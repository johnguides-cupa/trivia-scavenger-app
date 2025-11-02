-- Enable Realtime for rooms and players tables
-- Run this in your Supabase SQL Editor

-- Enable realtime for rooms table
alter publication supabase_realtime add table rooms;

-- Enable realtime for players table  
alter publication supabase_realtime add table players;

-- Verify it worked
select schemaname, tablename 
from pg_publication_tables 
where pubname = 'supabase_realtime';
