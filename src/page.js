// 画面（HTML / CSS / ブラウザ側のJavaScript）
// String.raw を使っているので、中の \ はそのままブラウザに届く
export const HTML = String.raw`<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>ツイートバズシミュレーター</title>
<meta name="description" content="バズ神があなたのツイートを採点。家庭内から地球まで、全14段階。霧の向こうには、まだ何かある……">
<meta property="og:type" content="website">
<meta property="og:title" content="🚀 ツイートバズシミュレーター">
<meta property="og:description" content="バズ神があなたのツイートを採点。家庭内から地球まで、全14段階。霧の向こうには、まだ何かある……">
<meta property="og:url" content="https://buzz-sim.kira-buzz.workers.dev/">
<meta property="og:site_name" content="ツイートバズシミュレーター">
<meta property="og:image" content="https://buzz-sim.kira-buzz.workers.dev/ogp.png?v=2">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://buzz-sim.kira-buzz.workers.dev/ogp.png?v=2">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@500;800&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #07080d; --panel: #12141c; --panel2: #181b25; --line: #262a36; --text: #eef1f6; --sub: #8a93a6;
    --blue: #1d9bf0; --pink: #f91880; --gold: #facc15;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; }
  body {
    min-height: 100vh; min-height: 100dvh; color: var(--text); background: var(--bg);
    font-family: "M PLUS Rounded 1c", system-ui, sans-serif;
    background-image: radial-gradient(circle at 15% 0%, #1b2440 0, transparent 45%),
                      radial-gradient(circle at 90% 40%, #2a1533 0, transparent 40%);
    background-attachment: fixed;
  }
  button { font: inherit; color: inherit; }

  /* ── レイアウト（スマホを先に書き、640px と 1024px の2段で広げる）──
     スマホ（〜639px）：1列。バズマップは上の絵文字の列で代わりにし、右のパネル（ランキング・記録）は入力欄の下に出す
     640px〜：入力欄を上に、その下にバズマップと右のパネルを2列で並べる
     1024px〜：左にバズマップ、真ん中に入力欄、右にパネルの3列 */
  .layout { display: grid; grid-template-columns: minmax(0, 1fr); gap: 20px; max-width: 1240px; margin: 0 auto;
    padding: 16px 16px calc(88px + env(safe-area-inset-bottom)); }
  .side { display: none; }
  .side:last-child { display: block; }
  @media (min-width: 640px) {
    .layout { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 24px; max-width: 900px; padding: 24px 24px 80px; }
    main { grid-column: 1 / -1; grid-row: 1; width: 100%; max-width: 680px; justify-self: center; }
    .side { display: block; }
    .mapstrip { display: none !important; }
  }
  @media (min-width: 1024px) {
    .layout { grid-template-columns: clamp(230px, 24vw, 280px) minmax(0, 600px) clamp(230px, 24vw, 280px); gap: 16px; justify-content: center; max-width: 1240px; padding: 24px 16px 80px; }
    main { grid-column: auto; grid-row: auto; max-width: none; }
    .layout .hero h1 { font-size: clamp(26px, 3.3vw, 38px); }   /* 真ん中の列の幅に収まる大きさ（下の .hero h1 より強くするため .layout を付けている）*/
    .side { position: sticky; top: 24px; align-self: start; max-height: calc(100dvh - 48px); overflow-y: auto; scrollbar-width: thin; scrollbar-color: #3b4252 transparent; }
    .side:last-child { padding-bottom: 56px; }   /* 右下の音量ボタンに隠れないように */
  }
  .panel { background: rgba(18,20,28,.85); border: 1px solid var(--line); border-radius: 18px; padding: 16px; backdrop-filter: blur(6px); }
  .panel h3 { margin: 0 0 12px; font-size: 15px; display: flex; flex-wrap: wrap; gap: 6px; justify-content: space-between; align-items: center; }
  .panel h3 small { color: var(--sub); font-weight: 500; font-size: 12px; }

  /* 左：バズマップ */
  .map { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column-reverse; gap: 4px; }
  .map li { display: flex; align-items: center; gap: 10px; padding: 6px 10px; border-radius: 10px; font-size: 14px; color: var(--sub);
    transition: background .3s, color .3s, transform .3s; }
  .map li .me { width: 24px; text-align: center; font-size: 18px; }
  .map li.secret { color: #6b5f8a; }
  .map li.secret.locked .e { filter: grayscale(1) brightness(.6); }
  .map li.reached { color: var(--text); background: rgba(255,255,255,.04); }
  .map li.best { background: linear-gradient(90deg, rgba(29,155,240,.25), transparent); color: #fff; }
  .map li.now { background: linear-gradient(90deg, rgba(249,24,128,.45), transparent); color: #fff; transform: translateX(6px); }
  .map .divider { color: #a78bfa; font-size: 11px; letter-spacing: .2em; padding: 6px 10px 2px; }
  .map .divider::before { content: "▲ ここから上はシークレット ▲"; }
  /* 霧：まだ届いていない「シークレットの中のシークレット」。名前も絵文字も見せず、あることだけ匂わせる */
  .map .fogline { color: #64748b; font-size: 11px; letter-spacing: .2em; padding: 6px 10px 2px; }
  .map .fogline::before { content: "▲ この先は霧で見えない ▲"; }
  .map li.fog { color: #565071; filter: blur(.7px); background: linear-gradient(90deg, rgba(148,163,184,.1), transparent 80%); }
  .map li.fog .me { filter: grayscale(1); opacity: .7; }

  /* 右：ランキングTOP3と記録 */
  .top3 { list-style: none; margin: 0 0 12px; padding: 0; }
  .top3 li { display: flex; gap: 8px; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--line); font-size: 13px; }
  .top3 .t { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .top3 .s { color: var(--sub); white-space: nowrap; }
  .top3 .empty { color: var(--sub); }
  .minitabs { display: flex; gap: 4px; }
  /* スマホでは指で押しやすい高さ（36px）、640px からは小さく */
  .minitabs button { border: 1px solid var(--line); background: transparent; color: var(--sub); border-radius: 999px; min-height: 36px; padding: 0 14px; font-size: 13px; font-weight: 800; cursor: pointer; white-space: nowrap; }
  @media (min-width: 640px) { .minitabs button { min-height: 0; padding: 2px 9px; font-size: 11px; } }
  .minitabs button.on { color: var(--text); background: var(--panel2); border-color: #3b4252; }
  /* 自己ベストの投稿（「あなたの記録」パネルの中）*/
  .bestpost { margin-top: 10px; background: var(--panel2); border: 1px solid #a16207; border-radius: 12px; padding: 10px 12px; display: none; }
  .bestpost.show { display: block; }
  .bestpost small { color: #fde68a; font-size: 11px; font-weight: 800; }
  .bestpost .bp-text { margin: 4px 0 6px; font-size: 14px; white-space: pre-wrap; word-break: break-word; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  .bestpost .bp-meta { color: var(--sub); font-size: 12px; margin-bottom: 8px; }
  .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .stat { background: var(--panel2); border: 1px solid var(--line); border-radius: 12px; padding: 10px; }
  .stat small { display: block; color: var(--sub); font-size: 11px; }
  .stat b { font-size: 20px; font-variant-numeric: tabular-nums; }
  .wide { width: 100%; }
  .mini-god { display: flex; gap: 10px; align-items: flex-end; }
  .mini-god .god { width: 86px; flex: none; }
  .tip { background: var(--panel2); border: 1px solid var(--line); border-radius: 12px 12px 12px 2px; padding: 10px 12px; font-size: 13px; line-height: 1.5; }
  .tip.alien { background: #020a02; border-color: #22c55e; color: #bbf7d0; }   /* ∬… に届いたあと、宇宙人になったバズ神の吹き出し */

  /* 中央 */
  .topbar { display: flex; justify-content: flex-end; margin-bottom: 8px; }
  .chip { border: 1px solid #3b4252; background: rgba(18,20,28,.7); border-radius: 999px; padding: 8px 14px; cursor: pointer; font-weight: 800; font-size: 14px; }
  .chip:hover { background: #1c2030; }
  .hero { text-align: center; margin-bottom: 20px; }
  .hero h1 { font-size: clamp(22px, 6.2vw, 38px); font-weight: 800; margin: 0; white-space: nowrap;
    background: linear-gradient(90deg, #7dd3fc, #c084fc, #f472b6, #7dd3fc); background-size: 300% 100%;
    -webkit-background-clip: text; background-clip: text; color: transparent; animation: shine 6s linear infinite; }
  .hero p { color: var(--sub); margin: 8px 0 0; }
  @keyframes shine { to { background-position: 300% 0; } }
  /* スマホ用のバズマップ（14個が1行に収まる大きさ） */
  .mapstrip { display: flex; justify-content: center; gap: 2px; margin-top: 12px; font-size: 17px; flex-wrap: wrap; }
  .mapstrip span { opacity: .9; }

  .card { background: var(--panel); border: 1px solid var(--line); border-radius: 18px; padding: 16px; }
  .composer { display: flex; gap: 12px; }
  .avatar { width: 44px; height: 44px; border-radius: 50%; flex: none; display: grid; place-items: center; font-size: 22px;
    background: linear-gradient(135deg, #38bdf8, #a855f7); position: relative; }
  /* 入力中のアイコンアニメ */
  .avatar.typing { animation: typing .5s ease-in-out infinite alternate; box-shadow: 0 0 0 3px rgba(56,189,248,.35); }
  .avatar.typing::after { content: ""; position: absolute; right: -6px; bottom: -4px; width: 22px; height: 12px; border-radius: 8px;
    background: #fff radial-gradient(circle at 5px 6px, #555 1.6px, transparent 2px) 0 0 / 7px 12px repeat-x;
    animation: dots 1s steps(3) infinite; }
  @keyframes typing { from { transform: rotate(-8deg) translateY(0); } to { transform: rotate(8deg) translateY(-3px); } }
  @keyframes dots { to { background-position: 21px 0; } }
  .composer textarea { flex: 1; min-height: 96px; resize: vertical; border: 0; outline: 0; background: transparent;
    color: var(--text); font: inherit; font-size: 18px; line-height: 1.5; }
  .composer-foot { display: flex; align-items: center; justify-content: flex-end; gap: 12px; border-top: 1px solid var(--line); margin-top: 8px; padding-top: 12px; }
  .count { color: var(--sub); font-size: 13px; }
  .count.warn { color: var(--pink); }
  /* ボタンは指で押しやすい高さ（44px 以上）*/
  .btn { border: 0; border-radius: 999px; min-height: 44px; padding: 10px 22px; font-weight: 800; font-size: 15px; cursor: pointer; color: #fff; background: var(--blue);
    transition: transform .15s, filter .15s; }
  .btn:hover { filter: brightness(1.1); } .btn:active { transform: scale(.96); }
  .btn:disabled { opacity: .45; cursor: default; }
  .btn.ghost { background: #000; border: 1px solid #3b4252; }
  .btn.sub { background: #262a36; }
  .hint { color: var(--sub); font-size: 13px; text-align: center; margin-top: 14px; }
  .boardbtn { display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; margin-top: 14px; padding: 14px; border-radius: 16px; cursor: pointer;
    font-weight: 800; font-size: 16px; border: 1px solid #a16207; color: #fde68a; background: linear-gradient(135deg, #3b2a05, #1c1404);
    box-shadow: 0 0 24px rgba(250,204,21,.12); transition: transform .15s, box-shadow .15s; }
  .boardbtn:hover { transform: translateY(-2px); box-shadow: 0 0 30px rgba(250,204,21,.3); }
  .boardbtn { flex-wrap: wrap; text-align: center; }
  .boardbtn small { color: #d6b75a; font-weight: 500; font-size: 12px; white-space: nowrap; }

  /* テストモード（合言葉を知っている人だけ）*/
  .admin { position: fixed; left: 16px; bottom: calc(16px + env(safe-area-inset-bottom)); z-index: 40; width: min(320px, calc(100vw - 32px)); background: #0f172a; border: 2px dashed #22c55e;
    border-radius: 16px; padding: 12px; font-size: 13px; display: none; box-shadow: 0 10px 40px rgba(0,0,0,.5); }
  .admin.show { display: block; }
  .admin.fold #adminPanel, .admin.fold #adminLogin { display: none !important; }
  .admin h4 { cursor: pointer; margin: 0 0 8px; color: #4ade80; display: flex; justify-content: space-between; align-items: center; }
  .admin .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
  .admin .grid button { border: 1px solid #334155; background: #1e293b; border-radius: 8px; padding: 6px 4px; cursor: pointer; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .admin .grid button:hover { background: #334155; }
  .admin .grid button.sec { border-color: #7c3aed; }
  /* 入力欄の文字は16px以上（小さいと iPhone がピントを合わせたときに画面を拡大してしまう）*/
  .admin input { width: 100%; padding: 8px; border-radius: 8px; border: 1px solid #334155; background: #020617; color: var(--text); font: inherit; font-size: 16px; margin-bottom: 8px; }
  .admin .mini { background: none; border: 0; color: var(--sub); cursor: pointer; font-size: 12px; }
  .testbadge { position: fixed; left: 50%; bottom: calc(12px + env(safe-area-inset-bottom)); white-space: nowrap; transform: translateX(-50%); z-index: 80; background: #16a34a; color: #fff; font-weight: 800; padding: 4px 14px;
    border-radius: 999px; font-size: 12px; display: none; letter-spacing: .1em; }
  .testbadge.show { display: block; }
  .last { margin-top: 16px; display: none; }
  .last.show { display: block; }

  /* ── 全画面オーバーレイ ── */
  .overlay { position: fixed; inset: 0; z-index: 50; display: none; overflow: hidden; }
  .overlay.show { display: block; }
  #cinema { background: #000; }
  .scene { position: absolute; inset: 0; overflow: hidden; }
  .caption { position: absolute; left: 0; right: 0; bottom: 8vh; text-align: center; z-index: 5; padding: 0 16px; }
  .caption .lv { font-size: clamp(24px, min(7vw, 10vh), 72px); font-weight: 800; text-shadow: 0 4px 24px rgba(0,0,0,.7); animation: popin .6s .2s cubic-bezier(.2,1.6,.4,1) both; }
  .caption .sub { font-size: clamp(13px, min(2.4vw, 4.5vh), 22px); margin-top: 6px; text-shadow: 0 2px 10px rgba(0,0,0,.8); animation: fadein .6s .7s both; }
  @keyframes popin { from { transform: scale(.3); opacity: 0; } }
  @keyframes fadein { from { opacity: 0; transform: translateY(10px); } }
  .skip { position: absolute; right: 16px; top: calc(16px + env(safe-area-inset-top)); z-index: 9; min-height: 40px; background: rgba(0,0,0,.5); border: 1px solid rgba(255,255,255,.3); border-radius: 999px;
    padding: 6px 14px; cursor: pointer; font-size: 13px; }
  /* いいね数：スマホはリツイートといいねを2段に積んで、右上のスキップと重ならない幅にする。640px〜は横に並べる */
  .hud { position: absolute; left: 12px; top: calc(16px + env(safe-area-inset-top)); z-index: 9; display: flex; flex-direction: column; gap: 2px; font-weight: 800; font-size: 14px;
    background: rgba(0,0,0,.45); border-radius: 14px; padding: 6px 12px; font-variant-numeric: tabular-nums; }
  @media (min-width: 640px) { .hud { left: 16px; flex-direction: row; gap: 14px; font-size: clamp(14px, 2.4vw, 20px); padding: 8px 14px; } }
  .hud .l { color: var(--pink); }

  /* 審査中 */
  .judging { position: absolute; inset: 0; display: grid; place-items: center; background: radial-gradient(circle, #1e1b4b, #000); }
  .judging .god { width: min(310px, 60vw); animation: float 2s ease-in-out infinite; }
  .judging p { text-align: center; font-weight: 800; font-size: 20px; margin: 10px 0 0; }
  .judging .glass { position: absolute; font-size: 56px; animation: scan 1.4s ease-in-out infinite; }
  @keyframes scan { 0%, 100% { transform: translate(-80px, -20px) rotate(-15deg); } 50% { transform: translate(80px, 10px) rotate(15deg); } }
  @keyframes float { 50% { transform: translateY(-12px); } }

  /* 上昇（村→町→…と駆け上がる）*/
  .climb { position: absolute; inset: 0; display: grid; place-items: center; transition: background .25s; }
  .climb .big { font-size: min(34vw, 260px); line-height: 1; animation: zoomout .32s ease-out; }
  .climb .nm { position: absolute; bottom: 14vh; font-size: clamp(22px, 5vw, 44px); font-weight: 800; }
  @keyframes zoomout { from { transform: scale(2.4); opacity: 0; } }
  .warning { position: absolute; inset: 0; display: grid; place-items: center; background: repeating-linear-gradient(45deg, #000 0 30px, #3b0764 30px 60px);
    font-weight: 800; font-size: clamp(28px, 7vw, 64px); color: #f0abfc; text-shadow: 0 0 20px #c026d3; text-align: center;
    animation: stripes 1.2s linear infinite, warnglow .45s ease-in-out infinite alternate; }   /* 点滅の代わりに、しま模様が流れて文字の光がふくらむ */
  @keyframes stripes { to { background-position: 85px 0; } }
  @keyframes warnglow { to { text-shadow: 0 0 44px #e879f9, 0 0 10px #f5d0fe; letter-spacing: .04em; } }
  @keyframes blink { 50% { opacity: .2; } }

  /* ── 各段階のシーン ── */
  .floor { position: absolute; left: 0; right: 0; bottom: 0; height: 30%; }
  .e { position: absolute; line-height: 1; }
  .bubble { position: absolute; background: #fff; color: #111; font-weight: 800; border-radius: 18px; padding: 10px 16px; font-size: clamp(18px, 3vw, 30px);
    animation: popin .4s cubic-bezier(.2,1.6,.4,1) both; }
  .bubble::after { content: ""; position: absolute; left: 22px; bottom: -12px; border: 8px solid transparent; border-top: 12px solid #fff; }

  /* 家庭内：寝転がる妹が鼻で笑う */
  .s-home { background: linear-gradient(#5b4636, #3b2c22); }
  .s-home .floor { background: linear-gradient(#8b6b4a, #6b4f35); }
  .s-home .wall { position: absolute; left: 8%; top: 12%; width: 22%; height: 30%; border: 10px solid #3b2c22; background: linear-gradient(#93c5fd, #bfdbfe); border-radius: 6px; }
  .s-home .zoom { position: absolute; inset: 0; animation: camzoom 3.2s ease-in-out forwards; transform-origin: 50% 70%; }
  @keyframes camzoom { 0% { transform: scale(1); } 45%, 100% { transform: scale(1.45); } }
  .s-home .sis { left: 44%; bottom: 30%; font-size: min(18vw, 150px); transform: rotate(-90deg); }
  .s-home .phone { left: 58%; bottom: 40%; font-size: min(6vw, 50px); transform: rotate(-20deg); }
  .s-home .snort { left: 36%; top: 28%; animation-delay: 1.4s; }
  .s-home .puff { left: 40%; bottom: 46%; font-size: min(5vw, 40px); opacity: 0; animation: puff .8s 1.5s ease-out forwards; }
  @keyframes puff { 0% { opacity: 1; transform: translate(0, 0) scale(.5); } 100% { opacity: 0; transform: translate(-40px, -30px) scale(1.4); } }

  /* 村：かかしのアップと飛んでいく軍手 */
  .s-village { background: linear-gradient(#f59e0b 0%, #9a3412 45%, #44403c 100%); }
  .s-village .floor { background: linear-gradient(#78716c, #44403c); height: 34%; }
  .s-village .zoom { position: absolute; inset: 0; animation: camzoom2 3.4s ease-in-out forwards; transform-origin: 50% 75%; }
  @keyframes camzoom2 { 0% { transform: scale(1); } 40%, 100% { transform: scale(1.35); } }
  .kakashi { position: absolute; left: 50%; bottom: 22%; width: 0; height: 0; animation: sway 1.6s ease-in-out infinite alternate; transform-origin: 0 100%; }
  .kakashi .pole { position: absolute; left: -6px; bottom: 0; width: 12px; height: 40vmin; background: #78350f; }
  .kakashi .bar { position: absolute; left: -24vmin; bottom: 30vmin; width: 48vmin; height: 10px; background: #78350f; }
  .kakashi .shirt { position: absolute; left: -11vmin; bottom: 21vmin; width: 22vmin; height: 13vmin; background: #1e40af; border-radius: 8px 8px 2px 2px;
    background-image: repeating-linear-gradient(90deg, transparent 0 14px, rgba(255,255,255,.15) 14px 18px); }
  .kakashi .head { position: absolute; left: -8vmin; bottom: 33vmin; width: 16vmin; height: 16vmin; border-radius: 50%; background: #f5f5f4; border: 3px solid #a8a29e;
    display: grid; place-items: center; font-size: 8vmin; color: #292524; font-weight: 800; }
  .kakashi .hat { position: absolute; left: -13vmin; bottom: 45vmin; font-size: 14vmin; }
  .kakashi .glove-l { position: absolute; left: -27vmin; bottom: 29vmin; font-size: 6vmin; }
  .kakashi .glove-r { position: absolute; left: 21vmin; bottom: 29vmin; font-size: 6vmin; animation: glovefly 1.8s 1s ease-in forwards; }
  @keyframes glovefly { 0% { transform: none; } 100% { transform: translate(70vw, -40vh) rotate(900deg); opacity: .3; } }
  @keyframes sway { from { transform: rotate(-2deg); } to { transform: rotate(3deg); } }
  .wind { position: absolute; height: 3px; border-radius: 3px; background: linear-gradient(90deg, transparent, rgba(255,255,255,.8), transparent); animation: wind 1.2s linear infinite; }
  @keyframes wind { from { transform: translateX(-60vw); } to { transform: translateX(120vw); } }
  .grass { bottom: 6%; font-size: min(8vw, 60px); animation: sway 1s ease-in-out infinite alternate; }

  /* 町：町内放送 */
  .s-town { background: linear-gradient(#7dd3fc, #e0f2fe 60%, #a3a3a3 60%); }
  .s-town .row { position: absolute; left: 0; right: 0; bottom: 46%; display: flex; justify-content: space-around; font-size: min(14vw, 120px); }
  .s-town .speaker { left: 12%; top: 10%; font-size: min(14vw, 110px); animation: shake .3s infinite; }
  .s-town .wave { position: absolute; left: 22%; top: 16%; width: 80px; height: 80px; border-radius: 50%; border: 4px solid #0369a1; border-left-color: transparent; border-bottom-color: transparent;
    animation: wave 1.2s ease-out infinite; }
  @keyframes wave { from { transform: scale(.4) rotate(45deg); opacity: 1; } to { transform: scale(3) rotate(45deg); opacity: 0; } }
  .s-town .announce { left: 30%; top: 12%; color: #0c4a6e; animation-delay: .3s; }
  .s-town .crowd { position: absolute; left: 0; right: 0; bottom: 27%; display: flex; justify-content: center; gap: 4vw; font-size: min(11vw, 90px); }
  .s-town .crowd span { animation: hop .5s ease-in-out infinite alternate; }
  @keyframes hop { to { transform: translateY(-14px); } }
  @keyframes shake { 25% { transform: translateX(-3px) rotate(-3deg); } 75% { transform: translateX(3px) rotate(3deg); } }

  /* 県：ローカルニュース */
  .s-pref { background: radial-gradient(circle at 50% 40%, #1e3a5f, #020617); display: grid; place-items: center; }
  .tv { position: relative; width: min(80vw, 760px); aspect-ratio: 16 / 9; border: 18px solid #1f2937; border-radius: 22px; background: linear-gradient(#bae6fd, #e0f2fe);
    overflow: hidden; box-shadow: 0 30px 80px rgba(0,0,0,.6); animation: popin .5s ease both; }
  .tv .castle { right: 6%; bottom: 18%; font-size: min(18vw, 160px); }
  .tv .anchor { left: 8%; bottom: 14%; font-size: min(16vw, 140px); }
  .tv .tag { position: absolute; left: 0; top: 8%; background: #dc2626; color: #fff; font-weight: 800; padding: 6px 14px; font-size: clamp(14px, 2.4vw, 24px); }
  .tv .ticker { position: absolute; left: 0; right: 0; bottom: 0; background: #1d4ed8; color: #fff; font-weight: 800; white-space: nowrap; padding: 8px 0; font-size: clamp(13px, 2vw, 20px); }
  .tv .ticker span { display: inline-block; padding-left: 100%; animation: ticker 6s linear infinite; }
  @keyframes ticker { to { transform: translateX(-100%); } }

  /* 全国：速報 */
  .s-nation { background: radial-gradient(circle, #7f1d1d, #1c0505); }
  .s-nation .japan { left: 50%; top: 45%; font-size: min(40vw, 340px); transform: translate(-50%, -50%); }
  .s-nation .ripple { position: absolute; left: 55%; top: 42%; width: 40px; height: 40px; margin: -20px; border-radius: 50%; border: 4px solid #fca5a5; animation: ripple 1.4s ease-out infinite; }
  @keyframes ripple { to { width: 80vmin; height: 80vmin; margin: -40vmin; opacity: 0; } }
  /* カメラのフラッシュ：1回だけ、やわらかく（光過敏の人のため、何度もちかちかさせない）*/
  .s-nation .flash { position: absolute; inset: 0; background: #fff; opacity: 0; animation: flash 1s .4s ease-out 1; }
  @keyframes flash { 0% { opacity: .45; } 100% { opacity: 0; } }
  .s-nation .sokuho { position: absolute; left: 0; right: 0; top: 10%; background: #dc2626; color: #fff; font-weight: 800; text-align: center; font-size: clamp(26px, 6vw, 60px); padding: 10px;
    animation: slam .5s cubic-bezier(.2,1.6,.4,1) both; letter-spacing: .3em; }
  @keyframes slam { from { transform: scaleX(0); } }
  .s-nation .heli { top: 26%; font-size: min(12vw, 90px); animation: heli 3.5s linear forwards; }
  @keyframes heli { from { left: -15%; } to { left: 110%; } }

  /* アジア */
  .s-asia { background: linear-gradient(135deg, #0f766e, #155e75, #1e3a8a); }
  .s-asia .globe { left: 50%; top: 45%; transform: translate(-50%, -50%); font-size: min(38vw, 300px); }
  .flag { font-size: min(10vw, 80px); animation: flyin 1s cubic-bezier(.2,1.2,.4,1) both; }
  @keyframes flyin { from { transform: translate(var(--fx), var(--fy)) scale(.3); opacity: 0; } }
  .word { font-weight: 800; font-size: clamp(18px, 3.4vw, 36px); text-shadow: 0 2px 10px rgba(0,0,0,.5); animation: floatword 2.8s ease-in-out both; }
  @keyframes floatword { 0% { opacity: 0; transform: translateY(20px); } 20%, 80% { opacity: 1; } 100% { opacity: 0; transform: translateY(-30px); } }

  /* 地球 */
  .s-earth { background: radial-gradient(circle, #0c4a6e, #000 70%); }
  .s-earth .planet { left: 50%; top: 45%; font-size: min(46vw, 380px); transform: translate(-50%, -50%); filter: drop-shadow(0 0 40px #38bdf8); }
  .orbit { position: absolute; left: 50%; top: 45%; width: 0; height: 0; animation: spin 4s linear infinite; }
  .orbit span { position: absolute; font-size: min(8vw, 56px); }
  @keyframes spin { to { transform: rotate(360deg); } }
  .ping { position: absolute; width: 14px; height: 14px; border-radius: 50%; background: #facc15; box-shadow: 0 0 20px #facc15; animation: ping 1s ease-out infinite; }
  @keyframes ping { 50% { transform: scale(2.2); opacity: .4; } }

  /* 宇宙系の共通：星 */
  .star { position: absolute; width: 2px; height: 2px; background: #fff; border-radius: 50%; animation: twinkle 2s infinite; }
  @keyframes twinkle { 50% { opacity: .2; } }

  /* 太陽系 */
  .s-solar { background: #000; }
  .s-solar .sun { left: 50%; top: 45%; transform: translate(-50%, -50%); font-size: min(26vw, 200px); filter: drop-shadow(0 0 60px #f59e0b); animation: pulse 1.2s ease-in-out infinite; }
  @keyframes pulse { 50% { filter: drop-shadow(0 0 100px #fbbf24); } }
  .ring { position: absolute; left: 50%; top: 45%; border: 1px solid rgba(255,255,255,.18); border-radius: 50%; animation: spin linear infinite; }
  .ring i { position: absolute; top: -8px; left: 50%; width: 16px; height: 16px; border-radius: 50%; font-style: normal; display: grid; place-items: center; }

  /* 銀河 */
  .s-galaxy { background: #000; }
  .spiral { position: absolute; left: 50%; top: 45%; width: min(80vmin, 640px); aspect-ratio: 1; transform: translate(-50%, -50%); border-radius: 50%;
    background: conic-gradient(from 0deg, transparent, #a78bfa, transparent 25%, #f0abfc, transparent 50%, #93c5fd, transparent 75%, #c4b5fd, transparent);
    -webkit-mask: radial-gradient(circle, #000 8%, rgba(0,0,0,.7) 30%, transparent 70%); mask: radial-gradient(circle, #000 8%, rgba(0,0,0,.7) 30%, transparent 70%);
    animation: spin2 6s linear infinite; filter: blur(2px); }
  @keyframes spin2 { to { transform: translate(-50%, -50%) rotate(360deg); } }
  .core { position: absolute; left: 50%; top: 45%; width: 80px; height: 80px; margin: -40px; border-radius: 50%; background: #fff; box-shadow: 0 0 80px 30px #e9d5ff; }

  /* 銀河団 */
  .s-cluster { background: #000; }
  .mini { position: absolute; width: 120px; aspect-ratio: 1; border-radius: 50%; animation: approach 2.5s ease-out both; }
  .mini::before { content: ""; position: absolute; inset: 0; border-radius: 50%; animation: spin 4s linear infinite;
    background: radial-gradient(circle, #fff 0 5%, transparent 12%), conic-gradient(#c4b5fd, transparent 25%, #fbcfe8 50%, transparent 75%, #93c5fd);
    -webkit-mask: radial-gradient(circle, #000 15%, transparent 70%); mask: radial-gradient(circle, #000 15%, transparent 70%); }
  @keyframes approach { from { transform: scale(.05); opacity: 0; } }

  /* 宇宙：ビッグバンとワープ */
  .s-universe { background: #000; }
  .bang { position: absolute; inset: 0; background: radial-gradient(circle, #fff, #fde68a 20%, #f97316 40%, transparent 70%); animation: bang 1.4s ease-out forwards; }
  @keyframes bang { 0% { transform: scale(0); opacity: 1; } 60% { opacity: 1; } 100% { transform: scale(3); opacity: 0; } }
  .streak { position: absolute; left: 50%; top: 45%; height: 2px; width: 30vmax; transform-origin: 0 50%; background: linear-gradient(90deg, transparent, #fff);
    animation: warp .8s linear infinite; }
  @keyframes warp { from { scale: 0 1; translate: 0 0; opacity: 0; } 30% { opacity: 1; } to { scale: 1 1; opacity: 0; } }

  /* 四次元 */
  .s-4d { background: #0b0118; animation: hue 2s linear infinite; }
  @keyframes hue { to { filter: hue-rotate(360deg); } }
  .cube { position: absolute; left: 50%; top: 45%; border: 3px solid #f0abfc; animation: spin3d 3s linear infinite; box-shadow: 0 0 30px #c026d3, inset 0 0 30px #c026d3; }
  @keyframes spin3d { to { transform: translate(-50%, -50%) rotateX(360deg) rotateY(720deg) rotateZ(180deg); } }
  .clock { font-size: min(10vw, 70px); animation: rewind 1.5s linear infinite; }
  @keyframes rewind { to { transform: rotate(-360deg); } }

  /* ∬∃@▽◇◎＄￡※⊆〒^^ */
  /* ∬…：点滅なしで「異常さ」を出す（光過敏の人のため、画面の明るさは急に変えない・1秒に3回以上ちかちかさせない）
     ゆっくり迫るカメラ、宇宙人のまわりを回る記号の輪、流れる走査線と緑の帯、なめらかな色ずれ、ときどき横にずれる文字 */
  .s-glitch { background: radial-gradient(circle at 50% 56%, #052e16 0, #000 62%); animation: gzoom 6s ease-out forwards; }
  @keyframes gzoom { to { transform: scale(1.08); } }
  .s-glitch::before { content: ""; position: absolute; inset: 0; z-index: 4; pointer-events: none;
    background: repeating-linear-gradient(0deg, rgba(0,0,0,.32) 0 2px, transparent 2px 4px); animation: scanline 4s linear infinite; }
  @keyframes scanline { to { background-position: 0 40px; } }
  .s-glitch::after { content: ""; position: absolute; left: 0; right: 0; top: -20%; height: 18%; z-index: 4; pointer-events: none;
    background: linear-gradient(transparent, rgba(74,222,128,.1), transparent); animation: tracking 3.2s linear infinite; }
  @keyframes tracking { to { top: 110%; } }
  .gring { position: absolute; left: 50%; top: 56%; translate: -50% -50%; border-radius: 50%; border: 1px dashed rgba(74,222,128,.25); animation: spin linear infinite; }
  .gring span { position: absolute; translate: -50% -50%; color: #4ade80; font-weight: 800; font-size: clamp(16px, 3.4vmin, 28px); text-shadow: 0 0 10px #22c55e; }
  .s-glitch .alienimg { position: absolute; left: 50%; top: 56%; width: min(48vw, 300px); transform: translate(-50%, -50%);
    animation: aberration 1.6s ease-in-out infinite alternate; }
  @keyframes aberration {
    from { filter: drop-shadow(-4px 0 rgba(255,0,255,.8)) drop-shadow(4px 0 rgba(0,255,255,.8)) drop-shadow(0 0 24px #22c55e); }
    to { filter: drop-shadow(5px 0 rgba(255,0,255,.8)) drop-shadow(-5px 0 rgba(0,255,255,.8)) drop-shadow(0 0 44px #22c55e); } }
  /* ガクッと揺れる（明るさは変えない。1.4秒に2回まで）*/
  @keyframes gjolt { 0%, 38%, 46%, 68%, 74%, 100% { transform: none; } 40% { transform: translate(6px, -3px) skewX(3deg); } 70% { transform: translate(-5px, 2px) skewX(-2deg); } }

  /* 神：金色の天界、回る光、雲の上でひれ伏すバズ神 */
  .s-kami { background: radial-gradient(circle at 50% 38%, #fffbeb, #fde047 28%, #b45309 72%, #451a03); }
  .s-kami .krays { position: absolute; left: 50%; top: 38%; width: 240vmax; height: 240vmax; margin: -120vmax 0 0 -120vmax;
    background: repeating-conic-gradient(rgba(255,255,255,.5) 0 4deg, transparent 4deg 12deg); animation: cispin 16s linear infinite;
    -webkit-mask: radial-gradient(circle, #000 0, transparent 40%); mask: radial-gradient(circle, #000 0, transparent 40%); }
  .s-kami .torii { left: 50%; top: 24%; transform: translate(-50%, -50%); font-size: min(28vw, 220px); filter: drop-shadow(0 0 40px #fff); }
  .cloud { position: absolute; font-size: min(24vw, 190px); line-height: 1; animation: drift 6s ease-in-out infinite alternate; }
  @keyframes drift { to { translate: 5vw 0; } }
  .s-kami .kneel { position: absolute; left: 50%; bottom: 25vh; width: min(30vw, 200px); margin-left: calc(min(30vw, 200px) / -2); transform-origin: 50% 96%;
    animation: bow 1.8s ease-in-out infinite; }
  @keyframes bow { 0%, 100% { transform: perspective(500px) rotateX(0) scaleY(.92); } 40%, 65% { transform: perspective(500px) rotateX(-48deg) scaleY(.8); } }
  .s-kami .haha { left: 57%; bottom: 52vh; color: #78350f; animation-delay: .6s; }
  .s-kami .caption .lv, .s-kami .caption .sub { text-shadow: 0 2px 14px #78350f, 0 0 4px #451a03, 0 0 2px #451a03; }
  .rise { position: absolute; bottom: -24px; color: #fff; font-size: 22px; text-shadow: 0 0 10px #fde047; animation: rise linear infinite; }
  @keyframes rise { to { transform: translateY(-110vh); opacity: 0; } }

  /* ── パチンコ風カットイン（シークレット段階に上がるたび）── */
  /* --d はカットインの長さ、--k は中の動きの速さの倍率（通過は速く、最後はスロー）*/
  .cutin { position: absolute; inset: 0; z-index: 8; overflow: hidden; --c1: #0b1d4d; --c2: #3b82f6; --c3: #bfdbfe; --d: 1600ms; --k: 1;
    background: radial-gradient(circle, var(--c2), var(--c1) 70%); animation: cishake .45s calc(.5s * var(--k)) linear; }
  .cutin.final { z-index: 10; animation: cishake .7s calc(.48s * var(--k)) linear, cizoom var(--d) cubic-bezier(.1,.8,.2,1) both; }
  @keyframes cizoom { from { scale: 1.25; } }
  .cutin.freeze { filter: grayscale(.7) brightness(.4); transition: filter .4s; }
  .cutin.freeze, .cutin.freeze * { animation-play-state: paused !important; }
  .ci-ring { position: absolute; left: 50%; top: 50%; z-index: 6; width: 0; height: 0; border: 10px solid #fff; border-radius: 50%; translate: -50% -50%; pointer-events: none;
    box-shadow: 0 0 40px var(--c3); animation: ciring .8s calc(.48s * var(--k)) ease-out both; }
  @keyframes ciring { from { width: 0; height: 0; opacity: 1; } to { width: 230vmax; height: 230vmax; opacity: 0; } }
  /* 溜め：最後の1段の前に、暗くなって心臓の音 */
  .tame { position: absolute; inset: 0; z-index: 9; display: grid; place-items: center; pointer-events: none;
    background: radial-gradient(circle, rgba(0,0,0,.15), rgba(0,0,0,.92) 70%); animation: tamein .3s ease-out both; }
  @keyframes tamein { from { opacity: 0; } }
  .tame-txt { font-weight: 800; font-size: clamp(64px, 18vw, 200px); color: #fff; text-shadow: 0 0 30px var(--tc), 0 0 80px var(--tc);
    animation: heartbeat .9s ease-out infinite; }
  @keyframes heartbeat { 0%, 30%, 100% { transform: scale(1); } 7% { transform: scale(1.28); } 19% { transform: scale(1.14); } }
  .cutin.t1 { --c1: #052e16; --c2: #16a34a; --c3: #bbf7d0; }
  .cutin.t2 { --c1: #450a0a; --c2: #dc2626; --c3: #fecaca; }
  .cutin.t3 { --c1: #422006; --c2: #eab308; --c3: #fef9c3; }
  .cutin.t4 { --c1: #1e1b4b; --c2: #db2777; --c3: #fff; }
  .cutin.t5 { --c1: #451a03; --c2: #f59e0b; --c3: #fffbeb; }
  .cutin.t6 { --c1: #000; --c2: #14532d; --c3: #4ade80; animation: gjolt 1.4s steps(1) infinite; }
  .ci-lines { position: absolute; left: 50%; top: 50%; width: 260vmax; height: 260vmax; margin: -130vmax 0 0 -130vmax; opacity: .7;
    background: repeating-conic-gradient(var(--c3) 0 1.6deg, transparent 1.6deg 7deg);
    -webkit-mask: radial-gradient(circle, transparent 4%, #000 20%); mask: radial-gradient(circle, transparent 4%, #000 20%); animation: cispin calc(1.1s * var(--k)) linear infinite; }
  @keyframes cispin { to { transform: rotate(360deg); } }
  .cutin.t4 .ci-lines, .cutin.t5 .ci-lines { background: repeating-conic-gradient(#f87171 0 2deg, transparent 2deg 5deg, #facc15 5deg 7deg, transparent 7deg 10deg,
    #4ade80 10deg 12deg, transparent 12deg 15deg, #60a5fa 15deg 17deg, transparent 17deg 20deg, #c084fc 20deg 22deg, transparent 22deg 25deg); }
  .cutin.t4 .ci-lines { animation: cispin 1.1s linear infinite, hue 1s linear infinite; }
  .cutin.t6 .ci-lines { background: repeating-conic-gradient(#22c55e 0 1deg, transparent 1deg 4deg, #f0f 4deg 4.5deg, transparent 4.5deg 9deg); animation-duration: 1.8s; }
  .ci-flash { position: absolute; inset: 0; z-index: 5; background: #fff; pointer-events: none; animation: ciflash calc(.35s * var(--k)) ease-out forwards; }
  @keyframes ciflash { to { opacity: 0; } }
  .ci-band { position: absolute; left: -12%; right: -12%; top: 50%; height: clamp(150px, 30vh, 260px); translate: 0 -50%;
    background: linear-gradient(100deg, var(--c1), var(--c2) 55%, var(--c3)); border-top: 6px solid #fff; border-bottom: 6px solid #fff;
    box-shadow: 0 0 60px var(--c2); animation: ciband var(--d) cubic-bezier(.2,.9,.2,1) forwards; }
  @keyframes ciband { 0% { transform: skewY(-7deg) translateX(-120%); } 16% { transform: skewY(-7deg) translateX(0); }
    86% { transform: skewY(-7deg) translateX(3%); } 100% { transform: skewY(-7deg) translateX(130%); } }
  .cutin.t4 .ci-band { background: linear-gradient(100deg, #ef4444, #f59e0b, #facc15, #22c55e, #3b82f6, #a855f7, #ec4899);
    animation: ciband var(--d) cubic-bezier(.2,.9,.2,1) forwards, hue 1.2s linear infinite; }
  .cutin.t5 .ci-band { background: linear-gradient(100deg, #78350f, #f59e0b 40%, #fde047 62%, #fffbeb);
    border-image: linear-gradient(90deg, #ef4444, #f59e0b, #facc15, #22c55e, #3b82f6, #a855f7) 1; }
  .cutin.t6 .ci-band { background: repeating-linear-gradient(0deg, #000 0 3px, #052e16 3px 6px); border-color: #22c55e; box-shadow: 0 0 40px #22c55e; }
  .ci-god { position: absolute; left: 10%; bottom: 6%; height: 66%; transform: skewY(7deg); filter: drop-shadow(0 0 18px var(--c3));
    animation: cigod calc(.45s * var(--k)) calc(.12s * var(--k)) cubic-bezier(.2,1.4,.4,1) both; }
  @keyframes cigod { from { translate: -60% 0; scale: .6; opacity: 0; } }
  .ci-txt { position: absolute; left: 42%; right: 16%; top: 50%; transform: translateY(-50%) skewY(7deg) skewX(-12deg); }
  .ci-label { font-weight: 800; letter-spacing: .3em; font-size: clamp(14px, 2.6vw, 26px); color: var(--c3); text-shadow: 0 2px 0 #000, 0 0 12px #000; }
  .ci-name { font-weight: 800; line-height: 1.1; white-space: nowrap; color: #fff; font-size: min(16vw, calc(50vw / var(--n, 3)));
    -webkit-text-stroke: .07em #000; paint-order: stroke fill; text-shadow: 0 0 24px var(--c2), .06em .06em 0 var(--c1);
    animation: ciname calc(.45s * var(--k)) calc(.22s * var(--k)) cubic-bezier(.2,1.6,.4,1) both; }
  @keyframes ciname { from { translate: 40% 0; scale: 1.8; opacity: 0; } }
  .cutin.t6 .ci-name { color: #000; -webkit-text-stroke: .05em #4ade80; text-shadow: -.05em 0 #f0f, .05em 0 #0ff; }
  .ci-stamp { position: absolute; right: 4%; bottom: 14%; z-index: 4; rotate: -10deg; font-weight: 800; font-size: clamp(30px, 8vw, 84px); color: #fff; white-space: nowrap;
    padding: .05em .4em; border: .1em solid #fff; border-radius: .25em; background: var(--c2); box-shadow: 0 0 40px var(--c2); text-shadow: 0 .05em 0 rgba(0,0,0,.45);
    animation: stamp calc(.3s * var(--k)) calc(.5s * var(--k)) cubic-bezier(.3,1.6,.5,1) both; }
  @keyframes stamp { from { scale: 3.5; opacity: 0; } }
  .cutin.t4 .ci-stamp, .cutin.t5 .ci-stamp { background: linear-gradient(90deg, #ef4444, #facc15, #22c55e, #3b82f6, #a855f7); }
  .cutin.t5 .ci-stamp { color: #fffbeb; border-color: #fde047; font-size: clamp(36px, 10vw, 110px); }
  .cutin.t6 .ci-stamp { background: #000; border-color: #22c55e; color: #4ade80; font-family: monospace; }
  .ci-new { position: absolute; left: 0; right: 0; top: 11%; margin: auto; width: fit-content; z-index: 4; rotate: -4deg; background: #facc15; color: #b91c1c;
    font-weight: 800; font-size: clamp(20px, 4.6vw, 42px); padding: 4px 20px; border-radius: 999px; border: 4px solid #fff; white-space: nowrap; box-shadow: 0 0 30px #facc15;
    animation: popin .4s calc(.7s * var(--k)) cubic-bezier(.2,1.6,.4,1) both, wobble .35s calc(1.1s * var(--k)) ease-in-out 4 alternate; }
  @keyframes wobble { to { rotate: 4deg; scale: 1.08; } }
  @keyframes cishake { 10%, 50%, 90% { transform: translate(-9px, 5px); } 30%, 70% { transform: translate(9px, -6px); } }
  /* 640px〜：帯を太く、バズ神を大きく帯からはみ出させる */
  @media (min-width: 640px) {
    .ci-band { height: clamp(150px, 36vh, 320px); }
    .ci-god { left: 13%; bottom: -10%; height: 128%; }
    .ci-txt { left: 36%; right: 12%; }
    .ci-name { font-size: min(150px, 17vw, calc(58vw / var(--n, 3))); }
    .ci-stamp { right: 5%; bottom: 9%; }
  }
  /* 横向きのスマホなど、高さが低い画面：NEW の札が SECRET の文字に重ならないように上へ
     （幅ではなく高さで決まる崩れなので、640px / 1024px とは別に高さで分けている）*/
  @media (max-height: 480px) {
    .ci-new { top: 3%; font-size: clamp(16px, 5vh, 26px); padding: 2px 14px; border-width: 3px; }
    .ci-stamp { font-size: clamp(26px, 11vh, 60px); bottom: 6%; }
  }
  .gtext { position: absolute; left: 50%; top: 28%; transform: translate(-50%, -50%); font-size: clamp(16px, min(6.2vw, 9vh), 90px); font-weight: 800; white-space: nowrap;
    text-shadow: -4px 0 #f0f, 4px 0 #0ff; animation: gt 1.2s ease-in-out infinite alternate, gslip 2.2s steps(1) infinite; }
  @keyframes gt { to { text-shadow: 5px 0 #f0f, -5px 0 #0ff; } }
  @keyframes gslip { 0%, 84%, 92%, 100% { transform: translate(-50%, -50%); } 86% { transform: translate(-46%, -50%) skewX(-12deg); } 89% { transform: translate(-53%, -51%) skewX(8deg); } }
  .sym { position: absolute; top: -10%; color: #0f0; font-weight: 800; animation: rain linear infinite; font-size: 22px; }
  @keyframes rain { to { transform: translateY(120vh); } }
  .eye { left: 50%; top: 54%; transform: translate(-50%, -50%); font-size: min(20vw, 160px); animation: blink2 1s infinite; }
  @keyframes blink2 { 90% { transform: translate(-50%, -50%) scaleY(1); } 95% { transform: translate(-50%, -50%) scaleY(.1); } }
  .unlock { position: absolute; left: 50%; top: 9%; transform: translateX(-50%); z-index: 6; background: linear-gradient(90deg, #7c3aed, #db2777); padding: 8px 18px;
    border-radius: 999px; font-weight: 800; white-space: nowrap; animation: popin .6s cubic-bezier(.2,1.6,.4,1) both; box-shadow: 0 0 30px #c026d3; }

  /* ── 結果画面（スクロールなしで講評が見える）── */
  #result { background: rgba(5,6,10,.94); backdrop-filter: blur(8px); overflow-y: auto; overflow-x: hidden; }
  /* 上に貼りつく ✕（スクロールしても、いつでも閉じられる）。高さ0の帯の中に置いて、中身を押し下げない */
  .resbar { position: sticky; top: 0; z-index: 3; height: 0; display: flex; justify-content: flex-end; }
  .resx { margin: calc(10px + env(safe-area-inset-top)) 10px 0 0; width: 44px; height: 44px; flex: none; border-radius: 50%; border: 1px solid #3b4252;
    background: rgba(18,20,28,.85); color: var(--text); font-size: 20px; cursor: pointer; backdrop-filter: blur(6px); }
  .resx:hover { background: #1c2030; }
  /* スマホは1列（バズ神と講評 → 点数とリプライ）。バズ神を小さめにして、段階と点数が早めに見えるように */
  .res { min-height: 100%; max-width: 1100px; margin: 0 auto; padding: 16px 16px calc(88px + env(safe-area-inset-bottom)); display: grid; gap: 16px; align-content: center;
    grid-template-columns: minmax(0, 1fr); }
  @media (min-width: 640px) { .res { padding: 24px 24px 72px; gap: 20px; } }
  @media (min-width: 1024px) { .res { grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr); align-items: center; } }
  /* 横向きのスマホ：バズ神と講評を左、点数とリプライを右に並べて、縦にスクロールしすぎないように
     （幅ではなく高さで決まるので、640px / 1024px とは別に高さで分けている）*/
  @media (min-width: 640px) and (max-width: 1023px) and (max-height: 520px) {
    .res { grid-template-columns: minmax(0, .9fr) minmax(0, 1fr); align-items: start; }
  }
  .godbox { display: flex; flex-direction: column; align-items: center; gap: 12px; }
  .godbox .god { width: min(170px, 44vw, 26dvh); animation: float 2.4s ease-in-out infinite; }
  @media (min-width: 640px) { .godbox .god { width: min(280px, 54vw, 42vh); } }
  .speech { position: relative; width: 100%; border-radius: 20px; padding: 18px 20px; font-size: clamp(16px, 2vw, 19px); line-height: 1.7; min-height: 120px;
    border: 2px solid; animation: popin .5s cubic-bezier(.2,1.4,.4,1) both; }
  .speech::before { content: ""; position: absolute; top: -14px; left: 50%; margin-left: -12px; border: 12px solid transparent; border-top: 0; border-bottom: 14px solid; border-bottom-color: inherit; }
  .speech .who { font-weight: 800; font-size: 13px; margin-bottom: 6px; display: block; }
  #comment.typing::after { content: "▍"; margin-left: 2px; animation: blink .6s steps(2) infinite; }
  .speech.roast  { background: linear-gradient(135deg, #3b0d0d, #1a0707); border-color: #ef4444; }
  .speech.roast .who { color: #f87171; }
  .speech.cold   { background: linear-gradient(135deg, #1b2230, #11151d); border-color: #64748b; }
  .speech.cold .who { color: #94a3b8; }
  .speech.warm   { background: linear-gradient(135deg, #0b2e2b, #0a1a19); border-color: #2dd4bf; box-shadow: 0 0 24px rgba(45,212,191,.18); }
  .speech.warm .who { color: #5eead4; }
  .speech.good   { background: linear-gradient(135deg, #3a1d07, #1c1006); border-color: #fb923c; box-shadow: 0 0 32px rgba(251,146,60,.25); }
  .speech.good .who { color: #fdba74; }
  .speech.praise { background: linear-gradient(135deg, #3b2a05, #1c1404); border-color: #facc15; box-shadow: 0 0 40px rgba(250,204,21,.3); }
  .speech.praise .who { color: #facc15; }
  .speech.kami { background: linear-gradient(135deg, #4a3405, #1c1404); border-color: #fde047; box-shadow: 0 0 50px rgba(253,224,71,.45), 0 0 0 1px #fff inset; }
  .speech.kami .who { color: #fde047; }
  .speech.glitch { background: #020a02; border-color: #22c55e; box-shadow: 0 0 30px rgba(34,197,94,.35); color: #bbf7d0; }
  .speech.glitch .who { color: #4ade80; }
  .scorebox { text-align: center; }
  .scorebox .lvname { font-size: clamp(28px, 5vw, 46px); font-weight: 800; line-height: 1.2; word-break: break-all; }
  .scorebox .secretTag { display: inline-block; background: linear-gradient(90deg, #7c3aed, #db2777); border-radius: 999px; padding: 3px 12px; font-size: 12px; font-weight: 800; margin-bottom: 6px; }
  .scorebox .pts { font-size: 15px; color: var(--sub); margin-top: 4px; }
  .scorebox .pts b { font-size: 34px; color: var(--text); }
  .axes { display: grid; grid-template-columns: auto 1fr auto; gap: 7px 10px; align-items: center; margin: 14px 0 0; font-size: 13px; color: var(--sub); }
  .bar { height: 9px; border-radius: 9px; background: rgba(255,255,255,.08); overflow: hidden; }
  .bar i { display: block; height: 100%; width: 0; border-radius: 9px; transition: width 1s cubic-bezier(.2,.8,.2,1); background: linear-gradient(90deg, #38bdf8, #c084fc, #f472b6); }
  .axes b { color: var(--text); font-variant-numeric: tabular-nums; }
  .minitweet { margin-top: 14px; font-size: 14px; }
  .minitweet .body { white-space: pre-wrap; word-break: break-word; margin: 6px 0 10px; font-size: 15px; }
  .metrics { display: flex; gap: 18px; color: var(--sub); flex-wrap: wrap; }
  .metrics b { color: var(--text); font-variant-numeric: tabular-nums; } .metrics .like b { color: var(--pink); }
  .replies { margin-top: 6px; }
  .reply { display: flex; gap: 10px; padding: 9px 0; border-top: 1px solid var(--line); opacity: 0; transform: translateY(8px); transition: opacity .4s, transform .4s; font-size: 14px; }
  .reply.show { opacity: 1; transform: none; }
  .reply .avatar { width: 32px; height: 32px; font-size: 14px; }
  .nm { font-weight: 800; } .hd { color: var(--sub); font-size: 12px; margin-left: 4px; }
  /* スマホ：シェアともう一回を半分ずつ、閉じるは下の段いっぱい。640px〜：中身の幅で横に並べる */
  .resbtns { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 14px; }
  .resbtns .btn { min-height: 48px; padding: 10px 12px; }
  .resbtns #closeRes { grid-column: 1 / -1; }
  @media (min-width: 640px) {
    .resbtns { display: flex; justify-content: center; flex-wrap: wrap; }
    .resbtns .btn { min-height: 44px; padding: 10px 22px; }
  }

  /* バズ神（アニメPNG）。∬… では宇宙人に変身する */
  .god { display: block; height: auto; user-select: none; -webkit-user-drag: none; }
  /* 変身：ぐにゃっと歪んで色が緑へ溶けていき、宇宙人がにじみ出る。白い全画面の光の代わりに、緑の輪が広がる（点滅させない）*/
  .god.morph { animation: morph .75s ease-in forwards !important; }
  @keyframes morph {
    30% { transform: skewX(8deg) scaleY(1.05); filter: hue-rotate(60deg) drop-shadow(-4px 0 #f0f) drop-shadow(4px 0 #0ff); }
    65% { transform: skewX(-12deg) scaleX(.9) scaleY(1.12); filter: hue-rotate(120deg) blur(1px) drop-shadow(5px 0 #f0f) drop-shadow(-5px 0 #0ff); }
    100% { transform: scale(.7) skewX(18deg); filter: hue-rotate(160deg) blur(6px); opacity: 0; } }
  .god.emerge { animation: emerge .7s ease-out both, float 2.4s ease-in-out .7s infinite !important; }
  @keyframes emerge { from { transform: scale(.7); filter: blur(6px) drop-shadow(0 0 30px #22c55e); opacity: 0; } }
  .morphring { position: fixed; z-index: 56; width: 0; height: 0; translate: -50% -50%; border-radius: 50%; border: 6px solid rgba(74,222,128,.7);
    box-shadow: 0 0 30px #22c55e; pointer-events: none; animation: morphring .9s ease-out forwards; }
  @keyframes morphring { to { width: 160vmax; height: 160vmax; opacity: 0; } }

  /* 地球から上のパラメーター表示 */
  .lb { display: inline-block; margin-left: 6px; vertical-align: middle; font-size: 11px; font-weight: 800; color: #fff; padding: 2px 8px; border-radius: 6px;
    background: linear-gradient(90deg, #ef4444, #f59e0b); letter-spacing: .05em; }
  .lb:empty { display: none; }
  .lb.max { background: #facc15; color: #422006; }
  .lb.blink { animation: lbpulse .8s ease-in-out infinite alternate; }   /* ちかちかさせず、ふくらむだけ */
  @keyframes lbpulse { to { transform: scale(1.15); box-shadow: 0 0 12px #f59e0b; } }
  .pts.over b { background: linear-gradient(90deg, #fde047, #f472b6, #60a5fa); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .axes b { position: relative; z-index: 1; text-shadow: 0 0 4px #000, 0 0 2px #000; white-space: nowrap; }
  .axes.max .bar i { background: linear-gradient(90deg, #f59e0b, #fde68a); box-shadow: 0 0 10px #facc15; }
  .axes.over .bar { overflow: visible; }
  .axes.over .bar i { background: linear-gradient(90deg, #38bdf8, #c084fc, #f472b6, #facc15); box-shadow: 0 0 14px #f472b6; transition-duration: 1.6s; }
  .axes.warp .bar i { animation: warpbar .4s steps(4) infinite; }
  @keyframes warpbar { 0% { width: 30%; } 25% { width: 150%; } 50% { width: 70%; } 75% { width: 190%; } }
  .axes.inf .bar i { background: linear-gradient(90deg, #fde047, #fff, #fde047); animation: hue 2s linear infinite; }
  .card.glitchbox { animation: gjolt 1.8s steps(1) infinite; border-color: #22c55e; }

  /* 記号の文字化け（1文字ずつ幅を固定して、入れ替わっても形が崩れないようにする）*/
  .ob { display: inline-block; width: 1em; text-align: center; text-indent: 0; }
  .ob.n { width: .62em; }

  /* 音のオン・オフと音量
     スマホ：丸いボタンだけ。押すと横に音量スライダーが開き（.open）、開いている間にもう一度押すと消音
     640px〜：ボタン（消音）とスライダーをいつも並べる */
  .sound { position: fixed; right: 12px; bottom: calc(12px + env(safe-area-inset-bottom)); z-index: 90; display: flex; align-items: center; gap: 4px; padding: 3px;
    border-radius: 999px; border: 1px solid #3b4252; background: rgba(18,20,28,.92); box-shadow: 0 6px 20px rgba(0,0,0,.45); }
  .sound.open { padding-right: 16px; }
  .mute { width: 44px; height: 44px; border-radius: 50%; border: 0; background: transparent; font-size: 20px; cursor: pointer; display: grid; place-items: center; }
  .mute:hover { background: #1c2030; }
  .sound input { display: none; width: 130px; accent-color: #1d9bf0; cursor: pointer; }
  .sound.open input { display: block; }
  @media (min-width: 640px) {
    .sound { right: 14px; bottom: calc(14px + env(safe-area-inset-bottom)); padding: 4px 14px 4px 4px; }
    .mute { width: 38px; height: 38px; }
    .sound input { display: block; width: 96px; }
  }
  /* 全画面の演出中とランキングを開いている間は、ボタンだけにしてじゃましない */
  body:has(#cinema.show) .sound:not(.open), body:has(#boardModal.show) .sound:not(.open) { padding: 4px; }
  body:has(#cinema.show) .sound:not(.open) input, body:has(#boardModal.show) .sound:not(.open) input { display: none; }

  /* 紙吹雪 */
  .confetti { position: fixed; top: -12px; width: 8px; height: 14px; z-index: 60; pointer-events: none; animation: fall linear forwards; }
  @keyframes fall { to { transform: translateY(110vh) rotate(720deg); } }

  /* ランキングのモーダル */
  #boardModal { background: rgba(0,0,0,.6); display: none; place-items: center; padding: 16px; }
  #boardModal.show { display: grid; }
  .modal { width: min(560px, 100%); max-height: calc(100vh - 32px); max-height: calc(100dvh - 32px); display: flex; flex-direction: column; background: var(--panel); border: 1px solid var(--line); border-radius: 20px;
    animation: popin .3s ease both; overflow: hidden; }
  .modal header { display: flex; align-items: center; gap: 6px; padding: 12px 10px; border-bottom: 1px solid var(--line); }
  .tab { flex: 1; min-height: 44px; text-align: center; padding: 6px 4px; border-radius: 12px; cursor: pointer; color: var(--sub); font-weight: 800; font-size: 13px;
    border: 1px solid var(--line); background: transparent; white-space: nowrap; }
  .tab.on { color: var(--text); background: var(--panel2); border-color: #3b4252; }
  .close { flex: none; width: 44px; height: 44px; background: none; border: 0; font-size: 22px; cursor: pointer; color: var(--sub); }
  .board { list-style: none; padding: 0; margin: 0; overflow-y: auto; }
  /* スマホ：投稿文を1行目、点数といいね数を2行目に。640px〜：1行に並べる */
  .board li { display: flex; flex-wrap: wrap; row-gap: 2px; gap: 12px; align-items: center; padding: 12px 14px; border-bottom: 1px solid var(--line); animation: fadein .4s ease backwards; }
  .board .rank { width: 28px; text-align: center; font-weight: 800; color: var(--sub); flex: none; }
  .board .txt { flex: 1 1 calc(100% - 40px); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .board .meta { flex-basis: 100%; padding-left: 40px; color: var(--sub); font-size: 13px; white-space: nowrap; }
  @media (min-width: 640px) {
    .modal header { gap: 8px; padding: 14px; }
    .tab { font-size: 15px; }
    .board li { flex-wrap: nowrap; }
    .board .txt { flex: 1; }
    .board .meta { flex-basis: auto; padding-left: 0; }
  }
  .board .empty { color: var(--sub); justify-content: center; }

  /* 通知（「○○さんがいいねしました」など）
     上の左にいいね数、右にスキップや結果画面の ✕ があるので、その下に出す
     スマホ：横いっぱいの真ん中に、上から下りてくる。640px〜：右寄せで、右から滑り込む */
  .toasts { position: fixed; left: 12px; right: 12px; top: calc(80px + env(safe-area-inset-top)); display: flex; flex-direction: column; align-items: center; gap: 8px;
    z-index: 70; pointer-events: none; }
  .toast { max-width: 100%; background: rgba(18,20,28,.95); border: 1px solid var(--line); border-radius: 12px; padding: 10px 14px; font-size: 14px;
    animation: toastdown 2.6s ease forwards; }
  @keyframes toastdown { 0% { transform: translateY(-14px); opacity: 0; } 10%, 85% { transform: none; opacity: 1; } 100% { opacity: 0; } }
  @media (min-width: 640px) {
    .toasts { left: auto; right: 16px; top: calc(72px + env(safe-area-inset-top)); align-items: flex-end; max-width: calc(100vw - 32px); }
    .toast { animation-name: toast; }
  }
  @keyframes toast { 0% { transform: translateX(120%); } 12%, 85% { transform: none; opacity: 1; } 100% { opacity: 0; } }

  @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition: none !important; } }
</style>
</head>
<body>
<div class="toasts" id="toasts"></div>
<div class="sound" id="soundBox"><button class="mute" id="mute" aria-label="音を消す">🔊</button><input type="range" id="vol" min="0" max="100" step="1" aria-label="音量"></div>

<div class="layout">
  <!-- 左：バズマップ -->
  <aside class="side">
    <div class="panel">
      <h3>🗺️ バズマップ <small id="unlockCount"></small></h3>
      <ul class="map" id="map"></ul>
    </div>
  </aside>

  <!-- 中央 -->
  <main>
    <div class="hero">
      <h1>ツイートバズシミュレーター</h1>
      <p>バズ神が、あなたのツイートを本気で採点します</p>
      <div class="mapstrip" id="mapstrip"></div>
    </div>
    <div class="card">
      <div class="composer">
        <div class="avatar" id="avatar">😎</div>
        <textarea id="text" maxlength="140" placeholder="いまどうしてる？"></textarea>
      </div>
      <div class="composer-foot">
        <span class="count" id="count">0 / 140</span>
        <button class="btn" id="post" disabled>ポストする</button>
      </div>
    </div>
    <button class="boardbtn" id="openBoard">🏆 みんなのランキング・最新のバズを見る <small id="postsCount"></small></button>
    <p class="hint">家庭内 → 村 → 町 → 県 → 全国 → アジア → 地球 → ？？？</p>
    <div class="card last" id="last"></div>
  </main>

  <!-- 右：トレンドと通知 -->
  <aside class="side">
    <div class="panel" style="margin-bottom:16px">
      <div class="mini-god"><div id="miniGod"></div><div class="tip" id="tip"></div></div>
    </div>
    <div class="panel" style="margin-bottom:16px">
      <h3>🏆 ランキング <span class="minitabs" id="top3Tabs"><button class="on" data-by="score">バズ力</button><button data-by="likes">いいね</button></span></h3>
      <ol class="top3" id="top3"></ol>
      <button class="btn sub wide" id="openBoard2">すべて見る</button>
    </div>
    <div class="panel">
      <h3>📊 あなたの記録 <small>このブラウザ</small></h3>
      <div class="stats">
        <div class="stat"><small>投稿回数</small><b id="myPosts">0</b></div>
        <div class="stat"><small>自己ベスト</small><b id="myBest">-</b></div>
        <div class="stat"><small>最高到達</small><b id="myTop" style="font-size:15px">-</b></div>
        <div class="stat"><small>シークレット</small><b id="mySecret">0 / 7</b></div>
      </div>
      <div class="bestpost" id="bestPost"></div>
    </div>
  </aside>
</div>

<!-- 全画面演出 -->
<div class="overlay" id="cinema"><div id="stage"></div><button class="skip" id="skip">スキップ ▶▶</button></div>

<!-- 結果画面 -->
<div class="overlay" id="result">
  <div class="resbar"><button class="resx" id="resX" aria-label="結果を閉じる">✕</button></div>
  <div class="res">
    <div class="godbox">
      <div id="bigGod"></div>
      <div class="speech" id="speech"><span class="who" id="who"></span><span id="comment"></span></div>
    </div>
    <div class="card" id="scoreCard">
      <div class="scorebox">
        <div id="secretTag"></div>
        <div class="lvname" id="lvname"></div>
        <div class="pts" id="ptsBox">バズ力 <b id="pts">0</b> / <span id="ptsMax">100</span><span class="lb" id="lb"></span></div>
      </div>
      <div class="axes" id="axes"></div>
      <div class="minitweet">
        <div><span class="nm">あなた</span><span class="hd">@you ・ たった今</span></div>
        <div class="body" id="rtext"></div>
        <div class="metrics">
          <span>💬 <b id="rrep">0</b></span><span>🔁 <b id="rrt">0</b></span><span class="like">❤️ <b id="rlike">0</b></span>
        </div>
      </div>
      <div class="replies" id="replies"></div>
      <div class="resbtns">
        <button class="btn ghost" id="share">𝕏 結果をシェア</button>
        <button class="btn" id="again">もう一回</button>
        <button class="btn sub" id="closeRes">閉じる</button>
      </div>
    </div>
  </div>
</div>

<!-- テストモード（URLの最後に ?admin を付けたときだけ出てくる）-->
<div class="testbadge" id="testBadge">🧪 TEST MODE（保存されません）</div>
<div class="admin" id="admin">
  <h4 id="adminHead">🧪 テストモード（タップで開閉） <button class="mini" id="adminOut">ログアウト</button></h4>
  <div id="adminLogin">
    <input type="password" id="adminKey" placeholder="合言葉">
    <button class="btn wide" id="adminGo">入る</button>
  </div>
  <div id="adminPanel" style="display:none">
    <p style="margin:0 0 8px;color:var(--sub)">押した段階の演出を再生します。文章は入力欄の内容を使います。</p>
    <div class="grid" id="adminGrid"></div>
  </div>
</div>

<!-- ランキング -->
<div class="overlay" id="boardModal">
  <div class="modal" role="dialog" aria-label="ランキング">
    <header>
      <button class="tab on" data-tab="score">💥 バズ力</button>
      <button class="tab" data-tab="likes">❤️ いいね数</button>
      <button class="tab" data-tab="history">🕒 最新</button>
      <button class="close" id="closeBoard" aria-label="閉じる">✕</button>
    </header>
    <ol class="board" id="board"></ol>
  </div>
</div>

<script>
var $ = function (id) { return document.getElementById(id); };
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
function rnd(a, b) { return a + Math.random() * (b - a); }
function pickOne(a) { return a[Math.floor(Math.random() * a.length)]; }

// 段階（サーバーの LEVELS と同じ順番。min は最低点）
// s: シークレット / h: シークレットの中のシークレット（一度届くまでバズマップに出さない）
var LV = [
  { name: "家庭内", emoji: "🏠", min: 0 }, { name: "村", emoji: "🌾", min: 14 }, { name: "町", emoji: "🏘️", min: 27 }, { name: "県", emoji: "🏯", min: 40 },
  { name: "全国", emoji: "🗾", min: 50 }, { name: "アジア", emoji: "🌏", min: 60 }, { name: "地球", emoji: "🌍", min: 70 },
  { name: "太陽系", emoji: "☀️", min: 77, s: 1 }, { name: "銀河", emoji: "🌌", min: 83, s: 1 }, { name: "銀河団", emoji: "✨", min: 88, s: 1 },
  { name: "宇宙", emoji: "🌠", min: 92, s: 1, h: 1 }, { name: "四次元", emoji: "🌀", min: 96, s: 1, h: 1 },
  { name: "神", emoji: "⛩️", min: 98, s: 1, h: 1 }, { name: "∬∃@▽◇◎＄￡※⊆〒^^", emoji: "👁️", min: 99, s: 1, h: 1 }
];
var EARTH = 6, FOURD = 11, KAMI = 12, GLITCH = 13;
var CLIMB_BG = ["#3b2c22", "#9a3412", "#0369a1", "#1e3a5f", "#7f1d1d", "#0f766e", "#0c4a6e", "#000", "#1e1b4b", "#2e1065", "#020617", "#3b0764", "#a16207", "#000"];
var LIKERS = [
  ["妹", "母", "飼い犬"], ["かかし", "村長", "田んぼのカエル"], ["商店街のおじさん", "町内会長", "駅前のパン屋"],
  ["県庁広報課", "地元テレビ", "ご当地キャラ"], ["人気芸人", "朝の情報番組", "トレンドbot"], ["ソウルの人", "台北の人", "バンコクの人"],
  ["ハリウッドスター", "NASA職員", "南極のペンギン"], ["太陽", "火星探査機", "冥王星"], ["宇宙人", "織姫", "流れ星"],
  ["アンドロメダ銀河", "暗黒物質", "天文学者"], ["ビッグバン", "宇宙そのもの", "光"], ["恐竜", "未来人", "過去のあなた"],
  ["八百万の神々", "福の神", "風神と雷神"], ["∃∃∃", "◎◎◎", "????"]
];
var TIPS = [
  "オチがあると点が伸びるのじゃ。", "会話形式は強いのじゃ。「」を使ってみるのじゃ。", "ハッシュタグは2個までにしておくのじゃ。",
  "仕事・家族・睡眠……みんなの「あるある」を狙うのじゃ。", "長すぎても短すぎてもいかんのじゃ。", "地球の先にも、まだ世界があるらしいのじゃ……",
  "最後の一行で裏切るのじゃ。", "みんなが参加したくなるお題も強いのじゃ。", "バズマップの霧の向こうには、ワシもまだ行ったことがないのじゃ……", "右下で音量を変えたり、音を消したりできるのじゃ。"
];

// ── 保存データの引っ越し（「神」を追加したので、∬… の番号が 12 → 13 になった）──
(function () {
  try {
    if (Number(localStorage.getItem("buzz_ver") || 1) >= 2) return;
    var u = JSON.parse(localStorage.getItem("buzz_unlocked") || "[]").map(function (i) { return i >= 12 ? i + 1 : i; });
    localStorage.setItem("buzz_unlocked", JSON.stringify(u));
    var b = localStorage.getItem("buzz_best");
    if (b != null && Number(b) >= 12) localStorage.setItem("buzz_best", String(Number(b) + 1));
    localStorage.setItem("buzz_ver", "2");
  } catch (e) {}
})();

// ── 記号の文字化け（マイクラの §k のように、記号の部分だけがずっと入れ替わり続ける）──
// 文字はすべて textContent で入れる。記号1文字ごとに幅を固定した span を作り、共通のタイマーで書き換える
var OB_RE = /[∬∃@▽◇◎＄￡※⊆〒\^]/;
var OB_WIDE = "∬∃▽◇◎＄￡※⊆〒∀∂∇∮≒≡∫∵∴◆□■△▲○●★☆〆￥％＃＆＠§";
var OB_NARROW = "@^#$%&*?!~+=<>/|";
function obf(el, text) {
  el.textContent = "";
  var buf = "";
  Array.from(String(text)).forEach(function (ch) {
    if (!OB_RE.test(ch)) { buf += ch; return; }
    if (buf) { el.append(buf); buf = ""; }
    var s = document.createElement("span");
    s.className = ch === "@" || ch === "^" ? "ob n" : "ob";
    s.textContent = ch; el.append(s);
  });
  if (buf) el.append(buf);
  return el;
}
setInterval(function () {
  if (document.hidden) return;
  var obs = document.getElementsByClassName("ob");
  for (var i = 0; i < obs.length; i++) {
    var pool = obs[i].classList.contains("n") ? OB_NARROW : OB_WIDE;
    obs[i].textContent = pool.charAt(Math.floor(Math.random() * pool.length));
  }
  // 四次元：数字が時空のゆがみでチラつく
  var fl = document.getElementsByClassName("flick");
  for (var j = 0; j < fl.length; j++) fl[j].textContent = String(Math.floor(fl[j].dataset.flick === "axis" ? rnd(1, 999) : rnd(100, 99999)));
}, 70);

// ── 表示用のバズ力（保存する点数はそのまま。地球から上は段階ごとに限界を突破して見せる）──
var LIMIT = { 6: [100, 25], 7: [120, 30], 8: [150, 38], 9: [200, 50], 10: [500, 125] };
function levelOf(item) {
  for (var i = 0; i < LV.length; i++) if (LV[i].name === item.level) return i;
  for (var j = LV.length - 1; j >= 0; j--) if (item.score >= LV[j].min) return j;
  return 0;
}
function scoreText(score, idx) {
  if (idx === FOURD) return "9999";
  if (idx === KAMI) return "∞";
  if (idx === GLITCH) return "∬∃@";
  return String(LIMIT[idx] ? LIMIT[idx][0] : score);
}
function putScore(el, score, idx) {
  el.classList.toggle("flick", idx === FOURD);
  return obf(el, scoreText(score, idx));
}
// 大きな数を「万・億・兆」で短くする（せまい場所用）
function compactNum(n) {
  n = Number(n);
  var units = [[1e12, "兆"], [1e8, "億"], [1e4, "万"]];
  for (var i = 0; i < units.length; i++) {
    if (n >= units[i][0]) { var v = n / units[i][0]; return (v >= 100 ? Math.round(v) : Math.round(v * 10) / 10) + units[i][1]; }
  }
  return n.toLocaleString();
}
// 点数＋うしろの文字（「点」など）。点数の部分だけチラついたり化けたりする
function scoreSpan(item, suffix) {
  var w = document.createElement("span"), s = document.createElement("span");
  putScore(s, item.score, levelOf(item));
  w.append(s, suffix || "");
  return w;
}

// ── バズ神（public/gods/*.png のアニメPNG）──
var GOD_MOODS = ["idle", "think", "roast", "cold", "warm", "good", "praise", "kami", "alien"], godsLoaded = false;
function godImg(mood) {
  var img = document.createElement("img");
  img.className = "god"; img.alt = "バズ神"; img.src = "/gods/" + mood + ".png";
  return img;
}
function preloadGods() {
  if (godsLoaded) return; godsLoaded = true;
  GOD_MOODS.forEach(function (m) { new Image().src = "/gods/" + m + ".png"; });
}

// ── 音（Web Audio でその場で作る。音声ファイルは使わない）──
var Sound = (function () {
  var ctx = null, master, musicBus, sfxBus, verb, echo, noiseBuf, cur = null;
  var muted = false; try { muted = localStorage.getItem("buzz_mute") === "1"; } catch (e) {}
  // 音量（0〜100）。耳の感じ方に合わせて2乗で効かせる。最初は32（＝以前の音の約10%）
  var vol = 32; try { var sv = localStorage.getItem("buzz_vol"); if (sv !== null && sv !== "" && !isNaN(sv)) vol = Number(sv); } catch (e) {}
  function volGain() { return 0.8 * Math.pow(vol / 100, 2); }
  var mood = "idle", step = 0, nextTime = 0;
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  // 音の通り道：曲 → 曲用の音量 → 全体の音量 → コンプレッサー（音割れ防止）→ スピーカー
  function build(c) {
    ctx = c;
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.knee.value = 8; comp.ratio.value = 12; comp.attack.value = 0.003; comp.release.value = 0.2;
    var out = ctx.createGain(); out.gain.value = 0.9;
    master = ctx.createGain(); master.gain.value = volGain();
    master.connect(comp); comp.connect(out); out.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.5; musicBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.75; sfxBus.connect(master);
    var len = Math.floor(ctx.sampleRate * 2.4), ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (var ch = 0; ch < 2; ch++) { var d = ir.getChannelData(ch); for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    verb = ctx.createConvolver(); verb.buffer = ir;
    var vg = ctx.createGain(); vg.gain.value = 0.35; verb.connect(vg); vg.connect(master);
    echo = ctx.createDelay(1); echo.delayTime.value = 0.34;
    var fb = ctx.createGain(), lp = ctx.createBiquadFilter(); fb.gain.value = 0.3; lp.frequency.value = 2600;
    echo.connect(lp); lp.connect(fb); fb.connect(echo);
    var eg = ctx.createGain(); eg.gain.value = 0.3; lp.connect(eg); eg.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    var nd = noiseBuf.getChannelData(0); for (var k = 0; k < nd.length; k++) nd[k] = Math.random() * 2 - 1;
    cur = null;
  }
  function newMoodBus(name) {
    var b = { g: ctx.createGain(), v: ctx.createGain(), e: ctx.createGain() }, k = MOOD_GAIN[name] || 1;
    [b.g, b.v, b.e].forEach(function (g) { g.gain.value = k; });
    b.g.connect(musicBus); b.v.connect(verb); b.e.connect(echo);
    return b;
  }
  function send(src, o, amt, kind) {
    var s = ctx.createGain(); s.gain.value = amt; src.connect(s);
    s.connect(o.sfx ? (kind === "v" ? verb : echo) : cur[kind]);
  }

  // ── 楽器 ──
  // o: type, vol, a(立ち上がり), dec(減衰), sus(残る割合), r(余韻), lp/lpTo(フィルター), q, slide, vib[速さ,深さ,遅れ], verb, echo, sfx
  function note(t, freq, dur, o) {
    o = o || {};
    var osc = ctx.createOscillator(), g = ctx.createGain(), node = osc;
    var vol = o.vol == null ? 0.1 : o.vol, a = o.a || 0.005, r = o.r || 0.08, sus = o.sus == null ? 0.7 : o.sus;
    osc.type = o.type || "sine";
    osc.frequency.setValueAtTime(freq, t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(o.slide, t + (o.slideT || dur));
    if (o.detune) osc.detune.value = o.detune;
    if (o.vib) {
      var lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = o.vib[0]; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(o.vib[1], t + (o.vib[2] || 0) + 0.05);
      lfo.connect(lg); lg.connect(osc.detune); lfo.start(t); lfo.stop(t + dur + r + 0.1);
    }
    if (o.lp) {
      var f = ctx.createBiquadFilter(); f.type = o.ft || "lowpass"; f.Q.value = o.q || 0.8;
      f.frequency.setValueAtTime(o.lp, t);
      if (o.lpTo) f.frequency.exponentialRampToValueAtTime(o.lpTo, t + dur);
      node.connect(f); node = f;
    }
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + a);
    g.gain.setTargetAtTime(Math.max(vol * sus, 0.0001), t + a, (o.dec || 0.2) / 3);
    g.gain.setTargetAtTime(0.0001, t + dur, r / 4);
    node.connect(g); g.connect(o.sfx ? sfxBus : cur.g);
    if (o.verb) send(g, o, o.verb, "v");
    if (o.echo) send(g, o, o.echo, "e");
    osc.start(t); osc.stop(t + dur + r + 0.1);
  }
  function noise(t, dur, o) {
    o = o || {};
    var src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), vol = o.vol == null ? 0.1 : o.vol;
    src.buffer = noiseBuf; src.loop = true;
    f.type = o.ft || "highpass"; f.Q.value = o.q || 0.7; f.frequency.setValueAtTime(o.f || 6000, t);
    if (o.fTo) f.frequency.exponentialRampToValueAtTime(o.fTo, t + dur);
    if (o.swell) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + dur); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.04); }
    else { g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); }
    src.connect(f); f.connect(g); g.connect(o.sfx ? sfxBus : cur.g);
    if (o.verb) send(g, o, o.verb, "v");
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.08);
  }
  function kick(t, vol, o) {
    o = o || {};
    var len = o.boom ? 0.9 : o.tom ? 0.35 : 0.28;
    note(t, o.boom ? 110 : o.tom ? 160 : 150, len, { slide: o.boom ? 32 : o.tom ? 70 : 45, slideT: o.boom ? 0.5 : 0.12, vol: vol * 0.5, sus: 0.0001, dec: len, r: 0.05, sfx: o.sfx, verb: o.boom ? 0.3 : 0 });
  }
  function snare(t, vol, o) {
    o = o || {};
    noise(t, 0.16, { f: o.lofi ? 1200 : 1800, vol: vol * 0.45, sfx: o.sfx, verb: 0.15 });
    note(t, 190, 0.07, { type: "triangle", vol: vol * 0.3, sus: 0.0001, dec: 0.08, r: 0.04, sfx: o.sfx });
  }
  function clap(t, vol) { [0, 0.011, 0.023].forEach(function (d) { noise(t + d, 0.09, { ft: "bandpass", f: 1300, q: 1.2, vol: vol * 0.5, verb: 0.2 }); }); }
  function hat(t, vol, open) { noise(t, open ? 0.16 : 0.04, { f: 8000, vol: vol }); }
  function lead(t, m, dur, vol) {
    note(t, mtof(m), dur, { type: "square", vol: vol, lp: 3400, sus: 0.6, dec: 0.15, r: 0.06, echo: 0.3, vib: [6, 12, 0.12] });
    note(t, mtof(m), dur, { type: "sawtooth", detune: 9, vol: vol * 0.5, lp: 2400, sus: 0.5, dec: 0.2, r: 0.06 });
  }
  function bass(t, m, dur, vol, type) { note(t, mtof(m), dur, { type: type || "sawtooth", vol: vol, lp: 700, lpTo: 260, q: 3, sus: 0.5, dec: 0.12, r: 0.04 }); }
  function pluck(t, m, vol, o) { note(t, mtof(m), 0.2, { type: "triangle", vol: vol, sus: 0.05, dec: 0.15, r: 0.05, echo: 0.25, sfx: o && o.sfx }); }
  function stab(t, ms, dur, vol) { ms.forEach(function (m) { note(t, mtof(m), dur, { type: "sawtooth", vol: vol, lp: 2600, lpTo: 700, sus: 0.35, dec: 0.12, r: 0.06, verb: 0.15 }); }); }
  function brass(t, m, dur, vol) {
    [-7, 7].forEach(function (dt) { note(t, mtof(m), dur, { type: "sawtooth", detune: dt, vol: vol, a: 0.03, lp: 2800, lpTo: 1300, sus: 0.8, dec: 0.3, r: 0.12, verb: 0.25, vib: [5.5, 10, 0.25] }); });
  }
  function pad(t, ms, dur, vol) {
    ms.forEach(function (m) { [-10, 10].forEach(function (dt) { note(t, mtof(m), dur, { type: "sawtooth", detune: dt, vol: vol, lp: 1300, a: 0.4, sus: 1, r: 1, verb: 0.6 }); }); });
  }
  function bell(t, m, dur, vol, o) {
    [[1, 1], [2.76, 0.4], [5.4, 0.2], [8.93, 0.08]].forEach(function (p, k) {
      note(t, mtof(m) * p[0], dur / (k + 1), { vol: vol * p[1], a: 0.002, sus: 0.0001, dec: dur / (k + 1), r: 0.3, verb: 0.5, echo: 0.2, sfx: o && o.sfx });
    });
  }
  // 合唱：のこぎり波を「あー」の声の形（フォルマント）に削る
  function choir(t, ms, dur, vol, o) {
    o = o || {};
    ms.forEach(function (m) {
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.6);
      g.gain.setValueAtTime(vol, t + dur); g.gain.linearRampToValueAtTime(0.0001, t + dur + 1);
      [[800, 5, 1], [1150, 6, 0.8], [2800, 8, 0.25]].forEach(function (fm) {
        var bp = ctx.createBiquadFilter(), bg = ctx.createGain();
        bp.type = "bandpass"; bp.frequency.value = fm[0]; bp.Q.value = fm[1]; bg.gain.value = fm[2] * 3;
        bp.connect(bg); bg.connect(g);
        [-11, 0, 10].forEach(function (dt) {
          var osc = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain();
          osc.type = "sawtooth"; osc.frequency.value = mtof(m); osc.detune.value = dt;
          lfo.frequency.value = 4.6 + Math.random(); lg.gain.value = 14; lfo.connect(lg); lg.connect(osc.detune);
          osc.connect(bp); osc.start(t); lfo.start(t); osc.stop(t + dur + 1.1); lfo.stop(t + dur + 1.1);
        });
      });
      g.connect(o.sfx ? sfxBus : cur.g); send(g, o, 0.7, "v");
    });
  }
  function sweep(t, pts, type, vol, o) {
    var osc = ctx.createOscillator(), g = ctx.createGain(), end = t + pts[pts.length - 1][1];
    osc.type = type; osc.frequency.setValueAtTime(pts[0][0], t);
    pts.forEach(function (p) { osc.frequency.linearRampToValueAtTime(p[0], t + p[1]); });
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.03); g.gain.setValueAtTime(vol, end - 0.05); g.gain.linearRampToValueAtTime(0.0001, end);
    var f = ctx.createBiquadFilter(); f.frequency.value = 2600;
    osc.connect(f); f.connect(g); g.connect(sfxBus); osc.start(t); osc.stop(end + 0.05);
  }

  // ── 曲（16分音符ごとに play が呼ばれる。n は曲が始まってからの通し番号）──
  var CH = { F: [65, 69, 72], G: [67, 71, 74], Em: [64, 67, 71], Am: [69, 72, 76], C: [60, 64, 67], Dm: [62, 65, 69], Bb: [58, 62, 65], A: [57, 61, 64] };
  // 王道進行 F-G-Em-Am のメロディ（8分音符、0は休み）
  var IDLE_MEL = [
    [72, 72, 76, 77, 79, 0, 77, 76], [74, 74, 79, 79, 81, 0, 79, 77], [76, 0, 79, 76, 83, 0, 81, 79], [81, 0, 79, 76, 72, 74, 76, 0],
    [84, 0, 81, 84, 86, 84, 81, 79], [79, 0, 83, 86, 84, 0, 83, 81], [79, 81, 83, 0, 88, 0, 86, 83], [81, 83, 84, 83, 81, 0, 0, 0]
  ];
  var EARTH_MEL = [[72, 0, 76, 79, 84, 0, 79, 76], [77, 0, 81, 84, 89, 0, 84, 81], [79, 0, 83, 86, 91, 0, 86, 83], [84, 0, 79, 76, 72, 0, 0, 0]];
  var KAZOO = [[72, 0, 76, 0, 74, 0, 71, 0], [72, 0, 69, 0, 67, 0, 0, 0], [65, 0, 69, 0, 67, 0, 64, 0], [62, 64, 60, 0, 0, 0, 0, 0]];
  // アジア：ドレミソラの五音音階
  var GOOD_MEL = [[81, 0, 79, 76, 79, 0, 81, 84], [86, 0, 84, 81, 79, 0, 76, 79], [81, 0, 76, 74, 76, 0, 79, 81], [84, 81, 79, 76, 72, 0, 0, 0]];
  var MOODS = {
    // 待機中：ノリのいい王道進行（128BPM）
    idle: { bpm: 128, play: function (n, t, sd) {
      var s = n % 16, bar = Math.floor(n / 16) % 8, pr = [["F", 41], ["G", 43], ["Em", 40], ["Am", 45]][bar % 4], ch = CH[pr[0]];
      if (s % 4 === 0) kick(t, 0.9);
      if (s === 4 || s === 12) clap(t, 0.32);
      if (s % 4 === 2) hat(t, 0.1, true); else if (s % 2 === 1) hat(t, 0.04);
      if (s % 2 === 0) bass(t, pr[1] + (s % 4 === 2 ? 12 : 0), sd * 1.6, 0.2);
      if (s % 4 === 2) ch.forEach(function (m) { pluck(t, m + 12, 0.035); });
      if (s % 2 === 0 && IDLE_MEL[bar][s / 2]) lead(t, IDLE_MEL[bar][s / 2], sd * 1.7, 0.06);
      if (bar >= 4 && s % 2 === 1) pluck(t, ch[(s >> 1) % 3] + 24, 0.02);
    } },
    // 審査中：ドラムロールと、だんだん上がっていく音
    judge: { bpm: 132, play: function (n, t, sd) {
      var s = n % 32;
      if (s === 0) {
        note(t, mtof(33), sd * 32, { type: "sawtooth", vol: 0.1, lp: 180, lpTo: 900, a: 0.3, sus: 1, r: 0.3 });
        note(t, mtof(34), sd * 32, { type: "sawtooth", vol: 0.07, lp: 180, lpTo: 900, a: 0.3, sus: 1, r: 0.3 });
        noise(t, sd * 32, { f: 300, fTo: 7000, vol: 0.1, swell: true });
        note(t, mtof(57), sd * 32, { slide: mtof(81), vol: 0.04, a: 0.2, sus: 1, r: 0.1 });
      }
      if (s >= 16 || s % 2 === 0) snare(t, 0.08 + 0.3 * s / 32);
      if (s === 0 || s === 8 || s === 16 || (s >= 24 && s % 2 === 0)) kick(t, 0.7, { tom: true });
      if (s % 2 === 0) note(t, mtof(s % 4 === 0 ? 52 : 53), sd * 0.8, { type: "square", vol: 0.03, lp: 1200, sus: 0.3 });
    } },
    // 上昇中：前に進むビート（150BPM）
    climb: { bpm: 150, play: function (n, t, sd) {
      var s = n % 16, bar = Math.floor(n / 16) % 4, pr = [["Am", 45], ["F", 41], ["C", 48], ["G", 43]][bar], ch = CH[pr[0]];
      if (s % 4 === 0) kick(t, 0.9);
      if (s === 4 || s === 12 || (bar === 3 && s >= 13)) snare(t, 0.3);
      hat(t, s % 2 ? 0.03 : 0.06);
      if (s % 2 === 0) bass(t, pr[1] + (s % 4 ? 12 : 0), sd * 1.5, 0.2);
      pluck(t, ch[s % 3] + 12 + (s >= 8 ? 12 : 0), 0.035);
      if (s === 0) stab(t, [ch[0] + 12, ch[1] + 12, ch[2] + 12], sd * 3, 0.03);
    } },
    // シークレットゾーン：速くて激しい（172BPM、短調）
    secret: { bpm: 172, play: function (n, t, sd) {
      var s = n % 16, bar = Math.floor(n / 16) % 4, pr = [["Dm", 38], ["Bb", 34], ["C", 36], ["A", 33]][bar], ch = CH[pr[0]];
      if (s % 4 === 0) kick(t, 1);
      if (s === 4 || s === 12) { snare(t, 0.32); clap(t, 0.15); }
      hat(t, s % 2 ? 0.035 : 0.07);
      bass(t, pr[1] + (s % 2 ? 12 : 0), sd * 0.9, 0.17);
      if ([0, 3, 6, 10, 12].indexOf(s) >= 0) stab(t, [ch[0] + 12, ch[1] + 12, ch[2] + 12], sd * 1.4, 0.035);
      note(t, mtof(ch[(s * 2) % 3] + 24 + (s % 8 >= 4 ? 12 : 0)), sd * 0.7, { type: "square", vol: 0.018, lp: 4200, sus: 0.2, dec: 0.08 });
      if (s === 0 && bar === 0) noise(t, 1.2, { f: 5000, vol: 0.08 });
    } },
    // 家庭内〜町：悲しいトロンボーンのあと、しょんぼりしたチューバ
    roast: { bpm: 100, play: function (n, t, sd) {
      if (n === 0) {
        [[55, 0, 0.45], [54, 0.55, 0.45], [53, 1.1, 0.45], [52, 1.65, 1.6]].forEach(function (x, k) {
          note(t + x[1], mtof(x[0]), x[2], { type: "sawtooth", vol: 0.14, lp: 500, lpTo: k === 3 ? 380 : 1500, q: 3, a: 0.04, sus: 0.9, r: 0.15,
            vib: k === 3 ? [5, 45, 0.25] : null, slide: k === 3 ? mtof(51.3) : null });
        });
      }
      if (n < 20) return;
      var m = n - 20, s = m % 16, bar = Math.floor(m / 16) % 4;
      if (s === 0 || s === 8) note(t, mtof([36, 31, 36, 31][bar] + (s ? 7 : 0)), sd * 3, { type: "triangle", vol: 0.22, lp: 500, sus: 0.4, dec: 0.2 });
      if (s === 4 || s === 12) stab(t, [60, 64, 67], sd * 0.8, 0.018);
      if (s % 2 === 0 && KAZOO[bar][s / 2]) note(t, mtof(KAZOO[bar][s / 2]), sd * 1.8, { type: "sawtooth", vol: 0.035, lp: 1600, q: 4, vib: [7, 35, 0.05], slide: mtof(KAZOO[bar][s / 2] - 0.6) });
      if (s % 4 === 2) hat(t, 0.025);
    } },
    // 県〜アジア：ローファイで、やる気のない感じ
    cold: { bpm: 76, swing: 0.18, play: function (n, t, sd) {
      var s = n % 16, bar = Math.floor(n / 16) % 4;
      var ch = [[50, 53, 57, 60, 64], [43, 53, 59, 64], [48, 52, 55, 59, 62], [45, 55, 60, 64]][bar];
      if (s === 0) ch.slice(1).forEach(function (m) {
        note(t, mtof(m), sd * 14, { vol: 0.04, sus: 0.3, dec: 1.4, r: 0.6, verb: 0.2 });
        note(t, mtof(m + 12), sd * 6, { type: "triangle", detune: 5, vol: 0.012, sus: 0.1, dec: 0.8, r: 0.4 });
      });
      if (s === 0 || s === 10) note(t, mtof(ch[0] - 12), sd * 5, { vol: 0.2, sus: 0.5, dec: 0.4, r: 0.1 });
      if (s === 0 || s === 7 || s === 10) kick(t, 0.5);
      if (s === 4 || s === 12) noise(t, 0.12, { ft: "bandpass", f: 1800, q: 0.8, vol: 0.09 });
      if (s % 2 === 0) noise(t, 0.03, { ft: "bandpass", f: 6000, vol: 0.025 });
      if (Math.random() < 0.45) noise(t + Math.random() * sd, 0.01, { f: 2500, vol: 0.01 + Math.random() * 0.025 });
      if (s === 6 && bar % 2 === 0) note(t, mtof(ch[2] + 12), sd * 3, { vol: 0.03, sus: 0.2, dec: 0.6, echo: 0.4 });
    } },
    // 全国：ちょっと得意げで、ゆるくノれるグルーヴ
    warm: { bpm: 100, swing: 0.12, play: function (n, t, sd) {
      var s = n % 16, bar = Math.floor(n / 16) % 4, pr = [["C", 36], ["Am", 33], ["F", 29], ["G", 31]][bar], ch = CH[pr[0]];
      if (s === 0 || s === 10) kick(t, 0.6);
      if (s === 4 || s === 12) snare(t, 0.18);
      if (s % 2 === 0) hat(t, s % 4 === 2 ? 0.05 : 0.025);
      if ([0, 3, 6, 10].indexOf(s) >= 0) bass(t, pr[1] + 12 + (s === 6 ? 7 : s === 10 ? 12 : 0), sd * 1.8, 0.24);
      if (s % 4 === 2) ch.forEach(function (m) { note(t, mtof(m), sd * 1.2, { type: "triangle", vol: 0.032, sus: 0.3, dec: 0.25, r: 0.1 }); });
      if (bar % 2 === 1 && (s === 8 || s === 11 || s === 14)) pluck(t, ch[s % 3] + 24, 0.03);
    } },
    // アジア：明るくはずむ五音音階のメロディ
    good: { bpm: 122, play: function (n, t, sd) {
      var s = n % 16, bar = Math.floor(n / 16) % 4, pr = [["F", 41], ["G", 43], ["Am", 45], ["C", 36]][bar], ch = CH[pr[0]];
      if (s % 4 === 0) kick(t, 0.8);
      if (s === 4 || s === 12) clap(t, 0.28);
      if (s % 4 === 2) hat(t, 0.08, true); else if (s % 2 === 1) hat(t, 0.03);
      if (s % 2 === 0) bass(t, pr[1] + (s % 4 === 2 ? 12 : 0), sd * 1.5, 0.18);
      if (s % 4 === 2) ch.forEach(function (m) { pluck(t, m + 12, 0.03); });
      if (s % 2 === 0 && GOOD_MEL[bar][s / 2]) bell(t, GOOD_MEL[bar][s / 2], 0.6, 0.04);
    } },
    // 溜め（シークレットの最後の1段の前）：心臓の音と、せり上がる音
    tame: { bpm: 100, play: function (n, t, sd) {
      if (n === 0) {
        noise(t, 1.2, { f: 400, fTo: 9000, vol: 0.12, swell: true });
        note(t, mtof(38), 1.3, { type: "sawtooth", vol: 0.09, lp: 180, lpTo: 1600, a: 0.1, sus: 1, r: 0.2 });
        note(t, mtof(62), 1.2, { slide: mtof(86), vol: 0.035, a: 0.3, sus: 1, r: 0.1 });
      }
      if (n % 6 === 0 || n % 6 === 1) kick(t, n % 6 ? 0.55 : 0.95);
    } },
    // 地球：勝利のファンファーレ
    earth: { bpm: 116, play: function (n, t, sd) {
      if (n === 0) {
        [[67, 0, 1], [67, 1, 1], [67, 2, 1], [72, 3, 5], [76, 8, 4], [79, 12, 4], [84, 16, 14]].forEach(function (x) {
          brass(t + x[1] * sd, x[0], x[2] * sd * 0.92, 0.05); brass(t + x[1] * sd, x[0] - 12, x[2] * sd * 0.92, 0.03);
        });
        for (var k = 0; k < 16; k++) kick(t + k * sd, 0.25 + k * 0.03, { tom: true });
        kick(t + 16 * sd, 1, { boom: true }); noise(t + 16 * sd, 1.8, { f: 4500, vol: 0.09, verb: 0.3 });
      }
      if (n < 32) return;
      var m = n - 32, s = m % 16, bar = Math.floor(m / 16) % 4, pr = [["C", 36], ["F", 41], ["G", 43], ["C", 36]][bar], ch = CH[pr[0]];
      if (s === 0 || s === 8) kick(t, 0.8);
      if (s === 4 || s === 12 || s >= 14) snare(t, s >= 14 ? 0.15 : 0.28);
      if (s % 2 === 0) hat(t, 0.03);
      if (s % 2 === 0) bass(t, pr[1], sd * 1.6, 0.17);
      if (s === 0) { brass(t, ch[0], sd * 7, 0.02); brass(t, ch[1], sd * 7, 0.02); brass(t, ch[2], sd * 7, 0.02); if (bar === 0) noise(t, 1.4, { f: 4500, vol: 0.06 }); }
      if (s % 2 === 0 && EARTH_MEL[bar][s / 2]) brass(t, EARTH_MEL[bar][s / 2], sd * 1.7, 0.035);
    } },
    // 太陽系〜四次元：壮大で宇宙っぽい
    cosmic: { bpm: 84, play: function (n, t, sd) {
      var s = n % 16, bar = Math.floor(n / 16) % 4, pr = [["Am", 33], ["F", 29], ["C", 36], ["G", 31]][bar], ch = CH[pr[0]];
      if (s === 0) {
        pad(t, [ch[0] - 12, ch[1] - 12, ch[2] - 12, ch[0]], sd * 16, 0.016);
        kick(t, 1, { boom: true });
        note(t, mtof(pr[1]), sd * 16, { type: "sawtooth", lp: 260, vol: 0.12, a: 0.2, sus: 1, r: 0.6 });
        if (bar % 2 === 0) choir(t, [ch[0], ch[2]], sd * 14, 0.02);
      }
      if (s % 2 === 0) note(t, mtof(pr[1] + 12 + (s % 4 ? 7 : 0)), sd * 1.5, { type: "sawtooth", lp: 900, vol: 0.035, sus: 0.4, dec: 0.15 });
      note(t, mtof(ch[s % 3] + 24 + (s >= 8 ? 12 : 0)), sd * 1.2, { vol: 0.022, sus: 0.2, dec: 0.2, echo: 0.45, verb: 0.3 });
      if (bar === 3 && s >= 8 && s % 2 === 0) kick(t, 0.4 + s * 0.03, { tom: true });
    } },
    // 神：天の合唱と鐘
    kami: { bpm: 60, play: function (n, t, sd) {
      var s = n % 16, bar = Math.floor(n / 16) % 4;
      var ch = [[60, 64, 67, 71], [65, 69, 72, 76], [57, 64, 67, 71], [55, 62, 67, 69]][bar];
      if (s === 0) {
        choir(t, ch, sd * 15, 0.028);
        note(t, mtof(ch[0] - 24), sd * 16, { vol: 0.12, a: 0.6, sus: 1, r: 1.2 });
        if (bar === 0) kick(t, 0.6, { boom: true });
      }
      if (s % 2 === 0 && Math.random() < 0.55) bell(t, pickOne([72, 74, 76, 79, 81, 84, 86, 88]), 2.6, 0.035);
      if (s >= 8 && bar % 2 === 1) pluck(t, ch[s % 4] + 12, 0.03);
    } },
    // ∬…：不気味でバグった音
    glitch: { bpm: 96, play: function (n, t, sd) {
      var s = n % 16;
      if (n % 32 === 0) {
        note(t, mtof(36), sd * 32, { type: "sawtooth", detune: -22, vol: 0.08, lp: 260, lpTo: 1400, a: 1, sus: 1, r: 1 });
        note(t, mtof(42), sd * 32, { type: "sawtooth", detune: 27, vol: 0.06, lp: 400, lpTo: 200, a: 1, sus: 1, r: 1 });
      }
      if (s === 0 || s === 3) kick(t, 0.7);
      if (s % 2 === 0 && Math.random() < 0.6) note(t, mtof(pickOne([72, 75, 78, 79, 84, 87])), 0.6, { detune: -45 + Math.random() * 25, vol: 0.04, sus: 0.0001, dec: 0.5, echo: 0.35, verb: 0.3 });
      if (Math.random() < 0.3) note(t + Math.random() * sd, rnd(200, 3200), 0.05, { type: "square", vol: 0.02, sus: 0.5 });
      if (Math.random() < 0.12) noise(t, rnd(0.03, 0.15), { ft: "bandpass", f: rnd(300, 4000), q: 8, vol: 0.18 });
      if (n % 32 === 24) noise(t, sd * 8, { f: 800, fTo: 6000, vol: 0.06, swell: true });
    } }
  };

  // 曲ごとの音量の補正（測った大きさをそろえる。トップページの曲は、講評中の曲より少し控えめ）
  var MOOD_GAIN = { idle: 0.7, secret: 0.9, roast: 1.7, cold: 1.2, warm: 1.65, tame: 1.1, earth: 1.05, glitch: 1.3 };

  // ── 効果音 ──
  var SFX = {
    blip: function (t, i) {
      var f = mtof(72 + i * 2);
      note(t, f, 0.09, { type: "square", vol: 0.1, slide: f * 1.5, slideT: 0.08, lp: 5000, r: 0.04, sfx: 1 });
      note(t + 0.06, f * 2, 0.08, { type: "triangle", vol: 0.05, sus: 0.3, sfx: 1 });
    },
    siren: function (t) {
      sweep(t, [[650, 0], [1300, 0.25], [650, 0.5], [1300, 0.75], [650, 1], [1300, 1.2]], "sawtooth", 0.12);
      sweep(t, [[660, 0], [1310, 0.25], [660, 0.5], [1310, 0.75], [660, 1], [1310, 1.2]], "square", 0.05);
    },
    // カットイン：シュッ → ドン → キュイン（段階が上がるほど派手）
    // a は段階の番号（tier）か { tier, k }。k はカットインの速さの倍率（小さいほど速い）で、ドンの位置を絵に合わせる
    cutin: function (t, a) {
      var tier = a.tier == null ? a : a.tier, k = a.k || 1, h = t + 0.32 * k;
      noise(t, 0.3 * k, { ft: "bandpass", f: 300, fTo: 5000, q: 1.2, vol: 0.3, swell: true, sfx: 1 });
      kick(h, 1.2, { sfx: 1, boom: tier >= 3 || k > 1.2 });
      noise(h, 0.45 + tier * 0.1, { f: 2500, vol: 0.12 + tier * 0.02, sfx: 1, verb: 0.4 });
      note(h + 0.02, 700, 0.55, { type: "sawtooth", slide: 3200, slideT: 0.35, vol: 0.04 + tier * 0.008, lp: 6000, vib: [18, 40, 0], r: 0.15, echo: 0.3, sfx: 1 });
      note(h + 0.02, 1400, 0.5, { type: "square", slide: 5200, slideT: 0.35, vol: 0.015 + tier * 0.005, r: 0.15, sfx: 1 });
      if (tier >= 2) [72, 76, 79, 84].forEach(function (m) { note(h + 0.18, mtof(m + (tier >= 4 ? 2 : 0)), 0.7, { type: "sawtooth", vol: 0.025, lp: 3200, sus: 0.6, r: 0.3, verb: 0.4, sfx: 1 }); });
      if (tier >= 4 && tier < 6) [84, 88, 91, 96, 100].forEach(function (m, j) { bell(h + 0.23 + j * 0.06, m, 1, 0.04, { sfx: 1 }); });
      if (tier === 5) choir(h + 0.08, [60, 67, 72, 76], 1.1, 0.04, { sfx: 1 });
      if (tier === 6) for (var j = 0; j < 14; j++) note(h + j * 0.07, rnd(150, 3500), 0.05, { type: "square", vol: 0.04, sfx: 1 });
    },
    // 講評の文字送り（ピピピ）
    type: function (t, m) { note(t, mtof(m), 0.035, { type: "square", vol: 0.03, lp: 2400, r: 0.02, sfx: 1 }); },
    unlock: function (t) { [84, 88, 91, 96, 100, 103].forEach(function (m, k) { bell(t + k * 0.07, m, 1.3, 0.05, { sfx: 1 }); }); },
    post: function (t) {
      noise(t, 0.3, { ft: "bandpass", f: 500, fTo: 6000, q: 1, vol: 0.25, swell: true, sfx: 1 });
      note(t, 400, 0.28, { slide: 1600, vol: 0.07, sfx: 1 });
    },
    morph: function (t) {
      for (var k = 0; k < 18; k++) note(t + k * 0.035, rnd(100, 4000), 0.04, { type: "square", vol: 0.05, sfx: 1 });
      note(t + 0.5, 220, 0.9, { type: "sawtooth", slide: 35, vol: 0.12, lp: 900, sfx: 1, verb: 0.4 });
    }
  };

  function startMood(name) {
    mood = name; step = 0;
    if (!ctx) return;
    var now = ctx.currentTime;
    if (cur) {
      var old = cur;
      [old.g, old.v, old.e].forEach(function (g) { g.gain.setTargetAtTime(0, now, 0.12); });
      setTimeout(function () { [old.g, old.v, old.e].forEach(function (g) { g.disconnect(); }); }, 3000);
    }
    cur = newMoodBus(name);
    nextTime = now + 0.06;
  }
  // 少し先までの音を予約していく
  function tick() {
    if (!ctx || ctx.state !== "running") return;
    var m = MOODS[mood];
    if (nextTime < ctx.currentTime - 0.1) nextTime = ctx.currentTime + 0.05;
    while (nextTime < ctx.currentTime + 0.12) {
      var sd = 60 / m.bpm / 4;
      if (m.swing) sd *= step % 2 ? 1 - m.swing : 1 + m.swing;
      m.play(step, nextTime, sd);
      nextTime += sd; step++;
    }
  }
  function init() {
    if (ctx) { if (!muted && ctx.state === "suspended" && !document.hidden) ctx.resume(); return; }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    build(new AC());
    startMood(mood);
    if (muted) ctx.suspend();
    setInterval(tick, 25);
  }
  return {
    init: init,
    mood: function (name) { if (name !== mood || !cur) startMood(name); },
    sfx: function (name, arg) { if (ctx && ctx.state === "running" && cur) SFX[name](ctx.currentTime + 0.02, arg); },
    muted: function () { return muted; },
    volume: function () { return vol; },
    setVolume: function (v) {
      vol = Math.max(0, Math.min(100, Math.round(Number(v))));
      try { localStorage.setItem("buzz_vol", String(vol)); } catch (e) {}
      if (master) master.gain.setTargetAtTime(volGain(), ctx.currentTime, 0.03);
    },
    toggle: function () {
      muted = !muted;
      try { localStorage.setItem("buzz_mute", muted ? "1" : "0"); } catch (e) {}
      if (ctx) { if (muted) ctx.suspend(); else ctx.resume(); }
      return muted;
    },
    visible: function (v) { if (!ctx) return; if (!v) ctx.suspend(); else if (!muted) ctx.resume(); },
    // 結果の段階 → 曲
    forLevel: function (i) { return i <= 2 ? "roast" : i === 3 ? "cold" : i === 4 ? "warm" : i === 5 ? "good" : i === EARTH ? "earth" : i < KAMI ? "cosmic" : i === KAMI ? "kami" : "glitch"; },
    // 確認用：曲や効果音をこっそり録音して、音の大きさ（ピークとRMS）を返す
    measure: async function (kind, name, secs) {
      var keep = [ctx, master, musicBus, sfxBus, verb, echo, noiseBuf, cur];
      var off = new OfflineAudioContext(2, 44100 * secs, 44100);
      build(off); cur = newMoodBus(kind === "mood" ? name : "");
      if (kind === "mood") {
        var m = MOODS[name], tt = 0.05, n = 0;
        while (tt < secs - 1.5) { var sd = 60 / m.bpm / 4; if (m.swing) sd *= n % 2 ? 1 - m.swing : 1 + m.swing; m.play(n, tt, sd); tt += sd; n++; }
      } else SFX[name](0.05, kind);
      ctx = keep[0]; master = keep[1]; musicBus = keep[2]; sfxBus = keep[3]; verb = keep[4]; echo = keep[5]; noiseBuf = keep[6]; cur = keep[7];
      var buf = await off.startRendering(), d = buf.getChannelData(0), peak = 0, sum = 0;
      for (var i = 0; i < d.length; i++) { var a = Math.abs(d[i]); if (a > peak) peak = a; sum += d[i] * d[i]; }
      return { peak: Math.round(peak * 1000) / 1000, rms: Math.round(Math.sqrt(sum / d.length) * 1000) / 1000 };
    }
  };
})();

// 最初のクリックかキー入力で音が鳴り始める（ブラウザの決まりで、それまでは鳴らせない）
document.addEventListener("pointerdown", function () { Sound.init(); });
document.addEventListener("keydown", function () { Sound.init(); });
document.addEventListener("visibilitychange", function () { Sound.visible(!document.hidden); });
function paintMute() {
  var m = Sound.muted(), v = Sound.volume();
  $("mute").textContent = m || v === 0 ? "🔇" : v < 34 ? "🔈" : v < 67 ? "🔉" : "🔊";
  $("mute").setAttribute("aria-label", m ? "音を出す" : "音を消す");
  $("mute").title = m ? "音を出す" : "音を消す";
}
// スマホ（639px まで）では、1回目に押すと音量スライダーが開き、開いている間に押すと消音。外を触ると閉じる
var NARROW = window.matchMedia("(max-width: 639px)");
$("mute").addEventListener("click", function () {
  Sound.init();
  if (NARROW.matches && !$("soundBox").classList.contains("open")) { $("soundBox").classList.add("open"); return; }
  Sound.toggle(); paintMute();
});
document.addEventListener("pointerdown", function (e) {
  if (!e.target.closest("#soundBox")) $("soundBox").classList.remove("open");
});
// 音量スライダー（動かすと、消音中でも音が戻る）
$("vol").value = Sound.volume();
$("vol").addEventListener("input", function () {
  Sound.init(); Sound.setVolume(this.value);
  if (Sound.muted() && Number(this.value) > 0) Sound.toggle();
  paintMute();
});
paintMute();

// ── 解放したシークレット（このブラウザだけに保存）──
function loadUnlocked() { try { return JSON.parse(localStorage.getItem("buzz_unlocked") || "[]"); } catch (e) { return []; } }
function saveUnlocked(list) { try { localStorage.setItem("buzz_unlocked", JSON.stringify(list)); } catch (e) {} }
function loadStats() { try { return JSON.parse(localStorage.getItem("buzz_stats") || '{"posts":0,"best":null}'); } catch (e) { return { posts: 0, best: null }; } }
function saveStats(v) { try { localStorage.setItem("buzz_stats", JSON.stringify(v)); } catch (e) {} }
function loadBest() { try { return Number(localStorage.getItem("buzz_best") || -1); } catch (e) { return -1; } }
function saveBest(v) { try { localStorage.setItem("buzz_best", String(v)); } catch (e) {} }

// 宇宙から上は、実際に届くまで「霧」の中（名前も絵文字も出さない）
function isVisible(i, unlocked) { return !LV[i].h || unlocked.indexOf(i) >= 0; }
function secretCount() {
  return loadUnlocked().length + " / " + LV.filter(function (lv) { return lv.s; }).length;
}
// 踏破：届いたことのある段階の数（ふつうの段階は最高到達までぜんぶ、シークレットは実際に届いたものだけ）
function reachedCount() {
  var best = loadBest();
  return (best < 0 ? 0 : Math.min(best, EARTH) + 1) + loadUnlocked().length;
}
function renderMyStats() {
  var st = loadStats(), top = loadBest();
  $("myPosts").textContent = st.posts;
  var b = $("myBest"); b.textContent = "";
  if (st.best == null) b.textContent = "-"; else b.append(scoreSpan({ score: st.best }, "点"));
  if (top < 0) $("myTop").textContent = "-";
  else obf($("myTop"), LV[top].emoji + " " + (LV[top].name.length > 6 ? LV[top].name.slice(0, 6) + "…" : LV[top].name));
  $("mySecret").textContent = secretCount();
  renderBestPost();
}

// 自己ベストの投稿（結果まるごと。このブラウザだけに保存）
function loadBestPost() { try { return JSON.parse(localStorage.getItem("buzz_best_post") || "null"); } catch (e) { return null; } }
function saveBestPost(d) { try { localStorage.setItem("buzz_best_post", JSON.stringify(d)); } catch (e) {} }
function renderBestPost() {
  var bp = loadBestPost();
  var el = $("bestPost"); el.innerHTML = ""; el.classList.toggle("show", !!bp);
  if (!bp) return;
  var h = document.createElement("small"); h.textContent = "🏅 自己ベストの投稿";
  var t = document.createElement("div"); t.className = "bp-text"; t.textContent = bp.text;
  var m = document.createElement("div"); m.className = "bp-meta";
  m.append(obf(document.createElement("span"), bp.emoji + " " + bp.level + "レベル ・ "), scoreSpan(bp, "点"), " ・ ❤️ " + compactNum(bp.likes));
  var b = document.createElement("button"); b.className = "btn sub wide"; b.textContent = "この結果をもう一度見る";
  b.addEventListener("click", function () { Sound.init(); Sound.mood(Sound.forLevel(bp.levelIndex)); showResult(bp); });
  el.append(h, t, m, b);
}

function renderMap(nowIndex) {
  var unlocked = loadUnlocked(), best = loadBest();
  var map = $("map"); map.innerHTML = "";
  var strip = $("mapstrip"); strip.innerHTML = "";
  var fogged = LV.some(function (lv, i) { return !isVisible(i, unlocked); });
  LV.forEach(function (lv, i) {
    if (i === 7) { var d = document.createElement("li"); d.className = "divider"; map.append(d); }
    if (lv.h && i === LV.findIndex(function (x) { return x.h; }) && fogged) { var fl = document.createElement("li"); fl.className = "fogline"; map.append(fl); }
    if (!isVisible(i, unlocked)) {
      var f = document.createElement("li"); f.className = "fog"; f.style.opacity = Math.max(0.25, 0.75 - (i - 10) * 0.15);
      var fe = document.createElement("span"); fe.className = "me"; fe.textContent = "☁️";
      f.append(fe, obf(document.createElement("span"), "∬∃▽◇◎".slice(0, 2 + (i % 3))));
      map.append(f);
      var fs = document.createElement("span"); fs.textContent = "☁️"; fs.style.opacity = ".4"; strip.append(fs);
      return;
    }
    var open = !lv.s || unlocked.indexOf(i) >= 0;
    var li = document.createElement("li");
    li.className = (lv.s ? "secret " : "") + (open ? "" : "locked ") + (i <= best ? "reached " : "") + (i === best ? "best " : "") + (i === nowIndex ? "now" : "");
    var e = document.createElement("span"); e.className = "me"; e.textContent = open ? lv.emoji : "🔒";
    var n = document.createElement("span"); obf(n, open ? lv.name : "？？？");
    li.append(e, n); map.append(li);
    var s = document.createElement("span"); s.textContent = open ? lv.emoji : "❔"; strip.append(s);
  });
  $("unlockCount").textContent = "踏破 " + reachedCount() + " / " + LV.length;
}

// ── 入力欄 ──
var textEl = $("text"), postBtn = $("post"), avatar = $("avatar"), typingTimer;
textEl.addEventListener("input", function () {
  var n = textEl.value.length;
  $("count").textContent = n + " / 140";
  $("count").classList.toggle("warn", n > 120);
  postBtn.disabled = textEl.value.trim() === "";
  avatar.classList.add("typing");
  avatar.textContent = pickOne(["✍️", "🤔", "😏", "✍️"]);
  clearTimeout(typingTimer);
  typingTimer = setTimeout(function () { avatar.classList.remove("typing"); avatar.textContent = "😎"; }, 700);
});

function toast(text) {
  var t = document.createElement("div"); t.className = "toast"; obf(t, text);
  var box = $("toasts"); box.append(t);
  while (box.children.length > (innerWidth < 600 ? 2 : 4)) box.firstChild.remove(); setTimeout(function () { t.remove(); }, 2700);
}
function confetti(count) {
  var colors = ["#f472b6", "#60a5fa", "#facc15", "#34d399", "#c084fc", "#fb923c"];
  for (var i = 0; i < count; i++) {
    var c = document.createElement("div"); c.className = "confetti";
    c.style.left = Math.random() * 100 + "vw"; c.style.background = colors[i % colors.length];
    c.style.animationDuration = rnd(2, 4) + "s"; c.style.animationDelay = rnd(0, .6) + "s";
    document.body.append(c); setTimeout(c.remove.bind(c), 5000);
  }
}
function countUp(el, target, ms) {
  var start = performance.now();
  function tick(now) {
    var t = Math.min((now - start) / ms, 1), eased = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.floor(target * eased).toLocaleString();
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
function stars(parent, n) {
  for (var i = 0; i < n; i++) {
    var s = document.createElement("div"); s.className = "star";
    s.style.left = rnd(0, 100) + "%"; s.style.top = rnd(0, 100) + "%"; s.style.animationDelay = rnd(0, 2) + "s";
    parent.append(s);
  }
}

// ── 各段階のシーン（中身は固定の文字だけ。ユーザーの文章は入れない）──
var SCENES = [
  { cls: "s-home", sub: "寝転がっていた妹に、鼻で笑われた。", html:
    '<div class="zoom"><div class="wall"></div><div class="floor"></div><span class="e" style="left:14%;bottom:26%;font-size:min(14vw,120px)">📺</span>' +
    '<span class="e" style="left:72%;bottom:28%;font-size:min(12vw,100px)">🛋️</span><span class="e sis">🧍‍♀️</span><span class="e phone">📱</span>' +
    '<span class="e puff">💨</span><div class="bubble snort">フッ</div></div>' },
  { cls: "s-village", sub: "さびれた村に、乾いた風が吹いた。", html:
    '<div class="floor"></div><div class="zoom"><div class="kakashi"><div class="pole"></div><div class="bar"></div><div class="shirt"></div>' +
    '<div class="head">˘_˘</div><span class="hat">👒</span><span class="glove-l">🧤</span><span class="glove-r">🧤</span></div></div>' +
    '<span class="e grass" style="left:6%">🌾</span><span class="e grass" style="left:20%">🌾</span><span class="e grass" style="right:18%">🌾</span><span class="e grass" style="right:4%">🌾</span>' +
    '<div class="wind" style="top:20%;width:40vw"></div><div class="wind" style="top:35%;width:30vw;animation-delay:.4s"></div><div class="wind" style="top:55%;width:50vw;animation-delay:.8s"></div>' +
    '<span class="e" style="top:12%;font-size:min(8vw,60px);animation:heli 4s linear forwards">🐦‍⬛</span>' },
  { cls: "s-town", sub: "町内放送で読み上げられた。", html:
    '<div class="row"><span>🏪</span><span>🏠</span><span>🏢</span><span>🏠</span><span>🏪</span></div><span class="e speaker">📢</span><div class="wave"></div>' +
    '<div class="bubble announce">ピンポンパンポーン♪ 町内のみなさまにお知らせです</div>' +
    '<div class="crowd"><span>👵</span><span style="animation-delay:.1s">👴</span><span style="animation-delay:.2s">🧒</span><span style="animation-delay:.3s">👨‍🍳</span><span style="animation-delay:.15s">👏</span></div>' },
  { cls: "s-pref", sub: "県内ニュースで取り上げられた。", html:
    '<div class="tv"><div class="tag">県内ニュース</div><span class="e castle">🏯</span><span class="e anchor">🧑‍💼</span>' +
    '<div class="ticker"><span>【県内】あるツイートが県民の間で話題に　専門家「よくわからない」　県知事もコメントを検討中</span></div></div>' },
  { cls: "s-nation", sub: "全国ニュースの速報が流れた。", html:
    '<div class="sokuho">速 報</div><span class="e japan">🗾</span><div class="ripple"></div><div class="ripple" style="animation-delay:.5s"></div>' +
    '<div class="ripple" style="animation-delay:1s"></div><span class="e heli">🚁</span><div class="flash"></div>' },
  { cls: "s-asia", sub: "国境を越えて、アジア中に広がった。", html: function () {
    var h = '<span class="e globe">🌏</span>';
    // 国旗の絵文字は Windows で表示されないので、アジアっぽいモチーフにしている
    var flags = ["🏮", "🐼", "🛕", "🍜", "🥟", "🐘", "🧋", "🎎", "🐉", "🌶️"];
    flags.forEach(function (f, i) {
      var a = i / flags.length * Math.PI * 2, r = 36;
      h += '<span class="e flag" style="left:' + (50 + Math.cos(a) * r) + '%;top:' + (45 + Math.sin(a) * r * .8) + '%;--fx:' + (Math.cos(a) * 60) + 'vw;--fy:' + (Math.sin(a) * 60) + 'vh;animation-delay:' + (i * .08) + 's">' + f + '</span>';
    });
    ["대박!", "太厉害了!", "Viral!", "สุดยอด!", "Hay quá!", "बहुत बढ़िया!"].forEach(function (w, i) {
      h += '<span class="e word" style="left:' + rnd(8, 70) + '%;top:' + rnd(10, 70) + '%;animation-delay:' + (i * .3) + 's">' + w + '</span>';
    });
    return h; } },
  { cls: "s-earth", sub: "全世界トレンド1位。地球がざわついている。", html: function () {
    var h = '<span class="e planet">🌍</span><div class="orbit"><span style="left:min(30vw,260px)">🛰️</span><span style="left:max(-36vw,-300px);top:-20px">✈️</span></div>';
    for (var i = 0; i < 10; i++) h += '<div class="ping" style="left:' + rnd(38, 62) + '%;top:' + rnd(30, 60) + '%;animation-delay:' + rnd(0, 1) + 's"></div>';
    return h; } },
  { cls: "s-solar", sub: "太陽系の惑星たちが、全員いいねした。", html: function () {
    var h = '<span class="e sun">☀️</span>';
    var p = [["#a8a29e", 18], ["#fbbf24", 26], ["#3b82f6", 34], ["#ef4444", 42], ["#f59e0b", 52], ["🪐", 62]];
    p.forEach(function (x, i) {
      var size = "min(" + x[1] * 1.6 + "vw," + x[1] * 13 + "px)";
      var inner = x[0].charAt(0) === "#" ? '<i style="background:' + x[0] + '"></i>' : '<i style="font-size:28px;width:auto;top:-18px">' + x[0] + '</i>';
      h += '<div class="ring" style="width:' + size + ';height:' + size + ';translate:-50% -50%;animation-duration:' + (2 + i * 1.2) + 's">' + inner + '</div>';
    });
    return h; } },
  { cls: "s-galaxy", sub: "天の川が、あなたのツイートで満たされた。", html: '<div class="spiral"></div><div class="core"></div>' },
  { cls: "s-cluster", sub: "銀河たちが、あなたのツイートに引き寄せられてきた。", html: function () {
    var h = "";
    for (var i = 0; i < 14; i++) h += '<div class="mini" style="left:' + rnd(0, 88) + '%;top:' + rnd(0, 75) + '%;width:' + rnd(60, 200) + 'px;animation-delay:' + rnd(0, 1.2) + 's"></div>';
    return h; } },
  { cls: "s-universe", sub: "ビッグバン以来の大事件。宇宙が、加速した。", html: function () {
    var h = '<div class="bang"></div>';
    for (var i = 0; i < 70; i++) h += '<div class="streak" style="rotate:' + rnd(0, 360) + 'deg;animation-delay:' + rnd(0, .8) + 's"></div>';
    return h; } },
  { cls: "s-4d", sub: "時間がゆがんだ。過去と未来から、いいねが届く。", html: function () {
    var h = "";
    [40, 26, 14].forEach(function (s, i) { h += '<div class="cube" style="width:' + s + 'vmin;height:' + s + 'vmin;animation-duration:' + (3 + i) + 's"></div>'; });
    ["⏰", "⌛", "🦖", "⏱️", "🕰️", "🚀"].forEach(function (c) { h += '<span class="e clock" style="left:' + rnd(5, 85) + '%;top:' + rnd(8, 70) + '%">' + c + '</span>'; });
    return h; } },
  { cls: "s-kami", sub: "八百万の神々がひれ伏した。今日から、あなたが神じゃ。", html: function () {
    var h = '<div class="krays"></div><span class="e torii">⛩️</span>';
    [[-8, 66, 0], [62, 62, 1.5], [16, 76, 3], [76, 78, .8], [38, 82, 2.2]].forEach(function (c) {
      h += '<span class="cloud" style="left:' + c[0] + '%;top:' + c[1] + '%;animation-delay:-' + c[2] + 's">☁️</span>';
    });
    h += '<img class="kneel" src="/gods/praise.png" alt=""><div class="bubble haha">ははぁーっ！！</div>';
    for (var i = 0; i < 26; i++) h += '<span class="rise" style="left:' + rnd(0, 100) + '%;animation-duration:' + rnd(3, 6) + 's;animation-delay:-' + rnd(0, 6) + 's">✦</span>';
    return h; } },
  { cls: "s-glitch", sub: "∃∃∃ 観測 不能 ∃∃∃", html: function () {
    var syms = Array.from("∬∃@▽◇◎＄￡※⊆〒^");
    // 宇宙人のまわりを、記号の輪が2つ逆向きに回る（記号は文字化けし続ける）
    var h = "";
    [[86, 16, 16], [58, 10, -11]].forEach(function (g) {
      var size = "min(" + g[0] + "vmin," + Math.round(g[0] * 7) + "px)";
      h += '<div class="gring" style="width:' + size + ';height:' + size + ';animation-duration:' + Math.abs(g[2]) + 's' + (g[2] < 0 ? ';animation-direction:reverse' : '') + '">';
      for (var k = 0; k < g[1]; k++) {
        var a = k / g[1] * Math.PI * 2, c = syms[k % syms.length];
        h += '<span class="ob' + (c === "@" || c === "^" ? " n" : "") + '" style="left:' + (50 + Math.cos(a) * 50) + '%;top:' + (50 + Math.sin(a) * 50) + '%">' + c + '</span>';
      }
      h += "</div>";
    });
    h += '<div class="gtext"></div><img class="alienimg" src="/gods/alien.png" alt="">';
    for (var i = 0; i < 40; i++) {
      var ch = pickOne(syms);
      h += '<span class="sym ob' + (ch === "@" || ch === "^" ? " n" : "") + '" style="left:' + rnd(0, 100) + '%;animation-duration:' + rnd(1, 3) + 's;animation-delay:' + rnd(0, 2) + 's">' + ch + '</span>';
    }
    return h; } }
];

// ── パチンコ風カットイン（太陽系から上は、1段ごとに入る）──
var TIERS = [
  { cls: "t0", stamp: "チャンス!", color: "#3b82f6" }, { cls: "t1", stamp: "アツい!!", color: "#16a34a" }, { cls: "t2", stamp: "激アツ!!", color: "#dc2626" },
  { cls: "t3", stamp: "超激アツ!!!", color: "#eab308" }, { cls: "t4", stamp: "確定!?", color: "#db2777" }, { cls: "t5", stamp: "神確定", color: "#f59e0b" },
  { cls: "t6", stamp: "∃RR0R", color: "#22c55e" }
];
// 上昇の段取り。シークレットは「前に届いたことがある段」と「今回の到達段」だけ見せる（まだ見ていない段のネタバレを防ぐ）
// 通過するシークレットはだんだん速く、最後の1段の前で「溜め」て、最後はスローで大きく見せる
var TAME_MS = 1100;
function climbPlan(idx, seen) {
  var steps = [], pass = [];
  for (var i = 0; i <= idx; i++) {
    if (i < 7) steps.push({ i: i, ms: idx >= 7 ? 420 - i * 30 : 380 });   // シークレットまで行くときは、加速しながら突入する
    else if (i === idx) steps.push({ i: i, ms: i === GLITCH ? 3000 : i >= KAMI ? 2800 : 2400, k: 1.5, final: true });
    else if (seen.indexOf(i) >= 0) { var p = { i: i }; steps.push(p); pass.push(p); }
  }
  pass.forEach(function (p, j) {
    p.ms = Math.round(1250 - 550 * (pass.length > 1 ? j / (pass.length - 1) : 0));
    p.k = p.ms / 1600;
  });
  return steps;
}
function cutIn(stage, p, isNew) {
  var i = p.i, tier = i - 7;
  var c = document.createElement("div"); c.className = "cutin " + TIERS[tier].cls + (p.final ? " final" : "");
  c.style.setProperty("--d", p.ms + "ms"); c.style.setProperty("--k", p.k);
  c.innerHTML = '<div class="ci-lines"></div><div class="ci-band"><img class="ci-god" alt=""><div class="ci-txt"><div class="ci-label"></div><div class="ci-name"></div></div></div>' +
    '<div class="ci-stamp"></div>' + (p.final ? '<div class="ci-ring"></div>' : "") + '<div class="ci-flash"></div>';
  c.querySelector(".ci-god").src = "/gods/" + (i === GLITCH ? "alien" : i === KAMI ? "kami" : "praise") + ".png";
  c.querySelector(".ci-label").textContent = i <= 9 ? "SECRET " + (i - 6) : "ULTRA SECRET";
  var nm = c.querySelector(".ci-name"); nm.style.setProperty("--n", Array.from(LV[i].name).length); obf(nm, LV[i].name);
  obf(c.querySelector(".ci-stamp"), TIERS[tier].stamp);
  if (isNew) { var nb = document.createElement("div"); nb.className = "ci-new"; nb.textContent = "NEW!! 初到達"; c.append(nb); }
  stage.append(c);
  Sound.sfx("cutin", { tier: tier, k: p.k });
  return c;
}

var skipped = false;
async function wait(ms) { var t = 0; while (t < ms && !skipped) { await sleep(50); t += 50; } }

// seen：今回の投稿より前に届いたことのあるシークレットの番号
async function playCinema(d, seen) {
  var cinema = $("cinema"), stage = $("stage"), idx = d.levelIndex;
  skipped = false;
  cinema.classList.add("show");
  document.body.style.overflow = "hidden";
  Sound.mood("climb");

  // ① 上昇：家庭内から到達段階まで駆け上がる（シークレットはカットイン）
  var hud = document.createElement("div"); hud.className = "hud";
  hud.innerHTML = '<span>🔁 <b id="hrt">0</b></span><span class="l">❤️ <b id="hlike">0</b></span>';
  var climb = document.createElement("div"); climb.className = "climb";
  stage.innerHTML = ""; stage.append(climb, hud);
  var plan = climbPlan(idx, seen), total = idx >= 7 ? 1300 + TAME_MS : 0;
  plan.forEach(function (p) { total += p.ms; });
  countUp($("hlike"), d.likes, total + 300);
  countUp($("hrt"), d.retweets, total + 300);
  var prev = null;   // 1つ前のカットイン（次のカットインと少し重ねて、つなぎ目を見せない）
  for (var s = 0; s < plan.length && !skipped; s++) {
    var p = plan[s], i = p.i;
    if (i >= 7 && plan[s - 1].i < 7) {
      var w = document.createElement("div"); w.className = "warning"; w.textContent = "⚠ SECRET ZONE 突入 ⚠";
      stage.append(w); Sound.mood("secret"); Sound.sfx("siren");
      await wait(1300); w.remove();
      if (skipped) break;
    }
    var tm = null;
    if (p.final && i >= 7) {
      // 溜め：今のカットインが止まって暗くなり、心臓の音だけになる
      if (prev) prev.classList.add("freeze");
      tm = document.createElement("div"); tm.className = "tame"; tm.style.setProperty("--tc", TIERS[i - 7].color);
      tm.innerHTML = '<div class="tame-txt">！？</div>'; stage.append(tm);
      Sound.mood("tame");
      await wait(TAME_MS);
      if (skipped) break;
      Sound.mood("secret");
    }
    climb.style.background = CLIMB_BG[i];
    climb.innerHTML = '<div class="big">' + LV[i].emoji + '</div><div class="nm"></div>';
    obf(climb.querySelector(".nm"), LV[i].name);
    renderMap(i);
    toast("❤️ " + pickOne(LIKERS[i]) + "さんがいいねしました");
    Sound.sfx("blip", i);
    if (i < 7) { await wait(p.ms); continue; }
    var ci = cutIn(stage, p, seen.indexOf(i) < 0);
    if (prev) setTimeout(prev.remove.bind(prev), 300);
    if (tm) setTimeout(tm.remove.bind(tm), 300);
    prev = ci;
    await wait(p.ms);
  }

  // ② 到達した段階のシーン
  var sc = SCENES[idx];
  var scene = document.createElement("div"); scene.className = "scene " + sc.cls;
  scene.innerHTML = typeof sc.html === "function" ? sc.html() : sc.html;
  scene.querySelectorAll(".gtext").forEach(function (g) { obf(g, LV[GLITCH].name); });
  if (idx >= 7 && idx !== KAMI) stars(scene, 80);
  if (d.secret) {
    var u = document.createElement("div"); u.className = "unlock"; u.textContent = "🔓 SECRET UNLOCKED"; scene.append(u);
  }
  var cap = document.createElement("div"); cap.className = "caption";
  var lvEl = document.createElement("div"); lvEl.className = "lv"; obf(lvEl, d.emoji + " " + d.level + "レベル");
  var subEl = document.createElement("div"); subEl.className = "sub"; obf(subEl, sc.sub);
  cap.append(lvEl, subEl); scene.append(cap);
  stage.innerHTML = ""; stage.append(scene);
  Sound.mood(Sound.forLevel(idx));
  if (d.secret) Sound.sfx("unlock");
  if (idx >= 4) confetti(idx >= 7 ? 140 : 70);
  skipped = false;
  await wait(idx >= 7 ? 4200 : 3600);

  cinema.classList.remove("show");
  stage.innerHTML = "";
}
$("skip").addEventListener("click", function () { skipped = true; });

// ── 結果画面 ──
var AXES = [["empathy", "共感"], ["surprise", "意外性"], ["fun", "ネタ度"], ["spread", "拡散力"]];
var WHO = { roast: "😡 バズ神の講評（激辛）", cold: "😐 バズ神の講評（塩）", warm: "😏 バズ神の講評（なかなか）", good: "😆 バズ神の講評（ほめ）", praise: "😭 バズ神の講評（大絶賛）" };
var WHO_KAMI = "⛩️ バズ神の講評（ひれ伏し）", WHO_ALIEN = "👁️ ∃ズ神の講∬（解読不能）";
var SYMS = Array.from("∬∃▽◇◎＄￡※⊆〒");
var TAGS = { 6: ["MAX", "max"], 7: ["OVER!", ""], 8: ["OVER!!", ""], 9: ["OVER!!!", ""], 10: ["LIMIT BREAK", "blink"], 11: ["時空のゆがみ", "blink"], 12: ["神域", "max"], 13: ["∃RR0R", "blink"] };
var lastResult = null, shownResult = null;   // shownResult：いま結果画面に出している結果（自己ベストを開いたときはそれ）

function randSyms(n) { var s = ""; for (var i = 0; i < n; i++) s += pickOne(SYMS); return s; }

// ∬… の講評とリプライは記号の部分が文字化けする
function putText(el, text, idx) { if (idx === GLITCH) obf(el, text); else el.textContent = text; return el; }
// 講評を1文字ずつ打ち込む（吹き出しをクリックすると最後まで一気に出る）
// resultRun は結果画面を開くたび・閉じるたびに増える番号。古い打ち込みはそこで止まる
var resultRun = 0, typeSkip = false;
async function typeText(el, text, idx, run) {
  var chars = Array.from(text), pitch = idx >= EARTH ? 81 : idx >= 3 ? 72 : 67;
  typeSkip = false;
  el.textContent = ""; el.classList.add("typing");
  await sleep(450);
  for (var i = 0; i < chars.length && run === resultRun && !typeSkip; i++) {
    var shown = chars.slice(0, i + 1).join(""), c = chars[i];
    if (idx === GLITCH) obf(el, shown); else el.textContent = shown;
    if (i % 2 === 0 && c.trim()) Sound.sfx("type", pitch + (i % 3) * 2);
    await sleep("。！？!?".indexOf(c) >= 0 ? 320 : "、…".indexOf(c) >= 0 ? 160 : c === " " ? 30 : 55);
  }
  if (run !== resultRun) return false;
  putText(el, text, idx); el.classList.remove("typing");
  return true;
}
$("speech").addEventListener("click", function () { typeSkip = true; });

// バズ力と4つのパラメーター（地球から上は限界突破）
function renderScore(d) {
  var idx = d.levelIndex, pts = $("pts"), tag = TAGS[idx];
  $("ptsBox").className = "pts" + (idx >= 7 ? " over" : "");
  pts.classList.remove("flick");
  if (idx <= 10) countUp(pts, LIMIT[idx] ? LIMIT[idx][0] : d.score, 900); else putScore(pts, d.score, idx);
  if (idx === GLITCH) obf($("ptsMax"), "◎＄￡"); else $("ptsMax").textContent = "100";
  var lb = $("lb"); lb.className = "lb" + (tag && tag[1] ? " " + tag[1] : ""); obf(lb, tag ? tag[0] : "");
  $("scoreCard").classList.toggle("glitchbox", idx === GLITCH);

  var axes = $("axes"); axes.innerHTML = ""; var bars = [];
  axes.className = "axes" + (idx === EARTH ? " max" : idx >= 7 && idx <= 10 ? " over" : idx === FOURD ? " over warp" : idx === KAMI ? " over inf" : "");
  AXES.forEach(function (a) {
    var name = document.createElement("span");
    var bar = document.createElement("div"); bar.className = "bar"; var fill = document.createElement("i"); bar.append(fill);
    var val = document.createElement("b"), pct;
    if (idx === GLITCH) {
      obf(name, randSyms(3)); obf(val, randSyms(2) + " / " + randSyms(2)); pct = rnd(30, 180);
    } else if (idx === KAMI) {
      name.textContent = a[1]; val.textContent = "∞ / 25"; pct = 140;
    } else if (idx === FOURD) {
      name.textContent = a[1];
      var fs = document.createElement("span"); fs.className = "flick"; fs.dataset.flick = "axis"; fs.textContent = "25";
      val.append(fs, " / 25"); pct = 100;
    } else {
      var v = LIMIT[idx] ? LIMIT[idx][1] : d.axes[a[0]];
      name.textContent = a[1]; val.textContent = v + " / 25"; pct = v / 25 * 100;
    }
    axes.append(name, bar, val); bars.push([fill, pct]);
  });
  setTimeout(function () { bars.forEach(function (b) { b[0].style.width = b[1] + "%"; }); }, 60);
}

// ∬…：ふつうのバズ神が、バグって宇宙人に変身する
async function morphGod(g, pattern) {
  await sleep(1000); if (!g.isConnected) return;
  g.classList.add("morph"); Sound.sfx("morph");
  await sleep(750); if (!g.isConnected) return;
  // バズ神の真ん中から緑の輪が広がる（白い光で画面をちかちかさせない）
  var r = g.getBoundingClientRect(), ring = document.createElement("div"); ring.className = "morphring";
  ring.style.left = (r.left + r.width / 2) + "px"; ring.style.top = (r.top + r.height / 2) + "px";
  document.body.append(ring); setTimeout(ring.remove.bind(ring), 1000);
  g.src = "/gods/alien.png"; g.classList.remove("morph"); g.classList.add("emerge");
  obf($("who"), WHO_ALIEN + pattern);
}

async function showResult(d) {
  var res = $("result"), idx = d.levelIndex, pattern = d.pattern ? "　#" + d.pattern : "", run = ++resultRun;
  shownResult = d;
  res.classList.add("show"); res.scrollTop = 0;
  document.body.style.overflow = "hidden";
  var g = godImg(idx === KAMI ? "kami" : idx === GLITCH ? "praise" : d.tone);
  $("bigGod").innerHTML = ""; $("bigGod").append(g);
  $("speech").className = "speech " + (idx === KAMI ? "kami" : idx === GLITCH ? "glitch" : d.tone);
  obf($("who"), (idx === KAMI ? WHO_KAMI : WHO[d.tone]) + pattern);
  if (idx === GLITCH) morphGod(g, pattern);
  $("secretTag").innerHTML = d.secret ? '<span class="secretTag">🔓 SECRET</span>' : "";
  obf($("lvname"), d.emoji + " " + d.level + "レベル");
  $("rtext").textContent = d.text;
  $("rlike").textContent = d.likes.toLocaleString();
  $("rrt").textContent = d.retweets.toLocaleString();
  $("rrep").textContent = Math.floor(d.likes * 0.03).toLocaleString();
  renderScore(d);

  var box = $("replies"); box.innerHTML = "";
  if (idx >= EARTH) confetti(100);
  if (!(await typeText($("comment"), d.comment, idx, run))) return;
  for (var i = 0; i < d.replies.length && run === resultRun; i++) {
    var r = d.replies[i];
    var row = document.createElement("div"); row.className = "reply";
    var av = putText(document.createElement("div"), Array.from(r.name)[0], idx); av.className = "avatar";
    var body = document.createElement("div"); var head = document.createElement("div");
    var nm = putText(document.createElement("span"), r.name, idx); nm.className = "nm";
    var hd = document.createElement("span"); hd.className = "hd"; hd.textContent = "@" + r.handle;
    head.append(nm, hd); var tx = putText(document.createElement("div"), r.text, idx);
    body.append(head, tx); row.append(av, body); box.append(row);
    await sleep(60); row.classList.add("show"); await sleep(380);
  }
}
function closeResult() {
  $("result").classList.remove("show");
  $("testBadge").classList.remove("show"); $("admin").style.display = "";
  document.body.style.overflow = "";
  resultRun++;
  Sound.mood("idle");
  renderLast();
}
$("closeRes").addEventListener("click", closeResult);
$("resX").addEventListener("click", closeResult);

// 閉じたあと、入力欄の下に前回の結果を小さく出す
function renderLast() {
  var el = $("last"); if (!lastResult || lastResult.test) return;
  el.innerHTML = "";
  var t = document.createElement("div"); t.style.fontWeight = "800";
  t.append(obf(document.createElement("span"), "前回の結果：" + lastResult.emoji + " " + lastResult.level + "レベル（"), scoreSpan(lastResult, "点）"));
  var c = putText(document.createElement("div"), lastResult.comment, lastResult.levelIndex);
  c.style.cssText = "color:var(--sub);font-size:14px;margin:6px 0 10px";
  var b = document.createElement("button"); b.className = "btn sub"; b.textContent = "結果をもう一度見る";
  b.addEventListener("click", function () { Sound.mood(Sound.forLevel(lastResult.levelIndex)); showResult(lastResult); });
  el.append(t, c, b); el.classList.add("show");
}

// ── ポスト ──
postBtn.addEventListener("click", async function () {
  var text = textEl.value.trim(); if (!text) return;
  postBtn.disabled = true;
  Sound.sfx("post"); Sound.mood("judge"); preloadGods();

  // 審査中の画面
  var cinema = $("cinema"), stage = $("stage");
  stage.innerHTML = '<div class="judging"><div><div id="jg"></div><p>バズ神が審査中……</p></div><span class="glass">🔍</span></div>';
  $("jg").append(godImg("think"));
  cinema.classList.add("show"); document.body.style.overflow = "hidden";

  var started = Date.now();
  // 「バズの波」用に、見たことのある段階（上昇演出で通るふつうの段階＋届いたシークレット）と投稿回数も送る
  var seenAll = loadUnlocked().slice();
  for (var si = 0; si <= Math.min(loadBest(), EARTH); si++) seenAll.push(si);
  var req = { text: text, seen: seenAll, posts: loadStats().posts };
  var data = await fetch("/api/buzz", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(req) })
    .then(function (r) { return r.json(); }).catch(function () { return { error: "通信に失敗しました。もう一度試してください" }; });
  await sleep(Math.max(0, 1600 - (Date.now() - started)));
  if (data.error) { cinema.classList.remove("show"); document.body.style.overflow = ""; toast("⚠️ " + data.error); postBtn.disabled = false; Sound.mood("idle"); return; }
  lastResult = data;

  // シークレット解放と自己ベストの記録
  var prevBest = loadBest(), seen = loadUnlocked();
  var st = loadStats(); st.posts += 1;
  if (st.best == null || data.score > st.best) { st.best = data.score; saveBestPost(data); }
  saveStats(st);
  if (data.secret) {
    var u = loadUnlocked();
    if (u.indexOf(data.levelIndex) < 0) { u.push(data.levelIndex); saveUnlocked(u); setTimeout(function () { toast("🔓 シークレット「" + data.level + "」を解放！"); }, 400); }
    // 見えている最後のシークレット（銀河団）に初めて届いたら、霧の向こうをほのめかす
    if (data.levelIndex === 9 && seen.indexOf(9) < 0) setTimeout(function () { toast("🌫️ 霧の向こうに、まだ何かある気配がする……"); }, 2600);
  }
  if (data.levelIndex > prevBest) saveBest(data.levelIndex);

  if (data.wave) setTimeout(function () { toast("🌊 バズの波に乗った！ いつもより遠くまで届きそうじゃ……"); }, 300);
  await playCinema(data, seen);
  renderMap(data.levelIndex);
  renderMyStats(); loadTop3();
  if (data.levelIndex === GLITCH) renderMiniGod();   // ∬… に届いたら、トップのバズ神も宇宙人に
  postBtn.disabled = false;
  await showResult(data);
});

$("share").addEventListener("click", function () {
  var d = shownResult || lastResult;
  if (!d) return;
  var shareText = "「" + d.text + "」はバズ力" + scoreText(d.score, d.levelIndex) + "点で" + d.emoji + d.level + "レベルのバズ！ ❤️ " + d.likes.toLocaleString() + " #ツイートバズシミュレーター";
  window.open("https://x.com/intent/post?text=" + encodeURIComponent(shareText) + "&url=" + encodeURIComponent(location.origin + "/"), "_blank");
});
$("again").addEventListener("click", function () {
  closeResult();
  textEl.value = ""; textEl.dispatchEvent(new Event("input"));
  window.scrollTo({ top: 0, behavior: "smooth" }); textEl.focus();
});

// ── ランキング（ボタンを押したときだけ表示）──
// タブ：score＝バズ力ランキング / likes＝いいね数ランキング / history＝最新のバズ
var currentTab = "score";
var BOARD_URL = { score: "/api/ranking?by=score", likes: "/api/ranking", history: "/api/history" };
function openBoard() { $("boardModal").classList.add("show"); loadBoard(); }
function closeBoard() { $("boardModal").classList.remove("show"); }
$("openBoard").addEventListener("click", openBoard);
$("openBoard2").addEventListener("click", openBoard);
$("closeBoard").addEventListener("click", closeBoard);
$("boardModal").addEventListener("click", function (e) { if (e.target.id === "boardModal") closeBoard(); });
document.addEventListener("keydown", function (e) {
  if (e.key !== "Escape") return;
  closeBoard(); if ($("result").classList.contains("show")) closeResult();
});
document.querySelectorAll(".tab").forEach(function (t) {
  t.addEventListener("click", function () {
    document.querySelectorAll(".tab").forEach(function (x) { x.classList.toggle("on", x === t); });
    currentTab = t.dataset.tab; loadBoard();
  });
});
async function loadBoard() {
  var board = $("board"); board.innerHTML = "";
  var tab = currentTab;
  var items = await fetch(BOARD_URL[tab]).then(function (r) { return r.json(); }).catch(function () { return []; });
  if (tab !== currentTab) return;   // 読み込み中に別のタブを押されたら、古い結果は捨てる
  if (!items.length) { var e = document.createElement("li"); e.className = "empty"; e.textContent = "まだ投稿がありません。一番乗りしよう！"; board.append(e); return; }
  var medals = ["🥇", "🥈", "🥉"];
  items.forEach(function (item, i) {
    var li = document.createElement("li"); li.style.animationDelay = i * 0.03 + "s";
    var rank = document.createElement("span"); rank.className = "rank";
    rank.textContent = tab === "history" ? item.emoji : medals[i] || String(i + 1);
    var txt = document.createElement("span"); txt.className = "txt"; txt.textContent = item.text;
    var meta = document.createElement("span"); meta.className = "meta";
    var likes = "❤️ " + Number(item.likes).toLocaleString();
    if (tab !== "history") meta.append(item.emoji + " ");
    // 並べている数字を先に出す
    if (tab === "likes") meta.append(likes, " ・ ", scoreSpan(item, "点"));
    else meta.append(scoreSpan(item, "点 ・ "), likes);
    li.append(rank, txt, meta); board.append(li);
  });
}

// 右のTOP3：バズ力といいね数を切り替えられる
var top3By = "score";
document.querySelectorAll("#top3Tabs button").forEach(function (b) {
  b.addEventListener("click", function () {
    top3By = b.dataset.by;
    document.querySelectorAll("#top3Tabs button").forEach(function (x) { x.classList.toggle("on", x === b); });
    loadTop3();
  });
});
async function loadTop3() {
  var by = top3By;
  var items = await fetch(by === "score" ? "/api/ranking?by=score" : "/api/ranking").then(function (r) { return r.json(); }).catch(function () { return []; });
  if (by !== top3By) return;
  var ol = $("top3"); ol.innerHTML = "";
  if (!items.length) { var e = document.createElement("li"); e.className = "empty"; e.textContent = "まだ投稿がありません"; ol.append(e); }
  var medals = ["🥇", "🥈", "🥉"];
  items.slice(0, 3).forEach(function (item, i) {
    var li = document.createElement("li");
    var m = document.createElement("span"); m.textContent = medals[i];
    var t = document.createElement("span"); t.className = "t"; t.textContent = item.text;
    var s = document.createElement("span"); s.className = "s"; s.append(item.emoji + " ");
    if (by === "score") s.append(scoreSpan(item, "点")); else s.append("❤️ " + compactNum(item.likes));
    li.append(m, t, s); ol.append(li);
  });
  var stats = await fetch("/api/stats").then(function (r) { return r.json(); }).catch(function () { return null; });
  if (stats) $("postsCount").textContent = "（これまで " + Number(stats.posts).toLocaleString() + " 件）";
}

// ── テストモード ──
var adminKey = null;
try { adminKey = sessionStorage.getItem("buzz_admin"); } catch (e) {}
function showAdminPanel() {
  $("adminLogin").style.display = "none"; $("adminPanel").style.display = "block";
  var grid = $("adminGrid"); grid.innerHTML = "";
  LV.forEach(function (lv, i) {
    var b = document.createElement("button"); if (lv.s) b.className = "sec";
    obf(b, lv.emoji + " " + lv.name); b.title = lv.name;
    b.addEventListener("click", function () { runTest(i); });
    grid.append(b);
  });
}
async function adminCheck(key) {
  var r = await fetch("/api/admin/check", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ key: key }) });
  return r.ok;
}
async function runTest(level) {
  var r = await fetch("/api/admin/test", { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ key: adminKey, level: level, text: textEl.value }) });
  var data = await r.json();
  if (!r.ok) { toast("⚠️ " + data.error); return; }
  lastResult = data; preloadGods();
  $("admin").style.display = "none"; $("testBadge").classList.add("show");
  await playCinema(data, loadUnlocked());
  await showResult(data);
}
if (new URLSearchParams(location.search).has("admin") || adminKey) {
  $("admin").classList.add("show");
  if (adminKey) adminCheck(adminKey).then(function (ok) { if (ok) showAdminPanel(); else { adminKey = null; } });
}
$("adminGo").addEventListener("click", async function () {
  var key = $("adminKey").value;
  if (await adminCheck(key)) {
    adminKey = key; try { sessionStorage.setItem("buzz_admin", key); } catch (e) {}
    showAdminPanel(); toast("🧪 テストモードに入りました");
  } else toast("⚠️ 合言葉が違います");
});
$("adminKey").addEventListener("keydown", function (e) { if (e.key === "Enter") $("adminGo").click(); });
$("adminHead").addEventListener("click", function (e) { if (e.target.id !== "adminOut") $("admin").classList.toggle("fold"); });
$("adminOut").addEventListener("click", function () {
  try { sessionStorage.removeItem("buzz_admin"); } catch (e) {}
  adminKey = null; $("admin").classList.remove("show");
});

// ── 右パネルのミニバズ神 ──
// ∬… に届いたことがあるブラウザでは、トップのバズ神も宇宙人のまま。ヒントも宇宙人の言葉になる（記号は文字化けする）
var ALIEN_TIPS = [
  "オチ ヲ ツケル ト 点 ガ ∬∃ ノビル ノジャ", "「」 ヲ ツカウ ト ◎◎ ウケル ノジャ", "最後 ノ 一行 デ ⊆〒⊆ 裏切ル ノジャ",
  "ハッシュタグ ハ 2コ マデ ＄＄ ソレ イジョウ ハ ノイズ", "ワシ ノ 目 ハ 7ツ。ドノ 目 デモ アナタ ヲ 見テ オル",
  "∃∃∃ ワシ ハ モウ 元ニ 戻レン ∃∃∃ 気ニ スルナ", "右下 デ 音量 ヲ ▽◇ カエラレル ノジャ", "アナタ ハ 霧 ノ 向コウ ヲ ※※ 見タ。ワシ モ 見タ"
];
function isAlienGod() { return loadUnlocked().indexOf(GLITCH) >= 0; }
function renderMiniGod() {
  var alien = isAlienGod();
  $("miniGod").innerHTML = ""; $("miniGod").append(godImg(alien ? "alien" : "idle"));
  $("tip").classList.toggle("alien", alien);
  nextTip();
}
function nextTip() { if (isAlienGod()) obf($("tip"), pickOne(ALIEN_TIPS)); else $("tip").textContent = pickOne(TIPS); }
renderMiniGod(); setInterval(nextTip, 7000);

renderMap(-1);
renderMyStats();
loadTop3();
</script>
</body>
</html>`;
