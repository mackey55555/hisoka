# Hisoka マルチテナント化 実装タスク一覧

[saas-multitenant-design.md](./saas-multitenant-design.md) をブレイクダウンした実装タスク。
各タスクは **Claude Code に1ブロックずつコピペして実行** できる単位で書いてある。

## 使い方

1. 上から順番に1タスクずつ Claude Code に渡す
2. 各タスクは独立したコミット/PR単位を想定（`Acceptance` を満たしたら次へ）
3. タスク内の `[ ]` チェックボックスは Claude Code が完了したらユーザーがレビューしてチェック
4. 設計判断で迷ったら [saas-multitenant-design.md](./saas-multitenant-design.md) を参照

## 凡例
- 🟦 DBマイグレーション
- 🟩 サーバーコード
- 🟨 UI
- 🟧 テスト/検証
- 🟥 運用/手動作業

---

## Phase 1: マルチテナント基盤

### T-01 🟦 マイグレーション (a) 新規テーブルとカラム追加
```
docs/saas-multitenant-design.md の §5.1 (1) に従い、以下を含む supabase/migrations/20260501_a_add_teams.sql を作成してください。

- teams テーブル作成（カラムは §1.2「teams」の表どおり）
- team_members テーブル作成（§1.2）
- team_invitations テーブル作成（§1.2）
- 既存業務テーブル (trainer_trainees, goals, activities, reflections, ai_diagnoses) に team_id UUID NULL カラムを追加
- users に is_super_admin BOOLEAN NOT NULL DEFAULT FALSE を追加
- §2 の関数 (current_team_ids, is_team_admin, is_trainer_of_in_team, is_super_admin) を作成
- §1.3 の copy_team_id_from_goal などのトリガを作成
- updated_at トリガを teams に適用

注意:
- まだ既存テーブルの NOT NULL 化や RLS 書き換えは行わない（次の T-02, T-03 で）
- 旧関数 is_admin / is_trainer_of は触らない（後の T-03 で置換）

Acceptance:
- [ ] supabase/migrations/20260501_a_add_teams.sql が作成されている
- [ ] スクリプト末尾に COMMENT 付きで意図が書かれている
- [ ] revert 用 supabase/migrations/20260501_a_add_teams_revert.sql も用意
```

---

### T-02 🟦 マイグレーション (b) 既存データのバックフィル
```
docs/saas-multitenant-design.md の §5.1 (2) に従い、supabase/migrations/20260501_b_backfill.sql を作成してください。

実行内容:
- name='Default Team', slug='default' で teams を1件作成（変数 v_default_team に保持）
- 既存 users 全員を team_members に INSERT
  - role は users.role_id → roles.name から引いてコピー
  - status='active'
- trainer_trainees, goals, activities, reflections, ai_diagnoses の team_id を v_default_team で UPDATE
- DO $$ ... $$ ブロック1つにまとめて原子的に実行

Acceptance:
- [ ] supabase/migrations/20260501_b_backfill.sql が作成されている
- [ ] revert 用も用意（default チーム削除 + team_id を NULL に戻す）
- [ ] スクリプト中に「実行後 team_id が NULL の行が0件であること」を確認する SELECT を入れる（コメントとしてでよい）
```

---

### T-03 🟦 マイグレーション (c) RLS刷新と旧スキーマ削除
```
docs/saas-multitenant-design.md の §5.1 (3) と §3 (RLSポリシー設計) に従い、supabase/migrations/20260501_c_drop_legacy.sql を作成してください。

実行内容:
1. 業務テーブル全部の team_id を ALTER COLUMN ... SET NOT NULL
2. 既存 RLS ポリシーを DROP（users, goals, activities, reflections, trainer_trainees, ai_diagnoses, ai_question_suggests）
3. §3 のテンプレに従い新しい RLS ポリシーを CREATE
   - is_super_admin() OR (team_id IN current_team_ids() AND (user_id=auth.uid() OR is_team_admin(team_id) OR is_trainer_of_in_team(user_id, team_id)))
4. team_members / team_invitations の RLS を §3 に従い設定
5. users テーブルから role_id を DROP
6. 旧関数 is_admin / is_trainer_of を DROP
7. roles テーブルを DROP

Acceptance:
- [ ] supabase/migrations/20260501_c_drop_legacy.sql 作成
- [ ] revert 用も用意（旧ポリシー復元/role_id 復活）
- [ ] 各テーブルで SELECT/INSERT/UPDATE/DELETE すべてに新ポリシーが当たっていること
```

---

### T-04 🟧 RLSテストスクリプト
```
scripts/rls-test.mjs を作成してください。
docs/saas-multitenant-design.md の §6.1 に挙げた以下のシナリオを検証します:

1. テナントA admin で goals/activities/reflections を作成
2. テナントB admin でログインしてA のデータが見えないこと
3. テナントA trainer は担当 trainee の goals のみ見えること
4. SuperAdmin は両方見えること
5. status='invited' な team_member は current_team_ids() に含まれないこと

実装方針:
- scripts/seed.mjs と同じく @supabase/supabase-js + service role を使う
- テスト用ユーザーを作成 → 各シナリオで supabase.auth.signInWithPassword でログインしクライアントを切り替え → assert
- 終了時にテスト用データを削除
- npm script として "rls-test": "node scripts/rls-test.mjs" を package.json に追加

Acceptance:
- [ ] scripts/rls-test.mjs 作成、すべてのシナリオが pass
- [ ] package.json に "rls-test" を追加
- [ ] README に実行方法を1行追記
```

---

### T-05 🟩 currentTeam 解決ユーティリティ（URL ドリブン）
```
lib/context/current-team.ts を新規作成してください。
URL の slug を真実とし、cookie はあくまで「直近どのチームを開いていたか」のヒントとして扱います。

API:
- resolveTeamFromSlug(slug: string): Promise<{ teamId: string; slug: string; role: 'admin'|'trainer'|'trainee'; status: string }>
  - teams を slug で引く
  - 現在ログイン中ユーザーが当該チームの active な team_member であることを team_members で検証
  - NG なら notFound() を throw（next/navigation）
  - SuperAdmin は所属していなくても通す（role は 'admin' 相当の virtual ロールにする）
- getLastTeamSlug(): Promise<string | null> — cookie 'hisoka_last_team' を返す
- setLastTeamSlug(slug: string): Promise<void> — cookie に保存
- listMyTeams(): Promise<{ id, slug, name, role }[]> — 所属一覧

注意:
- next/headers の cookies() を使う（Server Action / Server Component から呼ぶ前提）
- 全 Server Action は teamSlug を第1引数で受け取り、resolveTeamFromSlug で検証する規約

Acceptance:
- [ ] lib/context/current-team.ts 作成
- [ ] resolveTeamFromSlug が非メンバーで notFound する
```

---

### T-06 🟦🟩 SuperAdmin による「チーム発行 + 初代admin招待」RPC と Server Action
```
docs/saas-multitenant-design.md の §4.3 に従い、SuperAdmin がチームを発行する機能を実装してください。
セルフサインアップは実装しません。

DB:
- supabase/migrations/20260502_provision_team.sql を新規作成
- §4.3 の provision_team(p_team_name, p_team_slug, p_plan, p_admin_email, p_admin_name, p_invited_by, p_token, p_expires_at) RPC を作成
- slug 予約語チェック関数 public.is_reserved_slug(text) を追加し、provision_team 内から呼ぶ
  - 予約語: 'admin','super-admin','api','auth','login','signup','dashboard','t','invitations','no-team'

アプリ:
- lib/actions/super-admin.ts に provisionTeam Server Action を追加
  - 冒頭で is_super_admin チェック（false なら throw）
  - service role クライアントで rpc('provision_team', ...) を呼ぶ
  - 戻り値の team_id を取得し、supabase.auth.admin.inviteUserByEmail(adminEmail, {
      data: { name: adminName },
      redirectTo: `${SITE_URL}/auth/callback?next=/invitations/${token}`
    }) で招待メール送信
  - inviteUserByEmail 失敗時は team_invitations を DELETE してロールバック
  - 成功時 revalidatePath('/super-admin')

注意:
- ログイン画面に「新規登録」リンクは追加しない
- /signup ルートは作らない

Acceptance:
- [ ] provisionTeam 経由でチームが作成され、招待メールが届く
- [ ] slug 重複/予約語で分かりやすいエラー
- [ ] 招待送信失敗時に team_invitations が残らない
- [ ] 非 SuperAdmin が呼ぶと例外
```

---

### T-07 🟩 招待フロー（trainer/trainee 招待 + 共通受諾、複数所属対応）
```
docs/saas-multitenant-design.md §4.4, §4.5 に従って招待まわりを実装してください。
既存ユーザーが別チームに招待された場合も、同一 auth.users に team_members を1行追加するだけ（新規認証アカウントは作らない）。

新規:
- lib/actions/invitations.ts を作成
  - inviteTeamMember(teamSlug, email, role: 'trainer'|'trainee', trainerId?):
    - resolveTeamFromSlug で teamId 解決＋呼び出し元が admin であることを検証
    - role='admin' は弾く
    - 同一 (team_id, email) の未accepted 招待があれば再送扱い（DELETE→新規）
    - 招待先 email が既に同チームの active メンバーなら拒否（重複所属防止）
    - team_invitations に token (crypto.randomBytes(32).toString('hex')) を発行 INSERT
    - max_members 上限チェック（teams.max_members vs team_members.active 件数）
    - 招待先 email の auth.users が既に存在するかを supabase.auth.admin.listUsers で確認
      - 存在する → 招待メールは inviteUserByEmail を使わず、自前のメール送信ユーティリティで「{teamName} に追加で招待されました」リンクを送る（リンク先は ${SITE_URL}/invitations/${token}）。MVP では Supabase 経由の magicLink を使ってもOK
      - 存在しない → supabase.auth.admin.inviteUserByEmail(email, { redirectTo: `${SITE_URL}/auth/callback?next=/invitations/${token}` })
  - acceptInvitation(token):
    - token 検証（expires_at 未経過, accepted_at IS NULL）
    - 現在ログイン中ユーザーの email と team_invitations.email が一致（lower比較）する場合のみ受諾
    - 不一致なら「別アカウントでログインしてください」エラー
    - 同 team に既に active で所属していれば「既に所属しています」エラー
    - users upsert → team_members INSERT(role, status='active') → team_invitations.accepted_at 更新
    - cookie 'hisoka_last_team' を当該チームに切替
    - 戻り値で teamSlug を返し、呼び出し側で /t/<slug>/dashboard へリダイレクト
  - revokeInvitation(invitationId) — admin/SuperAdmin が取消

UI:
- app/invitations/[token]/page.tsx を新規作成
  - 「{teamName} に {role} として招待されています」の確認画面
  - 既存ログイン済みユーザー（email一致）の場合「{currentEmail} で受諾する」ボタン
  - email不一致の場合「別アカウントでログインしてください」案内 + ログアウトボタン
  - 期限切れエラー画面
- components/features/admin/create-user-form.tsx を新フローに合わせて修正
  - inviteTeamMember を呼ぶ（teamSlug を渡す）
  - role 選択肢から admin を除外

旧コード:
- lib/actions/admin.ts:inviteUser を削除（呼び出し箇所を inviteTeamMember に差し替え）

Acceptance:
- [ ] 新規ユーザー招待 → メール → 受諾 → /t/<slug>/dashboard
- [ ] 既存ユーザー（別チーム所属中）を別チームに招待 → 受諾後、両チームに所属している
- [ ] T-06 の SuperAdmin 経由 admin 招待もこの画面で受諾できる
- [ ] 上限超過/期限切れ/email不一致/重複所属で明示的なエラー
```

---

### T-08 🟩 業務 Server Action を teamSlug 必須に
```
以下の Server Action を「第1引数で teamSlug を受け取り、内部で resolveTeamFromSlug を呼ぶ」形に書き換えてください。

対象:
- lib/actions/goals.ts
- lib/actions/activities.ts
- lib/actions/reflections.ts
- lib/actions/ai.ts

変更内容:
- 各エクスポート関数の第1引数に teamSlug を追加
- 関数冒頭で const { teamId, role } = await resolveTeamFromSlug(teamSlug);
- INSERT する値に team_id: teamId を追加
  - activities/reflections は DB トリガで自動コピーされるので team_id を渡さなくてもOK（コメントで明記）
- SELECT/UPDATE/DELETE は RLS が効くが、明示的に .eq('team_id', teamId) を入れて意図を見せる
- 呼び出し側（page.tsx 等）も teamSlug を渡すよう修正（次タスク T-08.5 で URL構造を変えるのでそこで一気に対応してOK）

Acceptance:
- [ ] 全 Server Action が teamSlug 必須
- [ ] 別テナントの slug を渡すと notFound する
```

---

### T-08.5 🟨 URL構造の物理移行（/t/[slug]/ 配下へ）
```
docs/saas-multitenant-design.md §4.1 に従い、業務画面を /t/[slug]/ 配下に物理移動してください。

移動内容:
- app/(main)/dashboard → app/t/[slug]/dashboard
- app/(main)/goals → app/t/[slug]/goals
- app/(main)/activities → app/t/[slug]/activities
- app/(main)/reflections → app/t/[slug]/reflections
- app/(admin)/admin → app/t/[slug]/admin
- app/(trainer)/* → app/t/[slug]/trainer
- 共通レイアウト (app/(main)/layout.tsx, app/(admin)/layout.tsx 等) を app/t/[slug]/layout.tsx に統合
  - layout.tsx で resolveTeamFromSlug を呼んで CurrentTeamProvider にセット
  - role に応じて admin/trainer 配下の画面を出し分け（middleware ではなく layout で nested チェック）
- 既存の <Link> や redirect 先を /t/<slug>/... に書き換え（CurrentTeamProvider から useCurrentTeamSlug() で参照）

新規:
- lib/context/current-team-client.tsx を作成
  - CurrentTeamProvider, useCurrentTeam() フック (slug, teamId, role を返す)

その他:
- app/teams/page.tsx — 所属チーム一覧（カード表示）
- app/page.tsx (ルート) — §4.2 のログイン後遷移ロジック（0件→/no-team, 1件→/t/<slug>/dashboard, 複数→cookie or /teams）
- 既存ハードコードされた '/dashboard' 等のパスを全て /t/<slug>/dashboard 形式に修正

Acceptance:
- [ ] /t/<slug>/dashboard で業務画面が動く
- [ ] 別チームの slug を URL 直打ちしても notFound
- [ ] /teams が複数所属時に動く
- [ ] /(main), /(admin), /(trainer) の旧ディレクトリは削除
- [ ] middleware が壊れていない（次タスク T-09 で更新）
```

---

### T-09 🟩 ガード（middleware.ts）の更新
```
docs/saas-multitenant-design.md §4.7 に従い middleware.ts を更新してください。

ルール:
- 未認証 → /login（既存通り）
- 認証済み + 所属チーム0件 + is_super_admin=false → /no-team にリダイレクト
- /super-admin/* → is_super_admin=false なら 404
- /signup → 404（ルート自体作らない）
- /t/<slug>/* の所属/role チェックは middleware ではなく app/t/[slug]/layout.tsx で実施
  （middleware はセッション確認のみで、slug→team_id 解決はしない）

注意:
- middleware は Edge Runtime なので Supabase クライアントは @supabase/ssr の createServerClient を使う
- 所属0件チェックは team_members を1回引くだけ。is_super_admin と一緒にキャッシュ可能

Acceptance:
- [ ] 上記ルールどおりに振る舞う
- [ ] /t/<slug>/* は middleware を素通りし、layout で notFound する
```

---

### T-10 🟨 「チーム未所属」案内ページ（/no-team）
```
app/no-team/page.tsx を新規作成してください。
セルフでチームを作る導線は出さず、招待を待つ案内のみ表示します。

要件:
- 認証済みかつ team_members が空、かつ is_super_admin=false のユーザー専用
- 文言例:
  「あなたはまだチームに所属していません。
   管理者から招待メールが届いていないかご確認ください。
   届かない場合は運営までご連絡ください。」
- 「ログアウト」ボタンを設置
- ヘッダーは表示するが、チームナビゲーションは非表示

Acceptance:
- [ ] middleware から /no-team へ流れたユーザーがこの画面を見られる
- [ ] チーム作成ボタンや /signup リンクが画面上に存在しない
```

---

### T-11 🟨 ヘッダーにチーム切替ドロップダウン
```
components/layout/header.tsx を更新し、現在のチーム名表示と切替UIを実装してください。

要件:
- /t/<slug>/* 配下では useCurrentTeam() で現在のチーム名を表示
- 所属チームが2件以上ある場合、ドロップダウンで他チームに切替可能
  - クリックで /t/<別slug>/dashboard に遷移
  - listMyTeams() の結果を使う
- 「全所属チーム一覧へ」リンク → /teams
- SuperAdmin の場合は「[Super Admin]」バッジ + /super-admin へのリンク
- /t/* 以外（/teams や /no-team）ではチーム名表示はスキップ

Acceptance:
- [ ] 1チーム所属時はチーム名のみ表示（ドロップダウンなし）
- [ ] 2チーム以上で切替が動く
- [ ] SuperAdmin バッジが出る
```

---

## Phase 2: SuperAdmin

### T-12 🟩 SuperAdmin 用 Server Action（残り）
```
lib/actions/super-admin.ts に、T-06 で追加した provisionTeam に加えて以下を追加してください。

API:
- listTeams(): { id, name, slug, plan, status, member_count, created_at }[]
- getTeamDetail(teamId): { team, members[], invitations[] }
- updateTeamStatus(teamId, status: 'active'|'suspended'|'cancelled'): Promise<void>
- toggleSuperAdmin(userId, value: boolean): Promise<void>
- inviteAdditionalAdmin(teamId, email, name): Promise<void>
  - 既存チームに admin を追加で招待する経路（admin が辞めた時の救済）

実装:
- 全 Action 冒頭で is_super_admin チェック（false なら throw）
- service role クライアント (lib/supabase/admin.ts) を使う

Acceptance:
- [ ] 非 SuperAdmin が呼ぶと例外
- [ ] member_count が正しい
- [ ] inviteAdditionalAdmin で受諾までできる
```

---

### T-13 🟨 SuperAdmin ダッシュボード UI
```
以下を実装してください。

- app/(super)/super-admin/layout.tsx — SuperAdmin チェック、共通ヘッダー
- app/(super)/super-admin/page.tsx — テナント一覧テーブル（name, plan, member_count, status, 操作: 詳細/停止/復活）
- app/(super)/super-admin/teams/new/page.tsx — チーム発行フォーム（チーム名、slug、plan、初代adminのemail/氏名）
  - submit で provisionTeam を呼び、成功したらテナント詳細にリダイレクト
- app/(super)/super-admin/teams/[id]/page.tsx — テナント詳細
  - メンバー一覧、status トグル
  - 招待中一覧（pending invitations）、再招待ボタン、取消ボタン
  - 「admin を追加で招待」フォーム（inviteAdditionalAdmin を呼ぶ）

スタイルは既存の admin 画面に合わせる。

Acceptance:
- [ ] is_super_admin=true のユーザーで「新規発行 → メール届く → 受諾 → ダッシュボード」が通る
- [ ] テナント一覧/詳細/status変更が動く
- [ ] 一般ユーザーは全 /super-admin 配下が 404
```

---

### T-14 🟥 初期 SuperAdmin 設定手順を README に追記
```
README.md または ENV_SETUP.md に「初期 SuperAdmin の作り方」セクションを追記してください。

内容:
- Supabase SQL Editor で以下を実行する手順
  UPDATE users SET is_super_admin = true WHERE email = 'ops@example.com';
- 危険性（取り扱い注意）の警告
- /super-admin にアクセスして動作確認、までを書く

Acceptance:
- [ ] 該当セクションが追加されている
```

---

## Phase 1 完了の検収

### T-15 🟧 統合 E2E 手動テスト
```
以下の手順で手動 E2E を実施し、結果を docs/saas-multitenant-e2e-result.md に記録してください。

前提:
- SuperAdmin ユーザーが1人セットアップ済み（T-14 の手順で）
- /signup ルートが存在しないこと（404）を確認

1. SuperAdmin で /super-admin/teams/new から TeamA を発行（admin-a@example.com）
2. admin-a が招待メールを受領 → /invitations/[token] で受諾 → /t/teamA/dashboard 表示
3. admin-a で trainer-a を招待 → 受諾
4. admin-a で trainee-a を招待 → 受諾、admin-a から trainer-a にアサイン
5. trainee-a で goal/activity/reflection を作成
6. SuperAdmin で TeamB を発行（admin-b@example.com）→ admin-b 受諾
7. admin-b で /t/teamB/dashboard を見て、TeamA のデータが一切表示されないことを確認
8. /t/teamA/... の URL を admin-b が直打ち → notFound
9. **複数所属テスト**: TeamB の admin-b が TeamA に trainee として追加で招待される → 受諾後、ヘッダーのドロップダウンで TeamA / TeamB を切替可能
10. **複数所属の権限分離**: admin-b が TeamA で trainee として goal を作成 → TeamB の goal とは独立しており、TeamB で見えない
11. **/teams 画面**: 複数所属ユーザーで /teams にアクセス、両チームのカードが表示される
12. SuperAdmin で /super-admin にアクセス、両チームが見える
13. SuperAdmin が TeamA を suspended に → admin-a が /t/teamA/* で制限を受ける（TeamB の admin-b は影響なし）
14. チーム未所属ユーザー（手動で作成）が /no-team に飛ぶことを確認
15. 招待されていないメアドで /invitations/[token] にアクセス → エラー画面
16. 別アカウントでログイン中に /invitations/[token] にアクセス → 「別アカウントでログインしてください」エラー

Acceptance:
- [ ] 全手順成功
- [ ] スクリーンショットを docs/screenshots/ 配下に保存
- [ ] 失敗があれば issue を起票
```

---

## 後続フェーズ（参考、本タスク一覧では未着手）

- T-16: 監査ログ（audit_logs テーブル + Server Action 横断ロギング）
- T-17: テナント内利用状況ダッシュボード
- T-18: プラン上限の機能フラグ拡張
- T-19: チーム削除/退会フロー
- T-20: 課金（別計画書を作成すること）

---

## 進め方Tips

- 各タスクは「単一の意図のコミット」になるサイズに切ってある。途中で大きくなりそうなら分割を検討。
- マイグレ系（T-01〜T-03）は **必ずステージングで a→b→c を流して確認** してから本番に当てる。
- T-04 の RLS テストは Phase 1 の「命綱」。落ちたら他のタスクを止めて修正する。
- T-15 の E2E に通る = MVP リリース可能、と判断してOK。
