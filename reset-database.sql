-- Reset Database to Initial State
-- This script deletes all game data but preserves the schema
-- Use this to clean up test data and start fresh
-- NOTE: Default questions are recreated when new rooms are created by the app

-- Delete all data from tables (in correct order to respect foreign keys)
DELETE FROM scavenger_submissions;
DELETE FROM submissions;
DELETE FROM leaderboard_snapshots;
DELETE FROM questions; -- Questions will be regenerated when rooms are created
DELETE FROM players;
DELETE FROM user_sessions;
DELETE FROM rooms;

-- Reset any sequences if needed (optional)
-- ALTER SEQUENCE IF EXISTS rooms_id_seq RESTART WITH 1;
-- ALTER SEQUENCE IF EXISTS players_id_seq RESTART WITH 1;

-- Verify deletion
SELECT 'rooms' as table_name, COUNT(*) as row_count FROM rooms
UNION ALL
SELECT 'players', COUNT(*) FROM players
UNION ALL
SELECT 'questions', COUNT(*) FROM questions
UNION ALL
SELECT 'submissions', COUNT(*) FROM submissions
UNION ALL
SELECT 'scavenger_submissions', COUNT(*) FROM scavenger_submissions
UNION ALL
SELECT 'leaderboard_snapshots', COUNT(*) FROM leaderboard_snapshots
UNION ALL
SELECT 'user_sessions', COUNT(*) FROM user_sessions;

-- All counts should be 0
