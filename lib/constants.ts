/**
 * Application-wide constants and configuration values
 */

// Room Configuration
export const ROOM_CODE_LENGTH = 6
export const ROOM_EXPIRATION_HOURS = 24
export const PRESET_EXPIRATION_DAYS = 7
export const MAX_PLAYERS_PER_ROOM = 200

// Display Name Limits
export const MIN_DISPLAY_NAME_LENGTH = 1
export const MAX_DISPLAY_NAME_LENGTH = 20

// Game Settings Constraints
export const MIN_ROUNDS = 1
export const MAX_ROUNDS = 10
export const MIN_QUESTIONS_PER_ROUND = 1
export const MAX_QUESTIONS_PER_ROUND = 20
export const MIN_TRIVIA_TIME = 10 // seconds
export const MAX_TRIVIA_TIME = 120 // seconds
export const MIN_SCAVENGER_TIME = 30 // seconds
export const MAX_SCAVENGER_TIME = 300 // seconds

// Scoring Constants
export const DEFAULT_TRIVIA_BASE_POINTS = 100
export const MIN_TRIVIA_POINTS_RATIO = 0.5 // 50% minimum for time-scaled scoring
export const DEFAULT_FIRST_SCAVENGER_POINTS = 10
export const DEFAULT_OTHER_APPROVED_POINTS = 5
export const DEFAULT_REJECTED_POINTS = 2

// Realtime Configuration
export const HEARTBEAT_INTERVAL_MS = 30000 // 30 seconds
export const PLAYER_TIMEOUT_MS = 60000 // 1 minute before marked disconnected
export const REALTIME_EVENTS_PER_SECOND = 10

// LocalStorage Keys
export const STORAGE_KEY_CLIENT_UUID = 'trivia_client_uuid'
export const STORAGE_KEY_HOST_KEY = 'trivia_host_key'
export const STORAGE_KEY_PLAYER_NAME = 'player_display_name'
export const STORAGE_KEY_MUSIC_MUTED = 'music_muted'
export const STORAGE_KEY_EFFECTS_MUTED = 'effects_muted'

// Audio Configuration
export const BACKGROUND_MUSIC_VOLUME = 0.3
export const COUNTDOWN_BEEP_FREQUENCY = 800 // Hz
export const CORRECT_ANSWER_FREQUENCIES = [523.25, 659.25, 783.99] // C, E, G (major chord)
export const WRONG_ANSWER_FREQUENCY = 200 // Hz
export const LEADERBOARD_FREQUENCIES = [523.25, 659.25, 783.99, 1046.50] // C, E, G, C (octave)

// Timer Configuration
export const TIMER_UPDATE_INTERVAL_MS = 1000 // 1 second
export const URGENT_TIMER_THRESHOLD_PERCENT = 25

// UI Configuration
export const COUNTDOWN_DURATION_MS = 3000 // 3 seconds for 3-2-1 countdown
export const CONFETTI_DURATION_MS = 5000 // 5 seconds
export const TOAST_DURATION_MS = 3000 // 3 seconds for notifications

// API Configuration
export const MAX_RETRIES = 3
export const RETRY_DELAY_MS = 1000
export const REQUEST_TIMEOUT_MS = 10000

// Validation Regex
export const ROOM_CODE_REGEX = /^[A-Z0-9]{6}$/
export const DISPLAY_NAME_REGEX = /^[\w\s-]+$/

// Error Messages
export const ERROR_MESSAGES = {
  ROOM_NOT_FOUND: 'Room not found. Please check the room code.',
  ROOM_EXPIRED: 'This room has expired.',
  INVALID_ROOM_CODE: 'Invalid room code format.',
  INVALID_DISPLAY_NAME: 'Display name can only contain letters, numbers, spaces, and hyphens.',
  NAME_TOO_LONG: `Display name must be ${MAX_DISPLAY_NAME_LENGTH} characters or less.`,
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  ALREADY_SUBMITTED: 'You have already submitted an answer for this question.',
  SERVER_ERROR: 'Something went wrong. Please try again.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
}

// Success Messages
export const SUCCESS_MESSAGES = {
  ROOM_CREATED: 'Room created successfully!',
  PLAYER_JOINED: 'Joined room successfully!',
  ANSWER_SUBMITTED: 'Answer submitted!',
  SCAVENGER_SUBMITTED: 'Scavenger hunt completed!',
  GAME_STARTED: 'Game started!',
}

// Game State Values
export const GAME_STATES = {
  LOBBY: 'lobby',
  COUNTDOWN: 'countdown',
  TRIVIA: 'trivia',
  SCAVENGER: 'scavenger',
  REVIEW: 'review',
  LEADERBOARD: 'leaderboard',
  FINISHED: 'finished',
} as const

// Character Sets for Code Generation
export const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Excludes confusing chars
export const HOST_KEY_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

// Database Configuration
export const BATCH_SIZE = 100 // For bulk operations
export const MAX_QUERY_RESULTS = 1000

// Feature Flags (for future use)
export const FEATURES = {
  ENABLE_IMAGE_UPLOAD: false,
  ENABLE_TEAM_MODE: false,
  ENABLE_SPECTATOR_MODE: false,
  ENABLE_CHAT: false,
  ENABLE_VOICE: false,
}

// Leaderboard Configuration
export const TOP_PLAYERS_DISPLAY = 10
export const RANK_EMOJI = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
}

// Animation Timings (CSS transition durations)
export const ANIMATION_DURATIONS = {
  FAST: 200,
  NORMAL: 300,
  SLOW: 500,
}

// Breakpoints (must match Tailwind config)
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  '2XL': 1536,
}

// Export default settings object
export const DEFAULT_GAME_SETTINGS = {
  number_of_rounds: 3,
  questions_per_round: 3,
  time_per_trivia_question: 30,
  time_per_scavenger: 60,
  points_for_first_scavenger: DEFAULT_FIRST_SCAVENGER_POINTS,
  points_for_other_approved_scavengers: DEFAULT_OTHER_APPROVED_POINTS,
  points_for_rejected_scavengers: DEFAULT_REJECTED_POINTS,
  trivia_base_point: DEFAULT_TRIVIA_BASE_POINTS,
  trivia_time_scaling: true,
}
