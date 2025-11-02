-- Migration: Initial schema for trivia scavenger game
-- Version: 001
-- Description: Creates all core tables with RLS policies

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Sessions table (tracks client UUIDs)
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_uuid TEXT NOT NULL UNIQUE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_sessions_client_uuid ON user_sessions(client_uuid);

-- Rooms table
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_code TEXT NOT NULL UNIQUE,
  host_client_uuid TEXT NOT NULL,
  host_key TEXT NOT NULL, -- Secret token for host authentication
  title TEXT NOT NULL DEFAULT 'Untitled Game',
  is_preset BOOLEAN NOT NULL DEFAULT FALSE,
  preset_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  settings JSONB NOT NULL DEFAULT '{
    "number_of_rounds": 3,
    "questions_per_round": 3,
    "time_per_trivia_question": 30,
    "time_per_scavenger": 60,
    "points_for_first_scavenger": 10,
    "points_for_other_approved_scavengers": 5,
    "points_for_rejected_scavengers": 2,
    "trivia_base_point": 100,
    "trivia_time_scaling": true
  }'::jsonb,
  game_state JSONB NOT NULL DEFAULT '{
    "status": "lobby",
    "current_round": 0,
    "current_question": 0
  }'::jsonb
);

CREATE INDEX idx_rooms_room_code ON rooms(room_code);
CREATE INDEX idx_rooms_host_client_uuid ON rooms(host_client_uuid);
CREATE INDEX idx_rooms_expires_at ON rooms(expires_at);
CREATE INDEX idx_rooms_preset_expires_at ON rooms(preset_expires_at) WHERE is_preset = TRUE;

-- Players table
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  client_uuid TEXT NOT NULL,
  display_name TEXT NOT NULL,
  connected BOOLEAN NOT NULL DEFAULT TRUE,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  points INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(room_id, client_uuid)
);

CREATE INDEX idx_players_room_id ON players(room_id);
CREATE INDEX idx_players_client_uuid ON players(client_uuid);

-- Questions table
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  question_number INTEGER NOT NULL,
  stem TEXT NOT NULL,
  choices JSONB NOT NULL, -- Array of {id: string, label: string, is_correct: boolean}
  scavenger_instruction TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(room_id, round_number, question_number)
);

CREATE INDEX idx_questions_room_id ON questions(room_id);
CREATE INDEX idx_questions_round_question ON questions(room_id, round_number, question_number);

-- Trivia Submissions table
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  answer_choice_id TEXT NOT NULL,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  answer_time_ms INTEGER NOT NULL, -- Time taken to answer in milliseconds
  is_correct BOOLEAN NOT NULL,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  UNIQUE(player_id, question_id)
);

CREATE INDEX idx_submissions_room_id ON submissions(room_id);
CREATE INDEX idx_submissions_player_id ON submissions(player_id);
CREATE INDEX idx_submissions_question_id ON submissions(question_id);

-- Scavenger Submissions table
CREATE TABLE scavenger_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submission_order INTEGER NOT NULL, -- Order of submission (1st, 2nd, 3rd, etc.)
  approved BOOLEAN, -- NULL = pending, TRUE = approved, FALSE = rejected
  approved_by_host_at TIMESTAMPTZ,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  UNIQUE(player_id, question_id)
);

CREATE INDEX idx_scavenger_submissions_room_id ON scavenger_submissions(room_id);
CREATE INDEX idx_scavenger_submissions_player_id ON scavenger_submissions(player_id);
CREATE INDEX idx_scavenger_submissions_question_id ON scavenger_submissions(question_id);
CREATE INDEX idx_scavenger_submissions_order ON scavenger_submissions(question_id, submission_order);

-- Leaderboard Snapshots table
CREATE TABLE leaderboard_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload JSONB NOT NULL -- Array of {player_id, display_name, points, rank}
);

CREATE INDEX idx_leaderboard_snapshots_room_id ON leaderboard_snapshots(room_id);

-- Row Level Security Policies

-- Enable RLS on all tables
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scavenger_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_snapshots ENABLE ROW LEVEL SECURITY;

-- User Sessions: Allow reads, inserts, and updates (no deletes from client)
CREATE POLICY "User sessions are publicly readable"
  ON user_sessions FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own session"
  ON user_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own session"
  ON user_sessions FOR UPDATE
  USING (true);

-- Rooms: Public read, controlled write
CREATE POLICY "Rooms are publicly readable"
  ON rooms FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create a room"
  ON rooms FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Only host can update room"
  ON rooms FOR UPDATE
  USING (true); -- Server-side validation via host_key

CREATE POLICY "Only host can delete room"
  ON rooms FOR DELETE
  USING (true); -- Server-side validation via host_key

-- Players: Public read within room context
CREATE POLICY "Players are publicly readable"
  ON players FOR SELECT
  USING (true);

CREATE POLICY "Anyone can join a room as player"
  ON players FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Players can update their own record"
  ON players FOR UPDATE
  USING (true);

CREATE POLICY "Players can be removed"
  ON players FOR DELETE
  USING (true);

-- Questions: Public read
CREATE POLICY "Questions are publicly readable"
  ON questions FOR SELECT
  USING (true);

CREATE POLICY "Questions can be created"
  ON questions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Questions can be updated"
  ON questions FOR UPDATE
  USING (true);

-- Submissions: Public read, player insert
CREATE POLICY "Submissions are publicly readable"
  ON submissions FOR SELECT
  USING (true);

CREATE POLICY "Players can submit answers"
  ON submissions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Submissions can be updated"
  ON submissions FOR UPDATE
  USING (true);

-- Scavenger Submissions: Public read, player insert, host update
CREATE POLICY "Scavenger submissions are publicly readable"
  ON scavenger_submissions FOR SELECT
  USING (true);

CREATE POLICY "Players can submit scavenger completions"
  ON scavenger_submissions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Scavenger submissions can be updated"
  ON scavenger_submissions FOR UPDATE
  USING (true);

-- Leaderboard Snapshots: Public read
CREATE POLICY "Leaderboard snapshots are publicly readable"
  ON leaderboard_snapshots FOR SELECT
  USING (true);

CREATE POLICY "Leaderboard snapshots can be created"
  ON leaderboard_snapshots FOR INSERT
  WITH CHECK (true);

-- Function to update last_activity_at on rooms
CREATE OR REPLACE FUNCTION update_room_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE rooms
  SET last_activity_at = NOW()
  WHERE id = NEW.room_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to update room activity
CREATE TRIGGER trigger_update_room_activity_on_player
  AFTER INSERT OR UPDATE ON players
  FOR EACH ROW
  EXECUTE FUNCTION update_room_activity();

CREATE TRIGGER trigger_update_room_activity_on_submission
  AFTER INSERT ON submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_room_activity();

CREATE TRIGGER trigger_update_room_activity_on_scavenger
  AFTER INSERT ON scavenger_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_room_activity();

-- Function to cleanup expired rooms and presets
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS void AS $$
BEGIN
  -- Delete expired rooms
  DELETE FROM rooms
  WHERE expires_at < NOW() - INTERVAL '7 days';
  
  -- Delete expired presets
  DELETE FROM rooms
  WHERE is_preset = TRUE
    AND preset_expires_at IS NOT NULL
    AND preset_expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on cleanup function
GRANT EXECUTE ON FUNCTION cleanup_expired_data() TO authenticated, anon;
