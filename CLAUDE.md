# ツイートバズシミュレーター 引き継ぎメモ

このファイルは、クラウド版Claudeで進めてきた開発の経緯を、PCのClaude Codeに引き継ぐためのものです。

## ユーザーについて
- プログラミング初心者（HTML/JSはほぼ未経験）。ターミナル操作は避けたいので、コマンドはClaudeが実行する。
- ユーザーのチャットには必ず日本語で返答し、必要な場面以外では英語やその他外国語で返答しない。
- 返事は日本語で、結論から短く。専門用語には一言説明を添える。
- 「いかがでしたか？」「参考になれば幸いです」は使わない。

## アプリの概要
- ツイート文を入力すると、バズり具合を採点して「家庭内〜地球」（＋シークレット段階）のどこまで届くかを演出つきで表示する。
- BGMと効果音つき（Web Audio でその場で合成。音声ファイルなし）。
- 本番URL: https://buzz-sim.kira-buzz.workers.dev
- 構成: Cloudflare Workers ＋ D1 ＋ Static Assets（AIは使っていない）

## ファイル構成
- `src/index.js`：サーバー。採点（ルールベース）、API、D1への保存
- `src/data.js`：14段階の定義、テーマ判定の正規表現。講評・リプライは src/lines/ から読み込む
- `src/lines/`：講評とリプライの文章
  - 段階ごと（home village town pref nation asia earth solar galaxy cluster universe fourd kami glitch）：`{ comments: [100個], replies: [[名前, ID, 本文] 100個] }`
  - tone ごと（tone-roast / tone-cold / tone-warm / tone-good / tone-praise）：`{ comments: { パターン: [...] }, replies: { パターン: [[...], ...] } }`。パターン別リプライは1つをランダムに選ぶ
- `src/page.js`：画面全体（HTML/CSS/JS）を `String.raw` のテンプレート文字列で返す。BGM・効果音（`Sound`）もここ
- `public/ogp.png`：OGP画像（1200×630）。`npm run ogp`（= `tools/make-ogp.mjs`）で作り直す。パソコンの Chrome（なければ Edge）で撮影するので、ネット接続が必要。作り直したら page.js の `ogp.png?v=数字` を1つ上げる（Xなどの古いキャッシュを避けるため）
- `public/gods/*.png`：バズ神のアニメPNG（idle think roast cold warm good praise kami alien）。`npm run gods`（= `tools/make-gods.mjs`）で作り直す。手で編集しない
- `test/index.spec.js`：テスト（`npx vitest run`）
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
- 段階（minScore）：家庭内0 / 村14 / 町27（毒舌「は？」）→ 県40（塩対応「あー……」）→ 全国50（なかなか「ほう……」）→ アジア60（ほめ「おお！」）→ 地球70（大絶賛「ちょっと待って」）
  - 褒めは段階的に強くなる。全国はしぶしぶ認める、アジアは素直に褒める（！は1つまで）、宇宙規模の大げさな絶賛は地球から
  シークレット：太陽系77 / 銀河83 / 銀河団88 / 宇宙92 / 四次元96 / 神98 / ∬∃@▽◇◎＄￡※⊆〒^^ 99（番号は0始まりで 神=12、∬…=13）
- 宇宙・四次元・神・∬… は「シークレットの中のシークレット」（`hidden: true`）。実際に届くまで名前も絵文字も出さず、バズマップでは「▲ この先は霧で見えない ▲」の上に☁️の霧の行として置く（数だけ匂わせる。`/api/levels` には出さない）
- バズマップの右上は「踏破 ○ / 14」。記録パネルのシークレットは「○ / 7」。銀河団に初めて届くと「霧の向こうに、まだ何かある気配がする……」と出る
- 上昇演出のネタバレ防止：シークレットは「前に届いたことがある段（`buzz_unlocked`）」と「今回の到達段」だけ見せる。届いていない段は飛ばす（page.js の `climbPlan`）。家庭内〜地球はいつも全部見せる
- シークレットの緩急：通過するカットインはだんだん速く（1.25秒→0.7秒）、最後の1段の前に「溜め」（暗転＋心臓の音＋！？、光の色で次の色を予告）、最後はスローで大きく（衝撃波つき）
- バズ力の表示：D1 には素の点数を保存し、画面で段階ごとに変換する（page.js の `LIMIT` と `scoreText`）。地球100（各25 MAX）/ 太陽系120 / 銀河150 / 銀河団200 / 宇宙500（LIMIT BREAK）/ 四次元は数字がチラつく / 神∞ / ∬… は記号。ランキング・履歴・シェア・前回の結果も同じ変換を使う
- 太陽系から上は1段ごとにパチンコ風カットイン（青→緑→赤→金→虹→神→グリッチ）。∬… ではバズ神が宇宙人に変身する
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
- ブラウザ保存：localStorage `buzz_unlocked` `buzz_best` `buzz_stats` `buzz_ver`（保存データの版。神の追加で ∬… の番号を12→13に引っ越したので2）`buzz_mute` `buzz_vol`（音量0〜100）、sessionStorage `buzz_admin`
  - 段階を途中に足すと保存済みの番号がずれる。そのときは `buzz_ver` を上げて引っ越し処理を足す
- ∬… の記号（∬∃@▽◇◎＄￡※⊆〒^）はマイクラの §k のように文字化けし続ける。システムの文字は `obf(要素, 文字)` で入れる（中で textContent を使う）。ユーザーの入力文には使わない
- 音はブラウザの決まりで、最初のクリックかキー入力から鳴る。右下の🔊で消せて、横のスライダーで音量を変えられる（最初は32＝以前の約10%。2乗で効かせている）。タブを隠すと止まる
- 段階を足すときは page.js の `LV` `CLIMB_BG` `LIKERS` `SCENES` も同じ順番で足す

## デプロイ
- `npx wrangler deploy`（wranglerはこのPCでログイン済み。サブドメインは kira-buzz）
- 合言葉の変更：`npx wrangler secret put ADMIN_KEY`
- 変更したら、デプロイ前に `npx wrangler dev` で動作確認すると安全。
- 本物の合言葉を使わずにテストモードを試すとき：`npx wrangler dev --var ADMIN_KEY:local-test` で起動して、合言葉に local-test を入れる
- アプリ内ブラウザのパネルが隠れているとアニメーションが間引かれる（バグではない）。見た目の確認はアニメを止めてから撮る

## これまでの流れ（2026-10-29）
①Hello World公開 → ②画面＋判定 → ③D1で履歴/ランキング → ④Xシェア＋OGP → ⑤UI刷新 → ⑥AI審査（のちに廃止）→ ⑦13段階・全画面演出・バズ神キャラ → ⑧トレンド/通知廃止・ランキングボタン強化・テストモード・OGP画像。
GitHubに buzz-sim リポジトリを作成済み。

## 2026-10-30
⑩ 講評を1文字ずつ打ち込む演出・全国（ほう……）とアジア（おお！）の褒め段階を追加・シークレットのカットインに緩急・まだ届いていないシークレットを上昇演出で見せない・バズマップの霧と踏破数・音量スライダー（初期音量を約10%に）。
⑨ 神の段階を追加（四次元と∬…の間）・地球から上のパラメーター限界突破表示・宇宙から上をバズマップで隠す・シークレットのパチンコ風カットイン・∬…で宇宙人に変身・BGMと効果音・バズ神をアニメPNG化・記号の文字化け・講評とリプライを各段階100個ずつ（src/lines/）。
