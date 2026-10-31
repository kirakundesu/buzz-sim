// npx vitest run で実行する
import { SELF, env } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import worker, { simulateBuzz, score, superLikes, cleanText, personKey, clearLists, levelFromScore } from "../src/index.js";
import { LEVELS, BASE_COMMENTS, LEVEL_REPLIES, THEME_COMMENTS, THEME_REPLIES, isUnlisted } from "../src/data.js";
import MIGRATE_COUNT from "../tools/migrate-count.sql?raw";

// 本番の D1 と同じ形（unlisted・stage・who は後から ALTER TABLE で足した列。件数のトリガーは本物の移行ファイルを流す）
const COUNT_SQL = MIGRATE_COUNT.split(/\r?\n/).filter((line) => line.trim() && !line.startsWith("--")).join("\n");
const CREATE_TABLE = "CREATE TABLE IF NOT EXISTS buzzes (id INTEGER PRIMARY KEY AUTOINCREMENT, text TEXT NOT NULL, level TEXT NOT NULL, emoji TEXT NOT NULL, score INTEGER NOT NULL, likes INTEGER NOT NULL, retweets INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), comment TEXT, unlisted INTEGER NOT NULL DEFAULT 0, stage INTEGER NOT NULL DEFAULT 0, who TEXT)\n" + COUNT_SQL;
// 一覧は少しの間ためておくので、テストごとに空にする
beforeEach(() => clearLists("http://example.com"));
const OPENER = { roast: "は？", cold: "あー……", warm: "ほう……", good: "おお！", praise: "ちょっと待って" };

describe("段階", () => {
	it("14段階＋エンドコンテンツ3つで、神は四次元と∬…の間にある", () => {
		expect(LEVELS).toHaveLength(17);
		expect(LEVELS.map((l) => l.name).slice(11)).toEqual(["四次元", "神", "∬∃@▽◇◎＄￡※⊆〒^^", "無", "創世", "真・家庭内"]);
		expect(LEVELS.filter((l) => l.hidden && !l.end).map((l) => l.name)).toEqual(["宇宙", "四次元", "神", "∬∃@▽◇◎＄￡※⊆〒^^"]);
		expect(LEVELS.filter((l) => l.end).map((l) => l.name)).toEqual(["無", "創世", "真・家庭内"]);
	});

	it("minScore が小さい順に並んでいる（エンドコンテンツは点数では届かない）", () => {
		const main = LEVELS.filter((l) => !l.end);
		main.forEach((l, i) => i && expect(l.minScore).toBeGreaterThan(main[i - 1].minScore));
		LEVELS.filter((l) => l.end).forEach((l) => expect(l.minScore).toBeGreaterThan(100));
	});

	it("どの段階にも講評とリプライがそろっている", () => {
		for (const l of LEVELS) {
			expect(BASE_COMMENTS[l.name].length).toBe(100);
			expect(LEVEL_REPLIES[l.name].length).toBe(100);
			if (!l.end) for (const c of BASE_COMMENTS[l.name]) expect(c.startsWith(OPENER[l.tone])).toBe(true);
		}
		for (const tone of Object.keys(OPENER)) {
			for (const p of Object.keys(THEME_COMMENTS.roast)) {
				expect(THEME_COMMENTS[tone][p].length).toBeGreaterThan(0);
				expect(THEME_REPLIES[tone][p].length).toBeGreaterThan(0);
			}
		}
	});
});

describe("採点", () => {
	it("4つの観点は0〜25点、合計は0〜100点", () => {
		const { axes, total } = score("月曜の朝、母に「起きなさい」と言われた。\n日曜だった。");
		Object.values(axes).forEach((v) => expect(v).toBeGreaterThanOrEqual(0) && expect(v).toBeLessThanOrEqual(25));
		expect(total).toBe(axes.empathy + axes.surprise + axes.fun + axes.spread);
	});

	// 運の幅があるので、30回採点していちばん多かった段階で見る
	const usual = (text) => {
		const count = {};
		for (let k = 0; k < 30; k++) {
			const i = LEVELS.findLastIndex((l) => score(text).total >= l.minScore);
			count[i] = (count[i] || 0) + 1;
		}
		return Number(Object.entries(count).sort((a, b) => b[1] - a[1])[0][0]);
	};
	it("中身のない投稿は家庭内、ふつうの一文は町までは届く", () => {
		expect(usual("あ")).toBe(0);
		expect(usual("駅まで歩いた")).toBeGreaterThanOrEqual(2);
		expect(usual("部屋の掃除をした")).toBeGreaterThanOrEqual(2);
	});
	it("工夫するほど上がり、オチ＋会話＋あるあるで地球前後", () => {
		expect(usual("月曜の朝がつらすぎる")).toBeGreaterThanOrEqual(3);
		expect(usual("ダイエット中なのに、気づいたら焼肉食べ放題にいた")).toBeGreaterThanOrEqual(5);
		const top = usual("月曜の朝、母に「起きなさい」と言われた。\n日曜だった。");
		expect(top).toBeGreaterThanOrEqual(5);
		expect(top).toBeLessThanOrEqual(8);
	});

	it("ふつうの言葉を毒や連打にしない。テーマも取り違えない", () => {
		const same = (a, b) => { const x = Array.from({ length: 12 }, () => score(a).total), y = Array.from({ length: 12 }, () => score(b).total); return Math.abs(x.reduce((p, q) => p + q) - y.reduce((p, q) => p + q)) / 12; };
		for (const [a, b] of [["カステラ美味しい", "ケーキ美味しい"], ["ゴミ出しの日を忘れた", "資源の日を忘れた"], ["今日もカスタマーサポートで怒られた", "今日もコールセンターで怒られた"]]) expect(same(a, b), a).toBeLessThan(9);
		expect(score("面白すぎて草wwwwww").features.spam).toBe(false);
		expect(score("そう………………").features.spam).toBe(false);
		expect(score("やったーーーーーー").features.spam).toBe(false);
		expect(score("ああああああああ").features.spam).toBe(true);
		expect(score("うるせえカス").features.toxic).toBe(true);
		expect(score("大丈夫じゃない").features.themes).not.toContain("family");
		expect(score("親切な人に会った").features.themes).not.toContain("family");
		expect(score("事件が起きた").features.themes).not.toContain("sleep");
		expect(score("レコードを買った").features.themes).not.toContain("tech");
		expect(score("朝起きたら昼だった").features.themes).toContain("sleep");
		// 別の言葉の一部に引っかからない
		for (const [text, theme] of [["変わんない", "animal"], ["思わんかった", "animal"], ["こんにゃく", "animal"], ["ぐにゃぐにゃ", "animal"], ["ペットボトル", "animal"], ["ねころんで", "animal"],
			["ドライブに行く", "otaku"], ["何か起きた", "sleep"], ["QRコード", "tech"], ["バーコード", "tech"], ["サービスエリア", "tech"], ["母音", "family"], ["母校", "family"]]) expect(score(text).features.themes, text).not.toContain(theme);
		// 本物はこれまでどおり拾う
		for (const [text, theme] of [["猫がかわいい", "animal"], ["にゃーん", "animal"], ["うちのわんこ", "animal"], ["ペットを飼った", "animal"], ["ライブに行く", "otaku"], ["ソースコード", "tech"], ["母に怒られた", "family"]]) expect(score(text).features.themes, text).toContain(theme);
		expect(score("尊くて死ねる").features.toxic).toBe(false);
		expect(score("もう死ね").features.toxic).toBe(true);
	});
	it("長い文は拡散力が下がる（100文字まで 14、125文字まで 12、それより上 9）", () => {
		const plain = (n) => "あいうえおかきくけこさしすせそたちつてとなにぬねの".repeat(6).slice(0, n);
		expect(score(plain(100)).features.len).toBe(100);
		const avg = (n) => Array.from({ length: 30 }, () => score(plain(n)).axes.spread).reduce((p, q) => p + q) / 30;
		expect(avg(100)).toBeGreaterThan(avg(120));
		expect(avg(120)).toBeGreaterThan(avg(135));
	});
	it("テストモードの点数は、どの段階でも各25点を超えない", () => {
		LEVELS.forEach((l, i) => { const r = simulateBuzz("てすと", i); Object.values(r.axes).forEach((v) => expect(v, l.name).toBeLessThanOrEqual(25)); expect(r.score).toBe(Object.values(r.axes).reduce((p, q) => p + q)); });
	});

	it("バズの波は、まだ見ていない段階にだけ押し上げる", () => {
		const text = "月曜の朝、母に「起きなさい」と言われた。\n日曜だった。";
		const seen = LEVELS.map((l, i) => i).filter((i) => i !== 13);   // ∬… だけ見ていない
		let waves = 0;
		for (let k = 0; k < 60; k++) {
			const r = simulateBuzz(text, null, { seen, posts: 40 });
			if (r.wave) { waves++; expect(r.levelIndex).toBe(13); }
			expect(r.score).toBe(r.axes.empathy + r.axes.surprise + r.axes.fun + r.axes.spread);
		}
		expect(waves).toBeGreaterThan(0);
	});
	it("全部見終わっても、ときどき上の段階へ押し上げる（シークレットが出続ける）", () => {
		const all = LEVELS.map((l, i) => i);
		let secrets = 0;
		for (let k = 0; k < 300; k++) {
			const r = simulateBuzz("二度寝したら昼だった", null, { seen: all, posts: 99 });
			if (r.secret) secrets++;
		}
		expect(secrets).toBeGreaterThan(20);   // 300回のうち、だいたい60回前後
	});
	it("バズの波の行き先は下から順番ではなく、ばらける", () => {
		const normal = [0, 1, 2, 3, 4, 5, 6];   // ふつうの段階だけ見たことがある
		const targets = new Set();
		for (let k = 0; k < 300; k++) {
			const r = simulateBuzz("二度寝したら昼だった", null, { seen: normal, posts: 30 });
			if (r.wave) targets.add(r.levelIndex);
		}
		expect(targets.size).toBeGreaterThanOrEqual(5);   // 太陽系だけでなく、いろいろなシークレットに飛ぶ
	});
	it("∬… は、ほかのシークレットをぜんぶ解放するまで、波でも点数でも出ない", () => {
		const normal = [0, 1, 2, 3, 4, 5, 6], secrets = [7, 8, 9, 10, 11, 12];
		for (const lacking of secrets) {
			const seen = [...normal, ...secrets.filter((i) => i !== lacking)];
			for (let k = 0; k < 150; k++) expect(simulateBuzz("二度寝したら昼だった", null, { seen, posts: 99 }).levelIndex).not.toBe(13);
			expect(levelFromScore(100, { seen, posts: 99 })).toBe(12);   // 点数が足りていても神で止まる
		}
		expect(levelFromScore(100, { seen: normal, posts: 0 })).toBe(12);
		expect(levelFromScore(100, { seen: [...normal, ...secrets], posts: 0 })).toBe(13);
		expect(levelFromScore(100, { seen: [13], posts: 0 })).toBe(13);   // 一度届いた人はそのまま
		// ぜんぶ解放した人には、波で出る
		const hits = Array.from({ length: 300 }, () => simulateBuzz("二度寝したら昼だった", null, { seen: [...normal, ...secrets], posts: 40 }));
		expect(hits.some((r) => r.levelIndex === 13)).toBe(true);
	});

	it("テストモードで指定した段階になり、講評とリプライが付く", () => {
		LEVELS.forEach((l, i) => {
			const r = simulateBuzz("猫が「にゃ」と言った。", i);
			expect(r.levelIndex).toBe(i);
			expect(r.level).toBe(l.name);
			if (l.end) expect(BASE_COMMENTS[l.name]).toContain(r.comment);   // エンドコンテンツは追い講評なし
			else expect(r.comment.startsWith(OPENER[l.tone])).toBe(true);
			expect(r.replies).toHaveLength(3);
			r.replies.forEach((x) => expect(x.name && x.handle && x.text).toBeTruthy());
			expect(r.likes).toBeGreaterThanOrEqual(l.likes[0]);
			expect(r.score).toBeLessThanOrEqual(100);
		});
	});
});

describe("エンドコンテンツ", () => {
	const main = LEVELS.map((l, i) => i).filter((i) => !LEVELS[i].end);
	const ends = LEVELS.map((l, i) => i).filter((i) => LEVELS[i].end);
	const run = (seen, n) => Array.from({ length: n }, () => simulateBuzz("二度寝したら昼だった", null, { seen, posts: 50 }));

	it("14段階ぜんぶ見るまでは出ない", () => {
		const almost = main.filter((i) => i !== 13);
		for (const r of run(almost, 300)) expect(r.end).toBe(false);
	});
	it("ぜんぶ見たあとは、無 → 創世 → 真・家庭内 の順に出る", () => {
		const first = run(main, 300).filter((r) => r.end);
		expect(first.length).toBeGreaterThan(0);
		first.forEach((r) => expect(r.level).toBe("無"));
		const second = run([...main, ends[0]], 300).filter((r) => r.end);
		expect(second.length).toBeGreaterThan(0);
		second.forEach((r) => expect(r.level).toBe("創世"));
	});
	it("真・家庭内は、実際に家庭内に着いたことがある人にだけ出る", () => {
		const two = [...main, ends[0], ends[1]];
		const lucky = (seen, home, n = 600) => Array.from({ length: n }, () => simulateBuzz("二度寝したら昼だった", null, { seen, posts: 50, home }));
		for (const r of lucky(two, false)) expect(r.end).toBe(false);
		const opened = lucky(two, true).filter((r) => r.end);
		expect(opened.length).toBeGreaterThan(0);
		opened.forEach((r) => expect(r.level).toBe("真・家庭内"));
		// 一度出た人は、着いた記録がなくても、また出ることがある（3つとも見たあとの低確率）
		const again = lucky([...two, ends[2]], false, 2000).filter((r) => r.end);
		expect(again.length).toBeGreaterThan(0);
		// ヒントのとおり、中身のない投稿で家庭内に帰れる
		const back = lucky.call(null, two, false, 0).concat(Array.from({ length: 300 }, () => simulateBuzz("あ", null, { seen: two, posts: 100 })));
		expect(back.filter((r) => r.levelIndex === 0).length).toBeGreaterThan(100);
	});
	it("無は0いいね、真・家庭内は家族の3いいね", () => {
		expect(simulateBuzz("てすと", ends[0]).likes).toBe(0);
		expect(simulateBuzz("てすと", ends[2]).likes).toBe(3);
	});
	it("バズの波やふつうの採点では、エンドコンテンツには行かない", () => {
		for (const r of run(main.filter((i) => i < 7), 300)) expect(r.end).toBe(false);
	});
	it("創世は1無量大数いいね", () => {
		expect(simulateBuzz("てすと", ends[1]).likes).toBe(1e68);
	});
});

describe("超バズ（いいね数が京から上）", () => {
	const KAMI = LEVELS.findIndex((l) => l.name === "神");
	it("神より下の段階とエンドコンテンツでは起きない", () => {
		LEVELS.forEach((l, i) => {
			if (i >= KAMI && !l.end) return;
			for (let n = 0; n < 2000; n++) expect(superLikes(i)).toBeNull();
		});
	});
	it("神と∬…でも100回に1回くらい。垓から上はさらに10分の1。無量大数には届かない", () => {
		const N = 200000;
		const rolls = Array.from({ length: N }, () => superLikes(KAMI + 1)).filter((v) => v != null);
		expect(rolls.length / N).toBeGreaterThan(0.007);
		expect(rolls.length / N).toBeLessThan(0.013);
		rolls.forEach((v) => { expect(v).toBeGreaterThanOrEqual(1e16); expect(v).toBeLessThan(1e68); });
		const gai = rolls.filter((v) => v >= 1e20).length;
		expect(gai / rolls.length).toBeGreaterThan(0.05);
		expect(gai / rolls.length).toBeLessThan(0.16);
	});
	it("ふつうに投稿しても、京を超えるのはめったにない", () => {
		const seen = LEVELS.map((l, i) => i);
		const big = Array.from({ length: 20000 }, () => simulateBuzz("二度寝したら昼だった", null, { seen, posts: 100 }))
			.filter((r) => !r.end && r.likes >= 1e16);
		expect(big.length).toBeLessThan(40);   // 期待値は 20000回で約12回（1600回に1回くらい）
		big.forEach((r) => expect(r.levelIndex).toBeGreaterThanOrEqual(KAMI));
	});
});

describe("API", () => {
	it("/api/levels はシークレットの中のシークレットを出さない", async () => {
		const levels = await (await SELF.fetch("http://example.com/api/levels")).json();
		expect(levels).toHaveLength(10);
		expect(levels.filter((l) => l.secret)).toHaveLength(3);
		expect(JSON.stringify(levels)).not.toContain("神");
	});

	it("ランキングはバズ力順（?by=score）といいね数順で並びが変わる", async () => {
		await env.DB.exec(CREATE_TABLE);
		await env.DB.batch([
			env.DB.prepare("INSERT INTO buzzes (text, level, emoji, score, likes, retweets) VALUES (?, ?, ?, ?, ?, ?)").bind("点が高い", "地球", "🌍", 75, 100, 10),
			env.DB.prepare("INSERT INTO buzzes (text, level, emoji, score, likes, retweets) VALUES (?, ?, ?, ?, ?, ?)").bind("いいねが多い", "県", "🏯", 45, 999999, 10),
		]);
		const byScore = await (await SELF.fetch("http://example.com/api/ranking?by=score")).json();
		const byLikes = await (await SELF.fetch("http://example.com/api/ranking")).json();
		expect(byScore[0].text).toBe("点が高い");
		expect(byLikes[0].text).toBe("いいねが多い");
	});

	it("京から上の大きないいね数も保存でき、いいね数ランキングで正しく並ぶ", async () => {
		await env.DB.exec(CREATE_TABLE);
		const rows = [["兆", 9e15], ["京", 3.4e16], ["垓", 5e20], ["無量大数", 1e68], ["ふつう", 999999]];
		await env.DB.batch(rows.map(([text, likes]) =>
			env.DB.prepare("INSERT INTO buzzes (text, level, emoji, score, likes, retweets) VALUES (?, ?, ?, ?, ?, ?)").bind(text, "神", "⛩️", 99, likes, Math.floor(likes * 0.2))));
		const byLikes = await (await SELF.fetch("http://example.com/api/ranking")).json();
		expect(byLikes.slice(0, 4).map((r) => r.text)).toEqual(["無量大数", "垓", "京", "兆"]);
		expect(byLikes[0].likes).toBe(1e68);
		expect(byLikes[1].likes).toBe(5e20);
		expect(byLikes[2].likes).toBeCloseTo(3.4e16, -2);
	});

	it("いいね数の表示：京から上は単位つきで短く、それより下は桁区切り", async () => {
		const html = await (await SELF.fetch("http://example.com/")).text();
		const src = html.match(/var BIG_UNITS[\s\S]*?\nfunction bigUnit[\s\S]*?\n\}/)[0];
		const { likeNum, compactNum, bigUnit } = new Function(src + "\nreturn { likeNum, compactNum, bigUnit };")();
		expect(likeNum(9e15)).toBe((9e15).toLocaleString());
		expect(likeNum(123456)).toBe((123456).toLocaleString());
		expect(likeNum(3.4e16)).toBe("3.4京");
		expect(likeNum(3456e16)).toBe("3456京");
		expect(likeNum(5e20)).toBe("5垓");
		expect(likeNum(1e68)).toBe("1無量大数");
		expect(likeNum(5e15, true)).toBe("5000兆");   // いいね数が京を超えたときのリツイート数など
		expect(compactNum(9.99996e19)).toBe("1垓");   // 9999.9京 は 10000京 ではなく 1垓
		expect(compactNum(2.5e8)).toBe("2.5億");
		const names = ["京", "垓", "秭", "穣", "溝", "澗", "正", "載", "極", "恒河沙", "阿僧祇", "那由他", "不可思議", "無量大数"];
		names.forEach((name, k) => {
			expect(likeNum(10 ** (16 + 4 * k))).toBe("1" + name);
			expect(bigUnit(7 * 10 ** (16 + 4 * k))).toBe(name);
		});
	});

	it("合言葉なしのテストモードは 403", async () => {
		const res = await SELF.fetch("http://example.com/api/admin/test", { method: "POST", headers: { "content-type": "application/json", "cf-connecting-ip": "198.51.100.200" }, body: JSON.stringify({ key: "wrong", level: 12 }) });
		expect(res.status).toBe(403);
		expect((await res.json()).error).toBe("合言葉が違います");
	});

	it("トップページの HTML を返す", async () => {
		const html = await (await SELF.fetch("http://example.com/")).text();
		expect(html).toContain("ツイートバズシミュレーター");
		expect(html).toContain("/gods/");
		// page.js は String.raw のテンプレートなので、中のJSにバッククォートと ${ を書いてはいけない
		expect(html).not.toMatch(/`|\$\{/);
	});
});

// ランキングのテストより後に置く（ここで保存した投稿がランキングに混ざらないように）
describe("連投の制限", () => {
	const post = (ip) => SELF.fetch("http://example.com/api/buzz", {
		method: "POST", headers: { "content-type": "application/json", "cf-connecting-ip": ip }, body: JSON.stringify({ text: "連投テスト" }),
	});
	const saved = async () => (await env.DB.prepare("SELECT COUNT(*) AS n FROM buzzes WHERE text = '連投テスト'").first()).n;

	it("同じ IP から速く連投すると 429 になり、保存もされない。ほかの IP は投稿できる", async () => {
		await env.DB.exec(CREATE_TABLE);
		const before = await saved();
		// Gate は直近10秒をそのまま数えるので、区切りをまたいでもちょうど4回で止まる
		const res = [];
		for (let k = 0; k < 9; k++) res.push(await post("203.0.113.1"));
		const ok = res.filter((r) => r.status === 200).length;
		const blocked = res.filter((r) => r.status === 429);
		expect(ok).toBe(4);
		expect(blocked).toHaveLength(5);
		expect((await blocked[0].json()).error).toContain("速すぎる");
		expect(blocked[0].headers.get("retry-after")).toBe("10");
		expect((await saved()) - before).toBe(ok);
		expect((await post("203.0.113.2")).status).toBe(200);
	});

	it("Rate Limiting が取りこぼしても、Gate がちょうど4回で止める", async () => {
		const leaky = { ...env, BURST_LIMIT: undefined, MINUTE_LIMIT: undefined };   // 本番で数え漏らしたときと同じ
		const codes = [];
		for (let k = 0; k < 8; k++) {
			const req = new Request("http://example.com/api/buzz", { method: "POST", headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.9" }, body: JSON.stringify({ text: "" }) });
			codes.push((await worker.fetch(req, leaky)).status);
		}
		expect(codes).toEqual([400, 400, 400, 400, 429, 429, 429, 429]);   // 中身が空でも数える（保存はしない）
	});

	it("合言葉の総当たりは、10回間違えると止まる（そのあとは正しい合言葉でも通さない）", async () => {
		const codes = [];
		for (let k = 0; k < 14; k++) {
			const res = await SELF.fetch("http://example.com/api/admin/check", {
				method: "POST", headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.3" }, body: JSON.stringify({ key: "guess" + k }),
			});
			codes.push(res.status);
		}
		expect(codes.slice(0, 10).every((c) => c === 403)).toBe(true);
		expect(codes.slice(10).every((c) => c === 429)).toBe(true);
		const right = await SELF.fetch("http://example.com/api/admin/check", {
			method: "POST", headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.3" }, body: JSON.stringify({ key: env.ADMIN_KEY }),
		});
		expect(right.status).toBe(429);
	});
});

// 連投の制限より後に置く（ここで保存した投稿がランキングのテストに混ざらないように）
describe("ランキングに出さない投稿（下ネタ・URL）", () => {
	it("下ネタ・差別語・URL は引っかかる。空白や全角・半角カナでごまかしても拾う", () => {
		const bad = ["ちんこ", "パチンちんこここ", "うんちんこうんちんこ", "おちんちん！？", "ちんぽちんぽ", "ﾁﾝｺ", "ち ん こ", "ち・ん・こ",
			"チンコ", "おまんこ漬け", "オマンコ", "手コキして", "しょーくんの精子は緑色", "ゴムしてるよねッ!?", "nigger", "SEX",
			"https://example.com", "ｈｔｔｐｓ：／／ｅｘａｍｐｌｅ．ｃｏｍ", "www.example.jp", "pornhub.com を見て", "nhentai",
			"h t t p s : / / example", "example。com", "youtu.be/abc", "bit.ly/abc", "090-1234-5678", "０３（１２３４）５６７８", "test@example.com", "@someone 消えろ", "おい ＠someone",
			"a", "ああああ", "ww", "😂😂😂",
			"ちンこ", "ち♡ん♡こ", "セッくす", "おマんこ", "キチガイ", "ガイジ", "○○小学校を爆破する", "〇〇を殺す", "死ね", "evil.xxx", "example . com", "090.1234.5678",
			"お前を殺します", "○○を殺してやる", "あいつ殺したい", "ぶっ殺してやる", "ころすぞ", "タヒね", "ふぇら", "れいぷ", "なかだし", "チソコ", "マソコ", "www.example", "がちんこ"].filter((t) => t !== "がちんこ");
		bad.forEach((t) => expect(isUnlisted(t), t).toBe(true));
	});
	it("ふつうのツイートは引っかからない（似た字を含む言葉も）", () => {
		const ok = ["月曜の朝、母に「起きなさい」と言われた。\n日曜だった。", "ちんちん電車に乗った", "チンチン電車", "パチンコで負けた", "ぱちんこ玉",
			"フェラーリかっこいい", "フェラガモの財布", "ヘアゴムしてるの忘れてた", "サラリーマンコースの説明会", "ヒューマンコメディが好き",
			"グレイプバインのライブ", "精神的にきつい", "中出身です", "うんこ漢字ドリル", "インコはウンコしないらしいね", "漫湖公園を散歩",
			"Essexに留学した", "sextetの演奏", "Wカップ見てた", "node.jsでアプリ作った", "ver.2.0になった", "ふとんがふっとんだ",
			"0時に寝た", "2026-10-30の朝", "1000000円ほしい", "電話番号を忘れた", "メールアドレスを変えた", "3人で行った", "@マークの打ち方", "朝ごはん抜いた",
			"尊くて死ねる", "リア充爆発しろ", "必殺技を覚えた", "殺虫剤を買った", "チョンマゲの侍", "聞きちがいだった", "それ、ちがいじゃん", "外国人のガイジンさん",
			"Mr.Childrenを聴く", "Mr.Big最高", "Dr.STONEを読んだ", "test.pyを直した", "朝9.5時間寝た", "してまんねん",
			"ガチンコ勝負", "カチンコチンに凍った", "がちんこで勝負", "ユニセックスの服", "サセックス公", "大手マンションの広告", "若手マンガ家", "一日中出しっぱなし", "午前中出した",
			"新人が入ってこき使われた", "酒は飲まんことにした", "借金を相殺する", "悩殺する", "チョン・ヘインが好き", "ピチョンと水が落ちた", "ドレイプ感のある服", "スクレイプした", "尊すぎて死ねた", "レンジでチン、これが最高",
			"笑ったwww。", "草www。また明日", "それは草www…", "Lv.MAXになった", "Ver.UPした", "feat.Adoの新曲", "1.AIに聞く", "I know. Me too.", "OK. Live your life.", "Good luck. Be happy.", "YOASOBI。Liveに行く", "いいところすごく好き", "こころすっきり"];
		ok.forEach((t) => expect(isUnlisted(t), t).toBe(false));
	});
	it("バズ神の講評とリプライ（ふつうの文章 5000個あまり）は1つも引っかからない", () => {
		const lines = [...Object.values(BASE_COMMENTS).flat(), ...Object.values(LEVEL_REPLIES).flat().map((r) => r[2]),
			...Object.values(THEME_COMMENTS).flatMap((o) => Object.values(o).flat()), ...Object.values(THEME_REPLIES).flatMap((o) => Object.values(o).flat().map((r) => r[2]))];
		expect(lines.length).toBeGreaterThan(5000);
		// 「……じゃ。」のように文字が2種類以下のセリフは「中身がない」判定の対象なので外す。見たいのは言葉の誤判定
		const wordy = (l) => new Set(l.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "")).size >= 3;
		expect(lines.filter(wordy).filter(isUnlisted)).toEqual([]);
	});

	const post = (text, ip) => SELF.fetch("http://example.com/api/buzz", {
		method: "POST", headers: { "content-type": "application/json", "cf-connecting-ip": ip }, body: JSON.stringify({ text }),
	}).then((r) => r.json());
	const list = async (path) => (await (await SELF.fetch("http://example.com" + path)).json()).map((r) => r.text);

	it("引っかかった投稿も採点して結果を返し、保存もするが、ランキングと最新のバズには出ない", async () => {
		await env.DB.exec(CREATE_TABLE);
		const bad = await post("ちんこちんこテスト", "203.0.113.20");
		expect(bad.unlisted).toBe(true);
		expect(bad.score).toBe(bad.axes.empathy + bad.axes.surprise + bad.axes.fun + bad.axes.spread);
		expect(bad.comment).toBeTruthy();
		expect(bad.replies).toHaveLength(3);
		const url = await post("https://example.com/テスト", "203.0.113.21");
		expect(url.unlisted).toBe(true);
		const good = await post("ふつうのテスト投稿です", "203.0.113.22");
		expect(good.unlisted).toBe(false);
		const flag = (text) => env.DB.prepare("SELECT unlisted FROM buzzes WHERE text = ?").bind(text).first("unlisted");
		expect(await flag("ちんこちんこテスト")).toBe(1);
		expect(await flag("ふつうのテスト投稿です")).toBe(0);

		const history = await list("/api/history");
		expect(history).toContain("ふつうのテスト投稿です");
		expect(history).not.toContain("ちんこちんこテスト");
		expect(history).not.toContain("https://example.com/テスト");
	});
	it("いいね数もバズ力もいちばん上の投稿でも、一覧に出さないものはランキングに入らない", async () => {
		await env.DB.exec(CREATE_TABLE);
		const add = (text, likes, unlisted) => env.DB.prepare("INSERT INTO buzzes (text, level, emoji, score, likes, retweets, unlisted, stage) VALUES (?, ?, ?, ?, ?, ?, ?, 13)")
			.bind(text, "神", "⛩️", 100, likes, 0, unlisted);
		await env.DB.batch([add("隠す投稿", 9e70, 1), add("見せる投稿", 8e70, 0)]);
		for (const path of ["/api/ranking", "/api/ranking?by=score"]) {
			const texts = await list(path);
			expect(texts[0], path).toBe("見せる投稿");
			expect(texts, path).not.toContain("隠す投稿");
		}
	});
});

// いちばん後ろに置く（ここで保存した投稿がほかのテストに混ざらないように）
describe("荒らし対策", () => {
	const JSON_HEADERS = { "content-type": "application/json" };
	const send = (path, body, headers = {}) => SELF.fetch("http://example.com" + path, {
		method: "POST", headers: { ...JSON_HEADERS, ...headers }, body: typeof body === "string" ? body : JSON.stringify(body),
	});
	const add = (text, likes, who, stage = 0) => env.DB.prepare("INSERT INTO buzzes (text, level, emoji, score, likes, retweets, who, stage) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
		.bind(text, "村", "🌾", 20, likes, 0, who, stage);
	const get = async (path) => (await SELF.fetch("http://example.com" + path)).json();

	it("よそのサイトからの投稿（JSON でない・送信元が違う）は断る。同じサイトからは通る", async () => {
		await env.DB.exec(CREATE_TABLE);
		const body = JSON.stringify({ text: "よそから" });
		const plain = await SELF.fetch("http://example.com/api/buzz", { method: "POST", headers: { "content-type": "text/plain", "cf-connecting-ip": "198.51.100.1" }, body });
		expect(plain.status).toBe(403);
		const noType = await SELF.fetch("http://example.com/api/buzz", { method: "POST", headers: { "cf-connecting-ip": "198.51.100.1" }, body });
		expect(noType.status).toBe(403);
		const other = await send("/api/buzz", body, { origin: "https://evil.example", "cf-connecting-ip": "198.51.100.1" });
		expect(other.status).toBe(403);
		const same = await send("/api/buzz", body, { origin: "http://example.com", "cf-connecting-ip": "198.51.100.1" });
		expect(same.status).toBe(200);
		expect((await send("/api/admin/check", { key: env.ADMIN_KEY }, { origin: "https://evil.example", "cf-connecting-ip": "198.51.100.1" })).status).toBe(403);
	});

	it("おかしな本文でも落ちない（null・配列・壊れた JSON・巨大な本文・ふつうでない型）", async () => {
		const bodies = ["null", "[]", "123", '"x"', "{壊れた", "", JSON.stringify({ text: "あ".repeat(100000) }), JSON.stringify({ text: { a: 1 }, seen: "x", posts: "y" })];
		for (const [i, b] of bodies.entries()) {
			const res = await send("/api/buzz", b, { "cf-connecting-ip": "198.51.100.1" + i });
			expect([200, 400], b.slice(0, 20)).toContain(res.status);
			const json = await res.json();
			if (res.status === 400) expect(json.error).toBeTruthy(); else expect(json.comment).toBeTruthy();
		}
		const seen = await send("/api/buzz", { text: "見た段階がでたらめ", seen: [1e9, -1, "a", null, { x: 1 }, 1.5], posts: 1e99 }, { "cf-connecting-ip": "198.51.100.30" });
		expect(seen.status).toBe(200);
	});

	it("文章をきれいにする：見えない文字・向きを変える文字・Zalgo・壊れた文字を消し、絵文字と日本語は残す", () => {
		expect(cleanText("あ\u202Eいう\u200B\u2066え\uFEFF")).toBe("あいうえ");
		expect(cleanText("\u3164\u2800\u200B  ")).toBe("");
		expect(cleanText("z" + "\u0300".repeat(40) + "a")).toBe("z\u0300\u0300\u0300a");
		expect(cleanText("👨‍👩‍👧 か\u3099 1️⃣")).toBe("👨‍👩‍👧 か\u3099 1️⃣");
		expect(cleanText("壊れ\uD83D")).toBe("壊れ");
		expect(() => encodeURIComponent(cleanText("\uD83D壊れ\uDE00た"))).not.toThrow();
		expect(cleanText("あ\n\n\n\n\nい\r\nう")).toBe("あ\n\nい\nう");
		expect(cleanText("😂".repeat(100)).length).toBeLessThanOrEqual(140);
		expect(() => encodeURIComponent(cleanText("😂".repeat(100)))).not.toThrow();
		expect(cleanText(null)).toBe("");
		// 見えない文字だけの投稿は空にする
		expect(cleanText(String.fromCharCode(0x200D) + String.fromCharCode(0x200D))).toBe("");
		expect(cleanText(String.fromCharCode(0xFE0F) + String.fromCharCode(0xFE0F))).toBe("");
		expect(cleanText("\n\n" + String.fromCharCode(0x200D))).toBe("");
	});

	it("読むだけの API は GET と HEAD だけ", async () => {
		await env.DB.exec(CREATE_TABLE);
		for (const path of ["/api/levels", "/api/ranking", "/api/stats"]) {
			expect((await SELF.fetch("http://example.com" + path, { method: "HEAD" })).status, path).toBe(200);
			expect((await SELF.fetch("http://example.com" + path, { method: "DELETE" })).status, path).toBe(405);
		}
	});

	it("見張りが呼べなくても、投稿は止まらない", async () => {
		await env.DB.exec(CREATE_TABLE);
		const req = () => new Request("http://example.com/api/buzz", { method: "POST", headers: { ...JSON_HEADERS, "cf-connecting-ip": "198.51.100.210" }, body: JSON.stringify({ text: "見張りなしの投稿です" }) });
		const noLimit = { limit() { throw new Error("だめ"); } };
		expect((await worker.fetch(req(), { ...env, BURST_LIMIT: noLimit, MINUTE_LIMIT: noLimit, GATE: undefined })).status).toBe(200);
	});

	it("ランキングにエンドコンテンツを入れない（バズ力もいいね数も）", async () => {
		await env.DB.exec(CREATE_TABLE);
		await env.DB.batch([add("無の投稿です", 0, "e0", 14), add("創世の投稿です", 1e68, "e1", 15), add("ふつうの上位です", 5, "e2", 13)]);
		await clearLists("http://example.com");
		const byScore = (await get("/api/ranking?by=score")).map((r) => r.text);
		expect(byScore).toContain("ふつうの上位です");
		expect(byScore).not.toContain("無の投稿です");
		expect(byScore).not.toContain("創世の投稿です");
		const byLikes = (await get("/api/ranking")).map((r) => r.text);
		expect(byLikes).not.toContain("創世の投稿です");   // 1無量大数でも入らない
		expect(byLikes).not.toContain("無の投稿です");
	});

	it("IPv6 は回線（/64）単位で同じ人とみなす。住所を変えても連投の制限をすり抜けられない", async () => {
		expect(personKey("2001:db8:1:2:3:4:5:6")).toBe(personKey("2001:0DB8:0001:0002:aaaa:bbbb:cccc:dddd"));
		expect(personKey("2001:db8:1:2::1")).toBe(personKey("2001:db8:1:2:ffff::"));
		expect(personKey("2001:db8:1:2::1")).not.toBe(personKey("2001:db8:1:3::1"));
		expect(personKey("203.0.113.5")).toBe("203.0.113.5");
		expect(personKey("::ffff:203.0.113.5")).toBe("203.0.113.5");
		const codes = [];
		for (let k = 1; k <= 6; k++) codes.push((await send("/api/buzz", { text: "" }, { "cf-connecting-ip": "2001:db8:aaaa:bbbb::" + k })).status);
		expect(codes).toEqual([400, 400, 400, 400, 429, 429]);
	});

	it("D1 が止まったとき、Worker の入れ物が変わっても、Cache の控えから一覧を出せる", async () => {
		await env.DB.exec(CREATE_TABLE);
		await add("控えに入る投稿です", 5e99, "stale-1").run();
		await clearLists("http://example.com");
		await get("/api/ranking");   // 読めると控えも作られる
		const kept = await caches.default.match("http://example.com/api/ranking?stale=1");
		expect((await kept.json()).map((r) => r.text)).toContain("控えに入る投稿です");
		// 新しい入れ物を、控えの中身だけ変えてまねする
		await caches.default.put("http://example.com/api/ranking?stale=1", Response.json([{ text: "Cache の控え" }], { headers: { "cache-control": "public, max-age=86400" } }));
		await caches.default.delete("http://example.com/api/ranking");
		const brokenEnv = { ...env, DB: { prepare() { throw new Error("止まっている"); } } };
		const list = await (await worker.fetch(new Request("http://example.com/api/ranking"), brokenEnv)).json();
		expect(list[0].text).toBe("Cache の控え");
	});

	it("D1 が止まっても（無料枠を使い切っても）投稿の結果は返り、一覧は最後に読めたものを出す", async () => {
		await env.DB.exec(CREATE_TABLE);
		await add("止まる前の投稿", 1e100, "before-stop").run();
		const good = await get("/api/ranking");
		expect(good[0].text).toBe("止まる前の投稿");
		await clearLists("http://example.com");
		const broken = { prepare() { throw new Error("D1 DB exceeded its daily limit"); } };
		const brokenEnv = { ...env, DB: broken };
		const post = await worker.fetch(new Request("http://example.com/api/buzz", { method: "POST", headers: { ...JSON_HEADERS, "cf-connecting-ip": "198.51.100.50" }, body: JSON.stringify({ text: "止まっているときの投稿" }) }), brokenEnv);
		expect(post.status).toBe(200);
		expect((await post.json()).comment).toBeTruthy();
		const list = await worker.fetch(new Request("http://example.com/api/ranking"), brokenEnv);
		expect(list.status).toBe(200);
		expect((await list.json())[0].text).toBe("止まる前の投稿");
		const history = await worker.fetch(new Request("http://example.com/api/history?x=1"), brokenEnv);
		expect(history.status).toBe(200);
		await clearLists("http://example.com");
	});

	it("一覧は1人1件・同じ文章は1件。1人では埋められない", async () => {
		await env.DB.exec(CREATE_TABLE);
		await env.DB.batch([add("荒らし1", 9e110, "troll"), add("荒らし2", 8e110, "troll"), add("荒らし3", 7e110, "troll"),
			add("コピペ", 6e110, "a1"), add("コ ピ ペ", 5e110, "a2"), add("ふつうの人", 4e110, "a3")]);
		const texts = (await get("/api/ranking")).map((r) => r.text);
		expect(texts.slice(0, 3)).toEqual(["荒らし1", "コピペ", "ふつうの人"]);
		const rows = await get("/api/history");
		expect(rows.filter((r) => r.text.startsWith("荒らし"))).toHaveLength(1);
		expect(JSON.stringify(rows)).not.toContain("troll");   // 印そのものは外に出さない
	});

	it("バズ力ランキングは段階の番号で並ぶ（投稿のときに stage も保存する）", async () => {
		await env.DB.exec(CREATE_TABLE);
		await env.DB.batch([add("上の段階", 1, "s1", 13), add("下の段階", 9e115, "s2", 12)]);
		const byScore = (await get("/api/ranking?by=score")).map((r) => r.text);
		expect(byScore.indexOf("上の段階")).toBeLessThan(byScore.indexOf("下の段階"));
		const res = await send("/api/buzz", { text: "段階を保存するテスト" }, { "cf-connecting-ip": "198.51.100.60" });
		const saved = await env.DB.prepare("SELECT stage, who FROM buzzes WHERE text = ?").bind("段階を保存するテスト").first();
		expect(saved.stage).toBe((await res.json()).levelIndex);
		expect(saved.who).toMatch(/^[0-9a-f]{16}$/);
		expect(saved.who).not.toContain("198.51");
	});

	it("一覧はためておく。余計な ?x=1 を付けても D1 を読みに行かない", async () => {
		await env.DB.exec(CREATE_TABLE);
		await add("ためる前", 9e120, "c1").run();
		expect((await get("/api/ranking"))[0].text).toBe("ためる前");
		await add("あとから", 9e125, "c2").run();
		expect((await get("/api/ranking"))[0].text).toBe("ためる前");
		expect((await get("/api/ranking?x=" + Math.random()))[0].text).toBe("ためる前");
		await clearLists("http://example.com");
		expect((await get("/api/ranking"))[0].text).toBe("あとから");
		const res = await SELF.fetch("http://example.com/api/ranking");
		expect(res.headers.get("cache-control")).toContain("max-age");
		expect((await SELF.fetch("http://example.com/api/ranking", { method: "POST" })).status).toBe(405);
	});

	it("「これまで ○ 件」は一覧に出る投稿の数。隠す・戻す・消すと変わり、全件は読まない", async () => {
		await env.DB.exec(CREATE_TABLE);
		// テストどうしで D1 を分け合っているので、始めたときからの増減で見る
		await clearLists("http://example.com");
		const base = (await get("/api/stats")).posts;
		await env.DB.batch([add("数える1", 1, "n1"), add("数える2", 2, "n2"), add("数える3", 3, "n3"), add("数える4", 4, "n3")]);
		const count = async () => { await clearLists("http://example.com"); return (await get("/api/stats")).posts - base; };
		const idOf = (text) => env.DB.prepare("SELECT id FROM buzzes WHERE text = ?").bind(text).first("id");
		const ip = { "cf-connecting-ip": "198.51.100.80" };
		expect(await count()).toBe(4);
		// テストモードの「隠す」：clearLists を自分で呼ばなくても、すぐ変わる
		await get("/api/stats");
		await send("/api/admin/hide", { key: env.ADMIN_KEY, id: await idOf("数える1") }, ip);
		expect((await get("/api/stats")).posts - base).toBe(3);
		await send("/api/admin/hide", { key: env.ADMIN_KEY, id: await idOf("数える3"), all: true }, ip);
		expect((await get("/api/stats")).posts - base).toBe(1);
		// 隠れている投稿をもう一度隠しても、二重に引かない
		await send("/api/admin/hide", { key: env.ADMIN_KEY, id: await idOf("数える1") }, ip);
		expect(await count()).toBe(1);
		// 手で流す SQL でも合う
		await env.DB.prepare("UPDATE buzzes SET unlisted = 2 WHERE text = '数える2'").run();
		expect(await count()).toBe(0);
		await env.DB.prepare("UPDATE buzzes SET unlisted = 0 WHERE unlisted = 2").run();
		expect(await count()).toBe(1);
		await env.DB.prepare("DELETE FROM buzzes WHERE text = '数える2'").run();
		expect(await count()).toBe(0);
		await env.DB.prepare("DELETE FROM buzzes WHERE text = '数える1'").run();   // 隠れている投稿を消しても変わらない
		expect(await count()).toBe(0);
		// ふつうの投稿は増え、言葉の判定で隠れる投稿は増えない
		await send("/api/buzz", { text: "数に入るふつうの投稿です" }, { "cf-connecting-ip": "198.51.100.81" });
		expect(await count()).toBe(1);
		await send("/api/buzz", { text: "https://example.com を見て" }, { "cf-connecting-ip": "198.51.100.82" });
		expect(await count()).toBe(1);
		// 読むのは1行だけ。移行をもう一度流しても数は変わらない
		const read = await env.DB.prepare("SELECT listed FROM buzz_count WHERE id = 1").run();
		expect(read.meta.rows_read).toBe(1);
		await env.DB.exec(COUNT_SQL);
		expect(await count()).toBe(1);
	});

	it("テストモードの「隠す」：合言葉がないと隠せない。1件だけ／同じ人をぜんぶ隠せる", async () => {
		await env.DB.exec(CREATE_TABLE);
		await env.DB.batch([add("隠される1", 9e130, "h1"), add("隠される2", 8e130, "h1"), add("残る", 7e130, "h2"), add("1件だけ隠す", 6e130, "h3")]);
		const idOf = (text) => env.DB.prepare("SELECT id FROM buzzes WHERE text = ?").bind(text).first("id");
		const hiddenOf = (text) => env.DB.prepare("SELECT unlisted FROM buzzes WHERE text = ?").bind(text).first("unlisted");
		const ip = { "cf-connecting-ip": "198.51.100.70" };
		expect((await send("/api/admin/hide", { key: "違う", id: await idOf("残る") }, { "cf-connecting-ip": "198.51.100.71" })).status).toBe(403);
		expect(await hiddenOf("残る")).toBe(0);
		expect((await send("/api/admin/hide", { key: env.ADMIN_KEY, id: "1 OR 1=1" }, ip)).status).toBe(400);
		const one = await send("/api/admin/hide", { key: env.ADMIN_KEY, id: await idOf("1件だけ隠す") }, ip);
		expect((await one.json()).hidden).toBe(1);
		const all = await send("/api/admin/hide", { key: env.ADMIN_KEY, id: await idOf("隠される1"), all: true }, ip);
		expect((await all.json()).hidden).toBe(2);
		expect(await hiddenOf("隠される2")).toBe(1);
		expect(await hiddenOf("残る")).toBe(0);
		const texts = (await get("/api/ranking")).map((r) => r.text);   // ためていた一覧もすぐ入れ替わる
		expect(texts).toContain("残る");
		expect(texts).not.toContain("隠される1");
	});

	it("画面には守りのヘッダーが付く。script の nonce は毎回変わり、CSP と一致する", async () => {
		const a = await SELF.fetch("http://example.com/"), b = await SELF.fetch("http://example.com/");
		const csp = a.headers.get("content-security-policy");
		expect(csp).toContain("frame-ancestors 'none'");
		expect(csp).toContain("default-src 'none'");
		expect(csp).not.toMatch(/script-src[^;]*unsafe/);
		const nonce = csp.match(/'nonce-([0-9a-f]+)'/)[1];
		const html = await a.text();
		expect(html).toContain('<script nonce="' + nonce + '">');
		expect(html.match(/<script/g)).toHaveLength(1);
		expect(b.headers.get("content-security-policy")).not.toContain(nonce);
		expect(a.headers.get("x-content-type-options")).toBe("nosniff");
		expect(a.headers.get("x-frame-options")).toBe("DENY");
		expect((await SELF.fetch("http://example.com/api/stats")).headers.get("x-content-type-options")).toBe("nosniff");
	});

	it("長さを書かずに巨大な本文を送られても、読みすぎず空として扱う", async () => {
		const big = new ReadableStream({
			start(c) { for (let i = 0; i < 5; i++) c.enqueue(new TextEncoder().encode("x".repeat(2000))); c.close(); },
		});
		const res = await SELF.fetch("http://example.com/api/buzz", { method: "POST", headers: { ...JSON_HEADERS, "cf-connecting-ip": "198.51.100.95" }, body: big, duplex: "half" });
		expect(res.status).toBe(400);
		const notText = await send("/api/buzz", { text: { a: 1 } }, { "cf-connecting-ip": "198.51.100.96" });
		expect(notText.status).toBe(400);
	});

	it("見えない文字は Unicode にまだない番号のものも消す", () => {
		expect(cleanText("ち" + String.fromCodePoint(0x2065) + "ん" + String.fromCodePoint(0xfff0, 0xf0000) + "こ")).toBe("ちんこ");
	});

	it("1人が1日に保存できるのは60件まで。超えても結果は返し、保存はしない", async () => {
		await env.DB.exec(CREATE_TABLE);
		const ip = "198.51.100.97";
		const gate = env.GATE.get(env.GATE.idFromName("buzz:" + ip));
		for (let k = 0; k < 60; k++) expect(await gate.canSave()).toBe(true);
		const res = await send("/api/buzz", { text: "上限を超えた投稿です" }, { "cf-connecting-ip": ip });
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data.comment).toBeTruthy();
		expect(data.unlisted).toBe(true);
		const saved = await env.DB.prepare("SELECT COUNT(*) AS n FROM buzzes WHERE text = ?").bind("上限を超えた投稿です").first("n");
		expect(saved).toBe(0);
	});

	it("思わぬエラーでも中身を見せない", async () => {
		const res = await worker.fetch(new Request("http://example.com/api/admin/check", { method: "POST", headers: { ...JSON_HEADERS, "cf-connecting-ip": "198.51.100.90" }, body: "{}" }), { ...env, GATE: { idFromName() { throw new Error("秘密の中身"); } } });
		expect(res.status).toBe(500);
		expect(await res.text()).not.toContain("秘密の中身");
	});
});
