-- 2026-10-31 「これまで ○ 件」を一覧に出る投稿の数にする。古いコードのままでも動くので、デプロイの前に流す
--   ローカル：npx wrangler d1 execute buzz-db --local --file tools/migrate-count.sql
--   本番：--remote --file は認証エラー（code 10000）になる（2026-11-01）。1文ずつ --remote --command で流す
-- 数えると全部の行を読むことになるので、件数は buzz_count の1行に持ち、トリガーで増減する（手で流した SQL で隠す・消すときも合う）
-- もう一度流すと数え直せる（件数がずれたと思ったとき）。テストもこのファイルを読むので、1文を1行で書く
CREATE TABLE IF NOT EXISTS buzz_count (id INTEGER PRIMARY KEY CHECK (id = 1), listed INTEGER NOT NULL);
CREATE TRIGGER IF NOT EXISTS buzz_count_insert AFTER INSERT ON buzzes WHEN NEW.unlisted = 0 BEGIN UPDATE buzz_count SET listed = listed + 1 WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS buzz_count_delete AFTER DELETE ON buzzes WHEN OLD.unlisted = 0 BEGIN UPDATE buzz_count SET listed = listed - 1 WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS buzz_count_update AFTER UPDATE OF unlisted ON buzzes WHEN (OLD.unlisted = 0) <> (NEW.unlisted = 0) BEGIN UPDATE buzz_count SET listed = listed + CASE WHEN NEW.unlisted = 0 THEN 1 ELSE -1 END WHERE id = 1; END;
INSERT OR REPLACE INTO buzz_count (id, listed) SELECT 1, COUNT(*) FROM buzzes WHERE unlisted = 0;
