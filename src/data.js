// バズの段階・講評・リプライのデータ集
// 段階・テーマはこのファイル、講評とリプライの文章は src/lines/ のファイルにある

import home from "./lines/home.js";
import village from "./lines/village.js";
import town from "./lines/town.js";
import pref from "./lines/pref.js";
import nation from "./lines/nation.js";
import asia from "./lines/asia.js";
import earth from "./lines/earth.js";
import solar from "./lines/solar.js";
import galaxy from "./lines/galaxy.js";
import cluster from "./lines/cluster.js";
import universe from "./lines/universe.js";
import fourd from "./lines/fourd.js";
import kami from "./lines/kami.js";
import glitch from "./lines/glitch.js";
import toneRoast from "./lines/tone-roast.js";
import toneCold from "./lines/tone-cold.js";
import toneWarm from "./lines/tone-warm.js";
import toneGood from "./lines/tone-good.js";
import tonePraise from "./lines/tone-praise.js";

// ── 14段階（通常7 + シークレット7）──
// minScore 以上でその段階。tone は バズ神のキャラ（roast=毒舌 / cold=塩 / warm=なかなか / good=ほめ / praise=絶賛）
// hidden: シークレットの中のシークレット。一度届くまでバズマップにも /api/levels にも出さない
export const LEVELS = [
  { name: "家庭内", emoji: "🏠", minScore: 0,  likes: [0, 6],                     tone: "roast" },
  { name: "村",     emoji: "🌾", minScore: 14, likes: [6, 300],                   tone: "roast" },
  { name: "町",     emoji: "🏘️", minScore: 27, likes: [300, 5_000],               tone: "roast" },
  { name: "県",     emoji: "🏯", minScore: 40, likes: [5_000, 50_000],            tone: "cold" },
  { name: "全国",   emoji: "🗾", minScore: 50, likes: [50_000, 500_000],          tone: "warm" },
  { name: "アジア", emoji: "🌏", minScore: 60, likes: [500_000, 3_000_000],       tone: "good" },
  { name: "地球",   emoji: "🌍", minScore: 70, likes: [3_000_000, 20_000_000],    tone: "praise" },
  // ここからシークレット
  { name: "太陽系", emoji: "☀️", minScore: 77, likes: [2e7, 1e8],   tone: "praise", secret: true },
  { name: "銀河",   emoji: "🌌", minScore: 83, likes: [1e8, 1e9],   tone: "praise", secret: true },
  { name: "銀河団", emoji: "✨", minScore: 88, likes: [1e9, 1e10],  tone: "praise", secret: true },
  { name: "宇宙",   emoji: "🌠", minScore: 92, likes: [1e10, 1e11], tone: "praise", secret: true, hidden: true },
  { name: "四次元", emoji: "🌀", minScore: 96, likes: [1e11, 1e13], tone: "praise", secret: true, hidden: true },
  { name: "神",     emoji: "⛩️", minScore: 98, likes: [1e13, 1e15], tone: "praise", secret: true, hidden: true },
  { name: "∬∃@▽◇◎＄￡※⊆〒^^", emoji: "👁️", minScore: 99, likes: [1e15, 9e15], tone: "praise", secret: true, hidden: true },
];

// ── ツイートの「パターン」を見分けるキーワード ──
export const THEMES = {
  work:   { label: "仕事",     re: /仕事|上司|会社|会議|残業|月曜|出社|リモート|給料|社畜|退勤|部長|課長|取引先|有給|転職/ },
  family: { label: "家族",     re: /母|父|妹|弟|姉|兄|おかん|オカン|おとん|親|家族|子供|息子|娘|嫁|夫|じいちゃん|ばあちゃん/ },
  love:   { label: "恋愛",     re: /恋|彼氏|彼女|好きな人|デート|告白|失恋|既読|婚活|マッチング|元カレ|元カノ|片思い/ },
  food:   { label: "食べ物",   re: /ご飯|ごはん|飯|ラーメン|カレー|寿司|食べ|ダイエット|カロリー|コンビニ|焼肉|お腹|腹減|おやつ|ビール/ },
  animal: { label: "動物",     re: /猫|犬|ねこ|いぬ|ネコ|イヌ|ペット|ハムスター|うさぎ|にゃ|わん|インコ/ },
  sleep:  { label: "睡眠",     re: /眠|寝|布団|起き|二度寝|夜更かし|目覚まし|朝起|徹夜/ },
  otaku:  { label: "推し活",   re: /推し|オタク|ライブ|ガチャ|アニメ|ゲーム|課金|声優|新刊|コミケ|ソシャゲ/ },
  self:   { label: "自虐",     re: /俺なんて|私なんて|陰キャ|ぼっち|モテない|才能ない|ダメ人間|自分だけ|友達いない|非モテ|運動音痴/ },
  tech:   { label: "IT",       re: /AI|ＡＩ|プログラム|エンジニア|コード|バグ|サービス|アプリ|Web|ウェブ|Claude|ChatGPT|デプロイ|サーバー/ },
  school: { label: "学校",     re: /学校|先生|授業|テスト|宿題|部活|受験|大学|単位|レポート|教室/ },
};

// ── 講評とリプライ（中身は src/lines/ のファイル。文章を足したり変えたりするときはそちらを触る）──
// 段階ごとのファイル：{ comments: [書き出しの講評 100個], replies: [[名前, ID, 本文] 100個] }
// 毒舌は「は？」、塩は「あー……」、なかなか（全国）は「ほう……」、ほめ（アジア）は「おお！」、絶賛は「ちょっと待って」で始まる
// tone ごとのファイル（tone-*.js）：{ comments: { パターン: [追い講評…] }, replies: { パターン: [[名前, ID, 本文], …] } }

// LEVELS と同じ順番
const STAGE_LINES = [home, village, town, pref, nation, asia, earth, solar, galaxy, cluster, universe, fourd, kami, glitch];

// 段階ごとの講評（書き出し部分）とリプライ
export const BASE_COMMENTS = Object.fromEntries(LEVELS.map((l, i) => [l.name, STAGE_LINES[i].comments]));
export const LEVEL_REPLIES = Object.fromEntries(LEVELS.map((l, i) => [l.name, STAGE_LINES[i].replies]));

// パターン別の追い講評とリプライ（tone ごと）
// 講評は「段階の書き出し」＋「パターン別の追い講評」の組み合わせでできる
const TONES = { roast: toneRoast, cold: toneCold, warm: toneWarm, good: toneGood, praise: tonePraise };
export const THEME_COMMENTS = Object.fromEntries(Object.entries(TONES).map(([k, v]) => [k, v.comments]));
export const THEME_REPLIES = Object.fromEntries(Object.entries(TONES).map(([k, v]) => [k, v.replies]));
