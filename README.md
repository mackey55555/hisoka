# Hisoka - 才能発見プラットフォーム

目標設定・活動記録・振り返りを通じて、成長の軌跡を可視化するアプリケーションです。

## 技術スタック

- **フロントエンド**: Next.js 14 (App Router)
- **バックエンド/DB**: Supabase (PostgreSQL, Auth, Storage)
- **スタイリング**: Tailwind CSS
- **PWA**: next-pwa
- **ホスティング**: Vercel

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local` ファイルを作成し、以下の環境変数を設定してください：

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SECRET_KEY=your_supabase_secret_key  # (任意) seed実行時に必要
```

**SupabaseのAPIキー取得方法**:
- **Publishable key**: Settings → API → Publishable key（`sb_publishable_...`）→ `NEXT_PUBLIC_SUPABASE_ANON_KEY`に設定
- **Secret key**: Settings → API → Secret keys（`sb_secret_...`）→ `SUPABASE_SECRET_KEY`に設定（seed実行時のみ必要）

### 3. Supabaseデータベースのセットアップ

SupabaseのSQL Editorで、`hisoka-design-doc.md`の「12. Supabase SQLスキーマ」セクションに記載されているSQLを実行してください。

### 4. 開発サーバーの起動

```bash
npm run dev
```

## Seed（任意: 管理者/トレーナー/トレーニーを一括作成）

Supabaseの **Secret key** を使って、Authユーザーと `public.users`、紐付け（`trainer_trainees`）を作成します。

**注意**: Secret keyは特権アクセス権限があるため、`.env.local`に設定する際は絶対にGitにコミットしないでください。

```bash
npm run seed
```

必要に応じて以下の環境変数で上書きできます：

```env
SEED_ADMIN_EMAIL=
SEED_ADMIN_PASSWORD=
SEED_TRAINER_EMAIL=
SEED_TRAINER_PASSWORD=
SEED_TRAINEE_EMAIL=
SEED_TRAINEE_PASSWORD=
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

## プロジェクト構造

```
hisoka/
├── app/                    # Next.js App Router
│   ├── (auth)/            # 認証関連ページ
│   ├── (main)/            # トレーニー用ページ
│   ├── (trainer)/         # トレーナー用ページ
│   ├── (admin)/            # 管理者用ページ
│   └── layout.tsx         # ルートレイアウト
├── components/            # Reactコンポーネント
│   ├── ui/                # 基本UIコンポーネント
│   ├── features/          # 機能別コンポーネント
│   └── layout/            # レイアウトコンポーネント
├── lib/                   # ユーティリティ
│   ├── supabase/          # Supabase設定
│   ├── actions/           # Server Actions
│   └── utils/             # ヘルパー関数
├── types/                 # TypeScript型定義
└── public/                # 静的ファイル
```

## 機能

### トレーニー
- 目標設定・編集・削除
- 活動記録の追加
- 振り返りの記録
- ダッシュボードでの進捗確認

### トレーナー
- 担当トレーニー一覧表示
- トレーニーの進捗確認
- 目標・活動記録・振り返りの閲覧

### 管理者
- ユーザー管理
- トレーナー・トレーニー紐付け管理

## デプロイ

Vercelにデプロイする場合：

1. GitHubリポジトリにプッシュ
2. Vercelでプロジェクトをインポート
3. 環境変数を設定
4. デプロイ

## ライセンス

MIT

