// npx vitest run で実行する
import { SELF, env } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { simulateBuzz, score } from "../src/index.js";
import { LEVELS, BASE_COMMENTS, LEVEL_REPLIES, THEME_COMMENTS, THEME_REPLIES } from "../src/data.js";

const OPENER = { roast: "は？", cold: "あー……", warm: "ほう……", good: "おお！", praise: "ちょっと待って" };

describe("段階", () => {
	it("14段階で、神は四次元と∬…の間にある", () => {
		expect(LEVELS).toHaveLength(14);
		expect(LEVELS.map((l) => l.name).slice(11)).toEqual(["四次元", "神", "∬∃@▽◇◎＄￡※⊆〒^^"]);
		expect(LEVELS.filter((l) => l.hidden).map((l) => l.name)).toEqual(["宇宙", "四次元", "神", "∬∃@▽◇◎＄￡※⊆〒^^"]);
	});

	it("minScore が小さい順に並んでいる", () => {
		LEVELS.forEach((l, i) => i && expect(l.minScore).toBeGreaterThan(LEVELS[i - 1].minScore));
	});

	it("どの段階にも講評とリプライがそろっている", () => {
		for (const l of LEVELS) {
			expect(BASE_COMMENTS[l.name].length).toBeGreaterThan(0);
			expect(LEVEL_REPLIES[l.name].length).toBeGreaterThan(0);
			for (const c of BASE_COMMENTS[l.name]) expect(c.startsWith(OPENER[l.tone])).toBe(true);
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
			expect(r.comment.startsWith(OPENER[l.tone])).toBe(true);
			expect(r.replies).toHaveLength(3);
			r.replies.forEach((x) => expect(x.name && x.handle && x.text).toBeTruthy());
			expect(r.likes).toBeGreaterThanOrEqual(l.likes[0]);
		});
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
