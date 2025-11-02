'use client'

import { useEffect, useState, useRef } from 'react'

interface UseGameTimerProps {
  startTime: string | null // ISO timestamp when timer started
  duration: number // Duration in seconds
  onComplete: () => void
  enabled: boolean
}

export function useGameTimer({ startTime, duration, onComplete, enabled }: UseGameTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(duration)
  const [isRunning, setIsRunning] = useState(false)
  const onCompleteRef = useRef(onComplete)
  const hasCompletedRef = useRef(false)

  // Update callback ref
  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    if (!enabled || !startTime) {
      setIsRunning(false)
      setSecondsLeft(duration)
      hasCompletedRef.current = false
      return
    }

    setIsRunning(true)
    hasCompletedRef.current = false

    const interval = setInterval(() => {
      const start = new Date(startTime).getTime()
      const now = Date.now()
      const elapsed = Math.floor((now - start) / 1000)
      const remaining = Math.max(0, duration - elapsed)

      setSecondsLeft(remaining)

      if (remaining <= 0 && !hasCompletedRef.current) {
        hasCompletedRef.current = true
        setIsRunning(false)
        onCompleteRef.current()
      }
    }, 100) // Update every 100ms for smooth countdown

    return () => clearInterval(interval)
  }, [startTime, duration, enabled])

  return {
    secondsLeft,
    isRunning,
    totalSeconds: duration,
  }
}
