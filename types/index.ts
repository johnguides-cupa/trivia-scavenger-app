/**
 * Core TypeScript types for the trivia scavenger game
 */

export interface GameSettings {
  number_of_rounds: number
  questions_per_round: number
  time_per_trivia_question: number
  time_per_scavenger: number
  points_for_first_scavenger: number
  points_for_other_approved_scavengers: number
  points_for_rejected_scavengers: number
  trivia_base_point: number
  trivia_time_scaling: boolean
}

export type GameStatus = 'lobby' | 'countdown' | 'trivia' | 'scavenger' | 'review' | 'leaderboard' | 'finished'

export interface GameState {
  status: GameStatus
  current_round: number
  current_question: number
  timer_started_at?: string
  timer_duration?: number
}

export interface Room {
  id: string
  room_code: string
  host_client_uuid: string
  host_key: string
  title: string
  is_preset: boolean
  preset_expires_at: string | null
  created_at: string
  last_activity_at: string
  last_host_ping?: string
  expires_at: string
  settings: GameSettings
  game_state: GameState
}

export interface Player {
  id: string
  room_id: string
  client_uuid: string
  display_name: string
  connected: boolean
  last_seen_at: string
  points: number
  metadata: Record<string, any>
  joined_at: string
}

export interface QuestionChoice {
  id: string
  label: string
  is_correct: boolean
}

export interface Question {
  id: string
  room_id: string
  round_number: number
  question_number: number
  stem: string
  choices: QuestionChoice[]
  scavenger_instruction: string
  created_at: string
}

export interface Submission {
  id: string
  room_id: string
  player_id: string
  question_id: string
  answer_choice_id: string
  answered_at: string
  answer_time_ms: number
  is_correct: boolean
  points_awarded: number
}

export interface ScavengerSubmission {
  id: string
  room_id: string
  player_id: string
  question_id: string
  submitted_at: string
  submission_order: number
  approved: boolean | null
  approved_by_host_at: string | null
  points_awarded: number
}

export interface LeaderboardEntry {
  player_id: string
  display_name: string
  points: number
  rank: number
}

export interface LeaderboardSnapshot {
  id: string
  room_id: string
  snapshot_at: string
  payload: LeaderboardEntry[]
}

export interface UserSession {
  id: string
  client_uuid: string
  display_name: string | null
  created_at: string
  last_active_at: string
}

// Realtime event payloads
export interface RoomStatePayload {
  room: Room
  players: Player[]
  current_question: Question | null
}

export interface SubmissionPayload {
  submission: Submission
  player: Player
}

export interface ScavengerSubmissionPayload {
  submission: ScavengerSubmission
  player: Player
}

export interface ApprovalPayload {
  submission_id: string
  player_id: string
  approved: boolean
  points_awarded: number
}

export interface LeaderboardUpdatePayload {
  leaderboard: LeaderboardEntry[]
}

export interface TimerPayload {
  started_at: string
  duration_seconds: number
  type: 'trivia' | 'scavenger'
}

// Request/Response types for server actions
export interface CreateRoomRequest {
  title: string
  settings: GameSettings
  is_preset?: boolean
  questions?: Omit<Question, 'id' | 'room_id' | 'created_at'>[]
  host_client_uuid?: string
}

export interface CreateRoomResponse {
  room: Room
  host_key: string
}

export interface JoinRoomRequest {
  room_code: string
  client_uuid: string
  display_name: string
}

export interface JoinRoomResponse {
  player: Player
  room: Room
}

export interface SubmitAnswerRequest {
  room_id: string
  player_id: string
  question_id: string
  answer_choice_id: string
  answer_time_ms: number
}

export interface SubmitScavengerRequest {
  room_id: string
  player_id: string
  question_id: string
}

export interface ApproveScavengerRequest {
  room_id: string
  submission_id: string
  approved: boolean
  host_key: string
}

export interface UpdateGameStateRequest {
  room_id: string
  host_key: string
  game_state: Partial<GameState>
}

export interface ExportResultsRequest {
  room_id: string
}

// Audio types
export interface AudioControls {
  isMusicPlaying: boolean
  isMusicMuted: boolean
  areSoundEffectsMuted: boolean
  toggleMusic: () => void
  toggleMusicMute: () => void
  toggleSoundEffects: () => void
  playCountdown: () => void
  playCorrect: () => void
  playWrong: () => void
  playLeaderboard: () => void
}
