# 本番環境リニューアル手順書（SaaSマルチテナント化）

[saas-multitenant-design.md](./saas-multitenant-design.md) で設計し、開発環境（`dev-hisoka`）で検証済みのマルチテナント化を、**本番（`hisoka`）** に適用するための手順書。

> 🚨 **作業はメンテナンス時間中に実施し、事前にスナップショットを必ず取得すること。**
> 既存ユーザーは作業完了まで業務利用が止まる前提。

---

## 0. 用語と前提

- 本番 Supabase プロジェクト ID: `hvtuehlsmztcfyohxevw`（NAME: `hisoka`）
- 開発 Supabase プロジェクト ID: `umxkavfbzhmptfjvbshe`（NAME: `dev-hisoka`、検証済み）
- 本番ホスティング: Vercel（Production 環境）
- ホスト名: ※本番ドメインを記入してから進めること（例: `https://app.hisoka.example`）

このリニューアルで起きる主な破壊的変更:
- `roles` テーブル削除、`users.role_id` 削除
- 業務テーブル（`goals` など）に `team_id NOT NULL` 追加
- 既存 RLS ポリシー全削除 → 新ポリシー再作成
- URL 構造変更: `/dashboard`, `/admin/*`, `/trainer/*` → **`/t/<slug>/...`**
- 既存ユーザーは全員 **「Default Team」** に所属する形で継承される

---

## 1. 事前準備

### 1.1 バックアップ

1. **Supabase 本番のフルバックアップを取得**
   - Supabase Dashboard → Project → Database → Backups で最新の Point-in-time recovery 状態を確認
   - 念のため手動 Backup ボタンで取得（Pro 以上のプランで利用可）
   - 加えて pg_dump で論理バックアップも取っておく:
     ```bash
     # 本番の DB 接続文字列を Supabase Dashboard → Project Settings → Database から取得
     pg_dump "$PROD_DB_URL" \
       --no-owner --no-privileges \
       --schema=public \
       -f hisoka-prod-pre-multitenant-$(date +%Y%m%d-%H%M).sql
     ```
2. **既存スクリプト/マイグレ歴の確認**
   ```bash
   supabase link --project-ref hvtuehlsmztcfyohxevw
   supabase migration list
   ```
   - 何が「Local のみ」「Remote のみ」「両方」かを把握する

### 1.2 メンテナンスモード

- 既存ユーザーへ「○月○日 ○時〜△時 メンテナンス」を事前告知
- Vercel Production 環境にメンテナンスページを掲示するか、`status='suspended'` 相当の処理を出すか、選んで運用

### 1.3 検証用データの確認

- 本番に **未受諾の招待（旧 inviteUser フローで作られたもの）** が残っているなら以下を流して整理:
  ```sql
  -- パスワード未設定 + チーム所属なしの孤児 auth.users を一覧
  SELECT au.id, au.email, au.email_confirmed_at, au.created_at
    FROM auth.users au
    LEFT JOIN public.users u ON u.id = au.id
   WHERE au.email_confirmed_at IS NULL
   ORDER BY au.created_at DESC;
  ```
  必要に応じて Supabase Dashboard → Authentication → Users から削除しておく。

---

## 2. リポジトリ・コードの最終確認

本番デプロイ前に以下が `main` にマージ済みか確認:

- [ ] `supabase/migrations/20260501_a_add_teams.sql`
- [ ] `supabase/migrations/20260502_b_backfill.sql`
- [ ] `supabase/migrations/20260503_c_drop_legacy.sql`
- [ ] `supabase/migrations/20260504_provision_team.sql`
- [ ] `supabase/reverts/*` （3 + 1 ファイル）
- [ ] `lib/context/current-team.ts` / `lib/context/current-team-client.tsx`
- [ ] `lib/supabase/admin.ts`
- [ ] `lib/actions/super-admin.ts` / `lib/actions/invitations.ts`
- [ ] `lib/actions/admin.ts`（teamSlug 必須化版）
- [ ] `lib/actions/goals.ts` / `activities.ts` / `reflections.ts` / `ai.ts`（teamSlug 必須化版）
- [ ] `lib/ai/analysis.ts`（team_members ベースに修正済み）
- [ ] `app/t/[slug]/...` 配下の全ページ
- [ ] `app/teams/page.tsx` / `app/no-team/page.tsx` / `app/page.tsx`（遷移ロジック）
- [ ] `app/(super)/super-admin/...`
- [ ] `app/invitations/[token]/page.tsx` / `accept-form.tsx`
- [ ] `app/auth/signout/route.ts`
- [ ] `app/auth/set-password/page.tsx`（`?next` クエリ尊重版）
- [ ] `app/auth/callback/page.tsx`（defaultNext を `/` に）
- [ ] `lib/supabase/middleware.ts`（ガード版）
- [ ] `components/layout/header.tsx`（async Server Component）
- [ ] `components/layout/header-team-switcher.tsx`
- [ ] `components/layout/public-header.tsx`
- [ ] `components/layout/sidebar.tsx`（teamSlug 受け取り版）
- [ ] `components/features/admin/create-user-form.tsx` / `user-actions.tsx` / `trainer-detail.tsx`
- [ ] `components/features/goals/goal-detail.tsx` / `goals-list.tsx`
- [ ] `components/features/dashboard/goals-list-section.tsx`
- [ ] `components/features/ai/trainee-ai-card.tsx`

確認コマンド:
```bash
npm install
npx tsc --noEmit
npx next build
```

---

## 3. Supabase に接続を切り替え

### 3.1 link

```bash
# dev に link 中なら一旦解除
rm -rf supabase/.temp

supabase link --project-ref hvtuehlsmztcfyohxevw
# → DB password を求められたら入力
```

### 3.2 既存マイグレ歴を applied としてマーク

開発環境と同じく、本番でも既存の `20260220_ai_tables.sql` が SQL Editor 直適用で記録外になっているはず。**`db push` の前に必ず**:

```bash
supabase migration list
# 20260220 が「Local のみ」表示なら以下を実行
supabase migration repair --status applied 20260220
```

確認:
```bash
supabase migration list
# Local | Remote の両方に 20260220 が並ぶこと
```

### 3.3 マイグレ反映前の安全策

`supabase db push` は `supabase/migrations/` 配下を全て対象にする。
**`supabase/reverts/` には絶対に migrations を置かないこと**（dev 構築時にこれで失敗）。

```bash
ls supabase/migrations/
# 20260220_ai_tables.sql
# 20260501_a_add_teams.sql
# 20260502_b_backfill.sql
# 20260503_c_drop_legacy.sql
# 20260504_provision_team.sql
# (これ以外があれば確認)
```

---

## 4. マイグレを段階的に適用

### 4.1 (a) 新規テーブル / カラム追加

> 4 本のマイグレを **一度に push せず**、a→b→c→04 の各段階で確認する。
> dev では 4 本同時に流すと a→b 間で確認できなくなる失敗をしたため。

#### 一時退避

```bash
mkdir -p supabase/_pending
mv supabase/migrations/20260502_b_backfill.sql supabase/_pending/
mv supabase/migrations/20260503_c_drop_legacy.sql supabase/_pending/
mv supabase/migrations/20260504_provision_team.sql supabase/_pending/

supabase db push --dry-run
# → 20260501_a_add_teams.sql のみ表示されること
```

#### 適用

```bash
supabase db push
# プロンプトで Y
```

#### 確認

```bash
supabase migration list
# 20260501 が Remote 側にも並ぶこと
```

**SQL で実体確認**（Supabase Dashboard → SQL Editor）:
```sql
SELECT table_name FROM information_schema.tables
 WHERE table_schema='public' AND table_name IN ('teams','team_members','team_invitations');
-- 3 行返ること

SELECT column_name FROM information_schema.columns
 WHERE table_schema='public' AND table_name='users' AND column_name='is_super_admin';
-- 1 行返ること

SELECT column_name FROM information_schema.columns
 WHERE table_schema='public' AND column_name='team_id'
   AND table_name IN ('goals','activities','reflections','trainer_trainees','ai_diagnoses');
-- 5 行返ること（NULL 許容で追加されている状態）
```

### 4.2 (b) 既存データのバックフィル

#### 復帰

```bash
mv supabase/_pending/20260502_b_backfill.sql supabase/migrations/

supabase db push --dry-run
# → 20260502_b_backfill.sql のみ表示
```

#### 適用

```bash
supabase db push
```

#### 確認

```sql
-- すべて 0 件であること
SELECT 'trainer_trainees' AS t, COUNT(*) FROM trainer_trainees WHERE team_id IS NULL
UNION ALL SELECT 'goals',         COUNT(*) FROM goals             WHERE team_id IS NULL
UNION ALL SELECT 'activities',    COUNT(*) FROM activities        WHERE team_id IS NULL
UNION ALL SELECT 'reflections',   COUNT(*) FROM reflections       WHERE team_id IS NULL
UNION ALL SELECT 'ai_diagnoses',  COUNT(*) FROM ai_diagnoses      WHERE team_id IS NULL;

-- Default Team が作られたこと
SELECT * FROM teams WHERE slug = 'default';

-- 既存ユーザー全員が team_members に入ったこと
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM team_members WHERE status = 'active';
-- 上記 2 つの数が一致するはず
```

> **NULL が残っている場合、ここで止めて原因調査**。c を流すと NOT NULL 制約で失敗する。

### 4.3 (c) RLS 刷新と旧スキーマ削除

#### 復帰

```bash
mv supabase/_pending/20260503_c_drop_legacy.sql supabase/migrations/
supabase db push --dry-run
```

#### 適用

```bash
supabase db push
```

#### 確認

```sql
-- 業務テーブルの team_id が NOT NULL になっていること
SELECT table_name, column_name, is_nullable FROM information_schema.columns
 WHERE column_name = 'team_id'
   AND table_name IN ('goals','activities','reflections','trainer_trainees','ai_diagnoses');
-- すべて NO

-- 旧テーブル / 旧カラムが消えていること
SELECT to_regclass('public.roles') IS NULL AS roles_dropped;
SELECT NOT EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_name='users' AND column_name='role_id') AS role_id_dropped;

-- 新ポリシーが入っていること
SELECT tablename, policyname FROM pg_policies
 WHERE schemaname='public'
 ORDER BY tablename, policyname;
```

### 4.4 (04) provision_team RPC

```bash
mv supabase/_pending/20260504_provision_team.sql supabase/migrations/
supabase db push --dry-run
supabase db push
```

確認:
```sql
SELECT proname FROM pg_proc WHERE proname IN ('provision_team', 'is_reserved_slug');
-- 2 行返ること
```

### 4.5 後処理

```bash
rmdir supabase/_pending
supabase migration list
# Local と Remote が一致していること
```

---

## 5. RLS テスト（本番で実施）

開発で動作確認済みの RLS テストを **本番に対しても**1 回流す。

```bash
# .env.local の NEXT_PUBLIC_SUPABASE_URL 等を本番に向けて
npm run rls-test
```

**全シナリオ PASS** であることを確認。NG が出たらマイグレ巻き戻し（§9）を検討。

> ⚠️ テスト用ユーザーは finally で削除されるが、念のため終了後に
> `auth.users` から `rlstest-*@example.test` が消えているか確認すると安心。

---

## 6. Supabase Auth 設定

### 6.1 URL Configuration

Supabase Dashboard → Authentication → URL Configuration:

- **Site URL**: 本番ドメイン（例 `https://app.hisoka.example`）
- **Redirect URLs**: 以下を追加
  - `https://<本番ドメイン>/auth/callback`
  - `https://<本番ドメイン>/invitations/*`
  - `https://<プレビュー用ドメイン>/auth/callback`（必要なら）

### 6.2 メールテンプレート

Supabase Dashboard → Authentication → Email Templates:

- **Invite user** テンプレを確認
  - 招待メールから `{{ .ConfirmationURL }}` で `/auth/callback?next=/invitations/<token>` に飛ぶことを想定
  - 文面の差し替えが必要なら本番デプロイ前に修正

- **Magic Link** テンプレ
  - 既存ユーザーが別チームに招待される場合に使われる
  - 文面確認

### 6.3 SMTP 設定（任意・推奨）

Supabase 標準のメール送信は到達率が低い。本番ではカスタム SMTP（SendGrid 等）の設定を推奨:
- Authentication → Emails → SMTP Settings から設定

---

## 7. Vercel 環境変数

Vercel Project Settings → Environment Variables（**Production**）:

| Name | Value | Note |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://hvtuehlsmztcfyohxevw.supabase.co` | 本番 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | sb_publishable_... | 本番 |
| `SUPABASE_SECRET_KEY` | sb_secret_... | 本番 |
| `NEXT_PUBLIC_SITE_URL` | `https://<本番ドメイン>` | **必須**。招待メールの redirectTo に使う |
| 既存の AI/Bedrock 系 | （変更なし） | |

> `NEXT_PUBLIC_SITE_URL` 未設定だと招待リンクが localhost で生成される（dev で発覚済み）。

設定後、Production を **Redeploy** して環境変数を反映する。

---

## 8. アプリのデプロイ

### 8.1 デプロイ前チェック

```bash
git status
# クリーンであること

git checkout main
git pull
npx tsc --noEmit
npx next build
```

### 8.2 Vercel にデプロイ

通常の git push か、Vercel Dashboard で「Promote to Production」。

### 8.3 デプロイ完了後の確認

ブラウザで本番 URL にアクセス:

- [ ] `/login` がエラーなく表示される
- [ ] 既存ユーザーでログイン → `/t/default/dashboard` にリダイレクト
- [ ] ダッシュボード・goals 一覧・goal 詳細が表示される
- [ ] 旧 URL `/dashboard`, `/admin`, `/trainer/dashboard` を直打ちすると `/t/default/...` 系へ自然に流れる
   - 注意: 自動リライトはしていないので、`/dashboard` 直打ちは `/login` へ→`/t/default/dashboard` の流れ。
     ブックマーク救済が必要なら別途リダイレクト設定を検討
- [ ] `/super-admin` 直打ちは未認証→`/login`、認証済み非SuperAdmin → 404

---

## 9. 初期 SuperAdmin 作成

[README §初期 SuperAdmin の作成](../README.md) に従う。本番だけは慎重に:

```sql
-- 既に auth.users に該当メアドが存在することを前提
-- 例: 運営者として ops@hisoka.example
SELECT id, email FROM users WHERE email = 'ops@hisoka.example';

UPDATE users SET is_super_admin = true WHERE email = 'ops@hisoka.example';

-- 確認
SELECT email FROM users WHERE is_super_admin = true;
```

> 既存ユーザーがいない場合は、まず `npm run seed` 相当か、Supabase Dashboard → Authentication → Users から手動でユーザーを追加してから UPDATE を流す。

---

## 10. スモークテスト（本番で実施）

[docs/saas-multitenant-e2e-result.md](./saas-multitenant-e2e-result.md) のシナリオを **最低限** 以下まで実施:

- [ ] **S-1**: SuperAdmin で TeamA を発行（本番ドメイン経由で招待メールが届くこと）
- [ ] **S-2**: TeamA の admin が trainer/trainee を招待 → 受諾
- [ ] **S-2.5**: 受諾直後に `/auth/set-password` を経由してパスワード設定する動線が動く
- [ ] **S-3**: trainee の業務操作（goal/activity/reflection 作成）
- [ ] **S-5**: 別テナント TeamB を発行して独立性を確認
- [ ] **S-6**: 1メアドで複数チーム所属できることを確認
- [ ] **S-9**: チーム未所属ユーザーが `/no-team` に流れる

問題があれば §11 のロールバックを検討。

---

## 11. 本番特有のチェックポイント

### 11.1 招待取消時の auth.users クリーンアップ

開発時に判明した挙動:
- 招待を取り消すと `revokeInvitation` が auth.users も自動で片付ける（パスワード未設定 + 他チーム未所属 + SuperAdmin でない場合のみ）
- これにより同じメアドへ再招待しても `User already registered` で失敗しなくなる

### 11.2 既存ユーザーへの招待

- `provisionTeam` / `inviteAdditionalAdmin` / `inviteTeamMember` は **既存 auth ユーザー検知**を行い、`magicLink` フォールバックで送信する
- メール送信が失敗しても `invitationUrl` を返すので UI 上で URL を表示してコピペで渡せる

### 11.3 AI 月次バッチ（cron）

- `lib/ai/analysis.ts` は team_members ベースに修正済み
- `ai_diagnoses` の UNIQUE 制約は `(user_id, year, month)` のまま（複数チーム所属時の同月診断は1件に集約される）
- 必要なら別マイグレで `(user_id, team_id, year, month)` に変更

### 11.4 PWA キャッシュ

- 既存ユーザーの PWA キャッシュに古い `/dashboard` 等のルートがある場合、サーバ側で 404 → /login に流れる
- 必要なら Service Worker のバージョンを上げてキャッシュを破棄

---

## 12. ロールバック手順

万一のため、以下の順で巻き戻せる（**逆順**で適用）:

1. `supabase/reverts/20260504_provision_team_revert.sql`
2. `supabase/reverts/20260503_c_drop_legacy_revert.sql`
3. `supabase/reverts/20260502_b_backfill_revert.sql`
4. `supabase/reverts/20260501_a_add_teams_revert.sql`

これらを Supabase SQL Editor に手動で貼り付けて実行する（自動 push しない）。

その上で:
- アプリは `git revert` で旧コミット相当に戻し、Vercel に再デプロイ
- もし論理バックアップを使うなら、§1.1 で取った pg_dump をリストア

> 巻き戻し後の検証:
> - 既存ユーザーが旧 URL `/dashboard` でログインできる
> - `roles` テーブル / `users.role_id` が復活している
> - 業務テーブルの `team_id` カラムが消えている

---

## 13. 完了後タスク

- [ ] メンテ告知の解除
- [ ] 既存ユーザー向けに「URL が変わったこと」「招待制になったこと」のリリースノート発信
- [ ] [docs/saas-multitenant-e2e-result.md](./saas-multitenant-e2e-result.md) に本番スモークテスト結果を記録
- [ ] Supabase Dashboard → Database → Backups で本番のバックアップが新しい構造で取れるか確認

---

## 付録 A: トラブルシュート

### 招待メールが届かない
- Supabase Authentication → Logs を確認
- SMTP 設定がある場合は Supabase 内蔵 vs SMTP のどちらが使われたか確認
- `provisionTeam` の戻り値 `invitationUrl` を SuperAdmin 画面で表示して URL を直接渡す

### `User already registered` で発行が失敗
- 修正済（既存ユーザー検知 + magicLink フォールバック）
- もし出る場合は `supabase.auth.admin.listUsers` のページング上限（1000件/page）を超えていないか確認

### 招待受諾後にダッシュボードが 404
- middleware か `/t/[slug]/layout.tsx` の `resolveTeamFromSlug` で notFound している
- `team_members` に正しく行が入ったか SQL で確認:
  ```sql
  SELECT * FROM team_members WHERE user_id = '<auth.uid>' AND status='active';
  ```

### `/dashboard` を踏むと 404
- 旧 URL からの自動リダイレクトは設定していない
- `/login` 経由で `/` にリダイレクトされ、ロジックで適切な `/t/<slug>/dashboard` に流れる
- 必要なら `next.config.js` の `redirects()` で恒久的にリライトを追加

### マイグレ push で `schema_migrations_pkey` 衝突
- ファイル名先頭の version プレフィックスが既存と重複している
- 別の version 番号で命名し直して再 push

---

## 付録 B: 主要ファイル参照

- 設計書: [saas-multitenant-design.md](./saas-multitenant-design.md)
- タスク: [saas-multitenant-tasks.md](./saas-multitenant-tasks.md)
- E2E: [saas-multitenant-e2e-result.md](./saas-multitenant-e2e-result.md)
- README（SuperAdmin 設定）: [../README.md](../README.md)
