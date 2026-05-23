# チームプラン バグ管理

チームプラン（SaaSマルチテナント化）開発で見つかったバグ・未決事項を管理するファイル。

- 関連ドキュメント: [saas-multitenant-design.md](./saas-multitenant-design.md) / [saas-multitenant-tasks.md](./saas-multitenant-tasks.md)
- 新しいバグは「未対応」セクションに追記する。対応が完了したら「対応済み」へ移動する。
- 設計上の未決事項・宿題は「未決事項 / TODO」セクションへ。

## 未決事項 / TODO

### TODO-001: 招待メールの送信プロバイダ未決定

| 項目 | 内容 |
|---|---|
| ステータス | 🟢 対応済み（Resend / `hisoka.online` 1ドメイン運用で確定） |
| 重要度 | High |
| 報告日 | 2026-05-23 |
| 対応日 | 2026-05-23 |
| 関連バグ | [BUG-001](#bug-001-既存ユーザーを別チームに招待してもメールが届かない) / [BUG-003](#bug-003-管理者がトレーニーを招待しても招待メールが届かない) |

**背景**

BUG-001 / BUG-003 の根本原因は、既存 `auth.users` 宛の招待で `supabase.auth.admin.generateLink()` を呼んでいる点。これは「メールを送信しない」API（リンク生成のみ）で、カスタムメール送信に差し替える必要がある。

**未決ポイント**

メール送信に何を使うかが未決定。候補:

| 候補 | メリット | デメリット |
|---|---|---|
| AWS SES | `.env.local` の既存 AWS 認証情報を流用可能 | SES のサンドボックス解除・送信元 verify が必要 |
| Resend | セットアップが最も簡単（API キー1本） | 新規アカウント作成・DNS 認証が必要 |
| SendGrid | [runbook](./saas-multitenant-prod-runbook.md) で推奨 | 新規アカウント作成・DNS 認証が必要 |
| Nodemailer + Custom SMTP | 柔軟（自社/Mailgun 等任意） | SMTP 認証情報の管理が必要 |

### 推奨プロバイダ（私見）

前提:

- ドメインはムームードメインで取得済み（DNS レコード追加はムームー DNS の管理画面から手動でできる）
- ホスティングは Vercel（Next.js Server Actions から呼び出す）
- 既存依存: Supabase Auth / AWS Bedrock
- 送信ボリュームは MVP〜初期段階で **月数百〜数千通**（招待・通知用途中心）程度を想定

**第1推奨: Resend** 🏆

理由:

1. **セットアップが最速（30分〜1時間）**: SaaS のサインアップ → API キー発行 → ムームー DNS に SPF/DKIM/DMARC の TXT レコードを3〜4行追加するだけ。ダッシュボードのオンボーディングウィザードがコピペ可能な形式で表示してくれる。
2. **Next.js / Vercel との親和性が高い**: Vercel 公式が "Recommended" としており、Server Actions からのインテグレーション例も豊富。`resend` パッケージは依存も軽い。
3. **DX が最良**: ダッシュボードで配信ログ・bounce・open/click が即見える。デバッグが容易で、開発中に「送ったはずなのに届かない」を最小化できる。
4. **無料枠で MVP を完走できる**: **3,000 通/月・100 通/日** が永続無料。チームプランの初期招待ボリュームは確実に収まる。超えたら $20/月で 50k 通までスケール。
5. **料金が読みやすい**: 段階制（$0/$20/$35）。AWS SES のような従量＋IP ウォームアップの心配が不要。
6. **乗り換え容易**: `lib/mail.ts` の薄いラッパーで隔離しておけば、後で SES / SendGrid に切り替えるコストは低い（API 形は似ている）。

注意点:

- 会社としては比較的若い（2023年創業）ので、長期運用で**他社買収・サービス改廃**のリスクは中程度ある。ただし上記の理由でラッパー越しに使えば移行コストは低く、許容範囲。
- ムームードメインは DNS 設定が手動。**SPF / DKIM / DMARC の3レコードを正確にコピペする**こと（運用上の唯一の落とし穴）。

**第2推奨: AWS SES**（条件付き）

以下のいずれかに該当するなら SES を選んでよい:

- 月 50,000 通を超える可能性が早期に見える（SES は $0.10/1,000通 で群を抜いて安い）
- 「AWS で全部運用する」方針があり、IAM / CloudWatch / SES イベント連携を活用したい
- Bedrock と同じ IAM ユーザー / リージョンで完結させたい運用要求がある

注意点:

- **SES サンドボックス解除リクエスト**が必要（承認まで 24h〜数営業日）。承認前は verify したアドレス宛しか送れない
- DNS 設定はムームーで手動。Route53 を使わないので**自動 DKIM 設定の恩恵が薄い**（手作業の3レコード追加は Resend と同じ）
- Resend より初期セットアップが2〜3倍重い

**不採用: SendGrid**

runbook で名前が挙がっているが、現時点で積極的に選ぶ理由は薄い:

- Twilio 傘下になってからアカウント登録〜送信開始までのフリクションが増加（本人確認・用途審査）
- ダッシュボード / SDK の DX が Resend より劣る
- 料金は Resend とほぼ同等（$19.95/月 〜）で優位性なし
- 既存運用ノウハウがあるチームには良いが、ゼロから選ぶ理由は乏しい

**不採用: Nodemailer + Custom SMTP**

- 自前 SMTP の運用は到達率・SPF/DKIM/DMARC・IP レピュテーションすべてを自分で管理することになり、SaaS 向けトランザクションメールでは割に合わない
- 既に運用中の SMTP（社内/ロリポップ等）が存在する場合のみ検討

### 結論（最短ルート）

1. **Resend にサインアップ**（GitHub 連携で1分）
2. **ムームー DNS** で送信ドメインに **SPF / DKIM / DMARC レコードを追加**（Resend ダッシュボードに表示される値をコピペ）
3. Resend ダッシュボードで verified になったら API キーを発行 → `.env.local` に `RESEND_API_KEY` を追加
4. Vercel の Production / Preview 環境変数にも同じキーを設定
5. `npm i resend` → `lib/mail.ts` を実装し、[lib/actions/invitations.ts](../lib/actions/invitations.ts) の既存ユーザー分岐を差し替え

迷ったらこの順で進めて OK。ボリュームが伸びてきた段階で SES への移行を検討する。

### 採用構成 / 設定手順書

**👉 具体的なセットアップ手順は [mail-setup.md](./mail-setup.md) を参照**

採用した構成（Resend 無料枠の1ドメイン制約に合わせた単一ドメイン運用）:

| 項目 | 本番 | 開発 |
|---|---|---|
| 送信ドメイン | `hisoka.online` | `hisoka.online`（共通） |
| 送信元アドレス | `noreply@hisoka.online` | `noreply-dev@hisoka.online` |
| Subject プレフィックス | なし | `[DEV] ...` |
| 環境分離 | API キーを dev/prod 別発行、`MAIL_DEV_REDIRECT_TO` で開発時の誤爆を完全防止 | 同左 |

**未決のため、現状は以下の状態で運用**

- 管理画面の「招待中」セクションで **既存ユーザー宛は「メール未送信の可能性」バッジ** が出る
- **招待URLのコピー** ボタンで管理者が手動共有する運用でしのぐ
- 詳しくは BUG-001 の「暫定対応」を参照

**決定すべきこと**

1. メール送信プロバイダの選定（上表から1つ）
2. 送信元アドレス（From）の決定: 本番ドメイン / 個人アドレスで動作確認 / 環境変数（`MAIL_FROM`）でプレースホルダ
3. メール本文テンプレート（プレーンテキスト / HTML）
4. 既存ユーザー向けのみカスタム送信にするか、新規ユーザー向けも統一するか

**決定後にやる実装タスク**

- [x] `lib/mail.ts` などにメール送信ユーティリティ追加 → [lib/mail.ts](../lib/mail.ts) 実装済み
- [x] [lib/actions/invitations.ts](../lib/actions/invitations.ts) の `inviteTeamMember` 既存ユーザー分岐を差し替え
- [x] [lib/actions/super-admin.ts](../lib/actions/super-admin.ts) の `provisionTeam` / `inviteAdditionalAdmin` も同様に差し替え
- [x] `emailSent` フラグの判定ロジック修正
- [x] BUG-001 / BUG-003 を 🟢 対応済みに移動

**実装完了状況**（2026-05-23）

- 送信プロバイダ: **Resend**（採用決定）
- 送信ドメイン: **`hisoka.online`**（dev / prod 共通・無料枠の1ドメイン制約に対応）
- 環境分離: From アドレスの local part (`noreply-dev@` vs `noreply@`) + `MAIL_DEV_REDIRECT_TO` で誤爆防止
- 詳細手順: [mail-setup.md](./mail-setup.md)

## ステータスの凡例

| ステータス | 意味 |
|---|---|
| 🔴 未対応 | 未着手 |
| 🟡 対応中 | 調査・修正中 |
| 🟢 対応済み | 修正完了、未検証 |
| ✅ 確認済み | 修正を動作確認済み |

## 重要度の凡例

| 重要度 | 意味 |
|---|---|
| High | 主要機能が使えない / データ不整合の恐れ |
| Mid | 一部機能に支障があるが回避策あり |
| Low | 軽微 / UI・表記の問題 |

---

## 未対応

### BUG-001: 既存ユーザーを別チームに招待してもメールが届かない

| 項目 | 内容 |
|---|---|
| ステータス | 🟢 対応済み（未検証） |
| 重要度 | High |
| 報告日 | 2026-05-23 |
| 対応日 | 2026-05-23 |
| 環境 | 開発（`dev-hisoka` / `umxkavfbzhmptfjvbshe`） |

**現象**

すでに別チームに所属しているユーザー（= `auth.users` に既に存在するメールアドレス）を、別のチームに招待した場合に、招待メールが送信されない。エラーも警告も出ない。

**根本原因**（2026-05-23 調査）

[lib/actions/invitations.ts:144-162](../lib/actions/invitations.ts#L144-L162) の既存ユーザー分岐で、`supabase.auth.admin.generateLink({ type: 'magiclink' })` を呼んでいる。

- `generateLink` は **メールを送信しない**。リンクを「生成」して返すだけで、送信はカスタム SMTP 経由で行う前提の API（Supabase 公式仕様）。
- さらにコード上で `emailSent = Boolean(linkData)` としているが、`linkData` は成功時に常に truthy になるため、画面上は「送信成功」扱いになり、用意されている警告メッセージ `'既存ユーザー宛のため、招待URLを手動で共有してください'` も表示されない。

同じ実装パターンが以下にもある（同根本原因の派生）:
- [lib/actions/super-admin.ts:124-137](../lib/actions/super-admin.ts#L124-L137)（`provisionTeam` の初代admin招待）
- [lib/actions/super-admin.ts:319-331](../lib/actions/super-admin.ts#L319-L331)（`inviteAdditionalAdmin` のフォールバック）

**暫定対応**（実装済み）

管理画面に「招待中」一覧を追加し、既存 `auth.users` のメールアドレスには **「既存ユーザー（メール未送信の可能性）」バッジ** を表示。さらに **招待URL のコピー機能** を付け、管理者が手動でユーザーに URL を共有できるようにする。

**恒久対応（未着手）**

- `generateLink` を呼ぶ代わりに、**カスタム SMTP（SendGrid 等）経由でメール送信** する処理を追加する
- もしくは、Supabase Auth の「既存ユーザーへの招待」を許容する API に切り替える（要調査）
- `emailSent` フラグの判定ロジックも修正する
- BUG-003 と同根本原因。両者まとめて対応する

**再現手順**

1. チームA に所属済みのユーザー（または `auth.users` に存在するメール）を用意する
2. そのユーザーのメールアドレスでチームB へ招待を行う
3. UI 上は「招待を送信しました」になるがメールは届かない

---

### BUG-002: 管理画面で「招待中」のユーザーを確認できない

| 項目 | 内容 |
|---|---|
| ステータス | 🟢 対応済み（未検証） |
| 重要度 | Mid |
| 報告日 | 2026-05-23 |
| 環境 | 開発（`dev-hisoka` / `umxkavfbzhmptfjvbshe`） |

**現象**

チームの管理者がトレーナーやトレーニーを招待した後、現在「誰を招待中（受諾待ち）なのか」を管理画面で確認できない。

**再現手順**

1. チーム管理者でログインする
2. トレーナーまたはトレーニーを招待する
3. 管理画面を見ても、招待中（未受諾）のユーザー一覧が表示されない

**期待する挙動**

管理画面に「招待中（受諾待ち）」のユーザー一覧が表示され、誰宛に招待を出しているかを管理者が確認できる。

**実際の挙動**

招待中のユーザーが管理画面に表示されず、招待状況が把握できない。

**調査メモ / 関連ファイル**

- 管理画面ユーザー一覧: [app/t/[slug]/admin/users/page.tsx](../app/t/[slug]/admin/users/page.tsx)
- 招待処理: [lib/actions/invitations.ts](../lib/actions/invitations.ts)
- SuperAdmin 側のチーム詳細では未受諾の招待を一覧・取り消しできる実装がある（[app/(super)/super-admin/teams/[id]/page.tsx](../app/(super)/super-admin/teams/[id]/page.tsx) / [revoke-invitation-button.tsx](../app/(super)/super-admin/teams/[id]/revoke-invitation-button.tsx)）。チーム管理画面側にも同様の招待一覧 UI を追加する想定で参考にする

---

### BUG-005: trainer 役割でも自分の目標を管理したい（多段階層対応）

| 項目 | 内容 |
|---|---|
| ステータス | 🟢 対応済み（未検証） |
| 重要度 | High |
| 報告日 | 2026-05-23 |
| 対応日 | 2026-05-23 |
| 環境 | 開発（`dev-hisoka` / `umxkavfbzhmptfjvbshe`） |

**背景**

組織の階層（新人 ← リーダー ← 課長 ← 部長）では、**同じ人が「下を指導するトレーナー」かつ「上に指導されるトレーニー」**になる。例: 課長は部長から見ればトレーニー、リーダーから見ればトレーナー。

そのため、`team_members.role='trainer'` の人も **自分の目標管理（trainee 機能）が使えるべき**。

**現象**

team_members.role='trainer' のユーザーが trainee 機能（目標一覧 / 新規目標 / AI診断）にサイドバーからアクセスできない。

- [components/layout/sidebar.tsx](../components/layout/sidebar.tsx) の `trainerMenuItems` が「ダッシュボード」しか持っていない
- BUG-004 で入れた `/dashboard → /trainer/dashboard` redirect により、trainer は自分のダッシュボードにすら到達できない

**根本原因**（DB は対応済み）

[supabase/migrations/20260503_c_drop_legacy.sql](../supabase/migrations/20260503_c_drop_legacy.sql) の RLS では `goals_insert/update/delete` が `user_id = auth.uid()` だけを条件にしている。つまり **team_members.role に関係なく、自分の目標は CRUD できる**。

ブロッカーは UI 側のみ:

1. サイドバーが role 排他で trainee 機能を出さない
2. /dashboard が trainer を専用画面に強制 redirect する（BUG-004 修正の副作用）

**期待する挙動**

- trainer のサイドバー = trainee メニュー（マイダッシュボード / AI診断 / 目標一覧 / 新規目標）+ 区切り線 + 担当トレーニーリンク
- `/t/<slug>/dashboard` は trainer がアクセスしても自分のダッシュボードを表示（admin の redirect は維持）

**対応スコープ**

- trainer 役割のみ対応（admin は対象外。admin に同様の拡充は別途検討）
- DB / モデル変更なし
- BUG-004 で入れた trainer の redirect は撤回（admin の redirect は維持）

**関連ファイル**

- [components/layout/sidebar.tsx](../components/layout/sidebar.tsx) — `trainerMenuItems` 拡張 + divider サポート
- [app/t/[slug]/dashboard/page.tsx](../app/t/[slug]/dashboard/page.tsx) — trainer redirect を削除

---

### BUG-004: trainer / admin が `/t/<slug>/dashboard` に着地してもトレーニー用画面が出る

| 項目 | 内容 |
|---|---|
| ステータス | 🟢 対応済み（未検証） |
| 重要度 | Mid |
| 報告日 | 2026-05-23 |
| 対応日 | 2026-05-23 |
| 環境 | 開発（`dev-hisoka` / `umxkavfbzhmptfjvbshe`） |

**現象**

`/t/<slug>/dashboard` は実装上「トレーニーが自分の目標を見るためのページ」だが、役割チェックがないため、`trainer` / `admin` が同 URL を踏むと **自分の目標 (常に0件)** が表示されてしまう。サイドバーは正しく役割別メニュー（trainer なら「ダッシュボード」のみ）に切り替わるため、ユーザー視点では「画面が壊れている / メニューが薄い」と感じる。

**再現手順**

1. `hisoka4731@gmail.com` のように **MA チームに trainer として所属**しているユーザーでログイン
2. `http://localhost:3000/t/ma/dashboard` を開く（root `/` 経由のリダイレクトでもここに飛ぶ）
3. トレーニー用ダッシュボードが出る（「進行中の目標 0」「+ 新規目標」ボタン等）
4. サイドバーは trainer メニューだが、表示中の中身と噛み合っていない

**期待する挙動**

役割に応じて適切なダッシュボードに redirect される:

| 役割 | redirect 先 |
|---|---|
| trainee | `/t/<slug>/dashboard`（現状のまま） |
| trainer | `/t/<slug>/trainer/dashboard` |
| admin | `/t/<slug>/admin` |

**対応スコープ**

修正 #1（`/t/<slug>/dashboard` の役割別 redirect）のみ。root `/` のリダイレクト改善と招待受諾後の遷移先改善は別途。

**関連ファイル**

- [app/t/[slug]/dashboard/page.tsx](../app/t/[slug]/dashboard/page.tsx) — このページに役割判定 + redirect を入れる
- [lib/context/current-team.ts](../lib/context/current-team.ts) の `resolveTeamFromSlug` で `team.role` が取れる

---

### BUG-003: 管理者がトレーニーを招待しても招待メールが届かない

| 項目 | 内容 |
|---|---|
| ステータス | 🟢 対応済み（未検証） |
| 重要度 | High |
| 対応日 | 2026-05-23 |
| 報告日 | 2026-05-23 |
| 環境 | 開発（`dev-hisoka` / `umxkavfbzhmptfjvbshe`） |

**現象**

チームの管理者アカウントから、トレーニーを追加するために招待メールを送信したが、メールが送信されていないように見える。

**再現手順**

1. チーム管理者でログインする
2. トレーニーを追加するため、メールアドレスを指定して招待を送信する
3. 招待メールが届かない

**期待する挙動**

招待操作を行うと、対象のメールアドレスに招待メールが送信される。

**実際の挙動**

招待メールが送信されていないように見える。

**調査メモ / 関連ファイル**

- 招待処理: [lib/actions/invitations.ts](../lib/actions/invitations.ts)
- 管理画面ユーザー一覧: [app/t/[slug]/admin/users/page.tsx](../app/t/[slug]/admin/users/page.tsx)
- [BUG-001](#bug-001-既存ユーザーを別チームに招待してもメールが届かない) と症状が近い。BUG-001 は「既存ユーザー（別チーム所属）」が条件だが、本件は条件を問わず招待メール全般が飛んでいない可能性がある。両者が同一原因か切り分けが必要
- 確認ポイント:
  - Supabase の標準メール送信のレート制限・到達率（[saas-multitenant-prod-runbook.md](./saas-multitenant-prod-runbook.md) でカスタム SMTP 推奨と記載あり）
  - 招待メールの `redirectTo` に使う `NEXT_PUBLIC_SITE_URL` の設定
  - Supabase Dashboard → Auth → Logs で送信イベントが記録されているか

---

## 対応済み

（なし）
