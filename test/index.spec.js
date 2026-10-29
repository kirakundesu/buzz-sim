// npx vitest run で実行する
import { SELF, env } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { simulateBuzz, score, superLikes } from "../src/index.js";
import { LEVELS, BASE_COMMENTS, LEVEL_REPLIES, THEME_COMMENTS, THEME_REPLIES } from "../src/data.js";

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
		await env.DB.exec("CREATE TABLE IF NOT EXISTS buzzes (id INTEGER PRIMARY KEY AUTOINCREMENT, text TEXT NOT NULL, level TEXT NOT NULL, emoji TEXT NOT NULL, score INTEGER NOT NULL, likes INTEGER NOT NULL, retweets INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), comment TEXT)");
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
		await env.DB.exec("CREATE TABLE IF NOT EXISTS buzzes (id INTEGER PRIMARY KEY AUTOINCREMENT, text TEXT NOT NULL, level TEXT NOT NULL, emoji TEXT NOT NULL, score INTEGER NOT NULL, likes INTEGER NOT NULL, retweets INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), comment TEXT)");
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
		const res = await SELF.fetch("http://example.com/api/admin/test", { method: "POST", body: JSON.stringify({ key: "wrong", level: 12 }) });
		expect(res.status).toBe(403);
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
		method: "POST", headers: { "cf-connecting-ip": ip }, body: JSON.stringify({ text: "連投テスト" }),
	});
	const saved = async () => (await env.DB.prepare("SELECT COUNT(*) AS n FROM buzzes WHERE text = '連投テスト'").first()).n;

	it("同じ IP から速く連投すると 429 になり、保存もされない。ほかの IP は投稿できる", async () => {
		await env.DB.exec("CREATE TABLE IF NOT EXISTS buzzes (id INTEGER PRIMARY KEY AUTOINCREMENT, text TEXT NOT NULL, level TEXT NOT NULL, emoji TEXT NOT NULL, score INTEGER NOT NULL, likes INTEGER NOT NULL, retweets INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), comment TEXT)");
		const before = await saved();
		// 10秒の区切りをまたいでも、9回送ればどちらかの区切りで必ず4回を超える
		const res = [];
		for (let k = 0; k < 9; k++) res.push(await post("203.0.113.1"));
		const ok = res.filter((r) => r.status === 200).length;
		const blocked = res.filter((r) => r.status === 429);
		expect(blocked.length).toBeGreaterThan(0);
		expect(ok + blocked.length).toBe(9);
		expect((await blocked[0].json()).error).toContain("速すぎる");
		expect(blocked[0].headers.get("retry-after")).toBe("10");
		expect((await saved()) - before).toBe(ok);
		expect((await post("203.0.113.2")).status).toBe(200);
	});

	it("合言葉の総当たりも 1分に15回で止まる", async () => {
		const codes = [];
		for (let k = 0; k < 31; k++) {
			const res = await SELF.fetch("http://example.com/api/admin/check", {
				method: "POST", headers: { "cf-connecting-ip": "203.0.113.3" }, body: JSON.stringify({ key: "guess" + k }),
			});
			codes.push(res.status);
		}
		expect(codes).toContain(429);
		expect(codes.filter((c) => c === 403).length).toBeLessThanOrEqual(30);
		expect(codes.every((c) => c === 403 || c === 429)).toBe(true);
	});
});
