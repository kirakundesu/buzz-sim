// ツイートバズシミュレーター（⑪ 採点を緩めた・ランキングをバズ力といいね数に分けた）
// GET  /             → 画面（HTML）を返す
// POST /api/buzz     → ツイートのパターンを読み取って採点し、講評・リプライと一緒に返してD1に保存
// GET  /api/history  → 最新のバズ履歴
// GET  /api/ranking  → いいね数ランキング（?by=score でバズ力ランキング）
//   下ネタ・差別語・URL の投稿（data.js の isUnlisted）は unlisted = 1 で保存し、この2つには出さない
// POST /api/admin/check → 合言葉が正しいか確認（テストモード用）
// POST /api/admin/test  → 段階を指定して演出をテスト（D1には保存しない）
//
// テストモードの合言葉は Cloudflare の「シークレット」に ADMIN_KEY という名前で保存する
//   本番：npx wrangler secret put ADMIN_KEY
//   ローカル：プロジェクト直下の .dev.vars に ADMIN_KEY=合言葉 と書く

import { DurableObject } from "cloudflare:workers";
import { LEVELS, THEMES, BASE_COMMENTS, THEME_COMMENTS, LEVEL_REPLIES, THEME_REPLIES, isUnlisted } from "./data.js";
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
  const sentences = text.split(/[。！？!?\n]+/).map((s) => s.trim()).filter(Boolean);
  const themes = Object.keys(THEMES).filter((k) => THEMES[k].re.test(text));
  const emojiCount = (text.match(/\p{Extended_Pictographic}/gu) || []).length;
  return {
    len,
    lines: lines.length,
    themes,
    dialogue: (text.match(/「[^」]+」|『[^』]+』/g) || []).length,
    // オチ：短い最後の行、短い最後の一文（質問で終わるものは除く）、オチっぽい言い回し
    ochi: (lines.length >= 2 && Array.from(lastLine).length <= 18) ||
      (sentences.length >= 2 && Array.from(sentences[sentences.length - 1]).length <= 8 && !/[？?]\s*$/.test(text)) ||
      /……|…|そういうとこ|知らんけど|と思ったら|かと思いきや|まさか|なお、|ちなみに|結果、|結果は|からです|だからです|正解は|オチ|だった。?$|でした。?$|じゃなかった|ではなかった|てた。?$/.test(text),
    twist: /まさか|実は|と思ったら|かと思いきや|と見せかけて|かと思えば|と思ってた|だと思ってた|はずが|はずだった|なのに|のに、|ではなく|じゃなくて|けど|しかし|逆に|だからです/.test(text),
    aru: /あるある|しがち|つい|いつも|毎回|毎朝|毎日|毎晩|結局|なぜか|みんな|わかる|気づいたら|気付いたら|いつの間にか|これ私|自分だけ/.test(text),
    emo: /嬉し|うれし|悲し|泣|笑|つら|辛い|しんど|最高|無理|尊い|草|ｗ|w{2,}|好き|嫌い|怖|ヤバ|やば|疲れ|眠|腹立|ムカ|感動|幸せ|寂し|ウケ|楽しみ|かわいい|可愛い/.test(text),
    hyper: /一生|永遠|世界一|宇宙一|人類|全人類|全部|全員|絶対|死ぬほど|秒で|過去一|人生で一番|\d{3,}|百回|千回|万回|すぎ/.test(text),
    // ダジャレ：同じ2文字以上のかな（またはカナ）が2回出てくる（「ふとんがふっとんだ」など）
    wordplay: /(\p{sc=Hiragana}{2,}|\p{sc=Katakana}{2,}).*?\1/u.test(text.replace(/(.)\1+/gu, "$1")),
    laugh: /草|笑|ｗ|w{2,}/i.test(text),
    participation: /人が勝ち|選手権|教えて|みんな|あるある|どっち|派？|派\?|わかる人|なに派|何派|いる？|いますか/.test(text),
    question: /[？?]/.test(text),
    exclaim: /[！!]/.test(text),
    numbers: /\d|[一二三四五六七八九十百千万]+(円|回|歳|時間|分|年|日|個|人|杯)/.test(text),
    hashtags: (text.match(/[#＃]\S+/g) || []).length,
    emojiCount,
    onlyEmoji: emojiCount > 0 && text.replace(/\p{Extended_Pictographic}|\s|️|‍/gu, "") === "",
    toxic: /死ね|殺す|うざい|クソ|消えろ|ゴミ|カス/.test(text),
    spam: /(.)\1{5,}/u.test(text),
  };
}

// ── 4つの観点（各25点）で採点する ──
// 目安：ふつうの一文で町、あるあるネタで県、工夫（数字・感情・問いかけ）で全国、
// オチ・会話・裏切りのどれかでアジア、2つそろうと地球。シークレットは全部そろってやっと届く
export function score(text) {
  const f = analyze(text);
  const t = Math.min(f.themes.length, 3);
  const self = f.themes.includes("self");
  // 長さ：短すぎず長すぎず（0〜4）
  const L = f.len < 3 ? 0 : f.len < 6 ? 1 : f.len < 10 ? 2 : f.len < 18 ? 3 : f.len <= 100 ? 4 : f.len <= 125 ? 3 : 2;

  let empathy = 4 + [0, 2, 4.5, 6, 6.4][L] + t * 3.5 + (f.aru ? 4 : 0) + (f.emo ? 3 : 0) + (self ? 2 : 0) + (f.question ? 1 : 0) + (f.participation ? 4 : 0);
  let surprise = 4 + L * 1.2 + (f.ochi ? 6 : 0) + (f.twist ? 5 : 0) + (f.numbers ? 2 : 0) + (f.hyper ? 2 : 0) +
    (f.lines >= 2 ? 2 : 0) + (f.lines >= 3 ? 1 : 0) + (f.dialogue ? 2 : 0) + (f.wordplay ? 3 : 0);
  let fun = 4 + L * 1.2 + Math.min(f.dialogue, 3) * 3 + (f.ochi ? 4 : 0) + (f.laugh ? 3 : 0) + (f.wordplay ? 6 : 0) +
    (f.exclaim ? 2 : 0) + (f.emojiCount >= 1 && f.emojiCount <= 3 ? 2 : 0) + (self ? 2 : 0) + (f.hyper ? 2 : 0);
  let spread = [0, 5, 10, 12, 14, 12, 9][L + (f.len > 125 ? 2 : f.len > 100 ? 1 : 0)] +
    (f.participation ? 5 : 0) + (f.hashtags >= 1 && f.hashtags <= 2 ? 2 : 0) + (f.hashtags >= 4 ? -5 : 0) +
    (f.ochi ? 2 : 0) + (f.aru ? 2 : 0) + (t >= 1 ? 2 : 0);

  // コンボ：オチ ×（会話 か 裏切り）× あるある。3つ全部ならもう少し
  const relatable = t >= 1 || f.aru;
  if (f.ochi && (f.dialogue || f.twist) && relatable) { empathy += 2; surprise += 2; fun += 2; spread += 2; }
  if (f.ochi && f.dialogue && f.twist && relatable) { empathy += 1; surprise += 1; fun += 1; spread += 1; }

  // 減点（2文字以下で、話題も感情もないものは「中身なし」）
  if (f.len < 3 && !t && !f.emo) { empathy -= 2; surprise -= 2; fun -= 2; spread -= 2; }
  if (f.toxic) { empathy -= 8; fun -= 5; spread -= 4; }
  if (f.spam) { empathy -= 6; surprise -= 4; fun -= 4; spread -= 6; }
  if (f.onlyEmoji) { empathy -= 4; surprise -= 2; spread -= 4; }

  // 上のほうは伸びにくくする（シークレットはなかなか出ないように）
  const soft = (x) => (x > 17 ? 17 + (x - 17) * 0.45 : x);
  empathy = soft(empathy); surprise = soft(surprise); fun = soft(fun); spread = soft(spread);

  // 文章ごとの個性（同じ文章ならいつも同じ）＋ ちょっとした運
  const seeded = seededRandom(hashOf(text));
  const jitter = () => Math.floor(seeded() * 5) - 2 + Math.floor(Math.random() * 3) - 1;
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

// ── 「バズの波」──
// ときどき投稿を上の段階へ押し上げる。行き先は届く範囲の中からランダム（下から順番ではなく、飛び飛びに出る）
// ・まだ見ていない段階が届く範囲にあるうちは、その中から選ぶ（投稿するほど起きやすい）
//   → ふつうに投稿を続けると、20回ほど（中央値20回）で14段階ぜんぶの演出が見られる
// ・全部見終わったあとも、after の確率で上の段階のどこかへ押し上げる（シークレットが4回に1回くらい出続ける）
// ・届く範囲は「今の段階 + jump + 投稿回数 / jumpEvery」。中身のない投稿がいきなり頂上に行かないように
// 数字を変えたら、例文のシミュレーションで回数と順番のばらけ方を確かめる
const WAVE = { chance: 0.26, perPost: 0.011, maxChance: 0.75, jump: 8, jumpEvery: 2, after: 0.3 };
// 波やふつうの採点で届くのは、エンドコンテンツより前の14段階（0〜13）だけ
const MAIN = LEVELS.filter((l) => !l.end).length;
export function waveTarget(index, luck) {
  if (!luck) return null;
  const seen = new Set(luck.seen);
  if (!seen.has(index)) return null;   // 今の段階がまだ見たことのない段階なら、波がなくても新しい
  const reach = Math.min(MAIN - 1, index + WAVE.jump + Math.floor(luck.posts / WAVE.jumpEvery));
  const above = [];
  for (let i = index + 1; i <= reach; i++) above.push(i);
  const unseen = above.filter((i) => !seen.has(i));
  const pickOne = (list) => list[Math.floor(Math.random() * list.length)];
  if (unseen.length) {
    if (Math.random() >= Math.min(WAVE.maxChance, WAVE.chance + luck.posts * WAVE.perPost)) return null;
    return pickOne(unseen);
  }
  if (!above.length || Math.random() >= WAVE.after) return null;
  return pickOne(above);
}

// ── エンドコンテンツ（無 → 創世 → 真・家庭内）──
// バズマップにも載らない、最後の3段階。14段階ぜんぶ見たあとだけ、波とは別に、まれに出る
// 順番に1つずつ（chance の確率で）解放し、3つとも見たあとも again の確率でまた出る
const END = { chance: 0.12, again: 0.03 };
export function endTarget(luck) {
  if (!luck) return null;
  const seen = new Set(luck.seen);
  for (let i = 0; i < MAIN; i++) if (!seen.has(i)) return null;   // 14段階ぜんぶ見るまでは出ない
  const ends = LEVELS.map((l, i) => i).filter((i) => LEVELS[i].end);
  const next = ends.find((i) => !seen.has(i));
  if (next != null) return Math.random() < END.chance ? next : null;
  return Math.random() < END.again ? ends[Math.floor(Math.random() * ends.length)] : null;
}
// ── 超バズ ──
// 神と∬…では、ごくまれに いいね数が 9000兆 の天井を突き抜けて、京・垓・秭……と上がる
// 京に届くのはその段階の100回に1回。そこから単位が1つ上がるごとに、さらに10分の1（垓は1000回に1回）
// ふつうの投稿は不可思議（1e64）まで。無量大数（1e68）は創世だけのもの
// 単位の中では、桁がばらけるように対数で選ぶ（1.2京・34京・567京・8901京 が同じくらい出る）
const SUPER = { from: LEVELS.findIndex((l) => l.name === "神"), chance: 0.01, step: 0.1, units: 13 };
export function superLikes(index) {
  if (index < SUPER.from || LEVELS[index].end || Math.random() >= SUPER.chance) return null;
  let k = 0;   // 0＝京、1＝垓、……、12＝不可思議
  while (k < SUPER.units - 1 && Math.random() < SUPER.step) k++;
  return Math.floor(10 ** (16 + 4 * k + Math.random() * 4));
}

// その段階になる点数（エンドコンテンツは100、それ以外は次の段階の手前までのどこか）
function scoreFor(index) {
  const lv = LEVELS[index], next = LEVELS[index + 1];
  return lv.end || !next || next.end ? 100 : randomBetween(lv.minScore, next.minScore);
}
// 4つの観点の比率はそのままで、合計だけ total に合わせる（各25点まで）
function fitAxes(axes, total) {
  const keys = Object.keys(axes), sum = (o) => keys.reduce((s, k) => s + o[k], 0);
  const base = sum(axes) || 1, out = {};
  keys.forEach((k) => { out[k] = clamp((axes[k] || 1) * total / base, 0, 25); });
  for (let diff = total - sum(out), k = 0; diff !== 0; k = (k + 1) % keys.length) {
    const key = keys[k];
    if (diff > 0 && out[key] < 25) { out[key]++; diff--; } else if (diff < 0 && out[key] > 0) { out[key]--; diff++; }
  }
  return out;
}

// luck：{ seen: このブラウザで見たことのある段階の番号, posts: これまでの投稿回数 }（「バズの波」用。なくてもよい）
export function simulateBuzz(text, forceIndex, luck) {
  let { axes, total, features } = score(text);
  let wave = false, index;
  if (forceIndex != null) {
    // テストモード：指定した段階になるように点数を合わせる
    const lv = LEVELS[forceIndex], next = LEVELS[forceIndex + 1];
    total = lv.end || !next || next.end ? 100 : Math.floor((lv.minScore + next.minScore - 1) / 2);
    const q = Math.floor(total / 4);
    axes = { empathy: q, surprise: q, fun: q, spread: total - q * 3 };
    index = forceIndex;
  } else {
    index = LEVELS.findLastIndex((l) => !l.end && total >= l.minScore);
    const end = endTarget(luck);
    const target = end != null ? end : waveTarget(index, luck);
    if (target != null) {
      total = scoreFor(target);
      axes = fitAxes(axes, total);
      wave = end == null;   // エンドコンテンツは「波」ではなく、別の出来事として出す
      index = target;
    }
  }
  const level = LEVELS[index];
  const pattern = patternOf(features);
  const rand = Math.random;

  // エンドコンテンツは、段階の講評だけ（追い講評なし）。リプライも3つとも段階のもの
  const comment = level.end ? pick(BASE_COMMENTS[level.name], rand)
    : pick(BASE_COMMENTS[level.name], rand) + " " + pick(THEME_COMMENTS[level.tone][pattern], rand);
  const pool = [...LEVEL_REPLIES[level.name]].sort(() => rand() - 0.5).slice(0, level.end ? 3 : 2);
  const replies = (level.end ? pool : [pick(THEME_REPLIES[level.tone][pattern], rand), ...pool])
    .map(([name, handle, text]) => ({ name, handle, text }));

  const likes = superLikes(index) ?? randomBetween(level.likes[0], level.likes[1]);
  return {
    level: level.name,
    emoji: level.emoji,
    levelIndex: index,
    secret: !!level.secret,
    end: !!level.end,
    tone: level.tone,
    pattern: THEMES[pattern]?.label ?? PATTERN_LABELS[pattern],
    score: total,
    axes,
    wave,
    comment,
    replies,
    likes,
    retweets: Math.floor(likes * (0.1 + Math.random() * 0.2)),
  };
}

// ── 連投の制限 ──
// 同じ IP から /api/buzz は10秒に4回・1分に15回、/api/admin/* は1分に15回まで。超えたら 429 を返し、D1 にも保存しない。
// 手で投稿するなら演出を飛ばしても1回4秒くらいかかるので、ふつうの人は引っかからない
// 2段がまえ（設定は wrangler.jsonc の ratelimits と durable_objects）：
//   ① Cloudflare の Rate Limiting：速くて安いが、場所ごとのおおよその数え方なので、一気に来ると半分くらい取りこぼす
//   ② Gate（Durable Object）：IP ごとに1つの係が、通した時刻を順番に数える。正確
const RULES = {
  buzz:  { limiters: [["BURST_LIMIT", 10], ["MINUTE_LIMIT", 60]], gate: [[4, 10], [15, 60]] },   // gate は [回数, 秒]
  admin: { limiters: [["MINUTE_LIMIT", 60]], gate: [[15, 60]] },
};
export class Gate extends DurableObject {
  hits = [];   // 通した時刻（ミリ秒）。メモリに置くだけ（しばらく使われないと消えるが、それでよい）
  check(rules) {
    const now = Date.now();
    this.hits = this.hits.filter((t) => now - t < 60_000);
    for (const [limit, sec] of rules) {
      if (this.hits.filter((t) => now - t < sec * 1000).length >= limit) return sec;
    }
    this.hits.push(now);
    return 0;
  }
}
// 待ってほしい秒数を返す（0 なら通してよい）
async function tooFast(env, kind, ip) {
  const rule = RULES[kind], key = kind + ":" + ip;
  for (const [name, wait] of rule.limiters) {
    if (env[name] && !(await env[name].limit({ key })).success) return wait;
  }
  if (!env.GATE) return 0;
  // 係が呼べないとき（無料枠の上限など）は、ふつうの人を止めないように通す
  try { return await env.GATE.get(env.GATE.idFromName(key)).check(rule.gate); } catch { return 0; }
}
function slowDown(wait) {
  return Response.json(
    { error: "投稿が速すぎるのじゃ！" + (wait > 10 ? "1分" : "10秒") + "ほど休んでから、また投げてほしいのじゃ" },
    { status: 429, headers: { "retry-after": String(wait) } }
  );
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const ip = request.headers.get("cf-connecting-ip") || "unknown";

    if (url.pathname === "/api/buzz" && request.method === "POST") {
      const wait = await tooFast(env, "buzz", ip);
      if (wait) return slowDown(wait);
      const body = await request.json().catch(() => ({}));
      const text = String(body.text ?? "").trim().slice(0, 140);
      if (!text) {
        return Response.json({ error: "ツイートを入力してください" }, { status: 400 });
      }
      // 「バズの波」用：見たことのある段階（0〜13 の番号）と投稿回数。おかしな値は捨てる
      const seen = Array.isArray(body.seen)
        ? [...new Set(body.seen.map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n < LEVELS.length))] : [];
      const posts = Math.max(0, Math.min(10000, Math.floor(Number(body.posts) || 0)));
      const result = simulateBuzz(text, null, { seen, posts });
      // 下ネタ・URL の投稿も採点して結果は返すが、ランキングと履歴には出さない（unlisted = 1）
      const unlisted = isUnlisted(text);
      // D1に保存（env.DB は wrangler.jsonc の binding 名）
      await env.DB.prepare(
        "INSERT INTO buzzes (text, level, emoji, score, likes, retweets, comment, unlisted) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      ).bind(text, result.level, result.emoji, result.score, result.likes, result.retweets, result.comment, unlisted ? 1 : 0).run();
      return Response.json({ text, ...result, unlisted });
    }

    // ── テストモード（合言葉を知っている人だけ）──
    if (url.pathname.startsWith("/api/admin/") && request.method === "POST") {
      // 合言葉の総当たりを防ぐため、合言葉を比べる前に数える（1分に15回まで）
      const wait = await tooFast(env, "admin", ip);
      if (wait) return slowDown(wait);
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
        return Response.json({ text, test: true, ...simulateBuzz(text, level), unlisted: isUnlisted(text) });
      }
    }

    if (url.pathname === "/api/history") {
      const { results } = await env.DB.prepare(
        "SELECT text, level, emoji, score, likes, created_at FROM buzzes WHERE unlisted = 0 ORDER BY id DESC LIMIT 20"
      ).all();
      return Response.json(results);
    }

    if (url.pathname === "/api/ranking") {
      // ?by=score でバズ力ランキング（段階が上のものから、同じ段階なら点数順）、それ以外はいいね数ランキング
      const byScore = url.searchParams.get("by") === "score";
      const order = byScore
        ? "CASE level " + LEVELS.map(() => "WHEN ? THEN ?").join(" ") + " ELSE -1 END DESC, score DESC, likes DESC"
        : "likes DESC";
      const { results } = await env.DB.prepare("SELECT text, level, emoji, score, likes FROM buzzes WHERE unlisted = 0 ORDER BY " + order + " LIMIT 10")
        .bind(...(byScore ? LEVELS.flatMap((l, i) => [l.name, i]) : [])).all();
      return Response.json(results);
    }

    if (url.pathname === "/api/stats") {
      // みんなの記録（D1から集計）。文章は出さないので、一覧に出さない投稿も数に入れる
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
