-- Keep table privileges so the client gets empty results (RLS) instead of permission errors.
grant select on public.consent_settings to anon;
grant select on public.enrichment_runs to anon;
grant select on public.industry_trends_cache to anon;