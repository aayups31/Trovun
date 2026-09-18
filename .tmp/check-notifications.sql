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
-- Everything, including test identities and queued mail, is rolled back.
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
values
('91000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','notification.seller@uwaterloo.ca','',now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('91000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','notification.buyer@uwaterloo.ca','',now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','','');
insert into public.conversations (id, buyer_id, seller_id, listing_title_snapshot, buyer_last_read_at, seller_last_read_at)
values ('92000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000002','91000000-0000-4000-8000-000000000001','Test item',now()-interval '1 hour',now()-interval '1 hour');
insert into public.messages (id, conversation_id, sender_id, body)
values ('93000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000002','A transaction-only test message.');
do $$ declare job public.message_email_jobs; begin
  select * into job from public.message_email_jobs where message_id='93000000-0000-4000-8000-000000000001';
  if job.recipient_id is distinct from '91000000-0000-4000-8000-000000000001'::uuid then raise exception 'Wrong email recipient'; end if;
  if not public.message_email_is_eligible(job.id) then raise exception 'Unread message should be eligible'; end if;
  if job.available_at <= now() then raise exception 'Missing notification delay'; end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',true);
insert into public.notification_preferences(user_id,message_emails_enabled) values ('91000000-0000-4000-8000-000000000001',false);
do $$ begin
  if (select message_emails_enabled from public.notification_preferences where user_id='91000000-0000-4000-8000-000000000001') then raise exception 'Preference not saved'; end if;
  begin
    insert into public.notification_preferences(user_id,message_emails_enabled) values ('91000000-0000-4000-8000-000000000002',false);
    raise exception 'Other user preference write was allowed';
  exception when insufficient_privilege then null; end;
  begin
    perform * from public.message_email_jobs;
    raise exception 'Queue exposed to client';
  exception when insufficient_privilege then null; end;
  begin
    perform * from public.claim_message_emails();
    raise exception 'Client could dispatch email';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ declare job public.message_email_jobs; begin
  select * into job from public.message_email_jobs where message_id='93000000-0000-4000-8000-000000000001';
  if public.message_email_is_eligible(job.id) then raise exception 'Opt-out ignored'; end if;
end $$;
insert into public.messages (id, conversation_id, sender_id, body)
values ('93000000-0000-4000-8000-000000000002','92000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000002','Should not enqueue after opt-out.');
do $$ begin
  if exists(select 1 from public.message_email_jobs where message_id='93000000-0000-4000-8000-000000000002') then raise exception 'Opted-out user was queued'; end if;
end $$;
update public.notification_preferences set message_emails_enabled=true where user_id='91000000-0000-4000-8000-000000000001';
update public.conversations set seller_last_read_at=now()+interval '1 second' where id='92000000-0000-4000-8000-000000000001';
do $$ declare job public.message_email_jobs; begin
  select * into job from public.message_email_jobs where message_id='93000000-0000-4000-8000-000000000001';
  if public.message_email_is_eligible(job.id) then raise exception 'Read notification still eligible'; end if;
end $$;
update public.conversations set seller_last_read_at=now()-interval '1 hour' where id='92000000-0000-4000-8000-000000000001';
update public.message_email_jobs set available_at=now()-interval '1 minute' where message_id='93000000-0000-4000-8000-000000000001';
do $$ declare job public.message_email_jobs; begin
  select * into job from public.claim_message_emails() where message_id='93000000-0000-4000-8000-000000000001';
  if job.state is distinct from 'processing' or job.lease is null or job.attempts <> 1 then raise exception 'Claim did not lease job'; end if;
  if exists(select 1 from public.claim_message_emails() where id=job.id) then raise exception 'Job leased twice'; end if;
  perform public.finish_message_email(job.id,gen_random_uuid(),'sent');
  if (select state from public.message_email_jobs where id=job.id) <> 'processing' then raise exception 'Wrong lease could acknowledge'; end if;
  perform public.finish_message_email(job.id,job.lease,'retry');
  if not exists(select 1 from public.message_email_jobs where id=job.id and state='pending' and available_at>now()) then raise exception 'Retry not scheduled'; end if;
  update public.message_email_jobs set available_at=now()-interval '1 minute' where id=job.id;
  select * into job from public.claim_message_emails() where id=job.id;
  perform public.finish_message_email(job.id,job.lease,'sent');
  if not exists(select 1 from public.message_email_jobs where id=job.id and state='sent' and sent_at is not null) then raise exception 'Delivery not recorded'; end if;
end $$;
select 'Notification recipient, delay, opt-out, read suppression, RLS, leases and retry checks passed' as result;
rollback;
