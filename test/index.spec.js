// npx vitest run で実行する
import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { simulateBuzz, score } from "../src/index.js";
import { LEVELS, BASE_COMMENTS, LEVEL_REPLIES, THEME_COMMENTS, THEME_REPLIES } from "../src/data.js";

const OPENER = { roast: "は？", cold: "あー……", praise: "ちょっと待って" };

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
		for (const tone of ["roast", "cold", "praise"]) {
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
