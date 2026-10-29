// バズ神のアニメーション画像（APNG）を作るスクリプト
// 使い方：node tools/make-gods.mjs            → public/gods/*.png を作り直す
//         node tools/make-gods.mjs <フォルダ>  → ついでに確認用のコマ画像をそのフォルダに書き出す
// 1コマずつ SVG を組み立てて resvg で画像にし、UPNG でアニメPNGにまとめる

import { Resvg } from "@resvg/resvg-js";
import UPNG from "upng-js";
import { mkdirSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const N = 24;                       // 1ループのコマ数
const W = 300, H = 330;             // 出力サイズ（viewBox 240×264 の 1.25 倍）
const VB = "-20 -24 240 264";       // 元の絵（200×230）のまわりに余白をつけた範囲
const COLORS = 192;                 // 色数（減らすほどファイルが小さくなる）
const TAU = Math.PI * 2;
const sin = Math.sin, cos = Math.cos;
const f = (n) => Math.round(n * 100) / 100;

// ── 部品 ──
const aura = (color, op = 0.18, k = 1) =>
  `<ellipse cx="100" cy="120" rx="${f(92 * k)}" ry="${f(100 * k)}" fill="${color}" opacity="${f(op)}"/>`;
const halo = (y = 22, op = 1) =>
  `<ellipse cx="100" cy="${f(y)}" rx="42" ry="9" fill="none" stroke="#fde047" stroke-width="6" opacity="${f(op)}"/>`;
const robe = (fill = "#f8fafc", trim = "#facc15") =>
  `<path d="M48 150 Q100 120 152 150 L166 222 Q100 232 34 222 Z" fill="${fill}"/>` +
  `<path d="M98 140 L102 140 L106 222 L94 222 Z" fill="${trim}"/>` +
  `<path d="M34 222 Q100 232 166 222" fill="none" stroke="${trim}" stroke-width="5"/>`;
const staff = (k = 1) =>
  `<rect x="152" y="118" width="6" height="90" rx="3" fill="#a16207"/>` +
  `<g transform="translate(155 108) scale(${f(k)}) translate(-155 -108)"><path d="M155 120 C140 104 146 88 155 98 C164 88 170 104 155 120 Z" fill="#f91880"/></g>` +
  `<circle cx="155" cy="150" r="9" fill="#ffe0bd"/>`;
const leftHand = `<circle cx="44" cy="168" r="9" fill="#ffe0bd"/>`;
const hair =
  `<circle cx="58" cy="78" r="22" fill="#fff"/><circle cx="142" cy="78" r="22" fill="#fff"/>` +
  `<circle cx="70" cy="52" r="22" fill="#fff"/><circle cx="130" cy="52" r="22" fill="#fff"/><circle cx="100" cy="42" r="24" fill="#fff"/>`;
const skin = `<circle cx="100" cy="88" r="44" fill="#ffe0bd"/>`;
const beard =
  `<path d="M58 100 Q60 150 100 152 Q140 150 142 100 Q120 116 100 112 Q80 116 58 100 Z" fill="#fff"/>` +
  `<path d="M86 150 L80 166 L100 152 Z" fill="#fff"/>`;
const laurel =
  `<path d="M62 66 Q100 50 138 66" fill="none" stroke="#16a34a" stroke-width="6" stroke-linecap="round"/>` +
  `<ellipse cx="70" cy="62" rx="7" ry="4" fill="#22c55e" transform="rotate(-30 70 62)"/><ellipse cx="130" cy="62" rx="7" ry="4" fill="#22c55e" transform="rotate(30 130 62)"/>` +
  `<ellipse cx="86" cy="56" rx="7" ry="4" fill="#22c55e" transform="rotate(-15 86 56)"/><ellipse cx="114" cy="56" rx="7" ry="4" fill="#22c55e" transform="rotate(15 114 56)"/>`;
const cheeks = `<ellipse cx="72" cy="102" rx="8" ry="5" fill="#fca5a5" opacity=".7"/><ellipse cx="128" cy="102" rx="8" ry="5" fill="#fca5a5" opacity=".7"/>`;
const bird = ({ dy = 0, wing = 0, sleep = false } = {}) =>
  `<g transform="translate(0 ${f(dy)})">` +
  `<path d="M92 40 Q100 26 112 34 Q118 30 122 34 Q114 36 114 42 Q108 52 94 48 Q88 46 92 40 Z" fill="#1d9bf0"/>` +
  `<g transform="rotate(${f(wing)} 101 43)"><path d="M101 43 Q93 32 86 37 Q90 46 101 45 Z" fill="#0c7abf"/></g>` +
  (sleep ? `<path d="M107 36 Q110 39 113 36" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round"/>`
         : `<circle cx="110" cy="36" r="1.8" fill="#fff"/>`) + `</g>`;
const star4 = (x, y, r, fill = "#facc15", op = 1) =>
  `<path d="M${f(x)} ${f(y - r)} L${f(x + r * 0.28)} ${f(y - r * 0.28)} L${f(x + r)} ${f(y)} L${f(x + r * 0.28)} ${f(y + r * 0.28)} L${f(x)} ${f(y + r)} ` +
  `L${f(x - r * 0.28)} ${f(y + r * 0.28)} L${f(x - r)} ${f(y)} L${f(x - r * 0.28)} ${f(y - r * 0.28)} Z" fill="${fill}" opacity="${f(op)}"/>`;
const rays = (n, rot, color, op, R = 150, cx = 100, cy = 92) => {
  let s = `<g mask="url(#fade)"><g transform="rotate(${f(rot)} ${cx} ${cy})" opacity="${f(op)}">`;
  const half = (TAU / n) * 0.22;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * TAU;
    s += `<path d="M${cx} ${cy} L${f(cx + R * cos(a - half))} ${f(cy + R * sin(a - half))} L${f(cx + R * cos(a + half))} ${f(cy + R * sin(a + half))} Z" fill="${color}"/>`;
  }
  return s + `</g></g>`;
};
const text = (x, y, size, fill, str, op = 1) =>
  `<text x="${f(x)}" y="${f(y)}" font-family="Arial" font-weight="bold" font-size="${f(size)}" fill="${fill}" opacity="${f(op)}">${str}</text>`;
// t（0〜1）の中で a〜b の区間だけ 0→1 に進む値。区間外は -1
const seg = (t, a, b) => (t >= a && t < b ? (t - a) / (b - a) : -1);

// 人間の神さまの体（表情・前後の飾りだけ差し替える）
function body({ dx = 0, dy = 0, rot = 0, face, back = "", front = "", birdOpt, heart = 1, auraStr, haloStr = halo(), robeStr = robe() }) {
  return auraStr + back +
    `<g transform="translate(${f(dx)} ${f(dy)}) rotate(${f(rot)} 100 150)">` +
    haloStr + robeStr + staff(heart) + leftHand + hair + skin + beard + laurel + bird(birdOpt) + cheeks + face +
    `</g>` + front;
}

// ── 表情 ──
const eyesOpen = `<circle cx="84" cy="88" r="5" fill="#1f2937"/><circle cx="116" cy="88" r="5" fill="#1f2937"/>`;
const eyesShut = `<path d="M79 89 Q84 92 89 89" fill="none" stroke="#1f2937" stroke-width="3" stroke-linecap="round"/><path d="M111 89 Q116 92 121 89" fill="none" stroke="#1f2937" stroke-width="3" stroke-linecap="round"/>`;
const smile = `<path d="M90 108 Q100 116 110 108" fill="none" stroke="#7c2d12" stroke-width="3" stroke-linecap="round"/>`;

const MOODS = {
  // ふつう：まばたき、鳥がぴょんと跳ねて羽ばたく、ハートが脈打つ
  idle: { delay: 90, frame(i, t) {
    const hop = Math.max(seg(t, 0.12, 0.3), seg(t, 0.58, 0.76));
    const blink = i === 9 || i === 10;
    return body({
      dy: 2 * sin(TAU * t),
      auraStr: aura("#818cf8"),
      birdOpt: { dy: hop >= 0 ? -9 * sin(Math.PI * hop) : 0, wing: hop >= 0 ? -45 * Math.abs(sin(Math.PI * 3 * hop)) : 0 },
      heart: 1 + 0.14 * Math.max(0, sin(TAU * 2 * t)),
      face: (blink ? eyesShut : eyesOpen) + smile,
    });
  } },

  // 審査中：虫眼鏡がゆらゆら、？が浮かぶ
  think: { delay: 80, frame(i, t) {
    const a = 9 * sin(TAU * t), mx = 4 * sin(TAU * t), my = 3 * cos(TAU * t);
    let q = "";
    [[150, 0], [34, 0.33], [166, 0.66]].forEach(([x, ph], k) => {
      const p = (t + ph) % 1;
      q += text(x + 5 * sin(TAU * p), 46 - 58 * p, 18 + 6 * p, k === 1 ? "#c4b5fd" : "#a5b4fc", "?", sin(Math.PI * p));
    });
    const face =
      `<path d="M78 88 L90 88" stroke="#1f2937" stroke-width="4" stroke-linecap="round"/>` +
      `<path d="M92 110 L108 108" stroke="#7c2d12" stroke-width="3" stroke-linecap="round"/>` +
      `<g transform="translate(${f(mx)} ${f(my)}) rotate(${f(a)} 116 88)"><circle cx="116" cy="88" r="6" fill="#1f2937"/>` +
      `<circle cx="116" cy="88" r="16" fill="rgba(186,230,253,.35)" stroke="#a16207" stroke-width="4"/>` +
      `<path d="M128 100 L146 120" stroke="#a16207" stroke-width="6" stroke-linecap="round"/>` +
      `<path d="M108 82 Q112 78 117 79" stroke="#fff" stroke-width="2" fill="none" opacity=".8"/></g>`;
    return body({ dy: 1.5 * sin(TAU * t), auraStr: aura("#818cf8"), face, front: q });
  } },

  // 毒舌：怒りで震える、湯気、叫ぶ口
  roast: { delay: 60, frame(i, t) {
    const open = 0.5 + 0.5 * sin(TAU * 3 * t);
    const mark = 1 + 0.3 * Math.abs(sin(TAU * 2 * t));
    let steam = "";
    for (let k = 0; k < 4; k++) {
      const p = (t + k / 4) % 1, side = k % 2 ? 1 : -1;
      steam += `<circle cx="${f(100 + side * (52 + 14 * p))}" cy="${f(44 - 50 * p)}" r="${f(6 + 11 * p)}" fill="#f1f5f9" opacity="${f(0.95 * (1 - p * 0.8))}"/>`;
    }
    const face =
      `<path d="M74 76 L94 84" stroke="#1f2937" stroke-width="5" stroke-linecap="round"/><path d="M126 76 L106 84" stroke="#1f2937" stroke-width="5" stroke-linecap="round"/>` +
      `<circle cx="85" cy="92" r="4.5" fill="#1f2937"/><circle cx="115" cy="92" r="4.5" fill="#1f2937"/>` +
      `<ellipse cx="100" cy="115" rx="${f(8 + 4 * open)}" ry="${f(4 + 6 * open)}" fill="#7c2d12"/>` +
      `<rect x="${f(94 - 2 * open)}" y="${f(111 - 5 * open)}" width="${f(12 + 4 * open)}" height="3" rx="1.5" fill="#fff"/>` +
      `<g transform="translate(144 46) scale(${f(mark)}) translate(-144 -46)"><path d="M136 48 l6 -6 l2 8 l8 -2 l-6 6 l6 6 l-8 -2 l-2 8 l-2 -8 l-8 2 l6 -6 z" fill="#ef4444"/></g>`;
    return body({
      dx: i % 2 ? 2.5 : -2.5, rot: i % 4 < 2 ? -1.5 : 1.5,
      auraStr: aura("#ef4444", 0.2 + 0.1 * Math.abs(sin(TAU * 2 * t))), face, front: steam,
    });
  } },

  // 塩対応：半目、汗がたらり、鳥は居眠り（zzz）
  cold: { delay: 100, frame(i, t) {
    const dropY = 66 + 34 * t, dropOp = t < 0.8 ? 1 : (1 - t) / 0.2;
    let z = "";
    for (let k = 0; k < 3; k++) {
      const p = (t + k / 3) % 1;
      z += text(122 + 22 * p, 30 - 36 * p, 9 + 8 * p, "#cbd5e1", "z", sin(Math.PI * p));
    }
    const face =
      `<path d="M76 88 L92 88" stroke="#1f2937" stroke-width="4" stroke-linecap="round"/><path d="M108 88 L124 88" stroke="#1f2937" stroke-width="4" stroke-linecap="round"/>` +
      `<path d="M78 92 Q84 95 90 92" fill="none" stroke="#1f2937" stroke-width="2"/><path d="M110 92 Q116 95 122 92" fill="none" stroke="#1f2937" stroke-width="2"/>` +
      `<path d="M92 110 L108 110" stroke="#7c2d12" stroke-width="3" stroke-linecap="round"/>` +
      `<path d="M138 ${f(dropY)} Q144 ${f(dropY + 10)} 138 ${f(dropY + 14)} Q132 ${f(dropY + 10)} 138 ${f(dropY)} Z" fill="#7dd3fc" opacity="${f(dropOp)}"/>`;
    return body({
      dy: 1.5 * sin(TAU * t), auraStr: aura("#64748b"),
      birdOpt: { sleep: true, dy: 0.8 * sin(TAU * 2 * t) }, face, front: z,
    });
  } },

  // 全国（ほう……）：片眉を上げてニヤリ。うんうんとうなずく
  warm: { delay: 80, frame(i, t) {
    const nod = Math.max(0, sin(TAU * 2 * t));
    const blink = i === 15 || i === 16;
    const tw = Math.max(0, sin(TAU * t));
    const face =
      `<path d="M76 79 Q84 76 92 79" fill="none" stroke="#1f2937" stroke-width="3" stroke-linecap="round"/>` +
      `<path d="M108 ${f(74 - 3 * nod)} Q116 ${f(67 - 3 * nod)} 124 ${f(72 - 3 * nod)}" fill="none" stroke="#1f2937" stroke-width="3" stroke-linecap="round"/>` +
      (blink ? eyesShut
             : `<ellipse cx="84" cy="89" rx="5" ry="3.4" fill="#1f2937"/><circle cx="116" cy="88" r="5.5" fill="#1f2937"/><circle cx="118" cy="86" r="1.6" fill="#fff"/>`) +
      `<path d="M91 110 Q102 115 112 105" fill="none" stroke="#7c2d12" stroke-width="3" stroke-linecap="round"/>`;
    return body({
      dy: 3 * nod, auraStr: aura("#2dd4bf", 0.18),
      birdOpt: { dy: -2 * nod, wing: -12 * nod },
      heart: 1 + 0.1 * Math.max(0, sin(TAU * 2 * t)),
      face, front: star4(140, 72, 7 * tw, "#99f6e4", tw),
    });
  } },

  // アジア（おお！）：目をキラキラさせて跳ねる。泣くほどではない
  good: { delay: 70, frame(i, t) {
    const hop = Math.abs(sin(TAU * 2 * t));
    let sp = "";
    [[30, 50, 0], [170, 40, 0.3], [20, 140, 0.6], [182, 130, 0.15]].forEach(([x, y, ph]) => {
      const k = Math.max(0, sin(TAU * ((t + ph) % 1)));
      sp += star4(x, y, 8 * k, "#fdba74");
    });
    const face =
      `<path d="M75 ${f(77 - 2 * hop)} Q84 ${f(71 - 2 * hop)} 93 ${f(77 - 2 * hop)}" fill="none" stroke="#1f2937" stroke-width="3" stroke-linecap="round"/>` +
      `<path d="M107 ${f(77 - 2 * hop)} Q116 ${f(71 - 2 * hop)} 125 ${f(77 - 2 * hop)}" fill="none" stroke="#1f2937" stroke-width="3" stroke-linecap="round"/>` +
      `<circle cx="84" cy="89" r="6" fill="#1f2937"/><circle cx="116" cy="89" r="6" fill="#1f2937"/>` +
      star4(86, 87, 3.2, "#fff") + star4(118, 87, 3.2, "#fff") +
      `<path d="M86 105 Q100 ${f(122 + 2 * hop)} 114 105 Z" fill="#7c2d12"/><path d="M91 112 Q100 118 109 112" fill="#f87171"/>`;
    return body({
      dy: -4 * hop,
      auraStr: rays(10, 36 * t, "#fdba74", 0.22) + aura("#fb923c", 0.2),
      birdOpt: { dy: -6 * hop, wing: -40 * Math.abs(sin(TAU * 4 * t)) },
      heart: 1 + 0.16 * hop,
      face, front: sp,
    });
  } },

  // 絶賛：号泣、キラキラ、回る後光
  praise: { delay: 70, colors: 128, frame(i, t) {
    let tears = "";
    for (let k = 0; k < 3; k++) {
      const p = (t * 2 + k / 3) % 1;
      tears += `<ellipse cx="${f(80 - 10 * p)}" cy="${f(96 + 46 * p)}" rx="3.2" ry="5" fill="#7dd3fc" opacity="${f(1 - p * 0.7)}"/>`;
      tears += `<ellipse cx="${f(120 + 10 * p)}" cy="${f(96 + 46 * p)}" rx="3.2" ry="5" fill="#7dd3fc" opacity="${f(1 - p * 0.7)}"/>`;
    }
    let sp = "";
    [[34, 40, 0], [166, 30, 0.25], [24, 130, 0.5], [180, 120, 0.75], [100, -6, 0.4]].forEach(([x, y, ph]) => {
      const k = Math.max(0, sin(TAU * ((t + ph) % 1)));
      sp += star4(x, y, 10 * k, "#facc15");
    });
    const face =
      `<path d="M76 90 Q84 80 92 90" fill="none" stroke="#1f2937" stroke-width="4" stroke-linecap="round"/>` +
      `<path d="M108 90 Q116 80 124 90" fill="none" stroke="#1f2937" stroke-width="4" stroke-linecap="round"/>` +
      `<path d="M84 104 Q100 ${f(126 + 3 * sin(TAU * 4 * t))} 116 104 Z" fill="#7c2d12"/><path d="M90 112 Q100 120 110 112" fill="#f87171"/>` +
      `<path d="M78 94 Q76 104 80 112" stroke="#7dd3fc" stroke-width="3" fill="none" opacity=".8"/><path d="M122 94 Q124 104 120 112" stroke="#7dd3fc" stroke-width="3" fill="none" opacity=".8"/>`;
    return body({
      dy: -2 * Math.abs(sin(TAU * 2 * t)),
      auraStr: rays(12, 30 * t, "#fde047", 0.35) + aura("#facc15", 0.22),
      face: face + tears, front: sp,
    });
  } },

  // 神：まぶしい後光、光る二重の輪、穏やかな顔、立ちのぼるキラキラ
  kami: { delay: 80, colors: 96, frame(i, t) {
    const glow = 0.75 + 0.25 * sin(TAU * t);
    let sp = "";
    for (let k = 0; k < 8; k++) {
      const p = (t + k / 8) % 1;
      sp += star4(10 + ((k * 53) % 180), 232 - 250 * p, 4 + 4 * sin(Math.PI * p), k % 2 ? "#fff7cc" : "#fde047", sin(Math.PI * p));
    }
    const haloStr =
      `<g filter="url(#glow)" opacity="${f(glow)}"><ellipse cx="100" cy="18" rx="50" ry="11" fill="none" stroke="#fef08a" stroke-width="8"/><ellipse cx="100" cy="4" rx="34" ry="7" fill="none" stroke="#fff" stroke-width="6"/></g>` +
      `<ellipse cx="100" cy="18" rx="50" ry="11" fill="none" stroke="#facc15" stroke-width="4"/><ellipse cx="100" cy="4" rx="34" ry="7" fill="none" stroke="#fef9c3" stroke-width="3"/>`;
    const face =
      `<path d="M76 90 Q84 96 92 90" fill="none" stroke="#1f2937" stroke-width="3.5" stroke-linecap="round"/>` +
      `<path d="M108 90 Q116 96 124 90" fill="none" stroke="#1f2937" stroke-width="3.5" stroke-linecap="round"/>` +
      `<path d="M92 108 Q100 113 108 108" fill="none" stroke="#7c2d12" stroke-width="3" stroke-linecap="round"/>` +
      `<circle cx="100" cy="66" r="3" fill="#facc15"/>`;
    return body({
      dy: 4 * sin(TAU * t),
      auraStr: `<circle cx="100" cy="92" r="120" fill="url(#light)"/>` + rays(16, 22.5 * t, "#fde047", 0.45, 160) +
        rays(16, -22.5 * t + 11.25, "#fff", 0.18, 140) + aura("#fef08a", 0.25),
      haloStr, robeStr: robe("#fffbeb", "#f59e0b"), birdOpt: { dy: 1.5 * sin(TAU * t) }, face, front: sp,
    });
  } },

  // ∬…：宇宙人に変身したバズ神
  alien: { delay: 70, glitch: { split: [5, 6, 14, 20], slice: [11, 12, 14, 19] }, frame(i, t) {
    const sway = sin(TAU * t);
    // 壊れた後光（傾いて、欠けて、少しずれる）
    const haloStr =
      `<g transform="rotate(-14 100 -2) translate(${f(sway * 2)} 0)"><ellipse cx="100" cy="-2" rx="44" ry="9" fill="none" stroke="#a3a33a" stroke-width="5" stroke-dasharray="46 16 30 24 60 20"/></g>` +
      `<path d="M150 ${f(4 + 3 * sin(TAU * t + 1))} l8 3" stroke="#a3a33a" stroke-width="5" stroke-linecap="round"/>`;
    // 触手（ヒゲのかわり）
    let tent = "";
    [[78, -1], [92, -0.4], [108, 0.4], [122, 1]].forEach(([x, dir], k) => {
      const w = sin(TAU * t + k * 1.3), w2 = sin(TAU * t + k * 1.3 + 1.6);
      const d = `M${x} 124 C${f(x + dir * 6 + w * 10)} 146 ${f(x + dir * 14 - w2 * 12)} 160 ${f(x + dir * 16 + w * 14)} ${f(176 + 4 * w2)}`;
      tent += `<path d="${d}" fill="none" stroke="#4d6b45" stroke-width="11" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#86a77c" stroke-width="7" stroke-linecap="round"/>`;
    });
    // 触角
    const ant = [[86, 22, 66, -10], [114, 22, 134, -10]].map(([x1, y1, x2, y2], k) => {
      const bx = x2 + 5 * sin(TAU * t + k * 2), by = y2 + 3 * cos(TAU * t + k * 2);
      return `<path d="M${x1} ${y1} Q${f((x1 + bx) / 2 + (k ? 8 : -8))} ${f(y1 - 14)} ${f(bx)} ${f(by)}" fill="none" stroke="#5f7a57" stroke-width="3.5"/>` +
        `<circle cx="${f(bx)}" cy="${f(by)}" r="7" fill="#a3e635" filter="url(#glow)"/><circle cx="${f(bx)}" cy="${f(by)}" r="4.5" fill="#ecfccb"/>`;
    }).join("");
    // おでこの目（バラバラにまばたき）
    const extra = [[100, 40, 7, 0], [80, 52, 5, 7], [120, 52, 5, 15], [100, 60, 4, 4]].map(([x, y, r, ph]) => {
      const closed = (i + ph) % 12 < 2;
      return closed
        ? `<path d="M${x - r} ${y} Q${x} ${y + r * 0.6} ${x + r} ${y}" stroke="#1a2e16" stroke-width="2" fill="none"/>`
        : `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${f(r * 0.75)}" fill="#fef08a"/><ellipse cx="${f(x + sway)}" cy="${y}" rx="${f(r * 0.25)}" ry="${f(r * 0.65)}" fill="#111"/>`;
    }).join("");
    // 目玉の杖
    const lx = 4 * cos(TAU * t), ly = 3 * sin(TAU * 2 * t);
    const eyeStaff =
      `<rect x="152" y="118" width="6" height="90" rx="3" fill="#3b0764"/>` +
      `<circle cx="155" cy="104" r="15" fill="#f8fafc"/><path d="M142 98 l7 3 M168 110 l-6 -2 M146 114 l6 -4" stroke="#dc2626" stroke-width="1.5"/>` +
      `<circle cx="${f(155 + lx)}" cy="${f(104 + ly)}" r="7" fill="#16a34a"/><circle cx="${f(155 + lx * 1.2)}" cy="${f(104 + ly * 1.2)}" r="3.5" fill="#000"/>` +
      `<circle cx="155" cy="150" r="9" fill="#86a77c"/>`;
    const robeA =
      `<path d="M48 150 Q100 120 152 150 L166 222 L150 214 L136 226 L120 214 L100 228 L82 214 L66 226 L50 214 L34 222 Z" fill="#27272a"/>` +
      `<path d="M98 140 L102 140 L106 220 L94 220 Z" fill="#65a30d"/>`;
    const head =
      `<path d="M100 10 C154 10 152 92 128 122 C118 136 82 136 72 122 C48 92 46 10 100 10 Z" fill="#9db394"/>` +
      `<path d="M100 10 C130 10 144 34 146 60 C132 30 116 20 100 20 Z" fill="#b6c9ad" opacity=".7"/>`;
    const eyes =
      `<g transform="translate(80 88) rotate(28)"><ellipse rx="18" ry="9" fill="#050505"/><ellipse cx="-6" cy="-3" rx="4" ry="2" fill="#fff" opacity=".7"/></g>` +
      `<g transform="translate(120 88) rotate(-28)"><ellipse rx="18" ry="9" fill="#050505"/><ellipse cx="-6" cy="-3" rx="4" ry="2" fill="#fff" opacity=".7"/></g>` +
      `<path d="M95 116 Q100 ${f(118 + 2 * sway)} 105 116" stroke="#2f4a2a" stroke-width="2" fill="none"/>`;
    const jx = i === 13 ? 6 : i === 19 ? -5 : 0;
    return aura("#84cc16", 0.12 + 0.08 * Math.abs(sway)) +
      `<g transform="translate(${jx} ${f(2 * sin(TAU * t))})">` + haloStr + robeA + eyeStaff +
      `<circle cx="44" cy="168" r="9" fill="#86a77c"/>` + tent + ant + head + eyes + extra + `</g>`;
  } },
};

const DEFS =
  `<filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4"/></filter>` +
  `<radialGradient id="fadeg" cx="100" cy="92" r="128" gradientUnits="userSpaceOnUse"><stop offset=".45" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient>` +
  `<mask id="fade" maskUnits="userSpaceOnUse" x="-20" y="-24" width="240" height="264"><rect x="-20" y="-24" width="240" height="264" fill="url(#fadeg)"/></mask>` +
  `<radialGradient id="light"><stop offset="0" stop-color="#fffbeb" stop-opacity=".9"/><stop offset=".5" stop-color="#fde047" stop-opacity=".35"/><stop offset="1" stop-color="#fde047" stop-opacity="0"/></radialGradient>`;
const wrap = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VB}" width="240" height="264"><defs>${DEFS}</defs>${inner}</svg>`;

function render(svg) {
  const png = new Resvg(svg, { fitTo: { mode: "width", value: W }, font: { loadSystemFonts: true, defaultFontFamily: "Arial" } }).render().asPng();
  return new Uint8Array(UPNG.toRGBA8(UPNG.decode(png))[0]);
}

// 1コマだけを大きく描いたふつうのPNG（OGP画像などに使う）
export function still(mood, i, width) {
  const m = MOODS[mood];
  return Buffer.from(new Resvg(wrap(m.frame(i, i / N)), { fitTo: { mode: "width", value: width }, font: { loadSystemFonts: true, defaultFontFamily: "Arial" } }).render().asPng());
}

// ── グリッチ加工（宇宙人用）──
function rgbSplit(src, d) {
  const out = new Uint8Array(src.length);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const o = (y * W + x) * 4, r = (y * W + Math.min(W - 1, x + d)) * 4, b = (y * W + Math.max(0, x - d)) * 4;
    out[o] = src[r]; out[o + 1] = src[o + 1]; out[o + 2] = src[b + 2];
    out[o + 3] = Math.max(src[r + 3], src[o + 3], src[b + 3]);
  }
  return out;
}
function slices(src, seed) {
  const out = new Uint8Array(src);
  let s = seed;
  const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let n = 0; n < 6; n++) {
    const y0 = Math.floor(rnd() * H), h = 4 + Math.floor(rnd() * 22), dx = Math.round((rnd() - 0.5) * 40);
    for (let y = y0; y < Math.min(H, y0 + h); y++) for (let x = 0; x < W; x++) {
      const sx = x - dx, o = (y * W + x) * 4;
      if (sx < 0 || sx >= W) { out[o + 3] = 0; continue; }
      const so = (y * W + sx) * 4;
      out[o] = src[so]; out[o + 1] = src[so + 1]; out[o + 2] = src[so + 2]; out[o + 3] = src[so + 3];
    }
  }
  return out;
}

// ほかのスクリプトから still() だけ使うときは、ここから下は動かさない
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
const preview = isMain && process.argv[2];
if (preview) mkdirSync(preview, { recursive: true });
if (isMain) mkdirSync("public/gods", { recursive: true });

for (const [name, m] of isMain ? Object.entries(MOODS) : []) {
  const frames = [];
  for (let i = 0; i < N; i++) {
    let px = render(wrap(m.frame(i, i / N)));
    if (m.glitch?.slice.includes(i)) px = slices(px, i * 7919 + 13);
    if (m.glitch?.split.includes(i)) px = rgbSplit(px, 5);
    frames.push(px.buffer);
    if (preview && (i === 0 || i === 6 || i === 14)) {
      writeFileSync(`${preview}/${name}-${i}.png`, Buffer.from(UPNG.encode([px.buffer], W, H, 0)));
    }
  }
  const apng = UPNG.encode(frames, W, H, m.colors ?? COLORS, frames.map(() => m.delay));
  writeFileSync(`public/gods/${name}.png`, Buffer.from(apng));
  console.log(`${name}.png  ${(apng.byteLength / 1024).toFixed(0)} KB`);
}
