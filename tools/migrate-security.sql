-- 2026-10-30 荒らし対策で足した列と索引。古いコードのままでも動くので、デプロイの前に流す
--   npx wrangler d1 execute buzz-db --remote --file tools/migrate-security.sql
-- stage：段階の番号（バズ力ランキングを全件読まずに並べるため）
-- who：同じ人を表す印（IP そのものではなく、鍵つきハッシュの先頭）。一覧を1人1件にするため
-- 索引はどれも「一覧に出る行だけ」。隠れた投稿がいくら増えても、一覧を読む量と書きこむ量が増えない
ALTER TABLE buzzes ADD COLUMN stage INTEGER NOT NULL DEFAULT 0;
ALTER TABLE buzzes ADD COLUMN who TEXT;
UPDATE buzzes SET stage = CASE level
  WHEN '家庭内' THEN 0 WHEN '村' THEN 1 WHEN '町' THEN 2 WHEN '県' THEN 3 WHEN '全国' THEN 4 WHEN 'アジア' THEN 5 WHEN '地球' THEN 6
  WHEN '太陽系' THEN 7 WHEN '銀河' THEN 8 WHEN '銀河団' THEN 9 WHEN '宇宙' THEN 10 WHEN '四次元' THEN 11 WHEN '神' THEN 12
  WHEN '∬∃@▽◇◎＄￡※⊆〒^^' THEN 13 WHEN '無' THEN 14 WHEN '創世' THEN 15 WHEN '真・家庭内' THEN 16 ELSE 0 END;
CREATE INDEX IF NOT EXISTS idx_buzzes_rank ON buzzes (stage DESC, score DESC, likes DESC) WHERE unlisted = 0;
CREATE INDEX IF NOT EXISTS idx_buzzes_listed_likes ON buzzes (likes DESC) WHERE unlisted = 0;
CREATE INDEX IF NOT EXISTS idx_buzzes_listed_id ON buzzes (id DESC) WHERE unlisted = 0;
DROP INDEX IF EXISTS idx_buzzes_likes;
