-- Revert: 20260504_provision_team.sql
DROP FUNCTION IF EXISTS public.provision_team(
  TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TIMESTAMPTZ
);
DROP FUNCTION IF EXISTS public.is_reserved_slug(TEXT);
