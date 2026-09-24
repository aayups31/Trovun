-- Durable, private advisory reviews. This pipeline never changes listings or accounts.
create table public.ai_listing_reviews (
  listing_id uuid primary key references public.listings(id) on delete cascade,
  fingerprint text not null,
  state text not null default 'pending' check (state in ('pending','processing','done','failed')),
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  lease uuid,
  flags jsonb not null default '[]'::jsonb check (jsonb_typeof(flags) = 'array'),
  reviewed boolean not null default false,
  checked_at timestamptz,
  updated_at timestamptz not null default now()
);
create index ai_listing_reviews_due on public.ai_listing_reviews(available_at)
where state in ('pending','processing');
alter table public.ai_listing_reviews enable row level security;
alter table public.ai_listing_reviews force row level security;
revoke all on public.ai_listing_reviews from public, anon, authenticated;
grant select on public.ai_listing_reviews to authenticated;
grant update(reviewed) on public.ai_listing_reviews to authenticated;
grant all on public.ai_listing_reviews to service_role;
create policy ai_reviews_moderator_read on public.ai_listing_reviews for select to authenticated
using (exists (select 1 from public.profiles where id = auth.uid() and role = 'moderator'));
create policy ai_reviews_moderator_update on public.ai_listing_reviews for update to authenticated
using (exists (select 1 from public.profiles where id = auth.uid() and role = 'moderator'))
with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'moderator'));

create table private.ai_review_usage (usage_day date primary key, requests integer not null default 0);
revoke all on private.ai_review_usage from public, anon, authenticated;

create function private.enqueue_ai_listing_review(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_fingerprint text;
begin
  select md5(l.title || chr(10) || l.description || chr(10) || coalesce((
    select string_agg(i.storage_path, ',' order by i.position, i.id)
    from public.listing_images i where i.listing_id = l.id and i.upload_status = 'uploaded'
  ), '')) into v_fingerprint from public.listings l where l.id = p_id and l.status = 'published';
  if v_fingerprint is null then
    delete from public.ai_listing_reviews where listing_id = p_id;
    return;
  end if;
  insert into public.ai_listing_reviews(listing_id, fingerprint) values(p_id, v_fingerprint)
  on conflict(listing_id) do update set fingerprint = excluded.fingerprint, state = 'pending',
    attempts = 0, available_at = now(), lease = null, flags = '[]',
    reviewed = false, checked_at = null, updated_at = now()
  where ai_listing_reviews.fingerprint <> excluded.fingerprint;
end;
$$;
revoke all on function private.enqueue_ai_listing_review(uuid) from public, anon, authenticated;

create function private.queue_ai_listing_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'listings' then
    perform private.enqueue_ai_listing_review(new.id);
  elsif tg_op = 'DELETE' then
    perform private.enqueue_ai_listing_review(old.listing_id);
  else
    perform private.enqueue_ai_listing_review(new.listing_id);
  end if;
  return null;
end;
$$;
revoke all on function private.queue_ai_listing_change() from public, anon, authenticated;
create trigger ai_listing_change after insert or update of title, description, status on public.listings
for each row execute function private.queue_ai_listing_change();
create trigger ai_listing_photo_change after insert or update or delete on public.listing_images
for each row execute function private.queue_ai_listing_change();

create function public.claim_ai_listing_reviews() returns setof public.ai_listing_reviews
language plpgsql security definer set search_path = '' as $$
declare v_used integer; v_claimed integer;
begin
  if not pg_try_advisory_xact_lock(923202602) then return; end if;
  delete from private.ai_review_usage where usage_day < current_date - 7;
  insert into private.ai_review_usage(usage_day) values(current_date) on conflict do nothing;
  select requests into v_used from private.ai_review_usage where usage_day = current_date;
  if v_used >= 200 then return; end if;
  update public.ai_listing_reviews set state = 'failed', lease = null
    where state in ('pending','processing') and attempts >= 3 and available_at <= now();
  return query with due as (
    select r.listing_id from public.ai_listing_reviews r
    join public.listings l on l.id = r.listing_id and l.status = 'published'
    where r.state in ('pending','processing') and r.available_at <= now() and r.attempts < 3
    order by r.available_at for update of r skip locked limit least(2, 200-v_used)
  ) update public.ai_listing_reviews r set state = 'processing', attempts = attempts + 1,
    lease = gen_random_uuid(), available_at = now() + interval '5 minutes'
  from due where r.listing_id = due.listing_id returning r.*;
  get diagnostics v_claimed = row_count;
  update private.ai_review_usage set requests = requests + v_claimed where usage_day = current_date;
end;
$$;

create function public.finish_ai_listing_review(p_id uuid, p_lease uuid, p_flags jsonb, p_success boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if jsonb_typeof(p_flags) <> 'array' or jsonb_array_length(p_flags) > 6 then raise exception 'Invalid flags'; end if;
  update public.ai_listing_reviews set
    state = case when p_success then 'done' when attempts >= 3 then 'failed' else 'pending' end,
    flags = case when p_success then p_flags else '[]'::jsonb end,
    checked_at = case when p_success then now() else null end,
    available_at = now() + interval '5 minutes', lease = null, updated_at = now()
  where listing_id = p_id and lease = p_lease and state = 'processing';
end;
$$;
revoke all on function public.claim_ai_listing_reviews() from public, anon, authenticated;
revoke all on function public.finish_ai_listing_review(uuid, uuid, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.claim_ai_listing_reviews() to service_role;
grant execute on function public.finish_ai_listing_review(uuid, uuid, jsonb, boolean) to service_role;
-- Existing listings are intentionally not bulk-scanned; new publications and content edits enqueue reviews.
