import { v4 as uuidv4 } from 'uuid'

/**
 * Generate a unique UUID for client identification
 */
export function generateUUID(): string {
  return uuidv4()
}

/**
 * Generate a 6-character alphanumeric room code
 */
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Exclude confusing chars like O, 0, I, 1
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

/**
 * Generate a secure host key (32 character random string)
 */
export function generateHostKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let key = ''
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return key
}

/**
 * Format timer display from seconds
 * @param seconds - Total seconds
 * @returns Formatted string like "1:05" or "0:30"
 */
export function formatTimer(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Compute trivia points based on correctness and response time
 * Formula: points = base_points * (1 - elapsed_ms / time_limit_ms) * time_scaling_factor
 * 
 * @param isCorrect - Whether the answer is correct
 * @param basePoints - Base points for correct answer (e.g., 100)
 * @param timeLimitSeconds - Total time allowed for the question
 * @param elapsedMs - Time taken to answer in milliseconds
 * @param timeScaling - Whether to apply time-based scaling (Kahoot-style)
 * @returns Points awarded (0 if incorrect)
 */
export function computeTriviaPoints(
  isCorrect: boolean,
  basePoints: number,
  timeLimitSeconds: number,
  elapsedMs: number,
  timeScaling: boolean = true
): number {
  if (!isCorrect) {
    return 0
  }

  if (!timeScaling) {
    return basePoints
  }

  const timeLimitMs = timeLimitSeconds * 1000
  const timeRatio = Math.max(0, Math.min(1, elapsedMs / timeLimitMs))
  
  // Award more points for faster answers
  // Points range from 50% to 100% of base points
  const minPointsRatio = 0.5
  const scaledRatio = minPointsRatio + (1 - minPointsRatio) * (1 - timeRatio)
  
  return Math.round(basePoints * scaledRatio)
}

/**
 * Compute scavenger points based on approval status and submission order
 * 
 * Rules:
 * - First approved submission: firstApprovedPoints (default 10)
 * - Other approved submissions: otherApprovedPoints (default 5)
 * - Rejected submissions: rejectedPoints (default 2)
 * - If first submitter is rejected, next approved becomes "first approved"
 * 
 * @param approved - Whether submission was approved (null = pending)
 * @param isFirstApproved - Whether this is the first approved submission
 * @param firstApprovedPoints - Points for first approved submission
 * @param otherApprovedPoints - Points for other approved submissions
 * @param rejectedPoints - Points for rejected submissions
 * @returns Points awarded
 */
export function computeScavengerPoints(
  approved: boolean | null,
  isFirstApproved: boolean,
  firstApprovedPoints: number = 10,
  otherApprovedPoints: number = 5,
  rejectedPoints: number = 2
): number {
  if (approved === null) {
    return 0 // Pending, no points yet
  }

  if (approved === false) {
    return rejectedPoints
  }

  // Approved
  return isFirstApproved ? firstApprovedPoints : otherApprovedPoints
}

/**
 * Get or create client UUID from localStorage
 */
export function getClientUUID(): string {
  if (typeof window === 'undefined') {
    return '' // Server-side
  }

  const key = 'trivia_client_uuid'
  let uuid = localStorage.getItem(key)
  
  if (!uuid) {
    uuid = generateUUID()
    localStorage.setItem(key, uuid)
    console.log('🆕 Generated NEW UUID:', uuid)
  } else {
    console.log('✅ Using existing UUID:', uuid)
  }
  
  return uuid
}

/**
 * Get host key from localStorage
 */
export function getHostKey(): string | null {
  if (typeof window === 'undefined') {
    return null
  }
  
  return localStorage.getItem('trivia_host_key')
}

/**
 * Set host key in localStorage
 */
export function setHostKey(key: string): void {
  if (typeof window === 'undefined') {
    return
  }
  
  localStorage.setItem('trivia_host_key', key)
}

/**
 * Clear host key from localStorage
 */
export function clearHostKey(): void {
  if (typeof window === 'undefined') {
    return
  }
  
  localStorage.removeItem('trivia_host_key')
}

/**
 * Sanitize display name
 */
export function sanitizeDisplayName(name: string): string {
  return name.trim().slice(0, 20).replace(/[^\w\s-]/g, '')
}

/**
 * Check if a player name is already taken in the room
 * If taken, append a number suffix
 */
export function makeUniquePlayerName(name: string, existingNames: string[]): string {
  let uniqueName = name
  let counter = 1
  
  while (existingNames.includes(uniqueName)) {
    uniqueName = `${name}${counter}`
    counter++
  }
  
  return uniqueName
}

/**
 * Calculate submission order for scavenger hunt
 */
export function calculateSubmissionOrder(existingSubmissions: number): number {
  return existingSubmissions + 1
}

/**
 * Export leaderboard data to CSV
 */
export function exportLeaderboardToCSV(
  leaderboard: Array<{ display_name: string; points: number; rank: number }>,
  roomTitle: string
): void {
  const csvContent = [
    ['Rank', 'Player', 'Points'],
    ...leaderboard.map(player => [
      player.rank.toString(),
      player.display_name,
      player.points.toString(),
    ]),
  ]
    .map(row => row.join(','))
    .join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', `${roomTitle}_leaderboard.csv`)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Debounce function for rate limiting
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }
    
    if (timeout) {
      clearTimeout(timeout)
    }
    
    timeout = setTimeout(later, wait)
  }
}
