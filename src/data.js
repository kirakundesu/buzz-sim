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
import voidLines from "./lines/void.js";
import genesis from "./lines/genesis.js";
import truehome from "./lines/truehome.js";
import toneRoast from "./lines/tone-roast.js";
import toneCold from "./lines/tone-cold.js";
import toneWarm from "./lines/tone-warm.js";
import toneGood from "./lines/tone-good.js";
import tonePraise from "./lines/tone-praise.js";

// ── 14段階（通常7 + シークレット7）＋ エンドコンテンツ3 ──
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
  // ここからエンドコンテンツ（end）：バズマップにも数にも出さない。点数では届かず（minScore 999）、
  // 14段階ぜんぶ見たあと index.js の endTarget で、無 → 創世 → 真・家庭内 の順にまれに出る。講評は追い講評なし
  // いいね数：無は0、創世は1無量大数（1e68。新しい宇宙の最初の1）、真・家庭内は家族の3
  { name: "無",         emoji: "🕳️", minScore: 999, likes: [0, 1],       tone: "void",    secret: true, hidden: true, end: true },
  { name: "創世",       emoji: "🌱", minScore: 999, likes: [1e68, 1e68], tone: "genesis", secret: true, hidden: true, end: true },
  { name: "真・家庭内", emoji: "🏡", minScore: 999, likes: [3, 4],       tone: "home",    secret: true, hidden: true, end: true },
];

// ── ツイートの「パターン」を見分けるキーワード ──
export const THEMES = {
  work:   { label: "仕事",     re: /仕事|上司|会社|会議|残業|月曜|出社|リモート|給料|社畜|退勤|部長|課長|取引先|有給|転職/ },
  family: { label: "家族",     re: /母(?!音|校|国)|父|妹|弟|姉|兄|おかん|オカン|おとん|親(?!切|指|友|知らず)|家族|子供|息子|娘|嫁|(?<!大丈|工|丈)夫|じいちゃん|ばあちゃん/ },
  love:   { label: "恋愛",     re: /恋|彼氏|彼女|好きな人|デート|告白|失恋|既読|婚活|マッチング|元カレ|元カノ|片思い/ },
  food:   { label: "食べ物",   re: /ご飯|ごはん|飯|ラーメン|カレー|寿司|食べ|ダイエット|カロリー|コンビニ|焼肉|お腹|腹減|おやつ|ビール/ },
  animal: { label: "動物",     re: /猫|犬|ねこ(?!ろ)|いぬ|ネコ|イヌ|ペット(?!ボトル)|ハムスター|うさぎ|(?<![ぐふん])にゃ|わんこ|わんちゃん|わんわん|インコ/ },
  sleep:  { label: "睡眠",     re: /眠|寝|布団|ふとん|(?<![がもか])起き|二度寝|夜更かし|目覚まし|朝起|徹夜/ },
  otaku:  { label: "推し活",   re: /推し|オタク|(?<!ド)ライブ|ガチャ|アニメ|ゲーム|課金|声優|新刊|コミケ|ソシャゲ/ },
  self:   { label: "自虐",     re: /俺なんて|私なんて|陰キャ|ぼっち|モテない|才能ない|ダメ人間|自分だけ|友達いない|非モテ|運動音痴/ },
  tech:   { label: "IT",       re: /AI|ＡＩ|プログラム|エンジニア|(?<!レ|バー|QR|ＱＲ)コード|バグ|サービス(?!エリア|精神)|アプリ|Web|ウェブ|Claude|ChatGPT|デプロイ|サーバー/ },
  school: { label: "学校",     re: /学校|先生|授業|テスト|宿題|部活|受験|大学|単位|レポート|教室/ },
};

// ── ランキングと履歴に出さない言葉（下の isUnlisted で使う。index.js が投稿のときに呼ぶ）──
// 下ネタ・差別語。投稿はふつうに採点して結果も見せるが、みんなが見る一覧（ランキング・最新のバズ）には出さない
// 文章は先に「全角→半角・小文字・空白や記号を抜く」をしてから比べる（「ち ん こ」「ﾁﾝｺ」も拾う）
// ふつうのツイートを巻き込まないように、言葉は絞ってある（パチンコ・ちんちん電車・フェラーリ・ヘアゴム などは拾わない）
// うんこ・うんち は子どもの笑いとしてよくあるので入れていない
export const NG_WORDS = [
  /(?<![ぱパがかこばガカコバ])ちんこ(?!れ)/, /(?<![パガカコバ])チンコ/, /チソコ|マソコ/, /ちんぽ|チンポ/, /ちんちん(?!電車)|チンチン(?!電車)/,
  /(?<!\p{sc=Han})まんこ/u, /マンコ(?![ァ-ヴー])/, /手コキ|てこき(?!使|下ろ|おろ|つか)|手マン(?![ァ-ヴー])/, /ヤリマン|ヤリチン|やりまん|やりちん/,
  /(?<!ユニ|サ|エ|ノン)セックス|(?<!ゆに|さ|え|のん)せっくす/, /オナニ|おなにー/, /フェラ(?![ァ-ヴー])|ふぇら(?!ーり)/, /(?<![年日途前後今夜週月])中出し|なかだし/, /勃起/, /射精|精液|精子/,
  /(?<![グドク])レイプ|(?<![ぐどくす])れいぷ/, /(?<!ヘア|髪)ゴムしてる/,
  /porn|hentai|xvideos|fuck|\bsex\b|nigg(?:er|a)/,
  /キチガイ|気違い|ガイジ(?!ン)|池沼|(?<![ァ-ヴー])チョン(?![ァ-ヴー・])|支那人|シナ人/,   // 差別語（ひらがなの「きちがい」は「聞きちがい」があるので入れない）
  /(?<![相悩黙抹忙笑併必])殺(?:す|せ|そう|して|します|したい|害)|(?<![とこごおひ])ころす(?![ごっぎきべ])|爆破|放火|死ね(?![るんなまた])|タヒね/,   // 脅し。犯行予告のような投稿を、みんなの一覧に載せない（「相殺する」「尊くて死ねる」「死ねん」は通す）
];
// カタカナとひらがなを混ぜたごまかし（「ちンこ」「セッくす」）用。全部ひらがなにしてから比べる
const toHiragana = (s) => s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
const FOLDED_NG = [/(?<![ぱがかこば])ちんこ(?!れ)/, /ちんぽ/, /ちんちん(?!電車|でんしゃ)/, /(?<!\p{sc=Han})まんこ(?![ぁ-ゖー])/u, /てこき(?!使|下ろ|おろ|つか)/, /やりまん|やりちん/, /(?<!ゆに|さ|え|のん)せっくす/, /おなにー/];
// URL（よそのサイトへ誘う投稿）。「pornhub.com」のような http なしの書き方も拾う
export const URL_RE = /https?:|(?<![a-z0-9])www\.[a-z0-9]|(?<![a-z0-9-])(?=[0-9-]*[a-z])[a-z0-9-]+\.(?:com|net|org|jp|io|xyz|me|tv|ly|cc|to|gg|info|biz|site|app|dev|co|ru|cn|kr|tokyo|shop|top|link|club|online|live|page|vip|be|gl|ai|fm|us|uk|de|fr|br|tk|ml|cf|ga|pw|icu|lol|moe)\b/;
// 上にない短い終わり方（evil.xxx）も URL とみなす。ファイル名や「Mr.Big」「Dr.Who」は除く
const ANY_DOMAIN_RE = /(?<![a-z0-9-])(?=[0-9-]*[a-z])[a-z0-9-]+(?<!\b(?:mr|mrs|ms|dr|st|mt|vs|no|jr|lv|ver|feat|ft|vol))\.(?!(?:js|ts|py|md|sh|rb|go|rs|cs|css|txt|exe|png|jpg|gif|pdf|zip|mp3|mp4|am|pm)\b)[a-z]{2,3}\b/;
// 「example . com」「example。com」のように間を空けた書き方用。英語の文の区切りと見分けがつかないもの（me to be top live link page app）は外す
const SPACED_URL_RE = /(?<![a-z0-9-])(?=[0-9-]*[a-z])[a-z0-9-]+\.(?:com|net|org|jp|io|xyz|tv|ly|cc|gg|info|biz|site|dev|co|ru|cn|kr|tokyo|shop|club|online|vip|gl|fm|us|uk|de|fr|br|tk|ml|cf|ga|pw|icu|lol|moe)\b/;
// 個人情報と名指し（メールアドレス・@宛先・電話番号）。だれかの連絡先や、名指しの攻撃をみんなの一覧に載せない
export const PERSONAL_RE = /[a-z0-9._%+-]+@[a-z0-9-]+\.[a-z]{2,}|(?:^|[^a-z0-9_])@[a-z0-9_]{2,15}(?![a-z0-9_])/;
const PHONE_RE = /(?<!\d)0\d{9,10}(?!\d)/;
// 一覧に出さない投稿なら true（tools/unlist-old.mjs からも使うので、Workers 専用のものに頼らずここに置く）
export function isUnlisted(text) {
  const n = text.normalize("NFKC").toLowerCase();
  const dotted = n.replace(/。/g, ".").replace(/\s*\.\s*/g, ".");   // 「example。com」「example . com」も URL として見る
  const s = n.replace(/[^\p{L}\p{N}]/gu, "");   // 間に入れた空白や記号（「ち ん こ」「ち♡ん♡こ」）を抜く
  if (new Set(s).size < 3) return true;   // 「a」「ああああ」のような中身のない投稿（連打の荒らしを一覧に出さない）
  if (PHONE_RE.test(n.replace(/[\s().\-‐－ー]/g, ""))) return true;
  if (URL_RE.test(n) || SPACED_URL_RE.test(dotted) || ANY_DOMAIN_RE.test(n.replace(/。(?=[a-z])/g, ".")) || /https?/.test(s) && /https?:\s*\/\s*\//.test(n.replace(/\s/g, ""))) return true;
  const f = toHiragana(s);
  return PERSONAL_RE.test(n) || NG_WORDS.some((re) => re.test(n) || re.test(s)) || FOLDED_NG.some((re) => re.test(f));
}

// ── 講評とリプライ（中身は src/lines/ のファイル。文章を足したり変えたりするときはそちらを触る）──
// 段階ごとのファイル：{ comments: [書き出しの講評 100個], replies: [[名前, ID, 本文] 100個] }
// 毒舌は「は？」、塩は「あー……」、なかなか（全国）は「ほう……」、ほめ（アジア）は「おお！」、絶賛は「ちょっと待って」で始まる
// tone ごとのファイル（tone-*.js）：{ comments: { パターン: [追い講評…] }, replies: { パターン: [[名前, ID, 本文], …] } }

// LEVELS と同じ順番
const STAGE_LINES = [home, village, town, pref, nation, asia, earth, solar, galaxy, cluster, universe, fourd, kami, glitch, voidLines, genesis, truehome];

// 段階ごとの講評（書き出し部分）とリプライ
export const BASE_COMMENTS = Object.fromEntries(LEVELS.map((l, i) => [l.name, STAGE_LINES[i].comments]));
export const LEVEL_REPLIES = Object.fromEntries(LEVELS.map((l, i) => [l.name, STAGE_LINES[i].replies]));

// パターン別の追い講評とリプライ（tone ごと）
// 講評は「段階の書き出し」＋「パターン別の追い講評」の組み合わせでできる
const TONES = { roast: toneRoast, cold: toneCold, warm: toneWarm, good: toneGood, praise: tonePraise };
export const THEME_COMMENTS = Object.fromEntries(Object.entries(TONES).map(([k, v]) => [k, v.comments]));
export const THEME_REPLIES = Object.fromEntries(Object.entries(TONES).map(([k, v]) => [k, v.replies]));
