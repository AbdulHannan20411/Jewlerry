-- =============================================================================
-- 0012: account deletion — anonymize, never hard-delete. Paired (by the
-- calling Server Action, not SQL) with banning the matching auth.users row
-- via the Auth admin API, so the account can never sign in again while
-- profiles.id stays valid for every historical order/review/payment FK.
-- =============================================================================

create or replace function public.anonymize_profile(p_profile_id uuid)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
  v_suffix text := substr(p_profile_id::text, 1, 8);
begin
  update public.profiles
    set
      full_name = 'Deleted User',
      username = 'deleted_' || v_suffix,
      email = 'deleted_' || v_suffix || '@deleted.local',
      phone = null,
      avatar_url = null,
      deleted_at = now()
    where id = p_profile_id
    returning * into v_profile;

  if not found then
    raise exception 'PROFILE_NOT_FOUND' using errcode = 'P0002';
  end if;

  return v_profile;
end;
$$;

revoke all on function public.anonymize_profile(uuid) from public;
grant execute on function public.anonymize_profile(uuid) to service_role;
