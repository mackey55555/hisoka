# Hisoka SaaS化（マルチテナント / チーム単位提供）設計メモ

「1管理者 = 1チーム = 1契約」の単位で SaaS として販売できるようにするための、現状整理と必要な変更点を洗い出したドキュメント。
実装着手前の **設計合意のためのたたき台** であり、確定仕様ではない。

---

## 1. 現状の整理

### 1.1 ロール
- `admin` / `trainer` / `trainee` の3ロール（[supabase/schema.sql:12](../supabase/schema.sql#L12)）
- `admin` は **グローバル管理者** として実装されており、全ユーザー・全データを横断して見える前提。
  - [supabase/schema.sql:98-111](../supabase/schema.sql#L98-L111) の `is_admin()` がそれを表す。

### 1.2 主要テーブル
| テーブル | 用途 | 所属の判定 |
|---|---|---|
| `users` | プロフィール（auth.users 拡張） | ロールのみ。チーム概念なし |
| `trainer_trainees` | トレーナー↔トレーニーの担当割当 | 個別ペアでのみ表現 |
| `goals` / `activities` / `reflections` | 業務データ | `users.id` 経由で個人に紐づく |
| `ai_diagnoses` / `ai_question_suggests` | AI診断結果 | 同上 |
| `roles` | ロールマスター | グローバル |

### 1.3 RLS の前提
- すべて「自分」「担当ペア」「グローバル admin」の3軸で書かれている。
- **テナント境界の概念が一切ない** ため、`admin` でログインすれば他テナントのデータも全部見える状態になる（SaaS化すると致命的）。

### 1.4 認証/招待
- 招待は [lib/actions/admin.ts](../lib/actions/admin.ts) の `inviteUser` 経由で `supabase.auth.admin.inviteUserByEmail` を叩く。
- グローバル admin が誰でも招待できる前提。
- セルフサインアップは無効化済み。

### 1.5 課金/プラン
- 現状なし。

---

## 2. SaaS化の目標像

- **「チーム」単位** でサービス契約し、その配下に admin / trainer / trainee がぶら下がる。
- チームをまたいだデータの可視性は **完全に遮断**（admin であっても自チームのみ）。
- チームの作成は次のいずれか:
  - **(a) セルフサインアップ**: 申し込んだ人が初代 admin になり、空のチームができる。
  - **(b) 運営側プロビジョニング**: Hisoka 運営が SuperAdmin としてチームを発行し、初代 admin を招待する。
- プラン（人数上限・機能フラグ）の土台を入れる（課金は別フェーズ）。
- 運営自身が全テナントを横断して見るための **SuperAdmin** ロールを別途用意。

---

## 3. データモデルの変更

### 3.1 新規テーブル

#### `teams`（チーム = テナント）
```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(60) UNIQUE NOT NULL,         -- URL用 (例: /t/acme)
  plan VARCHAR(20) NOT NULL DEFAULT 'free', -- free / starter / pro / enterprise
  max_members INTEGER NOT NULL DEFAULT 5,
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'cancelled')),
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `team_members`（チームへの所属）
ロールを「グローバル」から「チーム内」へ移行するためのテーブル。
```sql
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'trainer', 'trainee')),
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'invited', 'disabled')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (team_id, user_id)
);
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
```
> 同一ユーザーが複数チームに所属できる構造にしておくと、運営代行やトレーナーの掛け持ちに対応しやすい。MVPでは「1ユーザー=1チーム」を UI で強制してもよい。

#### `team_invitations`（招待中の状態を保持）
```sql
CREATE TABLE team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'trainer', 'trainee')),
  invited_by UUID REFERENCES users(id),
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (team_id, email)
);
```

### 3.2 既存テーブルの改修

すべての業務テーブルに **`team_id`** を追加し、RLS をテナント境界で書き直す。

| テーブル | 追加カラム | 備考 |
|---|---|---|
| `users` | （追加なし） | チーム所属は `team_members` 側で表現 |
| `trainer_trainees` | `team_id UUID NOT NULL` | 異なるチームのペアを禁止する制約必要 |
| `goals` | `team_id UUID NOT NULL` | 移行時は `users` から派生してバックフィル |
| `activities` | `team_id UUID NOT NULL` | 〃 |
| `reflections` | `team_id UUID NOT NULL` | 〃 |
| `ai_diagnoses` | `team_id UUID NOT NULL` | 〃 |
| `ai_question_suggests` | （`ai_diagnoses` 経由でOK） | 直接持たなくても可 |

> `team_id` は **業務テーブルに正規化して持たせる方が RLS が圧倒的に書きやすい**（毎回 join しなくて済む）。書き込み時のトリガで親レコードからコピーすると、アプリ側のミスを防げる。

### 3.3 ロール体系の刷新
- 既存の `roles` テーブルは **撤廃**（または `team_members.role` の参考に縮小）。
- `users.role_id` を削除し、ロールはチーム内のものに統一。
- 代わりに **グローバルな運営権限** として:
  ```sql
  ALTER TABLE users ADD COLUMN is_super_admin BOOLEAN NOT NULL DEFAULT FALSE;
  ```
  あるいは別テーブル `super_admins` を切る。Hisoka 運営チームのみここに登録される。

### 3.4 ヘルパー関数の刷新
```sql
-- 現在ログイン中のユーザーが所属するチームID一覧
CREATE OR REPLACE FUNCTION public.current_team_ids() RETURNS SETOF UUID
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT team_id FROM team_members
   WHERE user_id = auth.uid() AND status = 'active';
$$;

-- 指定チーム内で admin か
CREATE OR REPLACE FUNCTION public.is_team_admin(p_team UUID) RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members
     WHERE user_id = auth.uid() AND team_id = p_team
       AND role = 'admin' AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin() RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT is_super_admin FROM users WHERE id = auth.uid()), false);
$$;
```
既存の `is_admin()` / `is_trainer_of()` も team スコープに書き換える。

### 3.5 RLS の書き直し方針
全業務テーブルで以下のテンプレに揃える:
```sql
USING (
  team_id IN (SELECT public.current_team_ids())
  AND (
    -- 自分のデータ
    user_id = auth.uid()
    -- または同チームのトレーナーで担当
    OR public.is_trainer_of_in_team(user_id, team_id)
    -- またはチーム admin
    OR public.is_team_admin(team_id)
  )
)
```
SuperAdmin は `OR public.is_super_admin()` を加える（または運用上は service role 経由で対応）。

---

## 4. アプリケーション側の改修

### 4.1 セッション/コンテキスト
- ログイン後に **「現在のチーム」** をセッションに持たせる（cookie or URL）。
  - URL ベースの方が SaaS らしく、`/t/<slug>/dashboard` のようにする案。
  - MVP ではユーザーが1チーム前提なら自動選択でOK。
- `lib/supabase/server.ts` 周辺で `currentTeamId` を解決するユーティリティを追加。
- 既存の Server Action（[lib/actions/](../lib/actions/)）は全て `team_id` を必須にし、書き込み時に注入する。

### 4.2 招待フロー（[lib/actions/admin.ts:36-122](../lib/actions/admin.ts#L36-L122) 改修）
- `inviteUser` を **`inviteTeamMember(teamId, ...)`** にリネーム。
- 招待時に `team_invitations` を作成し、招待メールのリンクに `team_id` / `token` を持たせる。
- `auth/callback` 受け取り後、招待トークンを照合して `team_members` に INSERT。
- 既存の `users.role_id` の代わりに `team_members.role` を立てる。

### 4.3 セルフサインアップで新チーム作成
- `/signup` を復活させる（[app/(auth)/signup/page.tsx](../app/(auth)/signup/page.tsx) は削除済みなので再作成）。
- フロー:
  1. メアド + パスワード + チーム名を入力。
  2. `auth.users` 作成 → `users` upsert → `teams` 作成 → `team_members(role='admin')` 挿入。
  3. トライアル期間を `trial_ends_at` で付与。
- トランザクション境界が必要なので **Postgres function (RPC)** にまとめるのが安全。

### 4.4 画面/ナビゲーション
- 既存の `/admin/*` は **チーム admin 用** に位置付け直す（URLは維持してOK）。
- 新設: `/super-admin/*` で運営用ダッシュボード（テナント一覧、課金状況、メンバー数）。
- ヘッダーに「現在のチーム名」を表示。複数チーム所属時は切替UI。

### 4.5 プラン/上限のチェック
- 招待時に `team_members` 件数を数えて `teams.max_members` と比較し、超過なら拒否。
- 機能フラグ（例: AI診断は `pro` 以上）をテーブルかコードで持つ。

---

## 6. データ移行計画

既存環境（dev/prod）には既にユーザーが存在する前提:

1. **`teams` に `default` チームを1つ作る**（既存データ全部の受け皿）。
2. 既存 `users` 全員に対して `team_members` を作成。
   - 既存 `roles` の名前を `team_members.role` にコピー。
3. 業務テーブルに `team_id` を ALTER で追加 → 既存行に default チームのIDをバックフィル → `NOT NULL` 化。
4. 既存 `is_admin()` 等の関数を新版で置換。
5. RLS ポリシーを drop → 新ポリシーを create。
6. `users.role_id` カラムをアプリ側コード差し替え後に DROP。

→ **全部1つのマイグレーション** にまとめると失敗時に戻しにくいので、`*_a_add_teams.sql` / `*_b_backfill.sql` / `*_c_drop_legacy.sql` の3段階に分ける。

---

## 7. 段階的リリース計画

### Phase 0: 設計合意（このドキュメント）
- スキーマ確定、URL設計（`/t/<slug>` の有無）、SuperAdmin方式を決める。

### Phase 1: マルチテナント基盤（課金なし）
- `teams` / `team_members` / `team_invitations` 追加。
- `team_id` バックフィル + RLS刷新。
- 招待フロー / 既存画面のテナント対応。
- セルフサインアップで新チーム作成。
- **この段階で「無料SaaS」として公開可能**。

### Phase 2: SuperAdmin / 運営ダッシュボード
- `/super-admin` でテナント一覧、人数、停止/復活操作。

### Phase 3: SaaSらしさ強化
- 監査ログ（`audit_logs`）
- 利用状況ダッシュボード（テナント内）
- プラン上限の機能フラグ拡張

---

## 8. リスク / 要検討事項

- **データ漏洩リスク**: RLS の書き換えはテストが必須。`team_id` を join 経由でしか得られない構造にすると複雑化するので、**業務テーブルに `team_id` を持たせる正規化崩し** を強く推奨。
- **AI診断のコスト**: テナントが増えるとBedrock料金が線形に増える。`teams.plan` で月次回数制限をかける設計が必要。
- **既存招待リンクの有効性**: 移行直前に未accept の招待がある場合の扱いを決める（破棄 or 再送）。
- **複数チーム所属を許すか**: 許すと UI 切替が必要。MVP では制限する方が早い。
- **`slug` の予約語**: `admin`, `super-admin`, `api` 等は禁止リストで弾く。
- **Supabase Auth の招待メール文面**: テナント名を差し込みたい場合、Supabase 標準テンプレでは `{{ .Data.* }}` 経由で渡す必要あり。

---

## 9. 次のアクション（提案）

1. 本ドキュメントをレビューして、以下の論点を確定:
   - URL方式（`/t/<slug>/...` を採用するか、テナントは暗黙か）
   - 1ユーザー複数チーム所属を許すか
   - SuperAdmin の実装方式（フラグ vs 別テーブル）
2. 上記が固まったら **Phase 1 のマイグレーションSQL** をドラフト作成。
3. ステージング環境で **既存データのバックフィル+RLSテスト**。
4. アプリコード（Server Actions / 招待 / サインアップ）を順次改修。
