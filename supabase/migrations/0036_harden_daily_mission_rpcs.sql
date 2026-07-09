-- ============================================================================
-- 0036_harden_daily_mission_rpcs.sql · M10 privilege hardening
-- ----------------------------------------------------------------------------
-- The daily mission RPCs already guard on auth.uid(), but explicit EXECUTE
-- grants keep the privilege surface consistent with the other app RPCs.
-- ============================================================================

revoke all on function public.set_daily_mission(text) from public, anon;
revoke all on function public.set_mission_done(boolean) from public, anon;

grant execute on function public.set_daily_mission(text) to authenticated;
grant execute on function public.set_mission_done(boolean) to authenticated;
