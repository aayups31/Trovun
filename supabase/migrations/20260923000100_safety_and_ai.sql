-- Persistent cost limits; no prompts or model output are retained here.
create table private.ai_usage (
  user_id uuid not null references public.profiles(id) on delete cascade,
  usage_day date not null default current_date,
  requests integer not null default 1,
  last_request timestamptz not null default now(),
  primary key (user_id, usage_day)
);
revoke all on private.ai_usage from public, anon, authenticated;

create function public.consume_ai_allowance() returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_id uuid := auth.uid(); v_count integer;
begin
  if v_id is null or not private.is_onboarded_student(v_id) then
    raise exception using errcode = '42501', message = 'Student access required.';
  end if;
  -- Serialize the daily global budget as well as each user's allowance.
  perform pg_advisory_xact_lock(9232026);
  delete from private.ai_usage where usage_day < current_date - 7;
  if (select coalesce(sum(requests), 0) from private.ai_usage where usage_day = current_date) >= 1000 then return false; end if;
  insert into private.ai_usage(user_id) values (v_id)
  on conflict (user_id, usage_day) do update
    set requests = private.ai_usage.requests + 1, last_request = now()
    where private.ai_usage.requests < 20 and private.ai_usage.last_request < now() - interval '10 seconds'
  returning requests into v_count;
  return v_count is not null;
end;
$$;
revoke all on function public.consume_ai_allowance() from public, anon;
grant execute on function public.consume_ai_allowance() to authenticated;

create table public.safety_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id) on delete set null,
  subject text not null check (subject in ('listing','conversation','privacy','appeal','other')),
  reference_id uuid,
  details text not null check (char_length(details) between 10 and 2000),
  status text not null default 'open' check (status in ('open','reviewed')),
  created_at timestamptz not null default now()
);
create index safety_reports_queue on public.safety_reports(status, created_at);
alter table public.safety_reports enable row level security;
alter table public.safety_reports force row level security;
revoke all on public.safety_reports from public, anon, authenticated;
grant select on public.safety_reports to authenticated;
grant update(status) on public.safety_reports to authenticated;
grant all on public.safety_reports to service_role;
create policy reports_moderator_read on public.safety_reports for select to authenticated
using (exists (select 1 from public.profiles where id = auth.uid() and role = 'moderator'));
create policy reports_moderator_update on public.safety_reports for update to authenticated
using (exists (select 1 from public.profiles where id = auth.uid() and role = 'moderator'))
with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'moderator'));

create function public.submit_safety_report(p_subject text, p_reference_id uuid, p_details text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid := auth.uid(); v_report uuid;
begin
  if v_id is null or not private.is_onboarded_student(v_id) then
    raise exception using errcode = '42501', message = 'Student access required.';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_id::text, 23));
  if (select count(*) from public.safety_reports where reporter_id = v_id and created_at > now() - interval '1 hour') >= 5 then
    raise exception using errcode = 'P0001', message = 'Please wait before submitting another report.';
  end if;
  if p_subject = 'conversation' and not exists (
    select 1 from public.conversations where id = p_reference_id and v_id in (buyer_id, seller_id)
  ) then raise exception using errcode = '42501', message = 'Conversation unavailable.'; end if;
  if p_subject = 'listing' and not exists (
    select 1 from public.listings where id = p_reference_id and (status = 'published' or seller_id = v_id)
  ) then raise exception using errcode = '42501', message = 'Listing unavailable.'; end if;
  insert into public.safety_reports(reporter_id,subject,reference_id,details)
    values(v_id,p_subject,p_reference_id,btrim(p_details)) returning id into v_report;
  return v_report;
end;
$$;
revoke all on function public.submit_safety_report(text, uuid, text) from public, anon;
grant execute on function public.submit_safety_report(text, uuid, text) to authenticated;
