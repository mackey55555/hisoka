# メール送信セットアップ手順

招待メール等の送信を **Resend** 経由で行うためのセットアップ手順書。
関連: [team-plan-bugs.md TODO-001](./team-plan-bugs.md#todo-001-招待メールの送信プロバイダ未決定)

## 採用構成（単一ドメイン運用）

> Resend の無料プランは **検証可能ドメインが 1 つ** のため、`hisoka.online` 1 ドメインで dev / prod を兼用する。
> DNS は1セット、From アドレスの local part と `MAIL_DEV_REDIRECT_TO` で環境を区別する。

| 項目 | 本番 | 開発 |
|---|---|---|
| 送信プロバイダ | Resend | Resend |
| 送信ドメイン | `hisoka.online` | `hisoka.online`（共通） |
| 送信元アドレス（From） | `Hisoka <noreply@hisoka.online>` | `Hisoka [DEV] <noreply-dev@hisoka.online>` |
| Subject プレフィックス | なし | `[DEV] ...` |
| API キー | `RESEND_API_KEY`（本番用） | `RESEND_API_KEY`（開発用・別キー） |
| 誤爆防止 | なし | **`MAIL_DEV_REDIRECT_TO` 必須**（送信先を強制リダイレクト） |

- ドメイン登録: ムームードメイン
- 送信用のメールボックスは作らない（**送信専用**）。返信は受け付けない設計
- DKIM/SPF/DMARC は「ドメイン」に対する署名・認証なので、local part が違っても **同じ DNS レコード1セット** でカバーされる
- レピュテーション分離は「dev は redirect でしか送らない」運用で担保する（実宛先に dev メールが届かないので、バウンスが発生しない）

---

## 全体の流れ

1. **Resend** に `hisoka.online` を1つだけ登録し、DNS レコードを表示させる
2. **ムームードメイン** の DNS 管理画面で、Resend から指示されたレコードと DMARC を追加
3. Resend でドメインが **Verified** になるまで待つ（通常 5〜30分）
4. **API キーを2本発行**（同じドメインに対する dev 用 / prod 用）
5. **`.env.local` と Vercel** に環境変数を設定
6. **動作確認**

---

## 1. Resend のセットアップ

### 1-1. サインアップ

1. [https://resend.com](https://resend.com) にアクセス
2. **「Sign up」→ GitHub 連携でログイン**（メール/パスワード登録でも可）
3. オンボーディング後、ダッシュボードに入る

### 1-2. ドメインを 1 つ追加

1. 左メニュー **「Domains」→ 右上「Add Domain」**
2. **Domain name** に `hisoka.online` を入力
3. **Region** を選択
   - 推奨: `us-east-1` または `ap-northeast-1`（東京）
   - 日本ユーザーが多いなら **`ap-northeast-1`** が遅延的に有利
4. **「Add」** を押すと、追加すべき DNS レコードが画面に表示される（後でムームーに貼る）

表示されるレコード（典型例。**実際の値は Resend ダッシュボードからコピペする**）:

| Type | Host / Name | Value | Priority |
|---|---|---|---|
| MX | `send` | `feedback-smtp.<region>.amazonses.com` | 10 |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` | - |
| TXT | `resend._domainkey` | `p=MIGfMA0GCS...（DKIM 公開鍵）` | - |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:naoyuki@dinovator.net` | - |

> **メモ**: ムームー DNS の管理画面では「サブドメイン欄」に `send` のように `.hisoka.online` を **省略した形** で入力する（親ドメインは自動補完）。Resend の表示が `send.hisoka.online` のように親まで含む場合は、末尾の `.hisoka.online` を取り除いて入力する。

### 1-3. API キーを 2 本発行（dev / prod）

無料プランでもキーは複数発行できる。同じドメインに対する2本でも、漏洩時に分離 revoke できるメリットがある。

1. 左メニュー **「API Keys」→ 右上「Create API Key」**

**本番用キー**

- **Name**: `production`
- **Permission**: `Sending access`
- **Domain**: `hisoka.online`（ドメイン制限）
- 「Add」→ 表示される `re_xxx...` をコピーして安全な場所に保存

**開発用キー**

- **Name**: `development`
- **Permission**: `Sending access`
- **Domain**: `hisoka.online`（**本番と同じドメイン**）
- 「Add」→ `re_xxx...` をコピー

> 同じドメインに対する2キーだが、`.env.local` と Vercel Production で **別のキーを使う** ことで運用上は分離できる。dev キーが漏洩した場合、それだけ revoke すれば本番送信は止まらない。

---

## 2. ムームードメインの DNS 設定

### 2-1. ムームー DNS の画面へ

1. [https://muumuu-domain.com/](https://muumuu-domain.com/) にログイン
2. 左メニュー **「ドメイン操作」→「ムームー DNS」**
3. `hisoka.online` の **「変更」** ボタンをクリック
4. 初回なら **「カスタム設定」のセットアップ情報を変更** を選択

### 2-2. レコードを追加

「設定2」セクションの入力欄に1行ずつ追加していく。**Resend ダッシュボードに表示されている値を正確にコピペ**すること（余計な空白・クオートが入らないよう注意）。

| サブドメイン | 種別 | 内容 | 優先度 |
|---|---|---|---|
| `send` | MX | `feedback-smtp.<region>.amazonses.com` | 10 |
| `send` | TXT | `v=spf1 include:amazonses.com ~all` | （空） |
| `resend._domainkey` | TXT | `p=MIGf...`（Resend が表示する値） | （空） |
| `_dmarc` | TXT | `v=DMARC1; p=none; rua=mailto:naoyuki@dinovator.net` | （空） |

DMARC の `rua=mailto:...` は **集計レポートの送り先**。受信できるアドレスを入れておくと届かなかった場合の解析に役立つ。**`p=none` から始める**こと（いきなり `p=quarantine` や `p=reject` にすると正常メールも落ちる可能性がある）。

> **dev 用のサブドメインレコード（`send.dev` 等）は不要**。Resend 無料枠の制約で `hisoka.online` 1ドメイン運用にしているため、DNS は本番分の1セットのみ。

### 2-3. 保存して反映を待つ

画面下の **「セットアップ情報変更」** で保存する。

- DNS の反映時間: **通常 5〜30分**（最大1時間程度）
- 確認方法: ターミナルで `dig TXT _dmarc.hisoka.online +short` などで値が返ってくれば反映済み

### 2-4. Resend で Verified を確認

1. Resend ダッシュボードの **Domains** で、各ドメインの隣に **「Verified」** バッジが出るのを待つ
2. しばらく経っても Verified にならない場合は、ダッシュボードの **「Verify DNS Records」** ボタンを押す
3. それでも失敗する場合は、各レコードの隣に出るエラーメッセージを確認（クオートが残っている / 値が古い 等）

---

## 3. 環境変数の設定

### 3-1. `.env.local`（開発）

```env
# メール送信（Resend）
RESEND_API_KEY=re_dev_xxxxxxxxxxxxxxxxxxxxx
MAIL_FROM=Hisoka [DEV] <noreply-dev@hisoka.online>

# 開発時の誤爆防止: 送信先を強制的にこのアドレスにリダイレクト
# (lib/mail.ts で実装。本番でない環境では必須)
MAIL_DEV_REDIRECT_TO=naoyuki@dinovator.net
```

### 3-2. Vercel **Production** 環境

Vercel Project Settings → Environment Variables → **Production** に追加:

| Key | Value | 備考 |
|---|---|---|
| `RESEND_API_KEY` | `re_prod_xxxxxx`（本番キー） | dev キーとは別 |
| `MAIL_FROM` | `Hisoka <noreply@hisoka.online>` | local part に `dev` を入れない |
| `MAIL_DEV_REDIRECT_TO` | （未設定/空） | 本番ではリダイレクトしない |

### 3-3. Vercel **Preview** 環境

Vercel の Preview 環境は dev と同じにしておくのが安全（誤爆防止）:

| Key | Value |
|---|---|
| `RESEND_API_KEY` | `re_dev_xxxxxx`（開発キー） |
| `MAIL_FROM` | `Hisoka [DEV] <noreply-dev@hisoka.online>` |
| `MAIL_DEV_REDIRECT_TO` | `naoyuki@dinovator.net` |

---

## 4. 動作確認

### 4-1. Resend ダッシュボードからテスト送信

1. Resend ダッシュボード **「Emails」→「Send Test Email」**
2. From: `noreply-dev@hisoka.online`（dev 用 local part でテスト）
3. To: 自分のアドレス
4. Subject / Body: 任意（`[DEV] test` など）
5. 送信 → 自分のメールボックスに届くか確認

### 4-2. ヘッダで認証を確認

届いたメールのソース/ヘッダを開き、**Authentication-Results** を見る:

```
Authentication-Results: mx.google.com;
       dkim=pass header.i=@hisoka.online
       spf=pass smtp.mailfrom=...
       dmarc=pass header.from=hisoka.online
```

`dkim=pass` / `spf=pass` / `dmarc=pass` の3つが揃っていれば OK。

### 4-3. アプリ側の動作確認（コード実装後）

`lib/mail.ts` 実装後、`npm run dev` で:

1. 管理画面からトレーニーを招待
2. ターミナルログに「送信成功」が出るか
3. **既存ユーザー宛**でも、Resend ダッシュボードの「Emails」に送信ログが残るか
4. `MAIL_DEV_REDIRECT_TO` を設定していれば、宛先がそこに書き換わって届くこと

---

## 5. トラブルシューティング

### Verified にならない

- **DNS 反映待ち**: `dig` で TXT が引けるか確認。引けないなら 30 分待って再 Verify
- **値にクオートが含まれる**: ムームー DNS は値を勝手にクオートで囲わない。`"v=spf1 ..."` のような **二重クオートが残っている** とエラー。引用符は取り除く
- **DKIM 値の改行**: DKIM 鍵が画面上で改行されているように見えても、ムームーには **1行で貼る**。改行コードを混ぜない

### メールが届かない / 迷惑メールに入る

- **DMARC を `p=none` から始める**こと。いきなり厳しくしない
- Gmail の場合、`spam` フォルダを最初に確認。1〜2通迷惑判定された後で「迷惑メールでない」を押すと学習する
- Resend ダッシュボード **「Emails」** で配信ステータスを確認（`delivered` / `bounced` / `complained`）

### dev で本物のユーザーに誤爆した

- `MAIL_DEV_REDIRECT_TO` が未設定だった可能性
- 該当アドレスを Resend ダッシュボードの **Suppression List** に追加して以後止める
- `lib/mail.ts` の実装で `MAIL_DEV_REDIRECT_TO` が空のとき本来の宛先に送る挙動になっているはず → **必ず設定しておく**

### API キーを間違えた / 漏洩した

- Resend ダッシュボード **「API Keys」** で該当キーを **Revoke**
- 新しいキーを再発行し、`.env.local` / Vercel の環境変数を差し替え

---

## 6. 次のステップ（実装側）

DNS 設定と環境変数が揃ったら、コード側の作業:

- [ ] `npm i resend`
- [ ] `lib/mail.ts` を作成（Resend SDK ラッパー + `MAIL_DEV_REDIRECT_TO` の適用）
- [ ] [lib/actions/invitations.ts](../lib/actions/invitations.ts) の `inviteTeamMember` 既存ユーザー分岐を、`lib/mail.ts` のカスタム送信に差し替え
- [ ] [lib/actions/super-admin.ts](../lib/actions/super-admin.ts) の `provisionTeam` / `inviteAdditionalAdmin` も同様に差し替え
- [ ] `emailSent` フラグの判定を実送信結果に修正
- [ ] [docs/team-plan-bugs.md](./team-plan-bugs.md) の BUG-001 / BUG-003 を 🟢 対応済みに移動

このコード変更は、ドメインの Verify が済んでから取り掛かれば OK。
