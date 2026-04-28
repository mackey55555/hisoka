-- =========================================================================
-- 20260504_provision_team.sql
--
-- SuperAdmin によるチーム発行用の RPC + 予約 slug 検証関数
-- 設計書 §4.3 / docs/saas-multitenant-tasks.md T-06 参照
-- =========================================================================

-- ---------------------------------------------------------------
-- 予約 slug 判定
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_reserved_slug(p_slug TEXT)
RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE AS $$
  SELECT lower(p_slug) IN (
    'admin','super-admin','api','auth','login','signup',
    'dashboard','t','invitations','no-team','teams'
  );
$$;

-- ---------------------------------------------------------------
-- チーム発行（チーム作成 + 招待中レコード作成）
--
-- 招待メール送信は Postgres から行えないため、Server Action 側で:
--   1. このRPCを呼ぶ → team_id が返る
--   2. supabase.auth.admin.inviteUserByEmail を別途実行
--   3. 失敗時は team_invitations を DELETE してロールバック扱い
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.provision_team(
  p_team_name   TEXT,
  p_team_slug   TEXT,
  p_plan        TEXT,
  p_admin_email TEXT,
  p_admin_name  TEXT,
  p_invited_by  UUID,
  p_token       TEXT,
  p_expires_at  TIMESTAMPTZ
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_team UUID;
BEGIN
  IF p_team_name IS NULL OR length(trim(p_team_name)) = 0 THEN
    RAISE EXCEPTION 'team name required';
  END IF;
  IF p_team_slug IS NULL OR length(trim(p_team_slug)) = 0 THEN
    RAISE EXCEPTION 'team slug required';
  END IF;
  IF p_admin_email IS NULL OR length(trim(p_admin_email)) = 0 THEN
    RAISE EXCEPTION 'admin email required';
  END IF;
  IF public.is_reserved_slug(p_team_slug) THEN
    RAISE EXCEPTION 'reserved slug: %', p_team_slug;
  END IF;
  IF p_team_slug !~ '^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$' THEN
    RAISE EXCEPTION 'invalid slug format: % (use a-z, 0-9, hyphens)', p_team_slug;
  END IF;

  INSERT INTO teams (name, slug, plan)
    VALUES (p_team_name, p_team_slug, COALESCE(NULLIF(p_plan, ''), 'free'))
    RETURNING id INTO v_team;

  INSERT INTO team_invitations (
    team_id, email, role, invited_by, token, expires_at
  ) VALUES (
    v_team, lower(p_admin_email), 'admin', p_invited_by, p_token, p_expires_at
  );

  RETURN v_team;
END;
$$;

-- 実行権限は service role のみ（公開しない）
REVOKE ALL ON FUNCTION public.provision_team(
  TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TIMESTAMPTZ
) FROM PUBLIC, anon, authenticated;
