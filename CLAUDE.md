# ツイートバズシミュレーター 引き継ぎメモ

このファイルは、クラウド版Claudeで進めてきた開発の経緯を、PCのClaude Codeに引き継ぐためのものです。

## ユーザーについて
- プログラミング初心者（HTML/JSはほぼ未経験）。ターミナル操作は避けたいので、コマンドはClaudeが実行する。
- 返事は日本語で、結論から短く。専門用語には一言説明を添える。
- 「いかがでしたか？」「参考になれば幸いです」は使わない。

## アプリの概要
- ツイート文を入力すると、バズり具合を採点して「家庭内〜地球」（＋シークレット段階）のどこまで届くかを演出つきで表示する。
- 本番URL: https://buzz-sim.kira-buzz.workers.dev
- 構成: Cloudflare Workers ＋ D1 ＋ Static Assets（AIは使っていない）

## ファイル構成
- `src/index.js`：サーバー。採点（ルールベース）、API、D1への保存
- `src/data.js`：13段階の定義、テーマ判定の正規表現、講評・リプライ集
- `src/page.js`：画面全体（HTML/CSS/JS）を `String.raw` のテンプレート文字列で返す
- `public/ogp.png`：OGP画像（1200×630）
- `wrangler.jsonc`：設定（下記）
- `.dev.vars`：ローカル用の合言葉（`ADMIN_KEY=...`）。gitに入れない

### wrangler.jsonc の要点
- name: `buzz-sim`、main: `src/index.js`
- `"assets": { "directory": "./public" }`
- D1: binding `DB`、database_name `buzz-db`、database_id `df14d879-ed90-45c9-b040-5de91669715a`

## D1 のテーブル
```sql
CREATE TABLE buzzes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL, level TEXT NOT NULL, emoji TEXT NOT NULL,
  score INTEGER NOT NULL, likes INTEGER NOT NULL, retweets INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  comment TEXT  -- 後から ALTER TABLE で追加
);
CREATE INDEX idx_buzzes_likes ON buzzes (likes DESC);
```
本番DBを触るときは `--remote`、ローカルは `--local`。

## 採点と段階
- 共感・意外性・面白さ・拡散力の4軸×25点＝100点。文章のハッシュで決まる個性＋少しのランダム。
- オチ・会話文（「」）・裏切り・あるあるテーマがそろうとコンボ加点。毒・連打・絵文字だけは減点。
- 段階（minScore）：家庭内0 / 村14 / 町27（毒舌）→ 県40 / 全国50 / アジア60（塩対応）→ 地球70（絶賛）
  シークレット：太陽系77 / 銀河83 / 銀河団88 / 宇宙92 / 四次元96 / ∬∃@▽◇◎＄￡※⊆〒^^ 99
- 講評は「バズ神」（一人称ワシ、語尾〜じゃ）。段階ごとのベース講評＋テーマ別の一言を組み合わせる。

## API
- `POST /api/buzz`：採点してD1に保存
- `GET /api/history` `/api/ranking` `/api/stats` `/api/levels`
- `POST /api/admin/check` `/api/admin/test`：テストモード用。`ADMIN_KEY` シークレットと一致しないと403。テスト結果はD1に保存しない
- テストモードは本番URLの末尾に `?admin` を付けて合言葉を入れると使える（本人専用）

## 画面の決まりごと
- page.js は `String.raw` のテンプレートなので、中のJSでバッククォートと `${` は使わない（文字列連結で書く）。
- ユーザーの入力文は必ず `textContent` で入れる（XSS対策）。
- Windowsでは国旗絵文字が表示されないので使わない。
- スマホ表示も確認する（トーストはスマホ2件・PC4件まで）。
- 偽の「トレンド」「通知」パネルは誤解を招くので廃止済み。復活させない。
- ブラウザ保存：localStorage `buzz_unlocked` `buzz_best` `buzz_stats`、sessionStorage `buzz_admin`

## デプロイ
- `npx wrangler deploy`（wranglerはこのPCでログイン済み。サブドメインは kira-buzz）
- 合言葉の変更：`npx wrangler secret put ADMIN_KEY`
- 変更したら、デプロイ前に `npx wrangler dev` で動作確認すると安全。

## これまでの流れ（2026-10-29）
①Hello World公開 → ②画面＋判定 → ③D1で履歴/ランキング → ④Xシェア＋OGP → ⑤UI刷新 → ⑥AI審査（のちに廃止）→ ⑦13段階・全画面演出・バズ神キャラ → ⑧トレンド/通知廃止・ランキングボタン強化・テストモード・OGP画像。
GitHubに buzz-sim リポジトリを作成済み（まだpushしていない）。
