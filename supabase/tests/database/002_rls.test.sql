begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;

select plan(18);

insert into private.admin_user_allowlist (email, role, note)
values (
  'rls.moderator@uwaterloo.ca',
  'moderator',
  'Transaction-scoped database test moderator.'
);

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
values
  (
    '10000000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'rls.student.one@uwaterloo.ca',
    '',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'rls.student.two@uwaterloo.ca',
    '',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '30000000-0000-4000-8000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'rls.moderator@uwaterloo.ca',
    '',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

update public.profiles
set
  full_name = case id
    when '10000000-0000-4000-8000-000000000001' then 'Student One'
    when '20000000-0000-4000-8000-000000000002' then 'Student Two'
  end,
  program = 'Computer Science',
  academic_year = '3',
  residence_area = 'UWP',
  onboarding_completed_at = now()
where id in (
  '10000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000002'
);

insert into public.listings (id, seller_id, title)
values
  (
    '11000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'Student one private draft'
  ),
  (
    '22000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    'Student two private draft'
  );

select is(
  (select count(*)::integer from public.profiles),
  3,
  'Auth inserts created all three profiles'
);

select throws_ok(
  $$
    update public.profiles
    set role = 'moderator'
    where id = '20000000-0000-4000-8000-000000000002'
  $$,
  '42501',
  'Moderator roles require an active administrative allowlist entry.',
  'even a privileged role cannot promote a non-allowlisted email'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

select is(
  (select count(*)::integer from public.profiles),
  1,
  'a student can read only their private profile row'
);

select is(
  (select count(*)::integer from public.seller_profiles),
  0,
  'draft-only profiles are not exposed as marketplace sellers'
);

select is(
  (select count(*)::integer from public.seller_profiles where id = '30000000-0000-4000-8000-000000000003'),
  0,
  'the moderator is hidden from seller profiles'
);

select is(
  (select count(*)::integer from public.listings),
  1,
  'a student sees their own draft only'
);

select is(
  (
    select count(*)::integer
    from public.listings
    where id = '22000000-0000-4000-8000-000000000002'
  ),
  0,
  'another student draft is hidden'
);

select lives_ok(
  $$
    insert into public.listings (seller_id, title)
    values ('10000000-0000-4000-8000-000000000001', 'Another owned draft')
  $$,
  'an onboarded student can create their own draft'
);

select throws_ok(
  $$
    insert into public.listings (seller_id, title)
    values ('20000000-0000-4000-8000-000000000002', 'Forged draft')
  $$,
  '42501',
  'Only onboarded Waterloo students can create their own listings.',
  'a student cannot create a listing for another seller'
);

select results_eq(
  $$
    update public.listings
    set title = 'Changed by someone else'
    where id = '22000000-0000-4000-8000-000000000002'
    returning id
  $$,
  $$ select null::uuid where false $$,
  'updating another student listing affects no rows'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000003', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"30000000-0000-4000-8000-000000000003","role":"authenticated"}',
  true
);

select is(
  private.current_user_role(),
  'moderator'::public.user_role,
  'a verified active allowlist member receives moderator authorization'
);

reset role;
update private.admin_user_allowlist
set is_active = false
where email = 'rls.moderator@uwaterloo.ca';
set local role authenticated;

select is(
  private.current_user_role(),
  null::public.user_role,
  'deactivating the allowlist immediately revokes moderator authorization'
);

select throws_ok(
  $$
    select public.remove_listing(
      '99999999-9999-4999-8999-999999999999',
      'Revoked moderator regression reason.'
    )
  $$,
  '42501',
  'Moderator access is required.',
  'a deactivated allowlist member cannot call a moderator RPC'
);

reset role;
update private.admin_user_allowlist
set is_active = true
where email = 'rls.moderator@uwaterloo.ca';
update auth.users
set email_confirmed_at = null
where id = '30000000-0000-4000-8000-000000000003';
set local role authenticated;

select is(
  private.current_user_role(),
  null::public.user_role,
  'an unverified allowlisted account has no moderator authorization'
);

reset role;
update auth.users
set email_confirmed_at = now()
where id = '30000000-0000-4000-8000-000000000003';
set local role authenticated;

select is(
  private.current_user_role(),
  'moderator'::public.user_role,
  'verification restores authorization for an active allowlisted moderator'
);

select is(
  (select count(*)::integer from public.listings),
  0,
  'a moderator cannot read private student drafts'
);

select throws_ok(
  $$
    insert into public.listings (seller_id, title)
    values ('30000000-0000-4000-8000-000000000003', 'Moderator listing')
  $$,
  '42501',
  'Only onboarded Waterloo students can create their own listings.',
  'a moderator cannot create a listing'
);

reset role;

select throws_ok(
  $$
    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '40000000-0000-4000-8000-000000000004',
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated', 'outsider@example.com', '',
      '{"provider":"email","providers":["email"]}', '{}', now(), now(),
      '', '', '', ''
    )
  $$,
  '22023',
  'Trovun requires an @uwaterloo.ca email address.',
  'the database trigger blocks a non-Waterloo Auth user'
);

select * from finish();
rollback;
