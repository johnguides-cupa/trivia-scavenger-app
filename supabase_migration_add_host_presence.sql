-- Add last_host_ping column to rooms table for host presence tracking
ALTER TABLE rooms 
ADD COLUMN last_host_ping TIMESTAMP WITH TIME ZONE;

-- Create index for efficient queries
CREATE INDEX idx_rooms_last_host_ping ON rooms(last_host_ping);

-- Add comment
COMMENT ON COLUMN rooms.last_host_ping IS 'Timestamp of last host heartbeat ping - used to detect host disconnection';
