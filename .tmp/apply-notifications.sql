begin;
-- Private preferences and a durable outbox. No browser may enqueue or deliver email.
create table public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  message_emails_enabled boolean not null default true
);
alter table public.notification_preferences enable row level security;
alter table public.notification_preferences force row level security;
revoke all on public.notification_preferences from public, anon, authenticated;
grant select, insert, update on public.notification_preferences to authenticated;
grant all on public.notification_preferences to service_role;
create policy own_notification_preferences on public.notification_preferences
  for all to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create table public.message_email_jobs (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null unique references public.messages(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  recipient_email text not null,
  created_at timestamptz not null default now(),
  available_at timestamptz not null default (now() + interval '1 minute'),
  state text not null default 'pending' check (state in ('pending', 'processing', 'sent', 'cancelled', 'failed')),
  attempts integer not null default 0,
  lease uuid,
  sent_at timestamptz
);
create index message_email_jobs_due on public.message_email_jobs (available_at)
  where state in ('pending', 'processing');
alter table public.message_email_jobs enable row level security;
alter table public.message_email_jobs force row level security;
revoke all on public.message_email_jobs from public, anon, authenticated;
grant all on public.message_email_jobs to service_role;

create function public.enqueue_message_email() returns trigger
language plpgsql security definer set search_path = '' as $$
declare recipient uuid;
begin
  select case when c.buyer_id = new.sender_id then c.seller_id else c.buyer_id end
  into recipient from public.conversations c where c.id = new.conversation_id;
  insert into public.message_email_jobs (message_id, conversation_id, recipient_id, recipient_email)
  select new.id, new.conversation_id, recipient, u.email
  from auth.users u join public.profiles p on p.id = u.id
  left join public.notification_preferences pref on pref.user_id = u.id
  where u.id = recipient and u.email_confirmed_at is not null and p.role = 'student'
    and coalesce(pref.message_emails_enabled, true);
  return new;
end;
$$;
create trigger enqueue_message_email after insert on public.messages
  for each row execute function public.enqueue_message_email();

-- Rechecked immediately before delivery, as well as when leasing jobs.
create function public.message_email_is_eligible(job_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.message_email_jobs j
    join public.conversations c on c.id = j.conversation_id
    join public.messages m on m.id = j.message_id
    join auth.users u on u.id = j.recipient_id
    join public.profiles p on p.id = u.id
    left join public.notification_preferences pref on pref.user_id = u.id
    where j.id = job_id and j.state in ('pending', 'processing')
      and coalesce(pref.message_emails_enabled, true)
      and u.email_confirmed_at is not null and u.email = j.recipient_email and p.role = 'student'
      and j.created_at > now() - interval '23 hours'
      and m.created_at > case when c.buyer_id = j.recipient_id
        then c.buyer_last_read_at else c.seller_last_read_at end
  );
$$;

create function public.claim_message_emails() returns setof public.message_email_jobs
language plpgsql security definer set search_path = '' as $$
begin
  if not pg_try_advisory_xact_lock(741123098) then return; end if;
  -- Expire read/disabled notifications and coalesce bursts into the latest message.
  update public.message_email_jobs j set state = 'cancelled', lease = null
  where (j.state = 'pending' or (j.state = 'processing' and j.available_at <= now()))
    and (not public.message_email_is_eligible(j.id) or exists (
      select 1 from public.message_email_jobs newer
      where newer.conversation_id = j.conversation_id and newer.recipient_id = j.recipient_id
        and (newer.created_at, newer.id) > (j.created_at, j.id)
        and newer.state in ('pending', 'processing', 'sent')
    ));
  update public.message_email_jobs set state = 'failed', lease = null
    where state in ('pending', 'processing') and available_at <= now() and attempts >= 5;
  return query
    with due as (
      select j.id from public.message_email_jobs j
      where j.state in ('pending', 'processing') and j.available_at <= now() and j.attempts < 5
        and not exists (
          select 1 from public.message_email_jobs recent
          where recent.conversation_id = j.conversation_id and recent.recipient_id = j.recipient_id
            and ((recent.state = 'sent' and recent.sent_at > now() - interval '10 minutes')
              or (recent.state = 'processing' and recent.available_at > now() and recent.id <> j.id))
        )
      order by j.available_at for update skip locked limit 10
    )
    update public.message_email_jobs j
    set state = 'processing', lease = gen_random_uuid(), attempts = j.attempts + 1,
        available_at = now() + interval '5 minutes'
    from due where j.id = due.id returning j.*;
end;
$$;

create function public.finish_message_email(job_id uuid, job_lease uuid, outcome text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if outcome not in ('sent', 'cancelled', 'retry') then raise exception 'Invalid outcome'; end if;
  update public.message_email_jobs set
    state = case when outcome = 'retry' then case when attempts >= 5 then 'failed' else 'pending' end else outcome end,
    sent_at = case when outcome = 'sent' then now() else sent_at end,
    available_at = now() + interval '1 minute' * power(2, attempts), lease = null
  where id = job_id and lease = job_lease and state = 'processing';
end;
$$;

revoke all on function public.enqueue_message_email() from public, anon, authenticated;
revoke all on function public.message_email_is_eligible(uuid) from public, anon, authenticated;
revoke all on function public.claim_message_emails() from public, anon, authenticated;
revoke all on function public.finish_message_email(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.message_email_is_eligible(uuid) to service_role;
grant execute on function public.claim_message_emails() to service_role;
grant execute on function public.finish_message_email(uuid, uuid, text) to service_role;

insert into supabase_migrations.schema_migrations(version,name,statements) values ('20260911000100','message_email_notifications', ARRAY[$migration$-- Private preferences and a durable outbox. No browser may enqueue or deliver email.
create table public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  message_emails_enabled boolean not null default true
);
alter table public.notification_preferences enable row level security;
alter table public.notification_preferences force row level security;
revoke all on public.notification_preferences from public, anon, authenticated;
grant select, insert, update on public.notification_preferences to authenticated;
grant all on public.notification_preferences to service_role;
create policy own_notification_preferences on public.notification_preferences
  for all to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create table public.message_email_jobs (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null unique references public.messages(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  recipient_email text not null,
  created_at timestamptz not null default now(),
  available_at timestamptz not null default (now() + interval '1 minute'),
  state text not null default 'pending' check (state in ('pending', 'processing', 'sent', 'cancelled', 'failed')),
  attempts integer not null default 0,
  lease uuid,
  sent_at timestamptz
);
create index message_email_jobs_due on public.message_email_jobs (available_at)
  where state in ('pending', 'processing');
alter table public.message_email_jobs enable row level security;
alter table public.message_email_jobs force row level security;
revoke all on public.message_email_jobs from public, anon, authenticated;
grant all on public.message_email_jobs to service_role;

create function public.enqueue_message_email() returns trigger
language plpgsql security definer set search_path = '' as $$
declare recipient uuid;
begin
  select case when c.buyer_id = new.sender_id then c.seller_id else c.buyer_id end
  into recipient from public.conversations c where c.id = new.conversation_id;
  insert into public.message_email_jobs (message_id, conversation_id, recipient_id, recipient_email)
  select new.id, new.conversation_id, recipient, u.email
  from auth.users u join public.profiles p on p.id = u.id
  left join public.notification_preferences pref on pref.user_id = u.id
  where u.id = recipient and u.email_confirmed_at is not null and p.role = 'student'
    and coalesce(pref.message_emails_enabled, true);
  return new;
end;
$$;
create trigger enqueue_message_email after insert on public.messages
  for each row execute function public.enqueue_message_email();

-- Rechecked immediately before delivery, as well as when leasing jobs.
create function public.message_email_is_eligible(job_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.message_email_jobs j
    join public.conversations c on c.id = j.conversation_id
    join public.messages m on m.id = j.message_id
    join auth.users u on u.id = j.recipient_id
    join public.profiles p on p.id = u.id
    left join public.notification_preferences pref on pref.user_id = u.id
    where j.id = job_id and j.state in ('pending', 'processing')
      and coalesce(pref.message_emails_enabled, true)
      and u.email_confirmed_at is not null and u.email = j.recipient_email and p.role = 'student'
      and j.created_at > now() - interval '23 hours'
      and m.created_at > case when c.buyer_id = j.recipient_id
        then c.buyer_last_read_at else c.seller_last_read_at end
  );
$$;

create function public.claim_message_emails() returns setof public.message_email_jobs
language plpgsql security definer set search_path = '' as $$
begin
  if not pg_try_advisory_xact_lock(741123098) then return; end if;
  -- Expire read/disabled notifications and coalesce bursts into the latest message.
  update public.message_email_jobs j set state = 'cancelled', lease = null
  where (j.state = 'pending' or (j.state = 'processing' and j.available_at <= now()))
    and (not public.message_email_is_eligible(j.id) or exists (
      select 1 from public.message_email_jobs newer
      where newer.conversation_id = j.conversation_id and newer.recipient_id = j.recipient_id
        and (newer.created_at, newer.id) > (j.created_at, j.id)
        and newer.state in ('pending', 'processing', 'sent')
    ));
  update public.message_email_jobs set state = 'failed', lease = null
    where state in ('pending', 'processing') and available_at <= now() and attempts >= 5;
  return query
    with due as (
      select j.id from public.message_email_jobs j
      where j.state in ('pending', 'processing') and j.available_at <= now() and j.attempts < 5
        and not exists (
          select 1 from public.message_email_jobs recent
          where recent.conversation_id = j.conversation_id and recent.recipient_id = j.recipient_id
            and ((recent.state = 'sent' and recent.sent_at > now() - interval '10 minutes')
              or (recent.state = 'processing' and recent.available_at > now() and recent.id <> j.id))
        )
      order by j.available_at for update skip locked limit 10
    )
    update public.message_email_jobs j
    set state = 'processing', lease = gen_random_uuid(), attempts = j.attempts + 1,
        available_at = now() + interval '5 minutes'
    from due where j.id = due.id returning j.*;
end;
$$;

create function public.finish_message_email(job_id uuid, job_lease uuid, outcome text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if outcome not in ('sent', 'cancelled', 'retry') then raise exception 'Invalid outcome'; end if;
  update public.message_email_jobs set
    state = case when outcome = 'retry' then case when attempts >= 5 then 'failed' else 'pending' end else outcome end,
    sent_at = case when outcome = 'sent' then now() else sent_at end,
    available_at = now() + interval '1 minute' * power(2, attempts), lease = null
  where id = job_id and lease = job_lease and state = 'processing';
end;
$$;

revoke all on function public.enqueue_message_email() from public, anon, authenticated;
revoke all on function public.message_email_is_eligible(uuid) from public, anon, authenticated;
revoke all on function public.claim_message_emails() from public, anon, authenticated;
revoke all on function public.finish_message_email(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.message_email_is_eligible(uuid) to service_role;
grant execute on function public.claim_message_emails() to service_role;
grant execute on function public.finish_message_email(uuid, uuid, text) to service_role;
$migration$]);
commit;
