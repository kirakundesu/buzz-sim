-- バズ結果を保存するテーブル
CREATE TABLE IF NOT EXISTS buzzes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL,
  level TEXT NOT NULL,
  emoji TEXT NOT NULL,
  score INTEGER NOT NULL,
  likes INTEGER NOT NULL,
  retweets INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_buzzes_likes ON buzzes (likes DESC);