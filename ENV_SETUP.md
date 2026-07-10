# 環境変数の設定方法

## 1. `.env.local`ファイルの作成

プロジェクトのルートディレクトリ（`package.json`がある場所）に`.env.local`ファイルを作成してください。

## 2. 必要な環境変数

### 基本設定（必須）

以下の2つの環境変数を設定する必要があります：

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_publishable_key
```

### Seed実行時（任意）

Seederスクリプトを実行する場合は、以下の環境変数も追加してください：

```env
SUPABASE_SECRET_KEY=your_supabase_secret_key
```

**重要**: Secret keyは特権アクセス権限があるため、絶対にGitにコミットしないでください。

### AIモデル（任意）

```env
# provider:model-id 形式。未設定なら google:gemini-2.5-flash-lite。
# Claude Sonnet 4.6 へ切り替える場合:
AI_MODEL=anthropic:claude-sonnet-4-6
ANTHROPIC_API_KEY=sk-ant-xxxxxxxx
```

### Stripe 課金（本番で必須 / ローカルは任意）

チームごとのサブスク課金（Starter ¥30,000 / Pro ¥50,000）に必要です。

```env
STRIPE_SECRET_KEY=sk_test_xxxxxxxx          # 開発者 → APIキー。本番は制限付きキー(rk_)推奨
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxx        # Webhook エンドポイント作成時に発行される署名シークレット
STRIPE_PRICE_STARTER=price_xxxxxxxx         # Starter(月額¥30,000)の Price ID
STRIPE_PRICE_PRO=price_xxxxxxxx             # Pro(月額¥50,000)の Price ID
NEXT_PUBLIC_SITE_URL=https://your-domain    # Checkout/Portal の戻り先。未設定ならlocalhost:3000
```

**セットアップ手順（Stripe 側）**:
1. Stripe ダッシュボードで Product を2つ作成し、それぞれ月額 Price（JPY, recurring/月）を作る → Price ID を上記に設定。
2. **開発者 → Webhook** で エンドポイント `https://<ドメイン>/api/webhooks/stripe` を追加。購読イベント:
   `checkout.session.completed` / `customer.subscription.created` / `customer.subscription.updated` / `customer.subscription.deleted`。
   → 発行された署名シークレットを `STRIPE_WEBHOOK_SECRET` に設定。
3. **Customer Portal** を有効化（設定 → Billing → Customer portal）。プラン変更・解約に使用。
4. ローカルで Webhook を試すには `stripe listen --forward-to localhost:3000/api/webhooks/stripe`（Stripe CLI）。

**重要**: `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` は秘密情報。Gitにコミットしないこと。

## 3. Supabaseの認証情報を取得する方法

### ステップ1: Supabaseプロジェクトを作成

1. [Supabase](https://supabase.com/)にアクセス
2. アカウントを作成（またはログイン）
3. 「New Project」をクリック
4. プロジェクト名、データベースパスワード、リージョンを設定
5. プロジェクトを作成（数分かかります）

### ステップ2: API認証情報を取得

1. Supabaseダッシュボードでプロジェクトを開く
2. 左サイドバーの「Settings」（歯車アイコン）をクリック
3. 「API」を選択
4. **「Publishable and secret API keys」タブ**を選択（新しい形式）
5. 以下の情報をコピー：
   - **Project URL**: `NEXT_PUBLIC_SUPABASE_URL`に設定
   - **Publishable key**（`sb_publishable_...`で始まる）: `NEXT_PUBLIC_SUPABASE_ANON_KEY`に設定
   - **Secret key**（`sb_secret_...`で始まる、seed実行時のみ必要）: `SUPABASE_SECRET_KEY`に設定

### ステップ3: `.env.local`ファイルに記入

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SUPABASE_SECRET_KEY=sb_secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**注意**:
- Publishable keyは`sb_publishable_...`で始まります
- Secret keyは`sb_secret_...`で始まります（seed実行時のみ必要）
- レガシーの`service_role`キー（`eyJhbG...`で始まる）も互換性のため使用可能ですが、新しいSecret key形式を推奨します

**重要**: 
- `NEXT_PUBLIC_`で始まる環境変数は、ブラウザ側でも使用されます
- `.env.local`ファイルは`.gitignore`に含まれているため、Gitにはコミットされません
- 実際の値は上記の例ではなく、Supabaseダッシュボードから取得した実際の値を使用してください

## 4. 環境変数の確認

設定後、開発サーバーを再起動してください：

```bash
npm run dev
```

環境変数が正しく読み込まれているか確認するには、ブラウザのコンソールで以下を実行：

```javascript
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)
```

（ただし、Next.jsでは`process.env`はサーバーサイドでのみ利用可能です）

## トラブルシューティング

### 環境変数が読み込まれない場合

1. `.env.local`ファイルがプロジェクトのルートディレクトリにあるか確認
2. ファイル名が正確に`.env.local`であるか確認（`.env.local.txt`などではない）
3. 開発サーバーを再起動
4. `NEXT_PUBLIC_`プレフィックスが正しく付いているか確認

### Supabase接続エラーが発生する場合

1. Supabaseプロジェクトが正しく作成されているか確認
2. URLとキーが正しくコピーされているか確認（余分なスペースや改行がないか）
3. Supabaseプロジェクトのステータスが「Active」であるか確認

