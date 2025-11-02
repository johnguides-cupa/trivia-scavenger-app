'use client'

import { formatTimer } from '@/lib/utils'

interface TimerProps {
  seconds: number
  totalSeconds: number
  isRunning: boolean
  variant?: 'trivia' | 'scavenger'
}

export function Timer({ seconds, totalSeconds, isRunning, variant = 'trivia' }: TimerProps) {
  const percentage = (seconds / totalSeconds) * 100
  const isUrgent = percentage < 25

  return (
    <div className="space-y-2">
      {/* Time Display */}
      <div className="text-center">
        <div className={`text-4xl md:text-6xl font-bold font-display ${
          isUrgent ? 'text-red-400 animate-pulse' : 'text-white'
        }`}>
          {formatTimer(seconds)}
        </div>
        <div className="text-sm text-gray-400 uppercase tracking-wide mt-1">
          {variant === 'trivia' ? 'Trivia Time' : 'Scavenger Hunt'}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ${
            variant === 'trivia'
              ? 'bg-gradient-to-r from-green-400 via-yellow-400 to-red-500'
              : 'bg-gradient-to-r from-blue-400 via-purple-400 to-pink-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

export default Timer
