'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Room, Player, Question } from '@/types'
import { useRealtime } from '@/hooks/useRealtime'
import { useGameTimer } from '@/hooks/useGameTimer'
import { PlayerList } from '@/components/PlayerList'
import { Timer } from '@/components/Timer'
import { Leaderboard } from '@/components/Leaderboard'
import { ConfirmModal } from '@/components/ConfirmModal'
import ScavengerReview from '@/components/ScavengerReview'
import { startGame, restartGame } from '@/app/actions'

export default function HostDashboard() {
  const params = useParams()
  const router = useRouter()
  const roomCode = params.room_code as string
  
  const [room, setRoom] = useState<Room | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [showEndGameModal, setShowEndGameModal] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [showContinueScreen, setShowContinueScreen] = useState(false)
  const [isAdvancing, setIsAdvancing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [questionLoadTime, setQuestionLoadTime] = useState<number | null>(null)
  const [currentTime, setCurrentTime] = useState(Date.now()) // For countdown updates
  const [showCountdown, setShowCountdown] = useState(false)
  const [countdownValue, setCountdownValue] = useState(3)
  const [waitingForSubmissions, setWaitingForSubmissions] = useState(false)

  
  // Ref to prevent duplicate auto-advance calls (kept for backwards compat)
  const isAdvancingRef = useRef(false)
  // Ref to track last loaded question to prevent duplicate loads
  const lastLoadedQuestionRef = useRef<string>('')

  // Get host key from localStorage
  const hostKey = typeof window !== 'undefined' 
    ? localStorage.getItem(`host_key_${roomCode}`) 
    : null

  // Calculate game state variables
  const gameState = room?.game_state as any
  const settings = room?.settings as any
  const isLobby = gameState?.status === 'lobby'
  const isTrivia = gameState?.status === 'trivia'
  const isTriviaReview = gameState?.status === 'trivia_review'
  const isScavenger = gameState?.status === 'scavenger'
  const isReview = gameState?.status === 'review'
  const isRoundSummary = gameState?.status === 'round_summary'
  const isPaused = gameState?.status === 'paused'
  const isFinished = gameState?.status === 'finished'

  // Timer for trivia question - MUST be called unconditionally (hooks rule)
  const triviaTimer = useGameTimer({
    startTime: gameState?.question_start_time || null,
    duration: settings?.time_per_trivia_question || 30,
    enabled: isTrivia && !!currentQuestion && !!room && !showCountdown,
    onComplete: async () => {
      // Check if at least one player has submitted an answer before auto-advancing
      if (room && hostKey && currentQuestion) {
        console.log('⏰ Trivia timer expired - checking for submissions...')
        
        try {
          const response = await fetch('/api/check-submissions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              room_id: room.id,
              question_id: currentQuestion.id
            }),
          })
          
          if (response.ok) {
            const data = await response.json()
            
            if (data.hasSubmissions) {
              console.log('✅ At least one submission found - auto-advancing')
              setWaitingForSubmissions(false)
              handleNextPhase()
            } else {
              console.log('⚠️ No submissions yet - waiting for players to reconnect...')
              setWaitingForSubmissions(true)
              // Don't auto-advance, let host manually advance when ready
            }
          } else {
            // If check fails, default to auto-advancing (don't block the game)
            console.log('⚠️ Submission check failed - auto-advancing anyway')
            setWaitingForSubmissions(false)
            handleNextPhase()
          }
        } catch (error) {
          console.error('Error checking submissions:', error)
          // If check fails, default to auto-advancing (don't block the game)
          setWaitingForSubmissions(false)
          handleNextPhase()
        }
      }
    },
  })

  // Timer for scavenger hunt - MUST be called unconditionally (hooks rule)
  const scavengerTimer = useGameTimer({
    startTime: gameState?.scavenger_start_time || null,
    duration: settings?.time_per_scavenger || 60,
    enabled: isScavenger && !!currentQuestion && !!room,
    onComplete: () => {
      // Auto-advance to review phase when scavenger timer expires
      console.log('⏰ Scavenger timer expired - advancing to review')
      if (room && hostKey) {
        handleNextPhase()
      }
    },
  })

  // Subscribe to realtime updates
  useRealtime(roomCode, (updatedRoom, updatedPlayers) => {
    console.log('🔄 Realtime update:', { 
      gameState: updatedRoom?.game_state,
      playersCount: updatedPlayers.length 
    })
    setRoom(updatedRoom)
    setPlayers(updatedPlayers)
    
    // Load current question if playing trivia or reviewing answer
    if (updatedRoom) {
      const gameState = updatedRoom.game_state as any
      if (gameState?.status === 'trivia' || gameState?.status === 'trivia_review') {
        console.log('📝 Loading question:', { 
          roomId: updatedRoom.id, 
          round: gameState.current_round, 
          question: gameState.current_question 
        })
        
        // Check if this is a new trivia question
        const questionKey = `${updatedRoom.id}-${gameState.current_round}-${gameState.current_question}`
        const isNewQuestion = lastLoadedQuestionRef.current !== questionKey
        
        loadCurrentQuestion(updatedRoom.id, gameState.current_round, gameState.current_question)
        
        // Start countdown for new trivia questions
        if (gameState?.status === 'trivia' && isNewQuestion) {
          setShowCountdown(true)
          setCountdownValue(3)
        }
      }
    }
  })

  // Load current question
  const loadCurrentQuestion = async (roomId: string, round: number, questionNum: number) => {
    const questionKey = `${roomId}-${round}-${questionNum}`
    
    // Prevent loading the same question multiple times
    if (lastLoadedQuestionRef.current === questionKey) {
      console.log('⏸️ Question already loaded, skipping:', questionKey)
      return
    }
    
    try {
      console.log('🔍 Fetching question from API...', { roomId, round, questionNum })
      lastLoadedQuestionRef.current = questionKey
      
      const response = await fetch('/api/question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_id: roomId, round_number: round, question_number: questionNum }),
      })

      if (response.ok) {
        const data = await response.json()
        console.log('✅ Question loaded:', data.question)
        setCurrentQuestion(data.question)
        setQuestionLoadTime(Date.now()) // Track when question loaded
      } else {
        console.error('❌ Question API error:', response.status, await response.text())
      }
    } catch (error) {
      console.error('❌ Failed to load question:', error)
    }
  }

  // Load initial data
  useEffect(() => {
    if (!roomCode) {
      router.push('/')
      return
    }

    const loadRoom = async () => {
      try {
        const response = await fetch('/api/room', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ room_code: roomCode }),
        })

        if (!response.ok) {
          throw new Error('Room not found')
        }

        const data = await response.json()
        setRoom(data.room)
        setPlayers(data.players || [])
        
        // Check if rejoining mid-game (not lobby or finished)
        const gameState = data.room.game_state as any
        const isInProgress = !['lobby', 'finished'].includes(gameState?.status)
        if (isInProgress) {
          console.log('🎮 [HOST] Rejoining mid-game, showing continue screen')
          setShowContinueScreen(true)
          
          // Load current question if in trivia, trivia_review, scavenger, or review phase
          if (['trivia', 'trivia_review', 'scavenger', 'review'].includes(gameState?.status)) {
            await loadCurrentQuestion(data.room.id, gameState.current_round, gameState.current_question)
          }
        }
      } catch (error) {
        console.error('Failed to load room:', error)
        router.push('/')
      } finally {
        setLoading(false)
      }
    }

    loadRoom()
  }, [roomCode, router])

  // Host presence heartbeat - updates last_host_ping timestamp
  useEffect(() => {
    if (!room) return

    const updatePresence = async () => {
      try {
        await fetch('/api/host-presence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ room_id: room.id }),
        })
      } catch (error) {
        console.error('Failed to update host presence:', error)
      }
    }

    // Update immediately
    updatePresence()

    // Update every 3 seconds
    const interval = setInterval(updatePresence, 3000)

    return () => clearInterval(interval)
  }, [room])

  // Update current time every 100ms for countdown display
  useEffect(() => {
    if (!questionLoadTime) return
    
    const interval = setInterval(() => {
      setCurrentTime(Date.now())
      // Stop updating after 5 seconds
      if (Date.now() - questionLoadTime >= 5000) {
        clearInterval(interval)
      }
    }, 100)
    
    return () => clearInterval(interval)
  }, [questionLoadTime])

  // Countdown effect - counts down 3...2...1...GO!
  useEffect(() => {
    if (!showCountdown) return

    if (countdownValue > 0) {
      const timer = setTimeout(() => {
        setCountdownValue(countdownValue - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else {
      // Countdown finished - show GO! for 500ms then hide
      const timer = setTimeout(() => {
        setShowCountdown(false)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [showCountdown, countdownValue])

  // Removed fallback polling - relying on realtime subscription only to prevent race conditions

  // Define handleNextPhase before auto-advance effect
  const handleNextPhase = useCallback(async () => {
    if (!room || !hostKey) return
    
    // Prevent duplicate calls
    if (isAdvancingRef.current) {
      console.log('⏸️ Already advancing, skipping duplicate call')
      return
    }

    const gameState = room.game_state as any
    const settings = room.settings as any

    // Enforce minimum 5-second wait ONLY during trivia phase
    // This prevents host from clicking "Show Answer" before players see the question
    // Does NOT delay question loading - players get question immediately
    if (gameState?.status === 'trivia' && questionLoadTime) {
      const elapsedSinceLoad = Date.now() - questionLoadTime
      if (elapsedSinceLoad < 5000) {
        const waitTime = ((5000 - elapsedSinceLoad) / 1000).toFixed(1)
        alert(`Please wait ${waitTime} more seconds to ensure all players have loaded the question.`)
        return
      }
    }

    try {
      isAdvancingRef.current = true
      setIsAdvancing(true)
      setWaitingForSubmissions(false) // Clear warning when manually advancing
      // Don't use setLoading - it causes full screen reload
      
      // Send immediate host presence ping before phase transition
      // This prevents players from seeing "disconnected" warnings during transitions
      try {
        await fetch('/api/host-presence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ room_id: room.id }),
        })
      } catch (error) {
        console.error('Failed to send presence ping:', error)
      }
      
      // Phase transitions: trivia → trivia_review → scavenger → review → next trivia
      if (gameState.status === 'trivia') {
        // Move to trivia review phase (show correct answer)
        console.log('📝 Advancing trivia → trivia_review')
        const response = await fetch('/api/update-game-state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            room_code: roomCode,
            host_key: hostKey,
            game_state: {
              ...gameState,
              status: 'trivia_review',
            },
          }),
        })
        if (!response.ok) throw new Error('Failed to move to trivia review')
      } else if (gameState.status === 'trivia_review') {
        // Move to scavenger phase
        console.log('✅ Advancing trivia_review → scavenger')
        const response = await fetch('/api/update-game-state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            room_code: roomCode,
            host_key: hostKey,
            game_state: {
              ...gameState,
              status: 'scavenger',
              scavenger_start_time: new Date().toISOString(),
            },
          }),
        })
        if (!response.ok) throw new Error('Failed to start scavenger phase')
      } else if (gameState.status === 'scavenger') {
        // Move to review phase
        console.log('🔍 Advancing scavenger → review')
        const response = await fetch('/api/update-game-state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            room_code: roomCode,
            host_key: hostKey,
            game_state: {
              ...gameState,
              status: 'review',
            },
          }),
        })
        if (!response.ok) throw new Error('Failed to start review phase')
      } else if (gameState.status === 'review') {
        // Move to next question or finish
        const currentRound = gameState.current_round
        const currentQ = gameState.current_question

        if (currentQ < settings.questions_per_round) {
          // Next question in same round
          console.log(`➡️ Advancing to question ${currentQ + 1}`)
          // Add 3 seconds to question_start_time for countdown (3...2...1...GO!)
          const countdownDelay = 3000
          const questionStartTime = new Date(Date.now() + countdownDelay).toISOString()
          
          const response = await fetch('/api/update-game-state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              room_code: roomCode,
              host_key: hostKey,
              game_state: {
                ...gameState,
                status: 'trivia',
                current_question: currentQ + 1,
                question_start_time: questionStartTime,
              },
            }),
          })
          if (!response.ok) throw new Error('Failed to advance question')
        } else if (currentRound < settings.number_of_rounds) {
          // Show round summary before next round
          console.log(`🏆 Round ${currentRound} complete - showing leaderboard`)
          const response = await fetch('/api/update-game-state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              room_code: roomCode,
              host_key: hostKey,
              game_state: {
                ...gameState,
                status: 'round_summary',
              },
            }),
          })
          if (!response.ok) throw new Error('Failed to show round summary')
        } else {
          // Game finished
          console.log('🏁 Game finished')
          const response = await fetch('/api/update-game-state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              room_code: roomCode,
              host_key: hostKey,
              game_state: {
                ...gameState,
                status: 'finished',
              },
            }),
          })
          if (!response.ok) throw new Error('Failed to end game')
        }
      } else if (gameState.status === 'round_summary') {
        // Continue to next round after showing leaderboard
        const currentRound = gameState.current_round
        console.log(`➡️ Starting round ${currentRound + 1}`)
        // Add 3 seconds to question_start_time for countdown (3...2...1...GO!)
        const countdownDelay = 3000
        const questionStartTime = new Date(Date.now() + countdownDelay).toISOString()
        
        const response = await fetch('/api/update-game-state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            room_code: roomCode,
            host_key: hostKey,
            game_state: {
              ...gameState,
              status: 'trivia',
              current_round: currentRound + 1,
              current_question: 1,
              question_start_time: questionStartTime,
            },
          }),
        })
        if (!response.ok) throw new Error('Failed to start next round')
      }
    } catch (error) {
      console.error('Failed to advance phase:', error)
      alert('Failed to advance. Please try again.')
    } finally {
      // Reset the advancing flag after a longer delay to prevent auto-advance from triggering too soon
      setTimeout(() => {
        isAdvancingRef.current = false
        setIsAdvancing(false)
        console.log('🔓 Advancing lock released')
      }, 3000) // 3 seconds to allow question to load and players to see it
    }
  }, [room, hostKey, roomCode, questionLoadTime])

  // Auto-advance when all players have answered (trivia) or submitted (scavenger)
  useEffect(() => {
    if (!room || !hostKey || !currentQuestion || players.length === 0) {
      console.log('⏸️ Auto-advance disabled:', { 
        hasRoom: !!room, 
        hasHostKey: !!hostKey, 
        hasQuestion: !!currentQuestion, 
        playerCount: players.length 
      })
      return
    }

    console.log('✅ Auto-advance enabled - checking every 2 seconds')

    const checkAutoAdvance = async () => {
      // Skip if already advancing
      if (isAdvancingRef.current) {
        console.log('⏸️ Skipping auto-advance check - already advancing')
        return
      }

      // Enforce minimum time (5 seconds) before auto-advance
      // This ensures players have time to see the question
      if (questionLoadTime) {
        const elapsedSinceLoad = Date.now() - questionLoadTime
        if (elapsedSinceLoad < 5000) {
          console.log(`⏸️ Too soon to auto-advance - waiting ${((5000 - elapsedSinceLoad) / 1000).toFixed(1)}s more`)
          return
        }
      }

      try {
        if (isTrivia) {
          // Check if all players have answered the current question
          const response = await fetch('/api/check-all-answered', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              room_id: room.id,
              question_id: currentQuestion.id,
              player_count: players.length
            })
          })

          if (response.ok) {
            const data = await response.json()
            console.log(`🔍 Auto-advance check (trivia): ${data.answered_count}/${data.player_count} answered`)
            if (data.all_answered) {
              console.log('✅ All players answered - auto-advancing to trivia review')
              await handleNextPhase()
            }
          } else {
            console.error('❌ Failed to check all answered:', response.status)
          }
        } else if (isScavenger) {
          // Check if all players have submitted scavenger
          const response = await fetch('/api/check-all-submitted', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              question_id: currentQuestion.id,
              player_count: players.length
            })
          })

          if (response.ok) {
            const data = await response.json()
            console.log(`🔍 Auto-advance check (scavenger): ${data.submitted_count}/${data.player_count} submitted`)
            if (data.all_submitted) {
              console.log('✅ All players submitted scavenger - auto-advancing to review')
              await handleNextPhase()
            }
          } else {
            console.error('❌ Failed to check all submitted:', response.status)
          }
        }
      } catch (error) {
        console.error('Error checking auto-advance:', error)
      }
    }

    // Run immediately on mount
    checkAutoAdvance()

    // Check every 2 seconds
    const interval = setInterval(checkAutoAdvance, 2000)
    return () => clearInterval(interval)
  }, [room, hostKey, currentQuestion, players, isTrivia, isScavenger, handleNextPhase, questionLoadTime])

  const handleStartGame = async () => {
    if (!hostKey) return
    
    try {
      setLoading(true)
      console.log('🎮 Starting game from lobby...', { roomCode, hostKey })
      const result = await startGame(roomCode, hostKey)
      console.log('✅ Game started:', result)
      // The realtime subscription will update the UI automatically
    } catch (error) {
      console.error('❌ Failed to start game:', error)
      alert('Failed to start game. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleRestartGame = async () => {
    if (!hostKey) return
    
    try {
      setLoading(true)
      console.log('🔄 Restarting game (resetting all scores)...', { roomCode, hostKey })
      const result = await restartGame(roomCode, hostKey)
      console.log('✅ Game restarted - returned to lobby with scores reset')
      // The realtime subscription will update the UI automatically
    } catch (error) {
      console.error('❌ Failed to restart game:', error)
      alert('Failed to restart game. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Legacy function for backwards compatibility - now calls handleNextPhase
  const handleNextQuestion = handleNextPhase

  const handleEndGame = async () => {
    // TODO: Implement end game logic
    console.log('End game clicked')
    setShowEndGameModal(false)
  }

  const handleKickPlayer = async (playerId: string) => {
    // TODO: Implement kick player logic
    console.log('Kick player:', playerId)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading room...</p>
        </div>
      </div>
    )
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Room Not Found</h1>
          <button
            onClick={() => router.push('/')}
            className="btn-primary"
          >
            Return Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="card mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 bg-clip-text text-transparent mb-2">{room.title}</h1>
              <div className="flex items-center gap-4 text-sm">
                <span className="bg-purple-900/50 text-purple-300 px-3 py-1 rounded-full font-mono font-bold border border-purple-700">
                  {roomCode}
                </span>
                <span className="text-gray-400">
                  {players.length} {players.length === 1 ? 'player' : 'players'}
                </span>
                {(isTrivia || isScavenger || isReview) && (
                  <span className="text-pink-400">
                    Round {gameState.current_round} / {settings.number_of_rounds}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => router.push('/')}
              className="btn-secondary text-sm"
            >
              Exit Room
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Continue Screen (when rejoining mid-game) */}
            {showContinueScreen && (
              <div className="card text-center">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent mb-4">
                  Game in Progress
                </h2>
                <div className="bg-gray-700/50 rounded-lg p-6 mb-6">
                  <div className="text-gray-300 mb-2">Current Status</div>
                  <div className="text-2xl font-bold text-white mb-1">
                    Round {gameState.current_round} of {settings.number_of_rounds}
                  </div>
                  <div className="text-lg text-gray-400">
                    Question {gameState.current_question} of {settings.questions_per_round}
                  </div>
                  <div className="mt-4 text-sm text-gray-400">
                    Phase: <span className="text-pink-400 capitalize">{gameState.status}</span>
                  </div>
                </div>
                <p className="text-gray-300 mb-6">
                  Click continue to resume the game
                </p>
                <button
                  onClick={() => setShowContinueScreen(false)}
                  className="btn-primary"
                >
                  Continue Game
                </button>
              </div>
            )}

            {/* Lobby State */}
            {!showContinueScreen && isLobby && (
              <div className="card">
                <h2 className="text-2xl font-bold text-white mb-4">Waiting for Players</h2>
                <p className="text-gray-300 mb-6">
                  Share the room code <span className="text-purple-400 font-mono font-bold">{roomCode}</span> with your players.
                  They can join at: <span className="text-pink-400">{typeof window !== 'undefined' ? window.location.origin : ''}/player/join</span>
                </p>
                
                <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-white mb-2">Game Settings</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-400">Rounds:</span>
                      <span className="ml-2 font-semibold text-white">{settings.number_of_rounds}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Questions/Round:</span>
                      <span className="ml-2 font-semibold text-white">{settings.questions_per_round}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Answer Time:</span>
                      <span className="ml-2 font-semibold text-white">{settings.time_per_trivia_question}s</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Scavenger Time:</span>
                      <span className="ml-2 font-semibold text-white">{settings.time_per_scavenger}s</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleStartGame}
                  disabled={players.length === 0}
                  className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {players.length === 0 ? 'Waiting for players...' : 'Start Game'}
                </button>
              </div>
            )}

            {/* Trivia Phase */}
            {!showContinueScreen && isTrivia && currentQuestion && (
              <div className="card">
                {showCountdown ? (
                  /* Countdown Screen */
                  <div className="flex items-center justify-center min-h-[500px]">
                    <div className="text-center">
                      <div className="text-9xl font-bold mb-6 animate-pulse">
                        {countdownValue > 0 ? (
                          <span className="text-purple-400">{countdownValue}</span>
                        ) : (
                          <span className="text-green-400">GO!</span>
                        )}
                      </div>
                      <p className="text-3xl text-gray-400">
                        {countdownValue > 0 ? 'Get Ready...' : 'Question Starting!'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Warning when waiting for submissions */}
                    {waitingForSubmissions && (
                      <div className="mb-4 p-4 bg-yellow-900/30 border border-yellow-600/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl animate-pulse">⚠️</span>
                          <div>
                            <p className="text-yellow-300 font-semibold">No submissions yet</p>
                            <p className="text-yellow-400/80 text-sm">Waiting for at least one player to answer. You can manually advance if needed.</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Timer */}
                    <div className="mb-6">
                      <Timer 
                        seconds={triviaTimer.secondsLeft}
                        totalSeconds={triviaTimer.totalSeconds}
                        isRunning={triviaTimer.isRunning}
                        variant="trivia"
                      />
                    </div>

                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-bold text-white">
                        Question {gameState.current_question} / {settings.questions_per_round}
                      </h2>
                  <div className="text-2xl font-bold text-pink-400">
                    Round {gameState.current_round} / {settings.number_of_rounds}
                  </div>
                </div>

                <div className="bg-gray-700/50 rounded-lg p-12 mb-6 flex items-center justify-center min-h-[300px]">
                  <p className="text-4xl font-bold text-white text-center leading-relaxed">
                    {currentQuestion.stem}
                  </p>
                </div>

                {questionLoadTime && currentTime - questionLoadTime < 5000 && (
                  <div className="mb-4 p-3 bg-yellow-900/30 border border-yellow-600/50 rounded-lg">
                    <p className="text-yellow-300 text-sm text-center">
                      ⏳ Waiting {Math.ceil((5000 - (currentTime - questionLoadTime)) / 1000)}s for all players to load question...
                    </p>
                  </div>
                )}

                <button
                  onClick={handleNextPhase}
                  disabled={isAdvancing || (questionLoadTime ? currentTime - questionLoadTime < 5000 : false)}
                  className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAdvancing ? 'Advancing...' : 'Show Answer'}
                </button>
                  </>
                )}
              </div>
            )}

            {/* Trivia Review Phase - Show Correct Answer */}
            {!showContinueScreen && isTriviaReview && currentQuestion && (
              <div className="card">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-white">
                    Question {gameState.current_question} / {settings.questions_per_round}
                  </h2>
                  <div className="text-2xl font-bold text-pink-400">
                    Round {gameState.current_round} / {settings.number_of_rounds}
                  </div>
                </div>

                <div className="bg-gray-700/50 rounded-lg p-8 mb-6">
                  <p className="text-2xl font-bold text-white text-center mb-8">
                    {currentQuestion.stem}
                  </p>
                  
                  {/* Show only the correct answer */}
                  {currentQuestion.choices?.find((choice: any) => choice.is_correct) && (
                    <div className="bg-green-900/40 border-2 border-green-500 rounded-xl p-6 max-w-2xl mx-auto">
                      <div className="flex items-center justify-center gap-3 mb-3">
                        <span className="text-3xl">✓</span>
                        <span className="text-green-400 font-bold text-lg">Correct Answer</span>
                      </div>
                      <p className="text-3xl font-bold text-green-100 text-center">
                        {(currentQuestion.choices?.find((choice: any) => choice.is_correct) as any)?.label}
                      </p>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleNextPhase}
                  disabled={isAdvancing}
                  className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAdvancing ? 'Advancing...' : 'Start Scavenger Hunt'}
                </button>
              </div>
            )}

            {/* Scavenger Phase */}
            {!showContinueScreen && isScavenger && currentQuestion && (
              <div className="card">
                {/* Timer */}
                <div className="mb-6">
                  <Timer 
                    seconds={scavengerTimer.secondsLeft}
                    totalSeconds={scavengerTimer.totalSeconds}
                    isRunning={scavengerTimer.isRunning}
                    variant="scavenger"
                  />
                </div>

                <h2 className="text-2xl font-bold text-white mb-4">Scavenger Hunt Phase</h2>
                <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl p-6 text-white mb-6">
                  <p className="text-lg font-medium">
                    {(currentQuestion as any).scavenger_instruction || 'Complete the scavenger challenge!'}
                  </p>
                </div>
                <p className="text-gray-300 mb-6">
                  Players are submitting their completions. Timer will auto-advance to review, or click below to start review early.
                </p>
                <button
                  onClick={handleNextPhase}
                  disabled={isAdvancing}
                  className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAdvancing ? 'Advancing...' : 'Start Review Now'}
                </button>
              </div>
            )}

            {/* Review Phase */}
            {!showContinueScreen && isReview && currentQuestion && (
              <div className="space-y-6">
                <ScavengerReview
                  roomCode={roomCode}
                  questionId={currentQuestion.id}
                  scavengerText={(currentQuestion as any).scavenger_instruction || 'Complete the scavenger challenge!'}
                />
                <div className="card">
                  <button
                    onClick={handleNextPhase}
                    disabled={isAdvancing}
                    className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAdvancing ? 'Advancing...' : 'Next Question'}
                  </button>
                </div>
              </div>
            )}

            {/* Round Summary */}
            {!showContinueScreen && isRoundSummary && (
              <div className="card text-center">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent mb-2">
                  Round {gameState.current_round} Complete!
                </h2>
                <p className="text-gray-400 mb-6">Current Standings</p>
                <Leaderboard players={players} maxVisible={10} />
                <div className="mt-6">
                  <button
                    onClick={handleNextPhase}
                    disabled={isAdvancing}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAdvancing ? 'Starting...' : `Start Round ${gameState.current_round + 1}`}
                  </button>
                </div>
              </div>
            )}

            {/* Finished State */}
            {isFinished && (
              <div className="card text-center">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 bg-clip-text text-transparent mb-6">Game Over!</h2>
                <Leaderboard players={players} maxVisible={10} />
                <div className="mt-6 flex gap-4 justify-center">
                  <button
                    onClick={() => router.push('/')}
                    className="btn-secondary"
                  >
                    Exit Room
                  </button>
                  <button
                    onClick={handleRestartGame}
                    className="btn-primary"
                  >
                    Play Again
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Players */}
            <div className="card">
              <h3 className="text-xl font-bold text-white mb-4">Players</h3>
              <PlayerList 
                players={players}
                onKick={isLobby ? handleKickPlayer : undefined}
              />
            </div>

            {/* Quick Actions */}
            {!isFinished && (
              <div className="card">
                <h3 className="text-xl font-bold text-white mb-4">Actions</h3>
                <div className="space-y-2">
                  <button
                    onClick={handleRestartGame}
                    className="btn-secondary w-full text-sm"
                  >
                    Restart Game
                  </button>
                  <button
                    onClick={() => setShowEndGameModal(true)}
                    className="btn-error w-full text-sm"
                  >
                    End Game
                  </button>
                </div>
              </div>
            )}

            {/* Leaderboard Toggle */}
            {!isLobby && !isFinished && !isRoundSummary && (
              <div className="card">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-white">Leaderboard</h3>
                  <button
                    onClick={() => setShowLeaderboard(!showLeaderboard)}
                    className="text-sm px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors"
                  >
                    {showLeaderboard ? 'Hide' : 'Show'}
                  </button>
                </div>
                {showLeaderboard && (
                  <Leaderboard players={players} maxVisible={10} />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirm End Game Modal */}
      <ConfirmModal
        isOpen={showEndGameModal}
        title="End Game?"
        message="Are you sure you want to end the game? This cannot be undone."
        confirmText="End Game"
        onConfirm={handleEndGame}
        onCancel={() => setShowEndGameModal(false)}
      />
    </div>
  )
}
