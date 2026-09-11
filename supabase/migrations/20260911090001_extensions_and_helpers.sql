-- =============================================================================
-- 0001: extensions + generic helper functions (no dependency on later tables)
-- =============================================================================

create extension if not exists "pgcrypto" with schema extensions;
create extension if not exists "pg_trgm" with schema extensions; -- fuzzy/ILIKE search speedup

-- ---------------------------------------------------------------------------
-- updated_at auto-touch trigger, attached per-table in later migrations.
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Rate limiting (no Redis on the free tier): a small table + helper that
-- auth-adjacent server actions call before doing real work. Each row is one
-- (bucket, key) counter with a fixed window; the function does the
-- increment-or-reset atomically so concurrent requests can't race past it.
-- ---------------------------------------------------------------------------
create table public.rate_limit_counters (
  bucket text not null,
  key text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (bucket, key)
);

-- Returns true if the call is allowed (and records it), false if the caller
-- is over the limit for the current window.
create or replace function public.check_rate_limit(
  p_bucket text,
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_row public.rate_limit_counters%rowtype;
begin
  insert into public.rate_limit_counters (bucket, key, window_start, count)
  values (p_bucket, p_key, v_now, 1)
  on conflict (bucket, key) do update
    set
      count = case
        when public.rate_limit_counters.window_start <= v_now - make_interval(secs => p_window_seconds)
          then 1
        else public.rate_limit_counters.count + 1
      end,
      window_start = case
        when public.rate_limit_counters.window_start <= v_now - make_interval(secs => p_window_seconds)
          then v_now
        else public.rate_limit_counters.window_start
      end
  returning * into v_row;

  return v_row.count <= p_limit;
end;
$$;

comment on function public.check_rate_limit is
  'Fixed-window rate limiter. Call with e.g. bucket=''login'', key=email-or-ip, p_limit=5, p_window_seconds=300. Returns false when the caller should be rejected.';

-- Only the service role calls this (server actions use the service-role
-- client for rate limiting so it works even for unauthenticated attempts
-- like login). No anon/authenticated grant needed beyond the default
-- SECURITY DEFINER execution.
revoke all on function public.check_rate_limit(text, text, integer, integer) from public;
grant execute on function public.check_rate_limit(text, text, integer, integer) to service_role;
