-- Buyers can rate a seller only through a conversation attached to a sold listing.
-- Ratings are transaction-scoped and may be updated by the buyer.
create table public.seller_ratings (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  seller_id uuid not null references public.profiles (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint seller_ratings_conversation_key unique (conversation_id),
  constraint seller_ratings_listing_buyer_key unique (listing_id, buyer_id),
  constraint seller_ratings_distinct_participants check (buyer_id <> seller_id)
);

create index seller_ratings_seller_created_idx
  on public.seller_ratings (seller_id, created_at desc);

create trigger seller_ratings_set_updated_at
before update on public.seller_ratings
for each row execute function private.set_updated_at();

alter table public.seller_ratings enable row level security;
alter table public.seller_ratings force row level security;

revoke all on table public.seller_ratings from public, anon, authenticated;
grant all on table public.seller_ratings to service_role;

create or replace function public.rate_seller(
  p_conversation_id uuid,
  p_rating smallint
)
returns smallint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_conversation public.conversations;
  v_listing public.listings;
begin
  if v_user_id is null or not private.is_onboarded_student(v_user_id) then
    raise exception using
      errcode = '42501',
      message = 'A verified Waterloo student account is required.';
  end if;

  if p_rating not between 1 and 5 then
    raise exception using errcode = '22023', message = 'Choose a rating from one to five.';
  end if;

  select conversation.*
  into v_conversation
  from public.conversations as conversation
  where conversation.id = p_conversation_id
    and conversation.buyer_id = v_user_id
    and conversation.listing_id is not null
  for share;

  if not found then
    raise exception using errcode = '42501', message = 'Only the buyer can rate this seller.';
  end if;

  select listing.*
  into v_listing
  from public.listings as listing
  where listing.id = v_conversation.listing_id
    and listing.seller_id = v_conversation.seller_id
    and listing.status = 'sold'
  for share;

  if not found then
    raise exception using errcode = '22023', message = 'The seller can be rated after the sale.';
  end if;

  insert into public.seller_ratings (
    listing_id,
    conversation_id,
    buyer_id,
    seller_id,
    rating
  ) values (
    v_listing.id,
    v_conversation.id,
    v_user_id,
    v_conversation.seller_id,
    p_rating
  )
  on conflict (conversation_id) do update
    set rating = excluded.rating;

  return p_rating;
end;
$$;

revoke execute on function public.rate_seller(uuid, smallint) from public, anon;
grant execute on function public.rate_seller(uuid, smallint) to authenticated, service_role;

create or replace view public.inbox_conversations
with (security_barrier = true)
as
select
  conversation.id,
  listing.id as listing_id,
  coalesce(listing.title, conversation.listing_title_snapshot) as listing_title,
  coalesce(current_cover.storage_path, conversation.listing_cover_path_snapshot)
    as cover_image_path,
  listing.status as listing_status,
  conversation.buyer_id,
  conversation.seller_id,
  case
    when conversation.buyer_id = auth.uid() then conversation.seller_id
    else conversation.buyer_id
  end as counterpart_id,
  private.public_display_name(
    case
      when conversation.buyer_id = auth.uid() then seller.full_name
      else buyer.full_name
    end
  ) as counterpart_name,
  latest.id as last_message_id,
  latest.sender_id as last_message_sender_id,
  latest.body as last_message_body,
  latest.created_at as last_message_created_at,
  unread.unread_count,
  conversation.last_message_at,
  conversation.created_at,
  conversation.updated_at,
  case
    when conversation.buyer_id = auth.uid() then buyer_rating.rating
    else null
  end as seller_rating
from public.conversations as conversation
join public.profiles as buyer on buyer.id = conversation.buyer_id
join public.profiles as seller on seller.id = conversation.seller_id
left join public.listings as listing on listing.id = conversation.listing_id
left join lateral (
  select image.storage_path
  from public.listing_images as image
  where image.listing_id = listing.id
    and image.upload_status = 'uploaded'
  order by image.position
  limit 1
) as current_cover on true
left join lateral (
  select message.id, message.sender_id, message.body, message.created_at
  from public.messages as message
  where message.conversation_id = conversation.id
  order by message.created_at desc, message.id desc
  limit 1
) as latest on true
left join public.seller_ratings as buyer_rating
  on buyer_rating.conversation_id = conversation.id
  and buyer_rating.buyer_id = auth.uid()
cross join lateral (
  select count(*)::bigint as unread_count
  from public.messages as unread_message
  where unread_message.conversation_id = conversation.id
    and unread_message.sender_id <> auth.uid()
    and unread_message.created_at > case
      when conversation.buyer_id = auth.uid() then conversation.buyer_last_read_at
      else conversation.seller_last_read_at
    end
) as unread
where private.is_onboarded_student((select auth.uid()))
  and (
    conversation.buyer_id = (select auth.uid())
    or conversation.seller_id = (select auth.uid())
  );

revoke all on table public.inbox_conversations from public, anon, authenticated;
grant select on table public.inbox_conversations to authenticated, service_role;

comment on table public.seller_ratings is
  'Buyer ratings for sellers, restricted to conversations attached to sold listings.';
comment on function public.rate_seller(uuid, smallint) is
  'Creates or updates the authenticated buyer rating for a sold-listing conversation.';

create or replace view public.seller_profiles
with (security_barrier = true)
as
select
  profile.id,
  private.public_display_name(profile.full_name) as display_name,
  profile.program,
  profile.academic_year,
  profile.university,
  profile.created_at,
  profile.avatar_path,
  rating_summary.rating_average,
  rating_summary.rating_count
from public.profiles profile
left join lateral (
  select
    round(avg(seller_rating.rating)::numeric, 1) as rating_average,
    count(*)::bigint as rating_count
  from public.seller_ratings as seller_rating
  where seller_rating.seller_id = profile.id
) as rating_summary on true
where profile.role = 'student'
  and profile.email_verified
  and profile.onboarding_completed_at is not null
  and (
    exists (
      select 1 from public.listings listing
      where listing.seller_id = profile.id and listing.status = 'published'
    )
    or (
      private.is_onboarded_student((select auth.uid()))
      and exists (
        select 1 from public.conversations conversation
        where (conversation.buyer_id = (select auth.uid()) and conversation.seller_id = profile.id)
           or (conversation.seller_id = (select auth.uid()) and conversation.buyer_id = profile.id)
      )
    )
  );

revoke all on table public.seller_profiles from public, anon, authenticated;
grant select on table public.seller_profiles to authenticated, service_role;

comment on view public.seller_profiles is
  'Safe profile facts and aggregate transaction ratings for published sellers and conversation counterparts.';
