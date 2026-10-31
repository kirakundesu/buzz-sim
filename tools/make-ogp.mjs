// OGP画像（public/ogp.png、1200×630）を作るスクリプト
// 使い方：node tools/make-ogp.mjs   （npm run ogp でも同じ）
// バズ神の1コマを make-gods.mjs から大きく描き、下の HTML に入れて、パソコンの Chrome（なければ Edge）で撮影する
// 文字は Google Fonts の M PLUS Rounded 1c を使うので、ネットにつながっている必要がある

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { still } from "./make-gods.mjs";

const BROWSERS = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
].filter(Boolean);
const browser = BROWSERS.find((p) => existsSync(p));
if (!browser) throw new Error("Chrome か Edge が見つかりません。CHROME_PATH に場所を指定してください");

const work = join(tmpdir(), "buzz-ogp");
mkdirSync(work, { recursive: true });
writeFileSync(join(work, "god.png"), still("praise", 6, 480));

// 星（毎回同じ位置になるように、決まった順番で散らす）
let seed = 7, stars = "";
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
for (let i = 0; i < 46; i++) {
  const s = rnd() < 0.2 ? 3 : 2;
  stars += `<i class="star" style="left:${(rnd() * 1200).toFixed(0)}px;top:${(rnd() * 630).toFixed(0)}px;width:${s}px;height:${s}px;opacity:${(0.3 + rnd() * 0.6).toFixed(2)}"></i>`;
}

const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@800&display=block" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; }
  html, body { width: 1200px; height: 630px; overflow: hidden; }
  body { position: relative; background: #07080d; color: #eef1f6; font-family: "M PLUS Rounded 1c", sans-serif; font-weight: 800;
    background-image: radial-gradient(circle at 12% 0%, #1b2440 0, transparent 50%), radial-gradient(circle at 86% 52%, #3a1840 0, transparent 46%); }
  .star { position: absolute; border-radius: 50%; background: #fff; }
  /* バズ神の後ろ：カットインと同じ集中線と光 */
  .glow { position: absolute; left: 985px; top: 300px; width: 560px; height: 560px; margin: -280px; border-radius: 50%;
    background: radial-gradient(circle, rgba(250,204,21,.38), transparent 66%); }
  .burst { position: absolute; left: 985px; top: 300px; width: 1100px; height: 1100px; margin: -550px; border-radius: 50%;
    background: repeating-conic-gradient(rgba(250,204,21,.45) 0 1.4deg, transparent 1.4deg 7.5deg);
    -webkit-mask: radial-gradient(circle, transparent 15%, #000 26%, transparent 49%); mask: radial-gradient(circle, transparent 15%, #000 26%, transparent 49%); }
  .god { position: absolute; left: 745px; top: 26px; width: 480px; filter: drop-shadow(0 0 24px rgba(250,204,21,.35)); }
  .stamp { position: absolute; right: 44px; bottom: 50px; rotate: -10deg; font-size: 52px; color: #fff; padding: 0 22px 4px; border: 6px solid #fff;
    border-radius: 16px; background: #dc2626; box-shadow: 0 0 44px #dc2626; text-shadow: 0 3px 0 rgba(0,0,0,.35); }
  .left { position: absolute; left: 72px; top: 56px; width: 680px; }
  .pill { display: inline-block; padding: 7px 22px 9px; border-radius: 999px; font-size: 25px; background: linear-gradient(90deg, #7c3aed, #db2777); }
  h1 { margin-top: 20px; font-size: 76px; line-height: 1.14; letter-spacing: -.01em;
    background: linear-gradient(90deg, #7dd3fc, #a78bfa 48%, #f472b6); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .sub { margin-top: 22px; font-size: 30px; line-height: 1.55; color: #d6dbe6; }
  .sub em { font-style: normal; color: #fde047; }
  /* 段階の並び：7つの絵文字 → シークレット3つ → 霧の4つ（全部で14） */
  .row { position: absolute; left: 70px; bottom: 50px; display: flex; align-items: center; gap: 8px; font-size: 36px;
    font-family: "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif; }
  .q { width: 44px; height: 44px; border-radius: 10px; display: grid; place-items: center; font-family: "M PLUS Rounded 1c"; font-size: 26px;
    color: #c4b5fd; background: rgba(124,58,237,.25); border: 2px solid #7c3aed; }
  .fog { opacity: .5; filter: grayscale(1) blur(1px); }
  .sep { font-family: "M PLUS Rounded 1c"; color: #64748b; font-size: 26px; margin: 0 2px; }
</style></head><body>
${stars}
<div class="glow"></div><div class="burst"></div>
<img class="god" src="god.png" alt="">
<div class="stamp">激アツ!!</div>
<div class="left">
  <span class="pill">バズ神があなたのツイートを採点</span>
  <h1>ツイート<br>バズシミュレーター</h1>
  <p class="sub">家庭内から地球、その先まで<em>全14段階</em>。<br>霧の向こうには、まだ何かある……</p>
</div>
<div class="row">
  <span>🏠</span><span>🌾</span><span>🏘️</span><span>🏯</span><span>🗾</span><span>🌏</span><span>🌍</span>
  <span class="sep">›</span><span class="q">?</span><span class="q">?</span><span class="q">?</span>
  <span class="sep">›</span><span class="fog">☁️</span><span class="fog">☁️</span><span class="fog">☁️</span><span class="fog">☁️</span>
</div>
</body></html>`;
writeFileSync(join(work, "ogp.html"), html);

const out = resolve("public/ogp.png");
execFileSync(browser, [
  "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
  "--window-size=1200,630", "--virtual-time-budget=10000", `--screenshot=${out}`, pathToFileURL(join(work, "ogp.html")).href,
], { stdio: "ignore" });
console.log("public/ogp.png を作りました");
