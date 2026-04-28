# Hisoka マルチテナント化 ロールバック タスク一覧

[saas-multitenant-tasks.md](./saas-multitenant-tasks.md) で進めた変更を **シングルテナント構成に戻す** ための手順。
Supabase（DBスキーマ・RLS・関数・データ）と Vercel（環境変数・デプロイ）両方を対象とする。

## 使い方

1. 上から順番に1タスクずつ実行する（**順序を変えない**こと、特に DB 系）
2. 各タスクは独立したコミット/PR単位を想定
3. 実行前に **必ず Supabase のバックアップ（pg_dump またはダッシュボードからの Backup 取得）を取る**
4. ステージングで R-01 → R-09 を通しでリハーサルしてから本番に当てる

## 凡例
- 🟦 DBマイグレーション（revert）
- 🟩 サーバーコード戻し
- 🟨 UI戻し
- 🟧 テスト/検証
- 🟥 運用/手動作業（Vercel・Supabase ダッシュボード）

---

## 前提・全体方針

- 既存 revert ファイル（`*_revert.sql`）は T-01〜T-03 とペアで作ってある前提
  - `supabase/migrations/20260501_c_drop_legacy_revert.sql`
  - `supabase/migrations/20260501_b_backfill_revert.sql`
  - `supabase/migrations/20260501_a_add_teams_revert.sql`
  - `supabase/migrations/20260502_provision_team.sql` の revert は R-01 で新規作成
- 適用順は **作成と逆順（c → b → a）** にする
- アプリ側コードは「T-08.5 の URL 物理移動」を巻き戻す必要があるため、ブランチを切って一括で戻すのが安全
- データロスを伴う操作（teams / team_members / team_invitations の DROP）は最後に行う

---

## Phase R-0: 準備

### R-00 🟥 バックアップ・凍結
```
本番反映の直前に以下を実施する。

1. Supabase ダッシュボード → Database → Backups から手動バックアップを取得
2. ローカルにも pg_dump を取る:
   pg_dump "$SUPABASE_DB_URL" --no-owner --no-privileges > backup_pre_rollback_$(date +%Y%m%d_%H%M).sql
3. Vercel の現行 production デプロイ ID を控える（rollback 先として使うため）
   vercel ls --prod | head -5
4. メンテナンス告知（必要なら）→ 利用者に「数十分間サービス停止」連絡
5. Vercel 側で一時的にメンテナンス用環境変数 MAINTENANCE_MODE=true を設定（実装してあれば）

Acceptance:
- [ ] バックアップファイルがローカルに保存されている
- [ ] 巻き戻し先の Vercel デプロイ ID をメモした
- [ ] 利用者への告知が完了
```

---

## Phase R-1: アプリコードの巻き戻し

### R-01 🟩 ロールバック用ブランチ作成 + provision_team の revert SQL 作成
```
1. git checkout main && git pull
2. git checkout -b rollback/single-tenant
3. supabase/migrations/20260502_provision_team_revert.sql を新規作成
   - DROP FUNCTION IF EXISTS public.provision_team(...)
   - DROP FUNCTION IF EXISTS public.is_reserved_slug(text)
4. コミット

Acceptance:
- [ ] rollback/single-tenant ブランチが切られている
- [ ] 20260502_provision_team_revert.sql が作成されている
```

---

### R-02 🟨 URL構造を /t/[slug]/ から (main)/(admin)/(trainer) に戻す
```
T-08.5 の逆操作。git history を活かしつつ、以下を機械的に戻す。

移動内容:
- app/t/[slug]/dashboard → app/(main)/dashboard
- app/t/[slug]/goals → app/(main)/goals
- app/t/[slug]/activities → app/(main)/activities
- app/t/[slug]/reflections → app/(main)/reflections
- app/t/[slug]/admin → app/(admin)/admin
- app/t/[slug]/trainer → app/(trainer)/...
- app/t/[slug]/layout.tsx を分解して (main)/(admin)/(trainer) 各 layout に戻す

削除:
- app/t/ ディレクトリ丸ごと
- app/teams/page.tsx
- app/no-team/page.tsx
- app/invitations/[token]/page.tsx
- app/(super)/super-admin/ 配下すべて

参照修正:
- 全 <Link href="/t/<slug>/..."> を /dashboard, /goals 等に書き換え
- useCurrentTeam(), useCurrentTeamSlug() 呼び出しを削除
- redirect 先のハードコード修正

Acceptance:
- [ ] /dashboard, /goals, /activities, /reflections, /admin, /trainer が以前どおり動く
- [ ] app/t/ が存在しない
- [ ] grep -r "useCurrentTeam" app/ components/ で 0 件
```

---

### R-03 🟩 Server Action から teamSlug 引数を除去
```
T-08 の逆。以下の Server Action から第1引数の teamSlug を取り除く。

対象:
- lib/actions/goals.ts
- lib/actions/activities.ts
- lib/actions/reflections.ts
- lib/actions/ai.ts

変更:
- 関数シグネチャから teamSlug を削除
- resolveTeamFromSlug 呼び出しを削除
- INSERT 値から team_id を削除
- SELECT/UPDATE/DELETE の .eq('team_id', teamId) を削除
- 呼び出し側 page.tsx も合わせて修正

Acceptance:
- [ ] tsc が通る
- [ ] 全ページで CRUD が動く
```

---

### R-04 🟩 マルチテナント関連コードの削除
```
以下を削除またはシングルテナント仕様に戻す。

削除:
- lib/context/current-team.ts
- lib/context/current-team-client.tsx
- lib/actions/invitations.ts
- lib/actions/super-admin.ts

復元:
- lib/actions/admin.ts:inviteUser を git history から復元（T-07 で削除した版）
- components/features/admin/create-user-form.tsx を旧仕様に戻す
- components/layout/header.tsx からチーム切替ドロップダウン/SuperAdminバッジを削除

middleware.ts:
- /no-team, /super-admin, /t/<slug>/ のルーティング判定を削除
- T-09 以前の単純な「未認証→/login」ガードに戻す

Acceptance:
- [ ] grep -r "team_id" lib/ app/ components/ で 0 件（DBには残っているが参照しない状態）
- [ ] grep -r "isSuperAdmin\|is_super_admin" lib/ app/ components/ で 0 件
- [ ] middleware.ts が T-09 以前の状態に戻っている
```

---

### R-05 🟧 ローカル動作確認
```
1. npm run build でビルド通過
2. npm run dev で起動し、以下を手動確認:
   - /login → ログイン → /dashboard が表示
   - 目標・活動・振り返りの作成/編集/削除
   - admin の招待（旧 inviteUser 経路）
3. tsc / eslint エラー 0

Acceptance:
- [ ] ビルド成功
- [ ] 主要画面が動く
- [ ] 型/リンタ エラーなし
```

---

## Phase R-2: Vercel デプロイ巻き戻し

### R-06 🟥 Vercel 環境変数の整理
```
Vercel ダッシュボード（Project → Settings → Environment Variables）で、
T-06 以降に追加した変数があれば削除する。

確認対象（追加したものがあれば削除）:
- SUPER_ADMIN_BOOTSTRAP_EMAIL（追加していれば）
- SITE_URL を招待リンク用に新設していれば、不要なら削除
- INVITATION_FROM_EMAIL 等のメール送信系（独自に追加したもの）

残すもの:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- BEDROCK 関連
- その他元々あった環境変数

Acceptance:
- [ ] マルチテナント化で追加した環境変数が production / preview から削除されている
- [ ] スクリーンショットを docs/rollback-evidence/ に保存
```

---

### R-07 🟥 Vercel への rollback ブランチ デプロイ
```
方針A（推奨）: rollback/single-tenant ブランチを main にマージしてデプロイ
  1. PR 作成 → レビュー → main へマージ
  2. Vercel が自動で production デプロイ
  3. デプロイ完了後、URL 直叩きで /dashboard 等が動作することを確認

方針B（即時切り戻し、緊急時）: R-00 で控えた旧デプロイ ID にロールバック
  vercel rollback <deployment-id> --scope <team>
  → ただしこれは「コードだけ」戻る。DB はまだマルチテナント構成のままなので
    R-08 の DB ロールバックと整合性が崩れる。
    緊急回避用途のみ、すぐに方針Aを完遂すること。

Acceptance:
- [ ] production が rollback/single-tenant の内容で稼働
- [ ] /t/<slug>/ にアクセスしても 404 になる
- [ ] /super-admin が 404
```

---

## Phase R-3: Supabase DB の巻き戻し

> **重要**: アプリは R-07 までで「team_id を参照しない」状態。
> ここから DB スキーマを戻す。順序は **c → b → a → provision_team** の逆順。

### R-08 🟦 RLS と旧スキーマを復元（c の revert）
```
supabase/migrations/20260501_c_drop_legacy_revert.sql を適用する。

実行内容（revert 内に書いてあるはず）:
- 新 RLS ポリシー DROP
- roles テーブル CREATE
- users.role_id カラム CREATE + 既存ユーザーへの再付与（team_members.role から逆引き）
- 旧関数 is_admin / is_trainer_of を CREATE
- 業務テーブルに対する旧 RLS ポリシー CREATE
- team_id カラムは NOT NULL のまま（次の R-10 で削除）

実行コマンド:
  supabase db push                    # ローカル/staging
  または psql "$SUPABASE_DB_URL" -f supabase/migrations/20260501_c_drop_legacy_revert.sql

Acceptance:
- [ ] roles テーブルが存在し、旧データが復元されている
- [ ] users.role_id が再現され、各ユーザーに正しい role_id が入っている
- [ ] 業務テーブル CRUD が旧 RLS で動く（アプリから動作確認）
```

---

### R-09 🟦 バックフィルの取り消し（b の revert）
```
supabase/migrations/20260501_b_backfill_revert.sql を適用する。

実行内容:
- 業務テーブル (trainer_trainees, goals, activities, reflections, ai_diagnoses) の
  team_id を NULL に戻す（NOT NULL 制約は次の R-10 で外すので、ここでは ALTER で一旦 DROP NOT NULL してから UPDATE）
- team_members から全行 DELETE
- teams から 'default' チームを DELETE

注意:
- アプリは team_id を参照しなくなっているので NULL になっても動く
- もし R-08 で team_id を NULL にできない場合は、R-10 と統合する選択肢もある

Acceptance:
- [ ] team_members が空
- [ ] teams が空（または default 1件のまま、R-10 で消す）
- [ ] 業務テーブルの team_id が NULL
```

---

### R-10 🟦 マルチテナント用テーブル/関数/カラムを削除（a の revert）
```
supabase/migrations/20260501_a_add_teams_revert.sql を適用する。

実行内容:
- トリガ削除（copy_team_id_from_goal など §1.3 のトリガすべて）
- 関数削除: current_team_ids, is_team_admin, is_trainer_of_in_team, is_super_admin
- 業務テーブルから team_id カラム DROP
- users から is_super_admin カラム DROP
- team_invitations DROP
- team_members DROP
- teams DROP

Acceptance:
- [ ] teams / team_members / team_invitations が存在しない
- [ ] 業務テーブルに team_id が無い
- [ ] users.is_super_admin が無い
- [ ] §2 の関数が DROP されている
```

---

### R-11 🟦 provision_team RPC の削除
```
supabase/migrations/20260502_provision_team_revert.sql を適用する。

実行内容:
- DROP FUNCTION public.provision_team(...)
- DROP FUNCTION public.is_reserved_slug(text)

Acceptance:
- [ ] 両関数が DROP されている
- [ ] \df+ provision_team で何も返らない
```

---

## Phase R-4: 検証

### R-12 🟧 シングルテナント動作の総点検
```
本番 URL で以下を手動確認する。

1. ログイン → /dashboard 表示
2. 目標 CRUD（旧 RLS で他人のデータが見えないこと）
3. 活動・振り返り CRUD
4. AI 診断
5. /admin でユーザー招待 → メール → 受諾 → ログイン
6. trainer 画面で trainee 一覧と進捗閲覧
7. 旧 URL: /t/<何か>/dashboard → 404
8. /super-admin → 404
9. /no-team → 404
10. /invitations/<token> → 404
11. Supabase ダッシュボード → Logs にエラーが大量発生していないこと

結果記録:
  docs/rollback-evidence/r12-result.md にチェックリストとスクリーンショットを保存

Acceptance:
- [ ] 全項目 OK
- [ ] エラーログにマルチテナント関連の参照（"current_team_ids", "team_id" 等）が無い
```

---

### R-13 🟥 不要マイグレーションファイルの整理（任意）
```
ロールバック後、supabase/migrations/ から以下のファイルを削除するかどうか方針決定。

候補:
- 20260501_a_add_teams.sql / _revert.sql
- 20260501_b_backfill.sql / _revert.sql
- 20260501_c_drop_legacy.sql / _revert.sql
- 20260502_provision_team.sql / _revert.sql

選択肢:
A. すべて削除し、git history からのみ参照可能にする
B. revert 適用済みとしてファイルは残す（履歴として）
C. tag を打って別ブランチに退避し、main からは削除

推奨: B。Supabase の migrations 履歴テーブルとファイルが食い違うとローカル開発が壊れるため。
ただし supabase_migrations.schema_migrations から該当 version 行を DELETE しないと
「未適用」扱いで再実行されるリスクがあるので注意。

Acceptance:
- [ ] 方針が決定し、コミットされている
- [ ] schema_migrations テーブルとファイルの整合がとれている
```

---

### R-14 🟥 ドキュメント更新
```
- README.md / ENV_SETUP.md からマルチテナント関連の記載（SuperAdmin 設定手順等）を削除
- docs/saas-multitenant-design.md, saas-multitenant-tasks.md は「ロールバック済み」追記を冒頭に入れて残す（再着手の参考用）
- docs/saas-multitenant-rollback-result.md にロールバック実施日と担当者、確認事項を記録

Acceptance:
- [ ] README が現状（シングルテナント）を反映
- [ ] 設計ドキュメントの位置づけが明確
```

---

## ロールバック完了の判断基準

- R-12 が全項目 OK
- production の Vercel デプロイがシングルテナント版で安定稼働して 24h 以上経過
- Supabase Logs にマルチテナント関連エラーが出ていない
- バックアップを最低 30日 保管する運用になっている

---

## 緊急対応（一部だけ戻したい場合）

### A. アプリだけ戻したい（DB はマルチテナントのまま残す）
- R-01 〜 R-07 までを実行
- R-08 以降はスキップ
- DB に team_id 列が残るが、アプリが参照しないので動作には影響しない
- ただし RLS が新ポリシーのままだとログインユーザーが何も見えない可能性 → **その場合は R-08 まで必須**

### B. DB だけ戻したい（コードはマルチテナントのまま）
- 不可。コードが team_id を要求するので必ず R-02 〜 R-04 とセット

### C. SuperAdmin 機能だけ撤去
- R-11（provision_team の DROP）
- app/(super)/super-admin/ 削除、lib/actions/super-admin.ts 削除
- users.is_super_admin 列はそのまま残す or 別マイグレで DROP
- 他のマルチテナント機能は維持
