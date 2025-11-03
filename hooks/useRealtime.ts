// @ts-nocheck
'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type {
  Room,
  Player,
  Question,
  GameState,
  Submission,
  ScavengerSubmission,
  LeaderboardEntry,
} from '@/types'

/**
 * Simple realtime hook for room and player updates
 */
export function useRealtime(
  roomCode: string,
  onUpdate: (room: Room | null, players: Player[]) => void
) {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)
  const onUpdateRef = useRef(onUpdate)

  // Keep ref updated
  useEffect(() => {
    onUpdateRef.current = onUpdate
  }, [onUpdate])

  useEffect(() => {
    if (!roomCode) return

    // Create channel for this room
    const roomChannel = supabase.channel(`room:${roomCode}`, {
      config: {
        broadcast: { self: true },
      },
    })

    // Subscribe to room changes
    roomChannel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rooms',
          filter: `room_code=eq.${roomCode}`,
        },
        async (payload) => {
          const room = payload.new as Room
          const { data: players } = await supabase
            .from('players')
            .select('*')
            .eq('room_id', room.id)
            .order('points', { ascending: false })
          
          onUpdateRef.current(room, players || [])
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
        },
        async () => {
          // Refetch room and players
          const { data: room } = await supabase
            .from('rooms')
            .select('*')
            .eq('room_code', roomCode)
            .single()

          if (room) {
            const { data: players } = await supabase
              .from('players')
              .select('*')
              .eq('room_id', room.id)
              .order('points', { ascending: false })
            
            onUpdateRef.current(room, players || [])
          }
        }
      )
      .subscribe()

    setChannel(roomChannel)

    return () => {
      roomChannel.unsubscribe()
    }
  }, [roomCode])

  return channel
}

interface UseRoomRealtimeProps {
  roomId: string
  onRoomUpdate?: (room: Room) => void
  onPlayersUpdate?: (players: Player[]) => void
  onGameStateUpdate?: (gameState: GameState) => void
  onQuestionUpdate?: (question: Question | null) => void
  onSubmission?: (submission: Submission) => void
  onScavengerSubmission?: (submission: ScavengerSubmission) => void
  onLeaderboardUpdate?: (leaderboard: LeaderboardEntry[]) => void
}

/**
 * Main realtime hook for room updates
 * Handles all realtime subscriptions for a room
 */
export function useRoomRealtime({
  roomId,
  onRoomUpdate,
  onPlayersUpdate,
  onGameStateUpdate,
  onQuestionUpdate,
  onSubmission,
  onScavengerSubmission,
  onLeaderboardUpdate,
}: UseRoomRealtimeProps) {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!roomId) return

    // Create channel for this room
    const roomChannel = supabase.channel(`room:${roomId}`, {
      config: {
        broadcast: { self: true },
      },
    })

    // Subscribe to room changes
    roomChannel
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, (payload) => {
        const room = payload.new as Room
        onRoomUpdate?.(room)
        
        if (room.game_state) {
          onGameStateUpdate?.(room.game_state as GameState)
        }
      })
      // Subscribe to player changes
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` }, async () => {
        // Fetch updated players list
        const { data: players } = await supabase
          .from('players')
          .select('*')
          .eq('room_id', roomId)
          .order('joined_at', { ascending: true })

        if (players) {
          onPlayersUpdate?.(players as Player[])
        }
      })
      // Subscribe to new submissions
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'submissions', filter: `room_id=eq.${roomId}` }, (payload) => {
        const submission = payload.new as Submission
        onSubmission?.(submission)
      })
      // Subscribe to scavenger submissions
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scavenger_submissions', filter: `room_id=eq.${roomId}` }, (payload) => {
        const submission = payload.new as ScavengerSubmission
        onScavengerSubmission?.(submission)
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsConnected(false)
        }
      })

    setChannel(roomChannel)

    return () => {
      roomChannel.unsubscribe()
      setChannel(null)
      setIsConnected(false)
    }
  }, [roomId, onRoomUpdate, onPlayersUpdate, onGameStateUpdate, onQuestionUpdate, onSubmission, onScavengerSubmission, onLeaderboardUpdate])

  // Broadcast custom events
  const broadcast = useCallback((event: string, payload: any) => {
    if (channel && isConnected) {
      channel.send({
        type: 'broadcast',
        event,
        payload,
      })
    }
  }, [channel, isConnected])

  return { isConnected, broadcast, channel }
}

/**
 * Hook to manage player presence and heartbeat
 */
export function usePlayerPresence(roomId: string, playerId: string) {
  const heartbeatRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (!roomId || !playerId) return

    // Send heartbeat every 30 seconds
    const sendHeartbeat = async () => {
      await supabase
        .from('players')
        .update({ last_seen_at: new Date().toISOString() } as any)
        .eq('id', playerId)
    }

    // Initial heartbeat
    sendHeartbeat()

    // Set up interval
    heartbeatRef.current = setInterval(sendHeartbeat, 30000)

    // Cleanup on unmount or disconnect
    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current)
      }
      
      // Mark as disconnected
      supabase
        .from('players')
        .update({ connected: false } as any)
        .eq('id', playerId)
        .then(() => {
          console.log('Player disconnected')
        })
    }
  }, [roomId, playerId])
}

/**
 * Hook to fetch and subscribe to current question
 */
export function useCurrentQuestion(roomId: string, round: number, questionNumber: number) {
  const [question, setQuestion] = useState<Question | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!roomId || round === 0 || questionNumber === 0) {
      setQuestion(null)
      setLoading(false)
      return
    }

    const fetchQuestion = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('questions')
        .select('*')
        .eq('room_id', roomId)
        .eq('round_number', round)
        .eq('question_number', questionNumber)
        .single()

      setQuestion(data as Question | null)
      setLoading(false)
    }

    fetchQuestion()
  }, [roomId, round, questionNumber])

  return { question, loading }
}

/**
 * Hook to get scavenger submissions for review (host only)
 */
export function useScavengerSubmissions(roomId: string, questionId: string) {
  const [submissions, setSubmissions] = useState<(ScavengerSubmission & { player: Player })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!roomId || !questionId) {
      setSubmissions([])
      setLoading(false)
      return
    }

    const fetchSubmissions = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('scavenger_submissions')
        .select(`
          *,
          player:players(*)
        `)
        .eq('room_id', roomId)
        .eq('question_id', questionId)
        .order('submission_order', { ascending: true })

      setSubmissions((data as any) || [])
      setLoading(false)
    }

    fetchSubmissions()

    // Subscribe to changes
    const channel = supabase
      .channel(`scavenger:${questionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scavenger_submissions', filter: `question_id=eq.${questionId}` }, () => {
        fetchSubmissions()
      })
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [roomId, questionId])

  return { submissions, loading }
}

/**
 * Hook to manage game timer
 */
export function useGameTimer(initialSeconds: number, autoStart: boolean = false) {
  const [seconds, setSeconds] = useState(initialSeconds)
  const [isRunning, setIsRunning] = useState(autoStart)
  const intervalRef = useRef<NodeJS.Timeout>()

  const start = useCallback(() => {
    setIsRunning(true)
  }, [])

  const pause = useCallback(() => {
    setIsRunning(false)
  }, [])

  const reset = useCallback((newSeconds?: number) => {
    setIsRunning(false)
    setSeconds(newSeconds ?? initialSeconds)
  }, [initialSeconds])

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => {
          if (prev <= 0) {
            setIsRunning(false)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning])

  return { seconds, isRunning, start, pause, reset }
}
