// 画面（HTML / CSS / ブラウザ側のJavaScript）
// String.raw を使っているので、中の \ はそのままブラウザに届く
export const HTML = String.raw`<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ツイートバズシミュレーター</title>
<meta name="description" content="バズ神があなたのツイートを採点。家庭内から地球まで、その先にはシークレットの世界が……">
<meta property="og:type" content="website">
<meta property="og:title" content="🚀 ツイートバズシミュレーター">
<meta property="og:description" content="バズ神があなたのツイートを採点。家庭内から地球まで、その先にはシークレットの世界が……">
<meta property="og:url" content="https://buzz-sim.kira-buzz.workers.dev/">
<meta property="og:site_name" content="ツイートバズシミュレーター">
<meta property="og:image" content="https://buzz-sim.kira-buzz.workers.dev/ogp.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://buzz-sim.kira-buzz.workers.dev/ogp.png">
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
    min-height: 100vh; color: var(--text); background: var(--bg);
    font-family: "M PLUS Rounded 1c", system-ui, sans-serif;
    background-image: radial-gradient(circle at 15% 0%, #1b2440 0, transparent 45%),
                      radial-gradient(circle at 90% 40%, #2a1533 0, transparent 40%);
    background-attachment: fixed;
  }
  button { font: inherit; color: inherit; }

  /* ── 3カラムレイアウト（広い画面では左右にパネル）── */
  .layout { display: grid; grid-template-columns: 1fr; gap: 24px; max-width: 1240px; margin: 0 auto; padding: 24px 16px 80px; }
  .side { display: none; }
  @media (min-width: 1100px) {
    .layout { grid-template-columns: 280px minmax(0, 600px) 280px; justify-content: center; }
    .side { display: block; position: sticky; top: 24px; align-self: start; }
    .mapstrip { display: none !important; }
  }
  .panel { background: rgba(18,20,28,.85); border: 1px solid var(--line); border-radius: 18px; padding: 16px; backdrop-filter: blur(6px); }
  .panel h3 { margin: 0 0 12px; font-size: 15px; display: flex; justify-content: space-between; align-items: center; }
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

  /* 右：ランキングTOP3と記録 */
  .top3 { list-style: none; margin: 0 0 12px; padding: 0; }
  .top3 li { display: flex; gap: 8px; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--line); font-size: 13px; }
  .top3 .t { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .top3 .s { color: var(--sub); white-space: nowrap; }
  .top3 .empty { color: var(--sub); }
  .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .stat { background: var(--panel2); border: 1px solid var(--line); border-radius: 12px; padding: 10px; }
  .stat small { display: block; color: var(--sub); font-size: 11px; }
  .stat b { font-size: 20px; font-variant-numeric: tabular-nums; }
  .wide { width: 100%; }
  .mini-god { display: flex; gap: 10px; align-items: flex-end; }
  .mini-god svg { width: 72px; flex: none; }
  .tip { background: var(--panel2); border: 1px solid var(--line); border-radius: 12px 12px 12px 2px; padding: 10px 12px; font-size: 13px; line-height: 1.5; }

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
  .mapstrip { display: flex; justify-content: center; gap: 4px; margin-top: 12px; font-size: 18px; flex-wrap: wrap; }
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
  .btn { border: 0; border-radius: 999px; padding: 10px 22px; font-weight: 800; font-size: 15px; cursor: pointer; color: #fff; background: var(--blue);
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
  .admin { position: fixed; left: 16px; bottom: 16px; z-index: 40; width: min(320px, calc(100vw - 32px)); background: #0f172a; border: 2px dashed #22c55e;
    border-radius: 16px; padding: 12px; font-size: 13px; display: none; box-shadow: 0 10px 40px rgba(0,0,0,.5); }
  .admin.show { display: block; }
  .admin.fold #adminPanel, .admin.fold #adminLogin { display: none !important; }
  .admin h4 { cursor: pointer; margin: 0 0 8px; color: #4ade80; display: flex; justify-content: space-between; align-items: center; }
  .admin .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
  .admin .grid button { border: 1px solid #334155; background: #1e293b; border-radius: 8px; padding: 6px 4px; cursor: pointer; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .admin .grid button:hover { background: #334155; }
  .admin .grid button.sec { border-color: #7c3aed; }
  .admin input { width: 100%; padding: 8px; border-radius: 8px; border: 1px solid #334155; background: #020617; color: var(--text); font: inherit; margin-bottom: 8px; }
  .admin .mini { background: none; border: 0; color: var(--sub); cursor: pointer; font-size: 12px; }
  .testbadge { position: fixed; left: 50%; bottom: 12px; white-space: nowrap; transform: translateX(-50%); z-index: 80; background: #16a34a; color: #fff; font-weight: 800; padding: 4px 14px;
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
  .caption .lv { font-size: clamp(30px, 7vw, 72px); font-weight: 800; text-shadow: 0 4px 24px rgba(0,0,0,.7); animation: popin .6s .2s cubic-bezier(.2,1.6,.4,1) both; }
  .caption .sub { font-size: clamp(14px, 2.4vw, 22px); margin-top: 6px; text-shadow: 0 2px 10px rgba(0,0,0,.8); animation: fadein .6s .7s both; }
  @keyframes popin { from { transform: scale(.3); opacity: 0; } }
  @keyframes fadein { from { opacity: 0; transform: translateY(10px); } }
  .skip { position: absolute; right: 16px; top: 16px; z-index: 9; background: rgba(0,0,0,.5); border: 1px solid rgba(255,255,255,.3); border-radius: 999px;
    padding: 6px 14px; cursor: pointer; font-size: 13px; }
  .hud { position: absolute; left: 16px; top: 16px; z-index: 9; display: flex; gap: 14px; font-weight: 800; font-size: clamp(14px, 2.4vw, 20px);
    background: rgba(0,0,0,.45); border-radius: 14px; padding: 8px 14px; font-variant-numeric: tabular-nums; }
  .hud .l { color: var(--pink); }

  /* 審査中 */
  .judging { position: absolute; inset: 0; display: grid; place-items: center; background: radial-gradient(circle, #1e1b4b, #000); }
  .judging .god { width: min(260px, 50vw); animation: float 2s ease-in-out infinite; }
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
    font-weight: 800; font-size: clamp(28px, 7vw, 64px); color: #f0abfc; text-shadow: 0 0 20px #c026d3; animation: blink .25s steps(2) 6; text-align: center; }
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
  .s-nation .flash { position: absolute; inset: 0; background: #fff; opacity: 0; animation: flash 2s .4s steps(1) 2; }
  @keyframes flash { 0%, 6%, 12%, 40%, 46% { opacity: 0; } 3%, 9%, 43% { opacity: .8; } }
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
  .s-glitch { background: #000; animation: gshake .15s infinite; }
  @keyframes gshake { 25% { transform: translate(4px, -3px); } 50% { transform: translate(-5px, 2px); } 75% { transform: translate(2px, 4px); filter: invert(1); } }
  .gtext { position: absolute; left: 50%; top: 28%; transform: translate(-50%, -50%); font-size: clamp(30px, 8vw, 90px); font-weight: 800; white-space: nowrap;
    text-shadow: -4px 0 #f0f, 4px 0 #0ff; animation: gt .3s steps(2) infinite; }
  @keyframes gt { 50% { text-shadow: 4px 0 #f0f, -4px 0 #0ff; transform: translate(-49%, -51%) skewX(10deg); } }
  .sym { position: absolute; top: -10%; color: #0f0; font-weight: 800; animation: rain linear infinite; font-size: 22px; }
  @keyframes rain { to { transform: translateY(120vh); } }
  .eye { left: 50%; top: 54%; transform: translate(-50%, -50%); font-size: min(20vw, 160px); animation: blink2 1s infinite; }
  @keyframes blink2 { 90% { transform: translate(-50%, -50%) scaleY(1); } 95% { transform: translate(-50%, -50%) scaleY(.1); } }
  .unlock { position: absolute; left: 50%; top: 9%; transform: translateX(-50%); z-index: 6; background: linear-gradient(90deg, #7c3aed, #db2777); padding: 8px 18px;
    border-radius: 999px; font-weight: 800; white-space: nowrap; animation: popin .6s cubic-bezier(.2,1.6,.4,1) both; box-shadow: 0 0 30px #c026d3; }

  /* ── 結果画面（スクロールなしで講評が見える）── */
  #result { background: rgba(5,6,10,.94); backdrop-filter: blur(8px); overflow-y: auto; }
  .res { min-height: 100%; max-width: 1100px; margin: 0 auto; padding: 24px 16px; display: grid; gap: 20px; align-content: center;
    grid-template-columns: 1fr; }
  @media (min-width: 860px) { .res { grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr); align-items: center; } }
  .godbox { display: flex; flex-direction: column; align-items: center; gap: 12px; }
  .godbox .god { width: min(240px, 46vw); animation: float 2.4s ease-in-out infinite; }
  .speech { position: relative; width: 100%; border-radius: 20px; padding: 18px 20px; font-size: clamp(16px, 2vw, 19px); line-height: 1.7; min-height: 120px;
    border: 2px solid; animation: popin .5s cubic-bezier(.2,1.4,.4,1) both; }
  .speech::before { content: ""; position: absolute; top: -14px; left: 50%; margin-left: -12px; border: 12px solid transparent; border-top: 0; border-bottom: 14px solid; border-bottom-color: inherit; }
  .speech .who { font-weight: 800; font-size: 13px; margin-bottom: 6px; display: block; }
  .speech.roast  { background: linear-gradient(135deg, #3b0d0d, #1a0707); border-color: #ef4444; }
  .speech.roast .who { color: #f87171; }
  .speech.cold   { background: linear-gradient(135deg, #1b2230, #11151d); border-color: #64748b; }
  .speech.cold .who { color: #94a3b8; }
  .speech.praise { background: linear-gradient(135deg, #3b2a05, #1c1404); border-color: #facc15; box-shadow: 0 0 40px rgba(250,204,21,.3); }
  .speech.praise .who { color: #facc15; }
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
  .resbtns { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-top: 14px; }

  /* バズ神の表情切り替え */
  .god .m { display: none; }
  .god[data-mood="idle"] .m-idle, .god[data-mood="think"] .m-think, .god[data-mood="roast"] .m-roast,
  .god[data-mood="cold"] .m-cold, .god[data-mood="praise"] .m-praise { display: inline; }
  .god .aura { transition: fill .4s; }
  .god[data-mood="roast"] .aura { fill: #ef4444; } .god[data-mood="cold"] .aura { fill: #64748b; }
  .god[data-mood="praise"] .aura { fill: #facc15; } .god[data-mood="think"] .aura, .god[data-mood="idle"] .aura { fill: #818cf8; }
  .god[data-mood="roast"] { animation: float 2.4s ease-in-out infinite, angry .25s infinite; }
  @keyframes angry { 50% { translate: 2px 0; } }
  .tear { animation: tear 1s linear infinite; }
  @keyframes tear { from { transform: translateY(0); opacity: 1; } to { transform: translateY(26px); opacity: 0; } }

  /* 紙吹雪 */
  .confetti { position: fixed; top: -12px; width: 8px; height: 14px; z-index: 60; pointer-events: none; animation: fall linear forwards; }
  @keyframes fall { to { transform: translateY(110vh) rotate(720deg); } }

  /* ランキングのモーダル */
  #boardModal { background: rgba(0,0,0,.6); display: none; place-items: center; padding: 16px; }
  #boardModal.show { display: grid; }
  .modal { width: min(560px, 100%); max-height: 86vh; display: flex; flex-direction: column; background: var(--panel); border: 1px solid var(--line); border-radius: 20px;
    animation: popin .3s ease both; overflow: hidden; }
  .modal header { display: flex; align-items: center; gap: 8px; padding: 14px; border-bottom: 1px solid var(--line); }
  .tab { flex: 1; text-align: center; padding: 9px; border-radius: 12px; cursor: pointer; color: var(--sub); font-weight: 800; border: 1px solid var(--line); background: transparent; }
  .tab.on { color: var(--text); background: var(--panel2); border-color: #3b4252; }
  .close { background: none; border: 0; font-size: 22px; cursor: pointer; padding: 4px 8px; color: var(--sub); }
  .board { list-style: none; padding: 0; margin: 0; overflow-y: auto; }
  .board li { display: flex; gap: 12px; align-items: center; padding: 12px 14px; border-bottom: 1px solid var(--line); animation: fadein .4s ease backwards; }
  .board .rank { width: 28px; text-align: center; font-weight: 800; color: var(--sub); flex: none; }
  .board .txt { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .board .meta { color: var(--sub); font-size: 13px; white-space: nowrap; }
  .board .empty { color: var(--sub); justify-content: center; }

  .toasts { position: fixed; right: 16px; top: 16px; display: flex; flex-direction: column; gap: 8px; z-index: 70; max-width: calc(100vw - 32px); pointer-events: none; }
  .toast { background: rgba(18,20,28,.95); border: 1px solid var(--line); border-radius: 12px; padding: 10px 14px; font-size: 14px; animation: toast 2.6s ease forwards; }
  @keyframes toast { 0% { transform: translateX(120%); } 12%, 85% { transform: none; opacity: 1; } 100% { opacity: 0; } }

  @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition: none !important; } }
</style>
</head>
<body>
<!-- バズ神のキャラクター（SVG）。data-mood で表情が変わる -->
<template id="godTpl">
<svg class="god" data-mood="idle" viewBox="0 0 200 230" xmlns="http://www.w3.org/2000/svg" aria-label="バズ神">
  <ellipse class="aura" cx="100" cy="120" rx="92" ry="100" opacity=".18"/>
  <!-- 後光 -->
  <ellipse cx="100" cy="22" rx="42" ry="9" fill="none" stroke="#fde047" stroke-width="6"/>
  <!-- ローブ -->
  <path d="M48 150 Q100 120 152 150 L166 222 Q100 232 34 222 Z" fill="#f8fafc"/>
  <path d="M98 140 L102 140 L106 222 L94 222 Z" fill="#facc15"/>
  <path d="M34 222 Q100 232 166 222" fill="none" stroke="#facc15" stroke-width="5"/>
  <!-- いいね笏 -->
  <rect x="152" y="118" width="6" height="90" rx="3" fill="#a16207"/>
  <path d="M155 120 C140 104 146 88 155 98 C164 88 170 104 155 120 Z" fill="#f91880"/>
  <circle cx="155" cy="150" r="9" fill="#ffe0bd"/>
  <circle cx="44" cy="168" r="9" fill="#ffe0bd"/>
  <!-- 髪とヒゲ（ヒゲは吹き出しの形） -->
  <circle cx="58" cy="78" r="22" fill="#fff"/><circle cx="142" cy="78" r="22" fill="#fff"/>
  <circle cx="70" cy="52" r="22" fill="#fff"/><circle cx="130" cy="52" r="22" fill="#fff"/><circle cx="100" cy="42" r="24" fill="#fff"/>
  <circle cx="100" cy="88" r="44" fill="#ffe0bd"/>
  <path d="M58 100 Q60 150 100 152 Q140 150 142 100 Q120 116 100 112 Q80 116 58 100 Z" fill="#fff"/>
  <path d="M86 150 L80 166 L100 152 Z" fill="#fff"/>
  <!-- 月桂冠と青い鳥 -->
  <path d="M62 66 Q100 50 138 66" fill="none" stroke="#16a34a" stroke-width="6" stroke-linecap="round"/>
  <ellipse cx="70" cy="62" rx="7" ry="4" fill="#22c55e" transform="rotate(-30 70 62)"/><ellipse cx="130" cy="62" rx="7" ry="4" fill="#22c55e" transform="rotate(30 130 62)"/>
  <ellipse cx="86" cy="56" rx="7" ry="4" fill="#22c55e" transform="rotate(-15 86 56)"/><ellipse cx="114" cy="56" rx="7" ry="4" fill="#22c55e" transform="rotate(15 114 56)"/>
  <path d="M92 40 Q100 26 112 34 Q118 30 122 34 Q114 36 114 42 Q108 52 94 48 Q88 46 92 40 Z" fill="#1d9bf0"/>
  <circle cx="110" cy="36" r="1.8" fill="#fff"/>
  <!-- ほっぺ -->
  <ellipse cx="72" cy="102" rx="8" ry="5" fill="#fca5a5" opacity=".7"/><ellipse cx="128" cy="102" rx="8" ry="5" fill="#fca5a5" opacity=".7"/>
  <!-- 表情：ふつう -->
  <g class="m m-idle"><circle cx="84" cy="88" r="5" fill="#1f2937"/><circle cx="116" cy="88" r="5" fill="#1f2937"/>
    <path d="M90 108 Q100 116 110 108" fill="none" stroke="#7c2d12" stroke-width="3" stroke-linecap="round"/></g>
  <!-- 表情：審査中（片目を細めて虫眼鏡） -->
  <g class="m m-think"><path d="M78 88 L90 88" stroke="#1f2937" stroke-width="4" stroke-linecap="round"/><circle cx="116" cy="88" r="6" fill="#1f2937"/>
    <circle cx="116" cy="88" r="16" fill="rgba(186,230,253,.35)" stroke="#a16207" stroke-width="4"/><path d="M128 100 L146 120" stroke="#a16207" stroke-width="6" stroke-linecap="round"/>
    <path d="M92 110 L108 108" stroke="#7c2d12" stroke-width="3" stroke-linecap="round"/></g>
  <!-- 表情：毒舌（怒り） -->
  <g class="m m-roast"><path d="M74 76 L94 84" stroke="#1f2937" stroke-width="5" stroke-linecap="round"/><path d="M126 76 L106 84" stroke="#1f2937" stroke-width="5" stroke-linecap="round"/>
    <circle cx="85" cy="92" r="4.5" fill="#1f2937"/><circle cx="115" cy="92" r="4.5" fill="#1f2937"/>
    <path d="M86 114 Q100 104 114 114" fill="none" stroke="#7c2d12" stroke-width="4" stroke-linecap="round"/>
    <path d="M136 48 l6 -6 l2 8 l8 -2 l-6 6 l6 6 l-8 -2 l-2 8 l-2 -8 l-8 2 l6 -6 z" fill="#ef4444"/></g>
  <!-- 表情：塩対応（半目と汗） -->
  <g class="m m-cold"><path d="M76 88 L92 88" stroke="#1f2937" stroke-width="4" stroke-linecap="round"/><path d="M108 88 L124 88" stroke="#1f2937" stroke-width="4" stroke-linecap="round"/>
    <path d="M78 92 Q84 95 90 92" fill="none" stroke="#1f2937" stroke-width="2"/><path d="M110 92 Q116 95 122 92" fill="none" stroke="#1f2937" stroke-width="2"/>
    <path d="M92 110 L108 110" stroke="#7c2d12" stroke-width="3" stroke-linecap="round"/>
    <path d="M138 70 Q144 80 138 84 Q132 80 138 70 Z" fill="#7dd3fc"/></g>
  <!-- 表情：絶賛（号泣） -->
  <g class="m m-praise"><path d="M76 90 Q84 80 92 90" fill="none" stroke="#1f2937" stroke-width="4" stroke-linecap="round"/>
    <path d="M108 90 Q116 80 124 90" fill="none" stroke="#1f2937" stroke-width="4" stroke-linecap="round"/>
    <path d="M84 104 Q100 128 116 104 Z" fill="#7c2d12"/><path d="M90 112 Q100 120 110 112" fill="#f87171"/>
    <rect class="tear" x="80" y="94" width="5" height="12" rx="2.5" fill="#7dd3fc"/><rect class="tear" x="115" y="94" width="5" height="12" rx="2.5" fill="#7dd3fc" style="animation-delay:.5s"/>
    <path d="M40 40 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3 l8 -3 z" fill="#facc15"/><path d="M160 30 l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2 l6 -2 z" fill="#facc15"/></g>
</svg>
</template>

<div class="toasts" id="toasts"></div>

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
      <h3>🏆 ランキング TOP3</h3>
      <ol class="top3" id="top3"></ol>
      <button class="btn sub wide" id="openBoard2">すべて見る</button>
    </div>
    <div class="panel">
      <h3>📊 あなたの記録 <small>このブラウザ</small></h3>
      <div class="stats">
        <div class="stat"><small>投稿回数</small><b id="myPosts">0</b></div>
        <div class="stat"><small>自己ベスト</small><b id="myBest">-</b></div>
        <div class="stat"><small>最高到達</small><b id="myTop" style="font-size:15px">-</b></div>
        <div class="stat"><small>シークレット</small><b id="mySecret">0 / 6</b></div>
      </div>
    </div>
  </aside>
</div>

<!-- 全画面演出 -->
<div class="overlay" id="cinema"><div id="stage"></div><button class="skip" id="skip">スキップ ▶▶</button></div>

<!-- 結果画面 -->
<div class="overlay" id="result">
  <div class="res">
    <div class="godbox">
      <div id="bigGod"></div>
      <div class="speech" id="speech"><span class="who" id="who"></span><span id="comment"></span></div>
    </div>
    <div class="card">
      <div class="scorebox">
        <div id="secretTag"></div>
        <div class="lvname" id="lvname"></div>
        <div class="pts">バズ力 <b id="pts">0</b> / 100</div>
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
      <button class="tab on" data-tab="ranking">🏆 ランキング</button>
      <button class="tab" data-tab="history">🕒 最新のバズ</button>
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

// 段階（サーバーの LEVELS と同じ順番）
var LV = [
  { name: "家庭内", emoji: "🏠" }, { name: "村", emoji: "🌾" }, { name: "町", emoji: "🏘️" }, { name: "県", emoji: "🏯" },
  { name: "全国", emoji: "🗾" }, { name: "アジア", emoji: "🌏" }, { name: "地球", emoji: "🌍" },
  { name: "太陽系", emoji: "☀️", s: 1 }, { name: "銀河", emoji: "🌌", s: 1 }, { name: "銀河団", emoji: "✨", s: 1 },
  { name: "宇宙", emoji: "🌠", s: 1 }, { name: "四次元", emoji: "🌀", s: 1 }, { name: "∬∃@▽◇◎＄￡※⊆〒^^", emoji: "👁️", s: 1 }
];
var CLIMB_BG = ["#3b2c22", "#9a3412", "#0369a1", "#1e3a5f", "#7f1d1d", "#0f766e", "#0c4a6e", "#000", "#1e1b4b", "#2e1065", "#020617", "#3b0764", "#000"];
var LIKERS = [
  ["妹", "母", "飼い犬"], ["かかし", "村長", "田んぼのカエル"], ["商店街のおじさん", "町内会長", "駅前のパン屋"],
  ["県庁広報課", "地元テレビ", "ご当地キャラ"], ["人気芸人", "朝の情報番組", "トレンドbot"], ["ソウルの人", "台北の人", "バンコクの人"],
  ["ハリウッドスター", "NASA職員", "南極のペンギン"], ["太陽", "火星探査機", "冥王星"], ["宇宙人", "織姫", "流れ星"],
  ["アンドロメダ銀河", "暗黒物質", "天文学者"], ["ビッグバン", "宇宙そのもの", "光"], ["恐竜", "未来人", "過去のあなた"], ["∃∃∃", "◎◎◎", "????"]
];
var TIPS = [
  "オチがあると点が伸びるのじゃ。", "会話形式は強いのじゃ。「」を使ってみるのじゃ。", "ハッシュタグは2個までにしておくのじゃ。",
  "仕事・家族・睡眠……みんなの「あるある」を狙うのじゃ。", "長すぎても短すぎてもいかんのじゃ。", "地球の先にも、まだ世界があるらしいのじゃ……",
  "最後の一行で裏切るのじゃ。", "みんなが参加したくなるお題も強いのじゃ。"
];

function godSVG(mood) {
  var node = $("godTpl").content.firstElementChild.cloneNode(true);
  node.setAttribute("data-mood", mood || "idle");
  return node;
}

// ── 解放したシークレット（このブラウザだけに保存）──
function loadUnlocked() { try { return JSON.parse(localStorage.getItem("buzz_unlocked") || "[]"); } catch (e) { return []; } }
function saveUnlocked(list) { try { localStorage.setItem("buzz_unlocked", JSON.stringify(list)); } catch (e) {} }
function loadStats() { try { return JSON.parse(localStorage.getItem("buzz_stats") || '{"posts":0,"best":null}'); } catch (e) { return { posts: 0, best: null }; } }
function saveStats(v) { try { localStorage.setItem("buzz_stats", JSON.stringify(v)); } catch (e) {} }
function renderMyStats() {
  var st = loadStats(), top = loadBest();
  $("myPosts").textContent = st.posts;
  $("myBest").textContent = st.best == null ? "-" : st.best + "点";
  $("myTop").textContent = top < 0 ? "-" : LV[top].emoji + " " + (LV[top].name.length > 6 ? LV[top].name.slice(0, 6) + "…" : LV[top].name);
  $("mySecret").textContent = loadUnlocked().length + " / 6";
}
function loadBest() { try { return Number(localStorage.getItem("buzz_best") || -1); } catch (e) { return -1; } }
function saveBest(v) { try { localStorage.setItem("buzz_best", String(v)); } catch (e) {} }

function renderMap(nowIndex) {
  var unlocked = loadUnlocked(), best = loadBest();
  var map = $("map"); map.innerHTML = "";
  var strip = $("mapstrip"); strip.innerHTML = "";
  LV.forEach(function (lv, i) {
    var open = !lv.s || unlocked.indexOf(i) >= 0;
    if (i === 7) { var d = document.createElement("li"); d.className = "divider"; map.append(d); }
    var li = document.createElement("li");
    li.className = (lv.s ? "secret " : "") + (open ? "" : "locked ") + (i <= best ? "reached " : "") + (i === best ? "best " : "") + (i === nowIndex ? "now" : "");
    var e = document.createElement("span"); e.className = "me"; e.textContent = open ? lv.emoji : "🔒";
    var n = document.createElement("span"); n.textContent = open ? lv.name : "？？？";
    li.append(e, n); map.append(li);
    var s = document.createElement("span"); s.textContent = open ? lv.emoji : "❔"; strip.append(s);
  });
  $("unlockCount").textContent = "シークレット " + unlocked.length + " / 6";
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
  var t = document.createElement("div"); t.className = "toast"; t.textContent = text;
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
  { cls: "s-glitch", sub: "∃∃∃ 観測 不能 ∃∃∃", html: function () {
    var h = '<div class="gtext">∬∃@▽◇◎＄￡※⊆〒^^</div><span class="e eye">👁️</span>';
    var syms = "∬∃@▽◇◎＄￡※⊆〒^^";
    for (var i = 0; i < 40; i++) h += '<span class="sym" style="left:' + rnd(0, 100) + '%;animation-duration:' + rnd(1, 3) + 's;animation-delay:' + rnd(0, 2) + 's">' + syms.charAt(Math.floor(rnd(0, syms.length))) + '</span>';
    return h; } }
];

var skipped = false;
async function wait(ms) { var t = 0; while (t < ms && !skipped) { await sleep(50); t += 50; } }

async function playCinema(d) {
  var cinema = $("cinema"), stage = $("stage");
  skipped = false;
  cinema.classList.add("show");
  document.body.style.overflow = "hidden";

  // ① 上昇：家庭内から到達段階まで駆け上がる
  var hud = document.createElement("div"); hud.className = "hud";
  hud.innerHTML = '<span>🔁 <b id="hrt">0</b></span><span class="l">❤️ <b id="hlike">0</b></span>';
  var climb = document.createElement("div"); climb.className = "climb";
  stage.innerHTML = ""; stage.append(climb, hud);
  var per = d.levelIndex >= 7 ? 260 : 380;
  countUp($("hlike"), d.likes, per * (d.levelIndex + 1) + 300);
  countUp($("hrt"), d.retweets, per * (d.levelIndex + 1) + 300);
  for (var i = 0; i <= d.levelIndex && !skipped; i++) {
    if (i === 7) {
      var w = document.createElement("div"); w.className = "warning"; w.textContent = "⚠ SECRET ZONE 突入 ⚠";
      stage.append(w); await wait(1300); w.remove();
    }
    climb.style.background = CLIMB_BG[i];
    climb.innerHTML = '<div class="big">' + LV[i].emoji + '</div><div class="nm">' + LV[i].name + '</div>';
    renderMap(i);
    var liker = pickOne(LIKERS[i]);
    toast("❤️ " + liker + "さんがいいねしました");
    await wait(per);
  }

  // ② 到達した段階のシーン
  var sc = SCENES[d.levelIndex];
  var scene = document.createElement("div"); scene.className = "scene " + sc.cls;
  scene.innerHTML = typeof sc.html === "function" ? sc.html() : sc.html;
  if (d.levelIndex >= 7) stars(scene, 80);
  if (d.secret) {
    var u = document.createElement("div"); u.className = "unlock"; u.textContent = "🔓 SECRET UNLOCKED"; scene.append(u);
  }
  var cap = document.createElement("div"); cap.className = "caption";
  var lvEl = document.createElement("div"); lvEl.className = "lv"; lvEl.textContent = d.emoji + " " + d.level + "レベル";
  var subEl = document.createElement("div"); subEl.className = "sub"; subEl.textContent = sc.sub;
  cap.append(lvEl, subEl); scene.append(cap);
  stage.innerHTML = ""; stage.append(scene);
  if (d.levelIndex >= 4) confetti(d.levelIndex >= 7 ? 140 : 70);
  skipped = false;
  await wait(d.levelIndex >= 7 ? 4200 : 3600);

  cinema.classList.remove("show");
  stage.innerHTML = "";
}
$("skip").addEventListener("click", function () { skipped = true; });

// ── 結果画面 ──
var AXES = [["empathy", "共感"], ["surprise", "意外性"], ["fun", "ネタ度"], ["spread", "拡散力"]];
var WHO = { roast: "😡 バズ神の講評（激辛）", cold: "😐 バズ神の講評（塩）", praise: "😭 バズ神の講評（大絶賛）" };
var lastResult = null;

async function typeText(el, text) {
  el.textContent = "";
  var chars = Array.from(text);
  for (var i = 0; i < chars.length; i++) { el.textContent += chars[i]; await sleep(26); }
}

async function showResult(d) {
  var res = $("result");
  res.classList.add("show"); res.scrollTop = 0;
  document.body.style.overflow = "hidden";
  $("bigGod").innerHTML = ""; $("bigGod").append(godSVG(d.tone));
  $("speech").className = "speech " + d.tone;
  $("who").textContent = WHO[d.tone] + (d.pattern ? "　#" + d.pattern : "");
  $("secretTag").innerHTML = d.secret ? '<span class="secretTag">🔓 SECRET</span>' : "";
  $("lvname").textContent = d.emoji + " " + d.level + "レベル";
  $("rtext").textContent = d.text;
  $("rlike").textContent = d.likes.toLocaleString();
  $("rrt").textContent = d.retweets.toLocaleString();
  $("rrep").textContent = Math.floor(d.likes * 0.03).toLocaleString();
  countUp($("pts"), d.score, 900);

  var axes = $("axes"); axes.innerHTML = ""; var bars = [];
  AXES.forEach(function (a) {
    var name = document.createElement("span"); name.textContent = a[1];
    var bar = document.createElement("div"); bar.className = "bar"; var fill = document.createElement("i"); bar.append(fill);
    var val = document.createElement("b"); val.textContent = d.axes[a[0]] + " / 25";
    axes.append(name, bar, val); bars.push([fill, d.axes[a[0]]]);
  });
  setTimeout(function () { bars.forEach(function (b) { b[0].style.width = (b[1] / 25 * 100) + "%"; }); }, 60);

  var box = $("replies"); box.innerHTML = "";
  if (d.levelIndex >= 6) confetti(100);
  await typeText($("comment"), d.comment);
  for (var i = 0; i < d.replies.length; i++) {
    var r = d.replies[i];
    var row = document.createElement("div"); row.className = "reply";
    var av = document.createElement("div"); av.className = "avatar"; av.textContent = Array.from(r.name)[0];
    var body = document.createElement("div"); var head = document.createElement("div");
    var nm = document.createElement("span"); nm.className = "nm"; nm.textContent = r.name;
    var hd = document.createElement("span"); hd.className = "hd"; hd.textContent = "@" + r.handle;
    head.append(nm, hd); var tx = document.createElement("div"); tx.textContent = r.text;
    body.append(head, tx); row.append(av, body); box.append(row);
    await sleep(60); row.classList.add("show"); await sleep(380);
  }
}
function closeResult() {
  $("result").classList.remove("show");
  $("testBadge").classList.remove("show"); $("admin").style.display = "";
  document.body.style.overflow = "";
  renderLast();
}
$("closeRes").addEventListener("click", closeResult);

// 閉じたあと、入力欄の下に前回の結果を小さく出す
function renderLast() {
  var el = $("last"); if (!lastResult || lastResult.test) return;
  el.innerHTML = "";
  var t = document.createElement("div"); t.style.fontWeight = "800";
  t.textContent = "前回の結果：" + lastResult.emoji + " " + lastResult.level + "レベル（" + lastResult.score + "点）";
  var c = document.createElement("div"); c.style.cssText = "color:var(--sub);font-size:14px;margin:6px 0 10px";
  c.textContent = lastResult.comment;
  var b = document.createElement("button"); b.className = "btn sub"; b.textContent = "結果をもう一度見る";
  b.addEventListener("click", function () { showResult(lastResult); });
  el.append(t, c, b); el.classList.add("show");
}

// ── ポスト ──
postBtn.addEventListener("click", async function () {
  var text = textEl.value.trim(); if (!text) return;
  postBtn.disabled = true;

  // 審査中の画面
  var cinema = $("cinema"), stage = $("stage");
  stage.innerHTML = '<div class="judging"><div><div id="jg"></div><p>バズ神が審査中……</p></div><span class="glass">🔍</span></div>';
  $("jg").append(godSVG("think"));
  cinema.classList.add("show"); document.body.style.overflow = "hidden";

  var started = Date.now();
  var res = await fetch("/api/buzz", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: text }) });
  var data = await res.json();
  await sleep(Math.max(0, 1600 - (Date.now() - started)));
  if (data.error) { cinema.classList.remove("show"); document.body.style.overflow = ""; toast("⚠️ " + data.error); postBtn.disabled = false; return; }
  lastResult = data;

  // シークレット解放と自己ベストの記録
  var st = loadStats(); st.posts += 1; if (st.best == null || data.score > st.best) st.best = data.score; saveStats(st);
  if (data.secret) {
    var u = loadUnlocked();
    if (u.indexOf(data.levelIndex) < 0) { u.push(data.levelIndex); saveUnlocked(u); setTimeout(function () { toast("🔓 シークレット「" + data.level + "」を解放！"); }, 400); }
  }
  if (data.levelIndex > loadBest()) saveBest(data.levelIndex);

  await playCinema(data);
  renderMap(data.levelIndex);
  renderMyStats(); loadTop3();
  postBtn.disabled = false;
  await showResult(data);
});

$("share").addEventListener("click", function () {
  if (!lastResult) return;
  var d = lastResult;
  var shareText = "「" + d.text + "」はバズ力" + d.score + "点で" + d.emoji + d.level + "レベルのバズ！ ❤️ " + d.likes.toLocaleString() + " #ツイートバズシミュレーター";
  window.open("https://x.com/intent/post?text=" + encodeURIComponent(shareText) + "&url=" + encodeURIComponent(location.origin + "/"), "_blank");
});
$("again").addEventListener("click", function () {
  closeResult();
  textEl.value = ""; textEl.dispatchEvent(new Event("input"));
  window.scrollTo({ top: 0, behavior: "smooth" }); textEl.focus();
});

// ── ランキング（ボタンを押したときだけ表示）──
var currentTab = "ranking";
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
  var items = await fetch("/api/" + currentTab).then(function (r) { return r.json(); });
  if (!items.length) { var e = document.createElement("li"); e.className = "empty"; e.textContent = "まだ投稿がありません。一番乗りしよう！"; board.append(e); return; }
  var medals = ["🥇", "🥈", "🥉"];
  items.forEach(function (item, i) {
    var li = document.createElement("li"); li.style.animationDelay = i * 0.03 + "s";
    var rank = document.createElement("span"); rank.className = "rank";
    rank.textContent = currentTab === "ranking" ? (medals[i] || String(i + 1)) : item.emoji;
    var txt = document.createElement("span"); txt.className = "txt"; txt.textContent = item.text;
    var meta = document.createElement("span"); meta.className = "meta";
    meta.textContent = (currentTab === "ranking" ? item.emoji + " " : "") + (item.score != null ? item.score + "点 ・ " : "") + "❤️ " + Number(item.likes).toLocaleString();
    li.append(rank, txt, meta); board.append(li);
  });
}

async function loadTop3() {
  var items = await fetch("/api/ranking").then(function (r) { return r.json(); }).catch(function () { return []; });
  var ol = $("top3"); ol.innerHTML = "";
  if (!items.length) { var e = document.createElement("li"); e.className = "empty"; e.textContent = "まだ投稿がありません"; ol.append(e); }
  var medals = ["🥇", "🥈", "🥉"];
  items.slice(0, 3).forEach(function (item, i) {
    var li = document.createElement("li");
    var m = document.createElement("span"); m.textContent = medals[i];
    var t = document.createElement("span"); t.className = "t"; t.textContent = item.text;
    var s = document.createElement("span"); s.className = "s"; s.textContent = item.emoji + " " + item.score + "点";
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
    b.textContent = lv.emoji + " " + lv.name; b.title = lv.name;
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
  lastResult = data;
  $("admin").style.display = "none"; $("testBadge").classList.add("show");
  await playCinema(data);
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
$("miniGod").append(godSVG("idle"));
function nextTip() { $("tip").textContent = pickOne(TIPS); }
nextTip(); setInterval(nextTip, 7000);

renderMap(-1);
renderMyStats();
loadTop3();
</script>
</body>
</html>`;
