# Hisoka システム設計書

**バージョン**: 1.0  
**作成日**: 2025年1月21日  
**ステータス**: ドラフト

---

## 1. プロジェクト概要

### 1.1 プロダクトビジョン

**「小さいときに才能を見抜く」** — Hisokaは、トレーニーの目標設定・活動記録・振り返りを通じて、個人の成長過程を可視化し、潜在的な才能や強みを発見するためのプラットフォームです。

### 1.2 プロダクト名

**Hisoka**（ヒソカ）

### 1.3 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド | Next.js 14 (App Router) |
| ホスティング | Vercel |
| バックエンド/DB | Supabase (PostgreSQL, Auth, Storage) |
| スタイリング | Tailwind CSS |
| PWA | next-pwa |

### 1.4 対象ユーザー

| ロール | 説明 | 想定利用者 |
|--------|------|-----------|
| トレーニー | 目標設定・活動記録・振り返りを行う | 大学生以上の成長を目指す個人 |
| トレーナー | 担当トレーニーの進捗確認・振り返り支援 | 外部コーチ、社内人事部など |
| 管理者 | ユーザー登録・紐付け管理 | システム運営者 |

---

## 2. 機能要件

### 2.1 機能一覧

#### Phase 1（MVP）

| 機能 | トレーニー | トレーナー | 管理者 |
|------|:----------:|:----------:|:------:|
| ログイン/ログアウト | ✓ | ✓ | ✓ |
| 目標設定（CRUD） | ✓ | 閲覧のみ | - |
| 活動記録（CRUD） | ✓ | 閲覧のみ | - |
| 振り返り（CRUD） | ✓ | 閲覧のみ | - |
| 担当トレーニー一覧表示 | - | ✓ | - |
| ユーザー管理 | - | - | ✓ |
| トレーナー/トレーニー紐付け | - | - | ✓ |
| ダッシュボード（進捗可視化） | ✓ | ✓ | - |

#### Phase 2（将来拡張）

| 機能 | 説明 |
|------|------|
| 通知機能 | 活動記録追加時にトレーナーへメール通知 |
| AIレポート | 活動記録・振り返りからの才能分析レポート生成 |
| エクスポート | PDF/CSVでのデータ出力 |

### 2.2 機能詳細

#### 2.2.1 目標設定

**概要**: トレーニーが自身の目標を設定・管理する機能

| 項目 | 型 | 必須 | 説明 |
|------|-----|:----:|------|
| 目標内容 | ロングテキスト | ✓ | 達成したい目標の詳細 |
| 期限 | 日付 | ✓ | 目標達成の期限 |
| ステータス | 選択 | ✓ | 進行中 / 達成 / 中止 |
| 作成日 | 日時 | 自動 | システム自動設定 |

**ビジネスルール**:
- 1人のトレーニーは複数の目標を作成可能
- 目標の編集・削除は作成者本人のみ可能
- トレーナーは担当トレーニーの目標を閲覧可能

#### 2.2.2 活動記録

**概要**: 目標達成に向けた具体的な活動を記録する機能

| 項目 | 型 | 必須 | 説明 |
|------|-----|:----:|------|
| 活動内容 | ロングテキスト | ✓ | 実施した活動の詳細 |
| 記録日 | 日時 | 自動 | システム自動設定 |

**ビジネスルール**:
- 1つの目標に対して複数の活動記録を登録可能
- 活動記録の編集・削除は作成者本人のみ可能

#### 2.2.3 振り返り

**概要**: トレーナーとの対話を通じて活動を振り返る機能

| 項目 | 型 | 必須 | 説明 |
|------|-----|:----:|------|
| 振り返り内容 | ロングテキスト | ✓ | 振り返りの詳細 |
| 記録日 | 日時 | 自動 | システム自動設定 |

**ビジネスルール**:
- 1つの活動記録に対して複数の振り返りを登録可能
- 入力はトレーニーが行う（トレーナーとの対話内容を記録）
- 振り返りの編集・削除は作成者本人のみ可能

---

## 3. 画面設計

### 3.1 画面一覧

| 画面名 | パス | アクセス権限 | 説明 |
|--------|------|-------------|------|
| LP（トップ） | `/` | 全員 | ログイン不要のランディングページ |
| ログイン | `/login` | 全員 | トレーニー用ログイン画面 |
| トレーナーログイン | `/trainer/login` | 全員 | トレーナー専用ログイン（リンク非公開） |
| 管理者ログイン | `/admin/login` | 全員 | 管理者専用ログイン（リンク非公開） |
| ダッシュボード | `/dashboard` | トレーニー | 自身の目標・進捗一覧 |
| 目標詳細 | `/goals/[id]` | トレーニー | 目標の詳細・活動記録・振り返り |
| 目標作成 | `/goals/new` | トレーニー | 新規目標作成フォーム |
| トレーナーダッシュボード | `/trainer/dashboard` | トレーナー | 担当トレーニー一覧 |
| トレーニー詳細 | `/trainer/trainees/[id]` | トレーナー | 特定トレーニーの詳細表示 |
| 管理画面 | `/admin` | 管理者 | ユーザー管理・紐付け管理 |

### 3.2 画面遷移図

```
[LP(/)]
    │
    ├─→ [ログイン(/login)] ─→ [ダッシュボード(/dashboard)]
    │                              │
    │                              ├─→ [目標作成(/goals/new)]
    │                              │
    │                              └─→ [目標詳細(/goals/[id])]
    │                                      │
    │                                      ├─→ 活動記録追加（モーダル）
    │                                      │
    │                                      └─→ 振り返り追加（モーダル）
    │
    ├─→ [トレーナーログイン] ─→ [トレーナーダッシュボード]
    │                              │
    │                              └─→ [トレーニー詳細]
    │
    └─→ [管理者ログイン] ─→ [管理画面]
```

### 3.3 ワイヤーフレーム概要

#### LP（トップページ）
```
┌─────────────────────────────────────────────────────┐
│  [Logo] Hisoka                      [ログイン]      │
├─────────────────────────────────────────────────────┤
│                                                     │
│              あなたの才能を、見つけよう              │
│                                                     │
│         目標設定・活動記録・振り返りを通じて         │
│           成長の軌跡を可視化するアプリ              │
│                                                     │
│               [無料で始める]                        │
│                                                     │
├─────────────────────────────────────────────────────┤
│  特徴1        特徴2        特徴3                   │
│  目標管理     活動記録     振り返り                 │
├─────────────────────────────────────────────────────┤
│  © 2025 Hisoka                                      │
└─────────────────────────────────────────────────────┘
```

#### トレーニー ダッシュボード（モバイル）
```
┌─────────────────────┐
│ ≡  Hisoka    [👤]   │
├─────────────────────┤
│                     │
│ こんにちは、〇〇さん │
│                     │
│ ┌─────────────────┐ │
│ │ 進行中の目標: 3  │ │
│ │ 今月の活動: 12   │ │
│ └─────────────────┘ │
│                     │
│ 目標一覧            │
│ ┌─────────────────┐ │
│ │ 📎 目標タイトル  │ │
│ │ 期限: 2025/3/31 │ │
│ │ 活動: 5件       │ │
│ └─────────────────┘ │
│ ┌─────────────────┐ │
│ │ 📎 目標タイトル  │ │
│ │ 期限: 2025/6/30 │ │
│ │ 活動: 3件       │ │
│ └─────────────────┘ │
│                     │
│      [+ 新規目標]   │
│                     │
└─────────────────────┘
```

---

## 4. データベース設計

### 4.1 ER図

```
┌──────────────┐       ┌──────────────┐
│    users     │       │    roles     │
├──────────────┤       ├──────────────┤
│ id (PK)      │──┐    │ id (PK)      │
│ email        │  │    │ name         │
│ name         │  │    │ created_at   │
│ role_id (FK) │──┼───→│              │
│ created_at   │  │    └──────────────┘
│ updated_at   │  │
└──────────────┘  │
       │          │
       │          │    ┌───────────────────┐
       │          │    │ trainer_trainees  │
       │          │    ├───────────────────┤
       │          └───→│ trainer_id (FK)   │
       │               │ trainee_id (FK)   │
       │               │ created_at        │
       │               └───────────────────┘
       │
       ▼
┌──────────────┐
│    goals     │
├──────────────┤
│ id (PK)      │
│ user_id (FK) │
│ content      │
│ deadline     │
│ status       │
│ created_at   │
│ updated_at   │
└──────────────┘
       │
       ▼
┌──────────────┐
│  activities  │
├──────────────┤
│ id (PK)      │
│ goal_id (FK) │
│ content      │
│ created_at   │
│ updated_at   │
└──────────────┘
       │
       ▼
┌──────────────┐
│ reflections  │
├──────────────┤
│ id (PK)      │
│ activity_id  │
│ content      │
│ created_at   │
│ updated_at   │
└──────────────┘
```

### 4.2 テーブル定義

#### roles（ロール）

| カラム名 | 型 | 制約 | 説明 |
|----------|-----|------|------|
| id | uuid | PK, DEFAULT uuid_generate_v4() | 主キー |
| name | varchar(50) | NOT NULL, UNIQUE | ロール名（trainee, trainer, admin） |
| created_at | timestamptz | DEFAULT now() | 作成日時 |

#### users（ユーザー）

| カラム名 | 型 | 制約 | 説明 |
|----------|-----|------|------|
| id | uuid | PK, REFERENCES auth.users(id) | Supabase Auth連携 |
| email | varchar(255) | NOT NULL, UNIQUE | メールアドレス |
| name | varchar(100) | NOT NULL | 表示名 |
| role_id | uuid | FK → roles(id), NOT NULL | ロール |
| created_at | timestamptz | DEFAULT now() | 作成日時 |
| updated_at | timestamptz | DEFAULT now() | 更新日時 |

#### trainer_trainees（トレーナー・トレーニー紐付け）

| カラム名 | 型 | 制約 | 説明 |
|----------|-----|------|------|
| id | uuid | PK, DEFAULT uuid_generate_v4() | 主キー |
| trainer_id | uuid | FK → users(id), NOT NULL | トレーナーID |
| trainee_id | uuid | FK → users(id), NOT NULL, UNIQUE | トレーニーID |
| created_at | timestamptz | DEFAULT now() | 作成日時 |

**制約**: trainee_idにUNIQUE制約（1トレーニー＝1トレーナー）

#### goals（目標）

| カラム名 | 型 | 制約 | 説明 |
|----------|-----|------|------|
| id | uuid | PK, DEFAULT uuid_generate_v4() | 主キー |
| user_id | uuid | FK → users(id), NOT NULL | 作成者（トレーニー） |
| content | text | NOT NULL | 目標内容 |
| deadline | date | NOT NULL | 期限 |
| status | varchar(20) | DEFAULT 'in_progress' | ステータス |
| created_at | timestamptz | DEFAULT now() | 作成日時 |
| updated_at | timestamptz | DEFAULT now() | 更新日時 |

**status enum**: `in_progress`, `achieved`, `cancelled`

#### activities（活動記録）

| カラム名 | 型 | 制約 | 説明 |
|----------|-----|------|------|
| id | uuid | PK, DEFAULT uuid_generate_v4() | 主キー |
| goal_id | uuid | FK → goals(id), NOT NULL, ON DELETE CASCADE | 紐づく目標 |
| content | text | NOT NULL | 活動内容 |
| created_at | timestamptz | DEFAULT now() | 作成日時 |
| updated_at | timestamptz | DEFAULT now() | 更新日時 |

#### reflections（振り返り）

| カラム名 | 型 | 制約 | 説明 |
|----------|-----|------|------|
| id | uuid | PK, DEFAULT uuid_generate_v4() | 主キー |
| activity_id | uuid | FK → activities(id), NOT NULL, ON DELETE CASCADE | 紐づく活動記録 |
| content | text | NOT NULL | 振り返り内容 |
| created_at | timestamptz | DEFAULT now() | 作成日時 |
| updated_at | timestamptz | DEFAULT now() | 更新日時 |

### 4.3 RLS（Row Level Security）ポリシー

```sql
-- goals: トレーニーは自分のデータのみ、トレーナーは担当トレーニーのデータを閲覧可能
CREATE POLICY "trainee_own_goals" ON goals
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "trainer_view_goals" ON goals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trainer_trainees tt
      WHERE tt.trainer_id = auth.uid()
      AND tt.trainee_id = goals.user_id
    )
  );

-- activities: goals経由で同様のポリシー
-- reflections: activities経由で同様のポリシー
```

---

## 5. API設計

### 5.1 エンドポイント一覧

Next.js App RouterのServer Actionsおよび Supabase Client を使用。

#### 認証（Supabase Auth）

| 機能 | メソッド | 説明 |
|------|----------|------|
| signUp | supabase.auth.signUp() | 新規登録 |
| signIn | supabase.auth.signInWithPassword() | ログイン |
| signOut | supabase.auth.signOut() | ログアウト |

#### 目標（Server Actions）

| アクション | 説明 |
|------------|------|
| createGoal(content, deadline) | 目標作成 |
| updateGoal(id, content, deadline, status) | 目標更新 |
| deleteGoal(id) | 目標削除 |
| getGoals() | 自身の目標一覧取得 |
| getGoalById(id) | 目標詳細取得 |

#### 活動記録（Server Actions）

| アクション | 説明 |
|------------|------|
| createActivity(goalId, content) | 活動記録作成 |
| updateActivity(id, content) | 活動記録更新 |
| deleteActivity(id) | 活動記録削除 |
| getActivitiesByGoalId(goalId) | 目標に紐づく活動一覧 |

#### 振り返り（Server Actions）

| アクション | 説明 |
|------------|------|
| createReflection(activityId, content) | 振り返り作成 |
| updateReflection(id, content) | 振り返り更新 |
| deleteReflection(id) | 振り返り削除 |
| getReflectionsByActivityId(activityId) | 活動に紐づく振り返り一覧 |

---

## 6. デザインシステム

### 6.1 コンセプト

**「丁寧な暮らし」** をテーマにした、温かみのあるナチュラルなデザイン

- 落ち着いた色調で入力が苦にならない
- 余白を大切にした読みやすいレイアウト
- モバイルファーストで親指操作を意識

### 6.2 カラーパレット

| 名称 | カラーコード | 用途 |
|------|-------------|------|
| Primary | `#5D7A6E` | メインカラー（落ち着いたグリーン） |
| Primary Light | `#8B9D83` | セカンダリ（セージグリーン） |
| Accent | `#C9B8A5` | アクセント（ベージュ） |
| Background | `#F5F2ED` | 背景色（オフホワイト） |
| Surface | `#FFFFFF` | カード背景 |
| Text Primary | `#3D3D3D` | 本文テキスト |
| Text Secondary | `#6B6B6B` | 補助テキスト |
| Border | `#D4CFC7` | ボーダー |
| Success | `#7BA383` | 成功・達成 |
| Warning | `#D4A574` | 警告・期限間近 |
| Error | `#C47C7C` | エラー |

### 6.3 タイポグラフィ

| 要素 | フォント | サイズ | ウェイト |
|------|----------|--------|----------|
| 見出し1 | Noto Sans JP | 24px | Bold |
| 見出し2 | Noto Sans JP | 20px | Bold |
| 見出し3 | Noto Sans JP | 16px | Medium |
| 本文 | Noto Sans JP | 14px | Regular |
| 補助テキスト | Noto Sans JP | 12px | Regular |

### 6.4 コンポーネント

#### ボタン

```
┌─────────────────┐
│    Primary      │  背景: #5D7A6E / 文字: #FFFFFF
└─────────────────┘

┌─────────────────┐
│   Secondary     │  背景: transparent / 枠: #5D7A6E / 文字: #5D7A6E
└─────────────────┘

┌─────────────────┐
│     Ghost       │  背景: transparent / 文字: #5D7A6E
└─────────────────┘
```

#### カード

```
┌─────────────────────────────────────┐
│                                     │
│  タイトル                           │
│  ─────────────────────────────────  │
│  コンテンツ                         │
│                                     │
│  補助テキスト              アクション│
└─────────────────────────────────────┘

背景: #FFFFFF
ボーダー: 1px solid #D4CFC7
角丸: 12px
シャドウ: 0 2px 8px rgba(0,0,0,0.04)
```

#### テキストエリア（ロングテキスト入力）

```
┌─────────────────────────────────────┐
│ ラベル                              │
│ ┌─────────────────────────────────┐ │
│ │                                 │ │
│ │  プレースホルダー...             │ │
│ │                                 │ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
│ ヘルパーテキスト                    │
└─────────────────────────────────────┘

背景: #F5F2ED
ボーダー: 1px solid #D4CFC7
フォーカス時ボーダー: #5D7A6E
角丸: 8px
パディング: 16px
```

### 6.5 レスポンシブ設計

| ブレークポイント | 幅 | 対応 |
|-----------------|-----|------|
| Mobile | < 640px | 1カラム、タッチ最適化 |
| Tablet | 640px - 1024px | 2カラム |
| Desktop | > 1024px | サイドバー + メインコンテンツ |

---

## 7. ディレクトリ構成

```
hisoka/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── trainer/
│   │   │   └── login/
│   │   │       └── page.tsx
│   │   └── admin/
│   │       └── login/
│   │           └── page.tsx
│   ├── (main)/
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── goals/
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx
│   │   │   └── new/
│   │   │       └── page.tsx
│   │   └── layout.tsx
│   ├── (trainer)/
│   │   ├── trainer/
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   └── trainees/
│   │   │       └── [id]/
│   │   │           └── page.tsx
│   │   └── layout.tsx
│   ├── (admin)/
│   │   ├── admin/
│   │   │   ├── page.tsx
│   │   │   ├── users/
│   │   │   │   └── page.tsx
│   │   │   └── assignments/
│   │   │       └── page.tsx
│   │   └── layout.tsx
│   ├── layout.tsx
│   ├── page.tsx              # LP
│   └── globals.css
├── components/
│   ├── ui/                   # 基本UIコンポーネント
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── textarea.tsx
│   │   └── modal.tsx
│   ├── features/             # 機能別コンポーネント
│   │   ├── goals/
│   │   ├── activities/
│   │   └── reflections/
│   └── layout/               # レイアウトコンポーネント
│       ├── header.tsx
│       ├── sidebar.tsx
│       └── footer.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   ├── actions/              # Server Actions
│   │   ├── goals.ts
│   │   ├── activities.ts
│   │   └── reflections.ts
│   └── utils/
│       └── helpers.ts
├── types/
│   └── index.ts              # 型定義
├── public/
│   ├── manifest.json         # PWA manifest
│   └── icons/
├── middleware.ts             # 認証ミドルウェア
├── next.config.js
├── tailwind.config.js
└── package.json
```

---

## 8. PWA対応

### 8.1 manifest.json

```json
{
  "name": "Hisoka",
  "short_name": "Hisoka",
  "description": "才能発見プラットフォーム",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#F5F2ED",
  "theme_color": "#5D7A6E",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### 8.2 next-pwa設定

```javascript
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development'
});

module.exports = withPWA({
  // Next.js config
});
```

---

## 9. セキュリティ要件

### 9.1 認証・認可

| 項目 | 実装 |
|------|------|
| 認証方式 | Supabase Auth（Email/Password） |
| セッション管理 | Supabase Session（JWT） |
| パスワードポリシー | 8文字以上、英数字混在 |
| ロールベースアクセス制御 | RLS + middleware |

### 9.2 データ保護

| 項目 | 実装 |
|------|------|
| 通信暗号化 | HTTPS（Vercel標準） |
| データベース暗号化 | Supabase標準（保存時暗号化） |
| 入力値検証 | Zod によるバリデーション |
| XSS対策 | React標準エスケープ |
| CSRF対策 | Supabase Auth標準 |

---

## 10. 非機能要件

### 10.1 パフォーマンス

| 項目 | 目標値 |
|------|--------|
| 初期表示（LCP） | < 2.5秒 |
| インタラクション（FID） | < 100ms |
| レイアウトシフト（CLS） | < 0.1 |

### 10.2 可用性

| 項目 | 目標値 |
|------|--------|
| 稼働率 | 99.5%以上（Vercel/Supabase SLA準拠） |

### 10.3 対応ブラウザ

| ブラウザ | バージョン |
|----------|-----------|
| Chrome | 最新2バージョン |
| Safari | 最新2バージョン |
| Firefox | 最新2バージョン |
| Edge | 最新2バージョン |

---

## 11. 開発ロードマップ

### Phase 1: MVP（4週間）

| 週 | タスク |
|-----|--------|
| Week 1 | プロジェクトセットアップ、DB設計、認証実装 |
| Week 2 | トレーニー機能（目標・活動記録・振り返り） |
| Week 3 | トレーナー機能、管理者機能 |
| Week 4 | UI/UX調整、PWA対応、テスト |

### Phase 2: 拡張（2週間）

| 週 | タスク |
|-----|--------|
| Week 5 | ダッシュボード（グラフ・可視化） |
| Week 6 | 通知機能、パフォーマンス最適化 |

### Phase 3: AI機能（将来）

- 活動記録・振り返りの分析
- 才能・強みのレポート自動生成
- 成長パターンの可視化

---

## 12. Supabase SQLスキーマ

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Roles table
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default roles
INSERT INTO roles (name) VALUES ('trainee'), ('trainer'), ('admin');

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  role_id UUID NOT NULL REFERENCES roles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trainer-Trainee assignments
CREATE TABLE trainer_trainees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trainer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trainee_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Goals table
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  deadline DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'achieved', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activities table
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reflections table
CREATE TABLE reflections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_goals_user_id ON goals(user_id);
CREATE INDEX idx_activities_goal_id ON activities(goal_id);
CREATE INDEX idx_reflections_activity_id ON reflections(activity_id);
CREATE INDEX idx_trainer_trainees_trainer_id ON trainer_trainees(trainer_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reflections_updated_at BEFORE UPDATE ON reflections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_trainees ENABLE ROW LEVEL SECURITY;

-- RLS Policies for goals
CREATE POLICY "Users can view own goals" ON goals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Trainers can view assigned trainee goals" ON goals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trainer_trainees
      WHERE trainer_id = auth.uid() AND trainee_id = goals.user_id
    )
  );

CREATE POLICY "Users can insert own goals" ON goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals" ON goals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals" ON goals
  FOR DELETE USING (auth.uid() = user_id);

-- Similar policies for activities and reflections...
```

---

## 付録A: 用語集

| 用語 | 説明 |
|------|------|
| トレーニー | コーチングを受ける側のユーザー |
| トレーナー | コーチングを行う側のユーザー |
| 目標 | トレーニーが設定する達成したいゴール |
| 活動記録 | 目標達成に向けて行った具体的な活動の記録 |
| 振り返り | トレーナーとの対話を通じた活動の内省記録 |

---

## 付録B: 参考リンク

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [next-pwa](https://github.com/shadowwalker/next-pwa)
