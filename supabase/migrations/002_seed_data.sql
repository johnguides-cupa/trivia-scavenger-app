-- Migration: Seed sample data
-- Version: 002
-- Description: Adds sample room with questions for testing

-- Insert a sample host session
INSERT INTO user_sessions (client_uuid, display_name, created_at, last_active_at)
VALUES 
  ('sample-host-uuid-12345', 'Sample Host', NOW(), NOW()),
  ('sample-player-uuid-001', 'Alice', NOW(), NOW()),
  ('sample-player-uuid-002', 'Bob', NOW(), NOW()),
  ('sample-player-uuid-003', 'Charlie', NOW(), NOW());

-- Insert a sample room
INSERT INTO rooms (
  id,
  room_code,
  host_client_uuid,
  host_key,
  title,
  is_preset,
  created_at,
  last_activity_at,
  expires_at,
  settings
)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'DEMO01',
  'sample-host-uuid-12345',
  'sample-host-key-secret-token',
  'Sample Party Game',
  FALSE,
  NOW(),
  NOW(),
  NOW() + INTERVAL '24 hours',
  '{
    "number_of_rounds": 2,
    "questions_per_round": 3,
    "time_per_trivia_question": 30,
    "time_per_scavenger": 60,
    "points_for_first_scavenger": 10,
    "points_for_other_approved_scavengers": 5,
    "points_for_rejected_scavengers": 2,
    "trivia_base_point": 100,
    "trivia_time_scaling": true
  }'::jsonb
);

-- Insert sample questions for Round 1
INSERT INTO questions (
  room_id,
  round_number,
  question_number,
  stem,
  choices,
  scavenger_instruction
)
VALUES
-- Round 1, Question 1
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  1,
  1,
  'What is the capital of France?',
  '[
    {"id": "a", "label": "London", "is_correct": false},
    {"id": "b", "label": "Paris", "is_correct": true},
    {"id": "c", "label": "Berlin", "is_correct": false},
    {"id": "d", "label": "Madrid", "is_correct": false}
  ]'::jsonb,
  'Find something BLUE in your room and show it to the camera!'
),
-- Round 1, Question 2
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  1,
  2,
  'Which planet is known as the Red Planet?',
  '[
    {"id": "a", "label": "Venus", "is_correct": false},
    {"id": "b", "label": "Jupiter", "is_correct": false},
    {"id": "c", "label": "Mars", "is_correct": true},
    {"id": "d", "label": "Saturn", "is_correct": false}
  ]'::jsonb,
  'Do 5 jumping jacks and press Done when finished!'
),
-- Round 1, Question 3
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  1,
  3,
  'What is 7 × 8?',
  '[
    {"id": "a", "label": "54", "is_correct": false},
    {"id": "b", "label": "56", "is_correct": true},
    {"id": "c", "label": "63", "is_correct": false},
    {"id": "d", "label": "48", "is_correct": false}
  ]'::jsonb,
  'Find a book and hold it above your head!'
),
-- Round 2, Question 1
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  2,
  1,
  'Who painted the Mona Lisa?',
  '[
    {"id": "a", "label": "Vincent van Gogh", "is_correct": false},
    {"id": "b", "label": "Pablo Picasso", "is_correct": false},
    {"id": "c", "label": "Leonardo da Vinci", "is_correct": true},
    {"id": "d", "label": "Michelangelo", "is_correct": false}
  ]'::jsonb,
  'Strike your best superhero pose!'
),
-- Round 2, Question 2
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  2,
  2,
  'What is the largest ocean on Earth?',
  '[
    {"id": "a", "label": "Atlantic Ocean", "is_correct": false},
    {"id": "b", "label": "Indian Ocean", "is_correct": false},
    {"id": "c", "label": "Arctic Ocean", "is_correct": false},
    {"id": "d", "label": "Pacific Ocean", "is_correct": true}
  ]'::jsonb,
  'Find something that makes you happy and show it!'
),
-- Round 2, Question 3
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  2,
  3,
  'How many continents are there?',
  '[
    {"id": "a", "label": "5", "is_correct": false},
    {"id": "b", "label": "6", "is_correct": false},
    {"id": "c", "label": "7", "is_correct": true},
    {"id": "d", "label": "8", "is_correct": false}
  ]'::jsonb,
  'Spell your name backwards using hand gestures!'
);

-- Insert sample players
INSERT INTO players (
  room_id,
  client_uuid,
  display_name,
  connected,
  points
)
VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'sample-player-uuid-001', 'Alice', TRUE, 0),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'sample-player-uuid-002', 'Bob', TRUE, 0),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'sample-player-uuid-003', 'Charlie', FALSE, 0);
