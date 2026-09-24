begin;
set local search_path = public, extensions, pg_catalog;
-- Synthetic identities, storage metadata and all queue mutations are rolled back.
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
values ('94000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','ai.fixture@uwaterloo.ca','',now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','','');
update public.profiles set full_name='AI Fixture', program='Computer Science', academic_year='3', residence_area='UWP', onboarding_completed_at=now()
where id='94000000-0000-4000-8000-000000000001';
insert into public.listings(id,seller_id,title,description,price_cents,category_id,condition,pickup_area)
values('95000000-0000-4000-8000-000000000001','94000000-0000-4000-8000-000000000001','Fixture desk','A desk used for transaction-only tests.',5000,(select id from public.categories where is_active order by id limit 1),'good','Waterloo Campus');
insert into public.listing_images(listing_id,storage_path,position,upload_status,mime_type,size_bytes)
values('95000000-0000-4000-8000-000000000001','94000000-0000-4000-8000-000000000001/95000000-0000-4000-8000-000000000001/test.jpg',0,'pending','image/jpeg',1024);
insert into storage.objects(bucket_id,name,owner_id,metadata)
values('listing-images','94000000-0000-4000-8000-000000000001/95000000-0000-4000-8000-000000000001/test.jpg','94000000-0000-4000-8000-000000000001','{"mimetype":"image/jpeg","size":1024}');
update public.listing_images set upload_status='uploaded' where listing_id='95000000-0000-4000-8000-000000000001';
do $$ begin
  if exists(select 1 from public.ai_listing_reviews where listing_id='95000000-0000-4000-8000-000000000001') then raise exception 'Draft was queued'; end if;
end $$;
update public.listings set status='published',published_at=now() where id='95000000-0000-4000-8000-000000000001';
do $$ declare job public.ai_listing_reviews; old_lease uuid; begin
  -- Only this fixture is made due; no production jobs are claimed even inside this rollback.
  update public.ai_listing_reviews set available_at=now()+interval '1 day' where listing_id<>'95000000-0000-4000-8000-000000000001';
  select * into job from public.claim_ai_listing_reviews() where listing_id='95000000-0000-4000-8000-000000000001';
  if job.lease is null or job.attempts<>1 then raise exception 'Published item was not leased'; end if;
  if exists(select 1 from public.claim_ai_listing_reviews() where listing_id=job.listing_id) then raise exception 'Double lease'; end if;
  perform public.finish_ai_listing_review(job.listing_id,gen_random_uuid(),'[]',true);
  if (select state from public.ai_listing_reviews where listing_id=job.listing_id)<>'processing' then raise exception 'Wrong lease accepted'; end if;
  old_lease := job.lease;
  update public.listings set description='Changed desk description for a new content version.' where id=job.listing_id;
  perform public.finish_ai_listing_review(job.listing_id,old_lease,'[{"reason":"stale"}]',true);
  if not exists(select 1 from public.ai_listing_reviews where listing_id=job.listing_id and state='pending' and flags='[]') then raise exception 'Stale check overwrote edited content'; end if;
  select * into job from public.claim_ai_listing_reviews() where listing_id=job.listing_id;
  perform public.finish_ai_listing_review(job.listing_id,job.lease,'[]',false);
  if not exists(select 1 from public.ai_listing_reviews where listing_id=job.listing_id and state='pending' and available_at>now()) then raise exception 'Failure did not retry'; end if;
  update public.ai_listing_reviews set available_at=now() where listing_id=job.listing_id;
  select * into job from public.claim_ai_listing_reviews() where listing_id=job.listing_id;
  perform public.finish_ai_listing_review(job.listing_id,job.lease,'[{"reason":"Human review needed"}]',true);
  update public.listings set title=title where id=job.listing_id;
  if (select state from public.ai_listing_reviews where listing_id=job.listing_id)<>'done' then raise exception 'Unchanged content was requeued'; end if;
  if (select status from public.listings where id=job.listing_id)<>'published' then raise exception 'AI changed listing status'; end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','94000000-0000-4000-8000-000000000001',true);
do $$ begin
  if exists(select 1 from public.ai_listing_reviews) then raise exception 'Student can see private flags'; end if;
  begin perform * from public.claim_ai_listing_reviews(); raise exception 'Student can claim reviews'; exception when insufficient_privilege then null; end;
  if not public.consume_ai_allowance() then raise exception 'Initial allowance unavailable'; end if;
  if public.consume_ai_allowance() then raise exception 'Cooldown ignored'; end if;
end $$;
reset role;
insert into private.admin_user_allowlist(email,role,note) values('ai.fixture@uwaterloo.ca','moderator','Transaction-only fixture');
update public.profiles set role='moderator', onboarding_completed_at=null where id='94000000-0000-4000-8000-000000000001';
set local role authenticated;
do $$ begin
  if not exists(select 1 from public.ai_listing_reviews where listing_id='95000000-0000-4000-8000-000000000001') then raise exception 'Moderator cannot see flags'; end if;
  update public.ai_listing_reviews set reviewed=true where listing_id='95000000-0000-4000-8000-000000000001';
  if not exists(select 1 from public.ai_listing_reviews where listing_id='95000000-0000-4000-8000-000000000001' and reviewed) then raise exception 'Moderator cannot dismiss flags'; end if;
end $$;
reset role;
update public.profiles set role='student', onboarding_completed_at=now() where id='94000000-0000-4000-8000-000000000001';
update public.listings set status='sold' where id='95000000-0000-4000-8000-000000000001';
do $$ begin
  if exists(select 1 from public.ai_listing_reviews where listing_id='95000000-0000-4000-8000-000000000001') then raise exception 'Unpublished listing retained review'; end if;
end $$;
select 'PASS: AI queue isolation, leases, retries, unchanged-content deduplication, stale-result rejection, role permissions, quotas, and no automated listing actions' as result;
rollback;
