begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;
select plan(1);
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
select pass('Notification recipient, delay, opt-out, read suppression, RLS, leases and retry checks passed');
select * from finish();
rollback;
