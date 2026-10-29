// スマホ（390×844）と PC（1280×800）で画面を撮り、横にはみ出した要素を出すスクリプト
// 使い方（Git Bash でも PowerShell でも同じ）：先に npx wrangler dev で起動してから
//   node scripts/responsive-check.mjs http://localhost:8787
// 撮った画像は responsive-shots/ に入る（Git には入れない）。横スクロールがあると終了コード 1
// パソコンの Chrome（なければ Edge）を使うので、ブラウザのダウンロードはいらない
import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";

const base = process.argv[2] || "http://localhost:8787";
const out = "responsive-shots";
const viewports = [
  { name: "mobile", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  { name: "desktop", viewport: { width: 1280, height: 800 } },
];

// 見る場面：トップ、結果画面、ランキング、全画面演出（カットイン）。演出はアニメを止めてから撮る
const FAKE = `({ text: "月曜の朝、母に「起きなさい」と言われた。\\n日曜だった。", levelIndex: 6, level: "地球", emoji: "🌍", tone: "praise", pattern: "家族",
  score: 75, axes: { empathy: 19, surprise: 19, fun: 19, spread: 18 }, likes: 12345678, retweets: 2345678, secret: false,
  comment: "ちょっと待って、地球の自転が一瞬止まって、あなたのツイートを読んでおったのじゃ！！ 読んだ人全員が実家に電話したのじゃ！！",
  replies: [{ name: "南極のペンギン", handle: "penguin_antarctica", text: "（氷の上で拍手）" }, { name: "NASA職員", handle: "nasa_staff_x", text: "Even we saw this from space" },
    { name: "全国のおかん", handle: "okan_all", text: "うちの子もこうなってほしい" }] })`;
const STATES = [
  { name: "top", full: true, setup: "" },
  { name: "result", setup: `showResult(${FAKE}); typeSkip = true;`, wait: 2500 },
  { name: "ranking", setup: "openBoard();", wait: 1500 },
  { name: "cutin", setup: `document.getElementById("cinema").classList.add("show");
    cutIn(document.getElementById("stage"), { i: 10, ms: 2400, k: 1.5, final: true }, true);
    var st = document.createElement("style"); st.textContent = "*, *::before, *::after { animation-play-state: paused !important; animation-delay: -1.4s !important; } .ci-flash, .ci-ring { display: none !important; }";
    document.head.append(st);`, wait: 800 },
];

mkdirSync(out, { recursive: true });
let browser;
try { browser = await chromium.launch({ channel: "chrome" }); } catch { browser = await chromium.launch({ channel: "msedge" }); }
let failed = 0;
for (const { name, ...options } of viewports) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const state of STATES) {
    await page.goto(base + "/", { waitUntil: "networkidle" });
    await page.waitForTimeout(800); // 文字・画像・遅れて出る部分を待つ
    if (state.setup) { await page.evaluate(state.setup); await page.waitForTimeout(state.wait || 800); }
    const result = await page.evaluate(() => {
      const width = document.documentElement.clientWidth;
      const outside = [...document.querySelectorAll("body *")].filter((el) => {
        if (el.closest(".overlay") && !el.closest(".overlay.show")) return false;
        if (el.classList.contains("confetti")) return false;   // 紙吹雪は画面の外へ落ちていく飾りなので数えない
        const r = el.getBoundingClientRect();
        if (!(r.width > 0 && r.height > 0 && (r.right > width + 1 || r.left < -1))) return false;
        // overflow で切り取られている親の中なら、画面には出ていないので数えない
        for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
          const o = getComputedStyle(p).overflowX;
          if (o !== "visible") { const pr = p.getBoundingClientRect(); if (pr.right <= width + 1 && pr.left >= -1) return false; }
        }
        return true;
      });
      const wide = outside.filter((el) => !outside.includes(el.parentElement)).slice(0, 5)
        .map((el) => el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + "." + [...el.classList].slice(0, 3).join("."));
      return { scrollWidth: document.documentElement.scrollWidth, width, wide };
    });
    const ok = result.scrollWidth <= result.width && result.wide.length === 0;
    if (!ok) failed++;
    console.log(`${ok ? "OK" : "NG"} ${name.padEnd(7)} ${state.name.padEnd(8)} (${result.scrollWidth}/${result.width})`, ok ? "" : result.wide);
    await page.screenshot({ path: `${out}/${state.name}--${name}.png`, fullPage: !!state.full });
  }
  if (errors.length) { failed++; console.log(`NG ${name} ページのエラー:`, errors); }
  await context.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
