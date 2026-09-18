begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;

select plan(39);

insert into private.admin_user_allowlist (email, role, note)
values (
  'message.moderator@uwaterloo.ca',
  'moderator',
  'Transaction-scoped messaging test moderator.'
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
    '61000000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'message.seller@uwaterloo.ca', '', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
  ),
  (
    '62000000-0000-4000-8000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'message.buyer@uwaterloo.ca', '', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
  ),
  (
    '63000000-0000-4000-8000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'message.outsider@uwaterloo.ca', '', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
  ),
  (
    '64000000-0000-4000-8000-000000000004',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'message.moderator@uwaterloo.ca', '', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
  );

update public.profiles
set
  full_name = case id
    when '61000000-0000-4000-8000-000000000001' then 'Message Seller'
    when '62000000-0000-4000-8000-000000000002' then 'Message Buyer'
    else 'Unrelated Student'
  end,
  program = 'Computer Science',
  academic_year = '3',
  residence_area = 'UWP',
  onboarding_completed_at = now()
where id in (
  '61000000-0000-4000-8000-000000000001',
  '62000000-0000-4000-8000-000000000002',
  '63000000-0000-4000-8000-000000000003'
);

insert into public.listings (
  id,
  seller_id,
  title,
  description,
  price_cents,
  category_id,
  condition,
  pickup_area
)
values
  (
    '61100000-0000-4000-8000-000000000001',
    '61000000-0000-4000-8000-000000000001',
    'Messaging test monitor',
    'A complete listing used to validate private marketplace messaging.',
    12000,
    (select id from public.categories where slug = 'electronics'),
    'good',
    'Waterloo Campus'
  ),
  (
    '61200000-0000-4000-8000-000000000002',
    '61000000-0000-4000-8000-000000000001',
    'Private messaging draft',
    'This draft must not accept new marketplace conversations.',
    5000,
    (select id from public.categories where slug = 'electronics'),
    'good',
    'Waterloo Campus'
  );

insert into public.listing_images (
  listing_id,
  storage_path,
  position,
  upload_status,
  mime_type,
  size_bytes
)
values (
  '61100000-0000-4000-8000-000000000001',
  '61000000-0000-4000-8000-000000000001/61100000-0000-4000-8000-000000000001/cover.jpg',
  0,
  'pending',
  'image/jpeg',
  1024
);

insert into storage.objects (bucket_id, name, owner_id, metadata)
values (
  'listing-images',
  '61000000-0000-4000-8000-000000000001/61100000-0000-4000-8000-000000000001/cover.jpg',
  '61000000-0000-4000-8000-000000000001',
  '{"mimetype":"image/jpeg","size":1024}'::jsonb
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '61000000-0000-4000-8000-000000000001', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"61000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

update public.listing_images
set upload_status = 'uploaded'
where listing_id = '61100000-0000-4000-8000-000000000001';
do $$
begin
  perform public.publish_listing('61100000-0000-4000-8000-000000000001');
end;
$$;

select throws_ok(
  $$ select public.start_listing_conversation('61100000-0000-4000-8000-000000000001') $$,
  '22023',
  'You cannot message your own listing.',
  'a seller cannot start a conversation with themself'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '62000000-0000-4000-8000-000000000002', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"62000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);

select lives_ok(
  $$ select public.start_listing_conversation('61100000-0000-4000-8000-000000000001') $$,
  'a buyer can start a conversation from a published listing'
);

select is(
  (
    select (public.start_listing_conversation('61100000-0000-4000-8000-000000000001')).id
  ),
  (
    select id
    from public.conversations
    where listing_id = '61100000-0000-4000-8000-000000000001'
      and buyer_id = '62000000-0000-4000-8000-000000000002'
  ),
  'starting the same listing conversation is idempotent'
);

select is(
  (select count(*)::integer from public.conversations),
  1,
  'the buyer sees the one conversation they participate in'
);

select lives_ok(
  $$
    select public.send_conversation_message(
      (select id from public.conversations limit 1),
      '  Is this monitor still available?  '
    )
  $$,
  'the buyer can send a trimmed message'
);

select is(
  public.get_unread_message_count(),
  0,
  'a sender does not create unread messages for themself'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '61000000-0000-4000-8000-000000000001', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"61000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

select is(
  (select count(*)::integer from public.conversations),
  1,
  'the seller sees a conversation addressed to them'
);

select is(
  public.get_unread_message_count(),
  1,
  'the buyer message is unread for the seller'
);

select lives_ok(
  $$ select public.mark_conversation_read((select id from public.conversations limit 1)) $$,
  'the seller can mark their conversation read'
);

select is(
  public.get_unread_message_count(),
  0,
  'marking the conversation read clears the seller count'
);

select lives_ok(
  $$
    select public.send_conversation_message(
      (select id from public.conversations limit 1),
      'Yes — pickup near DC works.'
    )
  $$,
  'the seller can reply'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '62000000-0000-4000-8000-000000000002', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"62000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);

select is(
  public.get_unread_message_count(),
  1,
  'the seller reply is unread for the buyer'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '63000000-0000-4000-8000-000000000003', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"63000000-0000-4000-8000-000000000003","role":"authenticated"}',
  true
);

select is(
  (select count(*)::integer from public.conversations),
  0,
  'an unrelated student cannot see the conversation'
);

select is(
  (select count(*)::integer from public.messages),
  0,
  'an unrelated student cannot see its messages'
);

select throws_ok(
  $$
    select public.send_conversation_message(
      (select id from public.conversations where false),
      'Forged message'
    )
  $$,
  '42501',
  'That conversation is unavailable.',
  'an unrelated student cannot send into the conversation'
);

select throws_ok(
  $$
    select public.mark_conversation_read(
      '65000000-0000-4000-8000-000000000005'
    )
  $$,
  '42501',
  'That conversation is unavailable.',
  'an unrelated student cannot mark another conversation read'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '62000000-0000-4000-8000-000000000002', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"62000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);

select throws_ok(
  $$ select public.send_conversation_message((select id from public.conversations limit 1), '   ') $$,
  '22023',
  'Messages must be between 1 and 2,000 characters.',
  'blank messages are rejected'
);

select throws_ok(
  $$
    select public.send_conversation_message(
      (select id from public.conversations limit 1),
      repeat('x', 2001)
    )
  $$,
  '22023',
  'Messages must be between 1 and 2,000 characters.',
  'oversized messages are rejected'
);

select throws_ok(
  $$
    insert into public.messages (conversation_id, sender_id, body)
    values (
      (select id from public.conversations limit 1),
      '62000000-0000-4000-8000-000000000002',
      'Direct write'
    )
  $$,
  '42501',
  'permission denied for table messages',
  'authenticated callers have no direct message insert privilege'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '64000000-0000-4000-8000-000000000004', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"64000000-0000-4000-8000-000000000004","role":"authenticated"}',
  true
);

select throws_ok(
  $$ select public.start_listing_conversation('61100000-0000-4000-8000-000000000001') $$,
  '42501',
  'A verified Waterloo student account is required.',
  'a moderator cannot start a marketplace conversation'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '62000000-0000-4000-8000-000000000002', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"62000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);

select throws_ok(
  $$ select public.start_listing_conversation('61200000-0000-4000-8000-000000000002') $$,
  'P0002',
  'That listing is unavailable.',
  'a private draft cannot start a conversation'
);

select lives_ok(
  $$ select public.mark_conversation_read((select id from public.conversations limit 1)) $$,
  'the buyer can mark the seller reply read'
);

select is(
  public.get_unread_message_count(),
  0,
  'the buyer unread count clears'
);

select ok(
  (public.search_marketplace('Messaging test monitor')->'ids') @>
    '["61100000-0000-4000-8000-000000000001"]'::jsonb,
  'search finds a published title'
);
select ok(
  (public.search_marketplace('display', array['monitor'])->'ids') @>
    '["61100000-0000-4000-8000-000000000001"]'::jsonb,
  'search finds a related item without the literal query word'
);
select ok(
  (public.search_marketplace('monitr')->'ids') @>
    '["61100000-0000-4000-8000-000000000001"]'::jsonb,
  'search tolerates a misspelled item name'
);
select ok(
  not ((public.search_marketplace('monitor', '{}', 'books')->'ids') @>
    '["61100000-0000-4000-8000-000000000001"]'::jsonb),
  'related search keeps the selected category restriction'
);
select ok(
  not ((public.search_marketplace('Private messaging draft')->'ids') @>
    '["61200000-0000-4000-8000-000000000002"]'::jsonb),
  'search never includes a private draft'
);
select is(
  public.search_marketplace('Messaging test monitor', '{}', null, 12, 24000)->'total',
  public.search_marketplace('Messaging test monitor')->'total',
  'empty pages retain the correct result count'
);
select ok(
  not has_function_privilege('anon', 'public.search_marketplace(text,text[],text,integer,integer)', 'execute'),
  'anonymous visitors cannot search the private marketplace'
);

reset role;
update public.listings
set
  status = 'removed',
  removed_at = now(),
  removal_reason = 'Removed during the private messaging regression test.'
where id = '61100000-0000-4000-8000-000000000001';

set local role authenticated;
select set_config('request.jwt.claim.sub', '61000000-0000-4000-8000-000000000001', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"61000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

select throws_ok(
  $$
    select public.send_conversation_message(
      (select id from public.conversations limit 1),
      'This must not send.'
    )
  $$,
  '42501',
  'Messaging is unavailable for this listing.',
  'moderation removal blocks additional messages'
);

reset role;
select lives_ok(
  $$ delete from public.listings where id = '61100000-0000-4000-8000-000000000001' $$,
  'deleting a listing preserves the conversation record'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '62000000-0000-4000-8000-000000000002', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"62000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);

select is(
  (select listing_id from public.conversations limit 1),
  null::uuid,
  'the deleted listing reference becomes null instead of deleting the chat'
);

select is(
  (select listing_title from public.inbox_conversations limit 1),
  'Messaging test monitor',
  'the inbox retains its safe listing-title snapshot'
);

select hasnt_column(
  'public',
  'inbox_conversations',
  'email',
  'the inbox view does not expose an email address'
);

select hasnt_column(
  'public',
  'inbox_conversations',
  'residence_area',
  'the inbox view does not expose private residence data'
);

select throws_ok(
  $$
    update public.messages
    set body = 'Changed after sending'
  $$,
  '42501',
  'permission denied for table messages',
  'authenticated callers cannot update immutable messages'
);

select is(
  (select count(*)::integer from public.seller_profiles where id = '61000000-0000-4000-8000-000000000001'),
  1,
  'a chat counterpart profile remains visible after the listing is deleted'
);
select is(
  (select count(*)::integer from public.seller_profiles where id = '63000000-0000-4000-8000-000000000003'),
  0,
  'an unrelated student without published listings is not exposed'
);

select * from finish();
rollback;
