# SaaS マルチテナント化 E2E テスト結果

[saas-multitenant-tasks.md](./saas-multitenant-tasks.md) T-15 の検収結果を記録するドキュメント。
ローカル `npm run dev` 上で実施し、各シナリオを目視で確認する。

> 📅 実施日: ___________  実施者: ___________

## 前提

- [ ] Supabase の dev プロジェクトに a/b/c/04 のマイグレが適用済み
- [ ] `npm run rls-test` が PASS している
- [ ] `npm run dev` でローカルサーバが起動している
- [ ] SuperAdmin ユーザーを 1人セットアップ済み（[README](../README.md) 参照）
- [ ] `/signup` が 404 を返すことを確認

## シナリオ

### S-1: SuperAdmin で TeamA を発行
1. [ ] SuperAdmin で `/login` → `/super-admin` にリダイレクト
2. [ ] `/super-admin/teams/new` から TeamA を発行（admin-a@example.com / 氏名）
3. [ ] テナント詳細画面に遷移し、招待中一覧に admin-a が出る
4. [ ] admin-a が招待メールを受領
5. [ ] メールリンクから `/invitations/[token]` に着地して受諾
6. [ ] パスワード未設定なら `/auth/set-password` を経由
7. [ ] `/t/<teamA-slug>/dashboard` が表示される

### S-2: TeamA admin が trainer-a / trainee-a を招待
1. [ ] admin-a で `/t/<teamA>/admin/users` の「+ ユーザーを招待」
2. [ ] role=trainer で trainer-a を招待 → 受諾 → ヘッダー / ダッシュボード表示
3. [ ] role=trainee で trainee-a を招待 → 受諾
4. [ ] admin-a で `/t/<teamA>/admin/assignments` から trainer-a → trainee-a を紐付け

### S-3: trainee-a で業務操作
1. [ ] trainee-a でログイン → `/t/<teamA>/dashboard`
2. [ ] `/t/<teamA>/goals/new` で目標作成
3. [ ] 目標詳細から活動記録 → 振り返りを追加
4. [ ] ダッシュボードに目標カードが出る
5. [ ] 目標カードクリックで `/t/<teamA>/goals/<id>` に遷移できる

### S-4: trainer-a で担当 trainee の閲覧
1. [ ] trainer-a でログイン → `/t/<teamA>/trainer/dashboard`
2. [ ] trainee-a の目標・活動・振り返りが見える
3. [ ] trainer-a が **担当外** trainee の goal を見られないこと（必要なら別 trainee を追加で確認）

### S-5: 別テナント TeamB の独立性
1. [ ] SuperAdmin で TeamB を発行（admin-b@example.com）
2. [ ] admin-b 受諾 → `/t/<teamB>/dashboard`
3. [ ] admin-b で `/t/<teamA>/...` の URL を直打ち → 404
4. [ ] admin-b の `/t/<teamB>/admin/users` に TeamA のユーザーが出ないこと

### S-6: 複数チーム所属（D-2 検証）
1. [ ] admin-a で `/t/<teamA>/admin/users` から、admin-b 宛に trainee として招待
2. [ ] admin-b でログインして `/invitations/[token]` を踏む（同じメアドなので受諾できる）
3. [ ] 受諾後、admin-b は TeamA で trainee, TeamB で admin の両方に所属
4. [ ] ヘッダーのチーム切替ドロップダウンで TeamA / TeamB を切替可能
5. [ ] `/teams` に両チームのカードが出る
6. [ ] admin-b が TeamA で goal を作成 → TeamB のダッシュボードに出ない（権限独立）

### S-7: SuperAdmin の俯瞰
1. [ ] SuperAdmin で `/super-admin` を開き TeamA / TeamB が一覧に出る
2. [ ] TeamA を suspended に変更
3. [ ] admin-a でログイン → 業務制限を受ける（※ MVP では status の運用挙動はメンバーシップにのみ反映、要動作確認）
4. [ ] TeamB の admin-b には影響なし

### S-8: 招待エラーケース
1. [ ] 期限切れ token (`team_invitations.expires_at` を SQL で過去にする) → エラー画面
2. [ ] 別アカウントでログイン中に `/invitations/[token]` を踏む → 「別アカウントでログインしてください」
3. [ ] 招待されていないメアドのユーザーで踏む → 同上エラー

### S-9: チーム未所属導線
1. [ ] 適当なユーザーを SQL で `team_members` から外す
2. [ ] そのユーザーでログイン → `/no-team` にリダイレクトされる
3. [ ] チーム作成導線や `/signup` リンクが表示されないこと

### S-10: signup ルート不在
1. [ ] `/signup` 直アクセス → 404

---

## 失敗 / 気づき
- 

## スクリーンショット
- `docs/screenshots/` 配下に保存（任意）
