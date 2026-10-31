-- 新しい D1 を作るときの形。本番の列を足す手順は CLAUDE.md の「D1 のテーブル」を見る
CREATE TABLE IF NOT EXISTS buzzes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL,
  level TEXT NOT NULL,
  emoji TEXT NOT NULL,
  score INTEGER NOT NULL,
  likes INTEGER NOT NULL,
  retweets INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  comment TEXT,
  unlisted INTEGER NOT NULL DEFAULT 0,
  stage INTEGER NOT NULL DEFAULT 0,
  who TEXT
);
CREATE INDEX IF NOT EXISTS idx_buzzes_listed_likes ON buzzes (likes DESC) WHERE unlisted = 0;
CREATE INDEX IF NOT EXISTS idx_buzzes_listed_id ON buzzes (id DESC) WHERE unlisted = 0;
CREATE INDEX IF NOT EXISTS idx_buzzes_rank ON buzzes (stage DESC, score DESC, likes DESC) WHERE unlisted = 0;
CREATE TABLE IF NOT EXISTS buzz_count (id INTEGER PRIMARY KEY CHECK (id = 1), listed INTEGER NOT NULL);
CREATE TRIGGER IF NOT EXISTS buzz_count_insert AFTER INSERT ON buzzes WHEN NEW.unlisted = 0 BEGIN UPDATE buzz_count SET listed = listed + 1 WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS buzz_count_delete AFTER DELETE ON buzzes WHEN OLD.unlisted = 0 BEGIN UPDATE buzz_count SET listed = listed - 1 WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS buzz_count_update AFTER UPDATE OF unlisted ON buzzes WHEN (OLD.unlisted = 0) <> (NEW.unlisted = 0) BEGIN UPDATE buzz_count SET listed = listed + CASE WHEN NEW.unlisted = 0 THEN 1 ELSE -1 END WHERE id = 1; END;
INSERT OR REPLACE INTO buzz_count (id, listed) SELECT 1, COUNT(*) FROM buzzes WHERE unlisted = 0;
