-- Ranked, paginated search. Return IDs only; the app loads the existing safe
-- marketplace view for presentation. RLS and the view's publication checks apply.
create or replace function public.search_marketplace(
  p_query text,
  p_related_terms text[] default '{}',
  p_category_slug text default null,
  p_limit integer default 24,
  p_offset integer default 0
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with parameters as (
    select
      left(lower(btrim(regexp_replace(coalesce(p_query, ''), '[^[:alnum:][:space:]-]', ' ', 'g'))), 80) as q,
      websearch_to_tsquery('english'::regconfig, left(coalesce(p_query, ''), 80)) as tsq
  ), related as (
    select distinct left(lower(btrim(term)), 40) as term
    from unnest((coalesce(p_related_terms, '{}'::text[]))[1:24]) as item(term)
    where length(btrim(term)) > 1
  ), matches as (
    select safe.id, safe.published_at,
      (
        case when lower(safe.title) = p.q then 150 else 0 end +
        case when strpos(lower(safe.title), p.q) > 0 then 90 else 0 end +
        case when listing.search_vector @@ p.tsq then 65 else 0 end +
        case when lower(safe.category_name) = p.q then 40 else 0 end +
        15 * extensions.word_similarity(p.q, lower(safe.title)) +
        10 * ts_rank_cd(listing.search_vector, p.tsq) +
        case when exists (
          select 1 from related r where strpos(lower(safe.title), r.term) > 0
        ) then 20 else 0 end
      ) as relevance
    from public.marketplace_listings safe
    join public.listings listing on listing.id = safe.id
    cross join parameters p
    where p.q <> ''
      and (nullif(btrim(p_category_slug), '') is null or safe.category_slug = lower(btrim(p_category_slug)))
      and (
        listing.search_vector @@ p.tsq
        or strpos(lower(safe.title), p.q) > 0
        or strpos(lower(safe.category_name), p.q) > 0
        or (length(p.q) >= 4 and p.q operator(extensions.<%) lower(safe.title))
        or exists (
          select 1 from related r
          where listing.search_vector @@ plainto_tsquery('english'::regconfig, r.term)
            or strpos(lower(safe.title), r.term) > 0
        )
      )
  ), page as (
    select id, relevance, published_at
    from matches
    order by relevance desc, published_at desc, id desc
    limit least(greatest(coalesce(p_limit, 24), 1), 48)
    offset least(greatest(coalesce(p_offset, 0), 0), 24000)
  )
  select jsonb_build_object(
    'ids', coalesce((select jsonb_agg(id order by relevance desc, published_at desc, id desc) from page), '[]'::jsonb),
    'total', (select count(*) from matches)
  );
$$;

revoke all on function public.search_marketplace(text, text[], text, integer, integer) from public, anon;
grant execute on function public.search_marketplace(text, text[], text, integer, integer) to authenticated, service_role;

-- A conversation participant can view the other student's safe profile even
-- when that student is only buying, or their listing has since sold.
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
  profile.avatar_path
from public.profiles profile
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

comment on function public.search_marketplace(text, text[], text, integer, integer) is
  'Authenticated relevance search with full-text, title typo tolerance, related terms, and stable pagination.';
comment on view public.seller_profiles is
  'Safe profile facts for published sellers and the current user’s conversation counterparts. No email, residence, or auth metadata.';
