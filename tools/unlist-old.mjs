// 前からある投稿のうち、一覧に出さないもの（src/data.js の isUnlisted）に unlisted = 1 を付ける
// NG_WORDS や URL_RE を変えたら、これで前の投稿にも付け直す（付けるだけで、外すことはしない）
//   node tools/unlist-old.mjs --remote          … 本番。対象の投稿と SQL を見せるだけ（何も変えない）
//   node tools/unlist-old.mjs --remote --apply  … 本番に書きこむ
//   --remote の代わりに --local にするとローカルの D1
// Git Bash でも PowerShell でも同じ。wrangler にログインしている必要がある
import { execSync } from "node:child_process";
import { isUnlisted } from "../src/data.js";

const where = ["--remote", "--local"].find((a) => process.argv.includes(a));
if (!where) { console.log("--remote（本番）か --local（ローカル）を付けてください"); process.exit(1); }
const apply = process.argv.includes("--apply");
const d1 = (sql) => JSON.parse(execSync("npx wrangler d1 execute buzz-db " + where + ' --json --command "' + sql + '"',
  { encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "inherit"] }))[0].results;

// SELECT * にしておくと、unlisted の列を足す前でも動く（そのときは全部が対象の候補）
const rows = d1("SELECT * FROM buzzes ORDER BY id").filter((r) => !r.unlisted && isUnlisted(r.text));
const kinds = new Map();
for (const r of rows) kinds.set(r.text, (kinds.get(r.text) || 0) + 1);
console.log("対象 " + rows.length + " 件（文章の種類 " + kinds.size + "）");
for (const [text, n] of kinds) console.log("  " + n + "件  " + JSON.stringify(text).slice(0, 70));

// 1回の SQL が長くなりすぎないように、300件ずつに分ける
const sqls = [];
for (let i = 0; i < rows.length; i += 300) {
  sqls.push("UPDATE buzzes SET unlisted = 1 WHERE id IN (" + rows.slice(i, i + 300).map((r) => r.id).join(", ") + ")");
}
console.log("\n" + (sqls.join(";\n") || "（付け直すものはありません）"));
if (!apply) { if (sqls.length) console.log("\n※ まだ何も変えていません。書きこむときは --apply を付けます"); process.exit(0); }
for (const sql of sqls) d1(sql);
console.log("\n" + rows.length + " 件に unlisted = 1 を付けました");
