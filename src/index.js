// ツイートバズシミュレーター（⑧ テストモード付き）
// GET  /             → 画面（HTML）を返す
// POST /api/buzz     → ツイートのパターンを読み取って採点し、講評・リプライと一緒に返してD1に保存
// GET  /api/history  → 最新のバズ履歴
// GET  /api/ranking  → いいね数ランキング
// POST /api/admin/check → 合言葉が正しいか確認（テストモード用）
// POST /api/admin/test  → 段階を指定して演出をテスト（D1には保存しない）
//
// テストモードの合言葉は Cloudflare の「シークレット」に ADMIN_KEY という名前で保存する
//   本番：npx wrangler secret put ADMIN_KEY
//   ローカル：プロジェクト直下の .dev.vars に ADMIN_KEY=合言葉 と書く

import { LEVELS, THEMES, BASE_COMMENTS, THEME_COMMENTS, LEVEL_REPLIES, THEME_REPLIES } from "./data.js";
import { HTML } from "./page.js";

const clamp = (n, min, max) => Math.max(min, Math.min(max, Math.round(n)));
const pick = (arr, rand) => arr[Math.floor(rand() * arr.length)];

// 同じ文章なら同じ「素の点数」になるように、文章から数字を作る
function hashOf(text) {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.codePointAt(0), 16777619);
  return h >>> 0;
}
function seededRandom(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── ツイートの特徴を読み取る ──
export function analyze(text) {
  const chars = Array.from(text);
  const len = chars.length;
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
  const lastLine = lines[lines.length - 1] ?? "";
  const themes = Object.keys(THEMES).filter((k) => THEMES[k].re.test(text));
  const emojiCount = (text.match(/\p{Extended_Pictographic}/gu) || []).length;
  return {
    len,
    lines: lines.length,
    themes,
    dialogue: (text.match(/「[^」]+」/g) || []).length,
    ochi: (lines.length >= 2 && Array.from(lastLine).length <= 18) ||
      /……|…|そういうとこ|知らんけど|と思ったら|かと思いきや|まさか|なお、|結果、|からです|だからです/.test(text),
    twist: /まさか|実は|と思ったら|かと思いきや|なのに|のに、|だからです|逆に/.test(text),
    laugh: /草|笑|ｗ|w{2,}/i.test(text),
    participation: /人が勝ち|選手権|教えて|みんな|あるある|どっち|派？|派\?|わかる人/.test(text),
    question: /[？?]/.test(text),
    exclaim: /[！!]/.test(text),
    numbers: /\d|[一二三四五六七八九十百千万]+(円|回|歳|時間|分|年)/.test(text),
    hashtags: (text.match(/[#＃]\S+/g) || []).length,
    emojiCount,
    onlyEmoji: emojiCount > 0 && text.replace(/\p{Extended_Pictographic}|\s|️|‍/gu, "") === "",
    toxic: /死ね|殺す|うざい|クソ|消えろ|ゴミ|カス/.test(text),
    spam: /(.)\1{5,}/u.test(text),
  };
}

// ── 4つの観点（各25点）で採点する ──
export function score(text) {
  const f = analyze(text);
  const t = f.themes.length;

  let empathy = 4 + Math.min(t, 3) * 5 + (f.themes.includes("self") ? 3 : 0) +
    (f.themes.includes("sleep") || f.themes.includes("work") ? 2 : 0) + (f.question ? 1 : 0) + (f.participation ? 5 : 0);
  let surprise = 3 + (f.ochi ? 8 : 0) + (f.twist ? 6 : 0) + (f.numbers ? 2 : 0) +
    (f.lines >= 3 ? 3 : 0) + (f.dialogue ? 2 : 0);
  let fun = 3 + (f.dialogue ? Math.min(f.dialogue, 3) * 4 : 0) + (f.ochi ? 5 : 0) + (f.laugh ? 3 : 0) +
    (f.themes.includes("self") ? 2 : 0) + (f.emojiCount >= 1 && f.emojiCount <= 3 ? 2 : 0) + (f.exclaim ? 1 : 0);
  let spread = f.len < 6 ? 1 : f.len < 15 ? 7 : f.len <= 80 ? 14 : f.len <= 115 ? 11 : 7;
  spread += (f.participation ? 7 : 0) + (f.hashtags >= 1 && f.hashtags <= 2 ? 2 : 0) +
    (f.hashtags >= 4 ? -5 : 0) + (f.ochi ? 2 : 0);

  // オチ × 会話や裏切り × あるある、がそろったら大きく加点（ここが宇宙への道）
  if (f.ochi && (f.dialogue >= 2 || f.twist) && t >= 1) { surprise += 5; fun += 4; empathy += 3; spread += 3; }

  // 減点
  if (f.toxic) { empathy -= 8; fun -= 5; spread -= 4; }
  if (f.spam) { empathy -= 6; surprise -= 4; fun -= 4; spread -= 6; }
  if (f.onlyEmoji) { empathy -= 4; surprise -= 2; spread -= 4; }

  // 文章ごとの個性（同じ文章ならいつも同じ）＋ ちょっとした運
  const seeded = seededRandom(hashOf(text));
  const jitter = () => Math.floor(seeded() * 7) - 3 + Math.floor(Math.random() * 5) - 2;
  const axes = {
    empathy: clamp(empathy + jitter(), 0, 25),
    surprise: clamp(surprise + jitter(), 0, 25),
    fun: clamp(fun + jitter(), 0, 25),
    spread: clamp(spread + jitter(), 0, 25),
  };
  return { axes, total: axes.empathy + axes.surprise + axes.fun + axes.spread, features: f };
}

// 講評やリプライを選ぶときの「パターン」
function patternOf(f) {
  if (f.spam) return "spam";
  if (f.toxic) return "toxic";
  if (f.len < 8) return "short";
  if (f.len > 115) return "long";
  return f.themes[0] ?? "general";
}
const PATTERN_LABELS = { general: "ふつう", short: "短文", long: "長文", toxic: "毒", spam: "連打" };

function randomBetween(min, max) {
  return Math.floor(min + Math.random() * (max - min));
}

export function simulateBuzz(text, forceIndex) {
  let { axes, total, features } = score(text);
  // テストモード：指定した段階になるように点数を合わせる
  if (forceIndex != null) {
    const lv = LEVELS[forceIndex];
    const next = LEVELS[forceIndex + 1];
    total = next ? Math.floor((lv.minScore + next.minScore - 1) / 2) : 100;
    const q = Math.floor(total / 4);
    axes = { empathy: q, surprise: q, fun: q, spread: total - q * 3 };
  }
  const index = LEVELS.findLastIndex((l) => total >= l.minScore);
  const level = LEVELS[index];
  const pattern = patternOf(features);
  const rand = Math.random;

  const comment = pick(BASE_COMMENTS[level.name], rand) + " " + pick(THEME_COMMENTS[level.tone][pattern], rand);
  const pool = [...LEVEL_REPLIES[level.name]].sort(() => rand() - 0.5).slice(0, 2);
  const replies = [THEME_REPLIES[level.tone][pattern], ...pool]
    .map(([name, handle, text]) => ({ name, handle, text }));

  const likes = Math.min(randomBetween(level.likes[0], level.likes[1]), 9e15);
  return {
    level: level.name,
    emoji: level.emoji,
    levelIndex: index,
    secret: !!level.secret,
    tone: level.tone,
    pattern: THEMES[pattern]?.label ?? PATTERN_LABELS[pattern],
    score: total,
    axes,
    comment,
    replies,
    likes,
    retweets: Math.floor(likes * (0.1 + Math.random() * 0.2)),
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/buzz" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const text = String(body.text ?? "").trim().slice(0, 140);
      if (!text) {
        return Response.json({ error: "ツイートを入力してください" }, { status: 400 });
      }
      const result = simulateBuzz(text);
      // D1に保存（env.DB は wrangler.jsonc の binding 名）
      await env.DB.prepare(
        "INSERT INTO buzzes (text, level, emoji, score, likes, retweets, comment) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).bind(text, result.level, result.emoji, result.score, result.likes, result.retweets, result.comment).run();
      return Response.json({ text, ...result });
    }

    // ── テストモード（合言葉を知っている人だけ）──
    if (url.pathname.startsWith("/api/admin/") && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      if (!env.ADMIN_KEY || body.key !== env.ADMIN_KEY) {
        return Response.json({ error: "合言葉が違います" }, { status: 403 });
      }
      if (url.pathname === "/api/admin/check") {
        return Response.json({ ok: true });
      }
      if (url.pathname === "/api/admin/test") {
        const level = Math.max(0, Math.min(LEVELS.length - 1, Number(body.level) || 0));
        const text = String(body.text ?? "").trim().slice(0, 140) || "（テスト投稿）";
        return Response.json({ text, test: true, ...simulateBuzz(text, level) });
      }
    }

    if (url.pathname === "/api/history") {
      const { results } = await env.DB.prepare(
        "SELECT text, level, emoji, score, likes, created_at FROM buzzes ORDER BY id DESC LIMIT 20"
      ).all();
      return Response.json(results);
    }

    if (url.pathname === "/api/ranking") {
      const { results } = await env.DB.prepare(
        "SELECT text, level, emoji, score, likes FROM buzzes ORDER BY likes DESC LIMIT 10"
      ).all();
      return Response.json(results);
    }

    if (url.pathname === "/api/stats") {
      // みんなの記録（D1から集計）
      const secretNames = LEVELS.filter((l) => l.secret).map((l) => l.name);
      const row = await env.DB.prepare(
        "SELECT COUNT(*) AS posts, MAX(score) AS best, SUM(CASE WHEN level IN (" + secretNames.map(() => "?").join(",") + ") THEN 1 ELSE 0 END) AS secrets FROM buzzes"
      ).bind(...secretNames).first();
      return Response.json({ posts: row?.posts ?? 0, best: row?.best ?? 0, secrets: row?.secrets ?? 0 });
    }

    if (url.pathname === "/api/levels") {
      // 画面のバズマップ用（シークレットは名前を伏せる。シークレットの中のシークレットは存在ごと隠す）
      return Response.json(LEVELS.filter((l) => !l.hidden)
        .map((l) => ({ name: l.secret ? null : l.name, emoji: l.secret ? null : l.emoji, secret: !!l.secret })));
    }

    if (url.pathname === "/") {
      return new Response(HTML, { headers: { "content-type": "text/html; charset=utf-8" } });
    }

    return new Response("Not Found", { status: 404 });
  },
};
