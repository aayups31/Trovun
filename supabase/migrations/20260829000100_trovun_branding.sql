-- Keep deployed authentication safeguards intact while updating the
-- user-facing product name. Historical migrations remain immutable.

create or replace function public.hook_restrict_signup(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_email text := event -> 'user' ->> 'email';
begin
  if private.is_allowed_auth_email(v_email) then
    return '{}'::jsonb;
  end if;

  return jsonb_build_object(
    'error',
    jsonb_build_object(
      'http_code', 403,
      'message', 'Use your @uwaterloo.ca email to join Trovun.'
    )
  );
end;
$$;

revoke execute on function public.hook_restrict_signup(jsonb)
  from public, anon, authenticated;
grant execute on function public.hook_restrict_signup(jsonb)
  to supabase_auth_admin;

create or replace function private.enforce_auth_user_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.email is distinct from old.email then
    raise exception using
      errcode = '22023',
      message = 'Trovun account email addresses cannot be changed.';
  end if;

  if not private.is_allowed_auth_email(new.email) then
    raise exception using
      errcode = '22023',
      message = 'Trovun requires an @uwaterloo.ca email address.';
  end if;

  return new;
end;
$$;
