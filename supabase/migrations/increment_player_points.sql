-- Create a function to atomically increment player points
-- This prevents race conditions and caching issues

CREATE OR REPLACE FUNCTION increment_player_points(
  player_uuid UUID,
  points_to_add INTEGER
)
RETURNS TABLE (
  id UUID,
  points INTEGER,
  display_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  UPDATE players
  SET points = COALESCE(players.points, 0) + points_to_add
  WHERE players.id = player_uuid
  RETURNING players.id, players.points, players.display_name;
END;
$$ LANGUAGE plpgsql;
