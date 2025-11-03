'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Room, Player, Question } from '@/types'
import { useRealtime } from '@/hooks/useRealtime'
import { useGameTimer } from '@/hooks/useGameTimer'
import { Leaderboard } from '@/components/Leaderboard'
import { Timer } from '@/components/Timer'
import ScavengerSubmit from '@/components/ScavengerSubmit'
import { submitAnswer } from '@/app/actions'

export default function PlayerRoom() {
  const params = useParams()
  const router = useRouter()
  const roomCode = params.room_code as string
  
  const [room, setRoom] = useState<Room | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [hasAnswered, setHasAnswered] = useState(false)
  const [showContinueScreen, setShowContinueScreen] = useState(false)
  const [hostDisconnected, setHostDisconnected] = useState(false)
  const [questionStartTime, setQuestionStartTime] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Calculate game state variables for hooks (must be before any returns)
  const gameState = room?.game_state as any
  const settings = room?.settings as any
  const isLobby = gameState?.status === 'lobby'
  const isTrivia = gameState?.status === 'trivia'
  const isScavenger = gameState?.status === 'scavenger'
  const isReview = gameState?.status === 'review'
  const isFinished = gameState?.status === 'finished'

  // Timer for trivia question - MUST be called unconditionally
  const triviaTimer = useGameTimer({
    startTime: gameState?.question_start_time || null,
    duration: settings?.time_per_trivia_question || 30,
    enabled: isTrivia && !!currentQuestion && !hasAnswered && !!room,
    onComplete: () => {
      // Time's up - mark as answered even if they didn't submit
      if (!hasAnswered) {
        setHasAnswered(true)
      }
    },
  })

  // Timer for scavenger phase - MUST be called unconditionally
  const scavengerTimer = useGameTimer({
    startTime: gameState?.scavenger_start_time || null,
    duration: settings?.time_per_scavenger || 60,
    enabled: isScavenger && !!currentQuestion && !!room,
    onComplete: () => {
      // Scavenger time is up
      console.log('⏰ Scavenger time expired')
    },
  })

  // Subscribe to realtime updates
  useRealtime(roomCode, (updatedRoom, updatedPlayers) => {
    console.log('👤 [PLAYER] Realtime update:', { 
      gameState: updatedRoom?.game_state,
      playersCount: updatedPlayers.length 
    })
    
    // Check host presence
    if (updatedRoom) {
      const gameState = updatedRoom.game_state as any
      const isGameActive = !['lobby', 'finished'].includes(gameState?.status)
      
      if (isGameActive && updatedRoom.last_host_ping) {
        const lastPing = new Date(updatedRoom.last_host_ping).getTime()
        const now = Date.now()
        const timeSinceLastPing = now - lastPing
        
        // If no ping for more than 10 seconds, consider host disconnected
        if (timeSinceLastPing > 10000) {
          setHostDisconnected(true)
        } else {
          setHostDisconnected(false)
        }
      } else {
        setHostDisconnected(false)
      }
    }
    
    // If we receive an update while continue screen is showing, dismiss it
    // This happens when host continues or game progresses
    if (showContinueScreen && updatedRoom) {
      console.log('👤 [PLAYER] Dismissing continue screen due to game update')
      setShowContinueScreen(false)
    }
    
    setRoom(updatedRoom)
    setPlayers(updatedPlayers)
    
    // Update current player info
    if (typeof window !== 'undefined' && updatedRoom) {
      const playerId = localStorage.getItem(`player_id_${updatedRoom.id}`)
      const player = updatedPlayers.find(p => p.id === playerId)
      if (player) {
        setCurrentPlayer(player)
      }

      // Load current question if playing trivia
      const gameState = updatedRoom.game_state as any
      if (gameState?.status === 'trivia') {
        console.log('👤 [PLAYER] Loading question:', { 
          roomId: updatedRoom.id, 
          round: gameState.current_round, 
          question: gameState.current_question 
        })
        
        loadCurrentQuestion(updatedRoom.id, gameState.current_round, gameState.current_question)
        // Reset answer state for new question
        const questionKey = `${gameState.current_round}-${gameState.current_question}`
        const lastQuestionKey = localStorage.getItem(`last_question_${updatedRoom.id}`)
        if (questionKey !== lastQuestionKey) {
          // New question - check if already answered
          const hasAnsweredKey = `answered_${updatedRoom.id}_${questionKey}`
          const alreadyAnswered = localStorage.getItem(hasAnsweredKey)
          setHasAnswered(!!alreadyAnswered)
          setSelectedAnswer(null)
          
          // Set question start time for time-based scoring (only if not already answered)
          if (!alreadyAnswered) {
            setQuestionStartTime(Date.now())
          }
          
          localStorage.setItem(`last_question_${updatedRoom.id}`, questionKey)
        }
      }
    }
  })

  // Load current question
  const loadCurrentQuestion = async (roomId: string, round: number, questionNum: number) => {
    try {
      const response = await fetch('/api/question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_id: roomId, round_number: round, question_number: questionNum }),
      })

      if (response.ok) {
        const data = await response.json()
        setCurrentQuestion(data.question)
      }
    } catch (error) {
      console.error('Failed to load question:', error)
    }
  }

  const handleSubmitAnswer = async (choiceId: string) => {
    if (!currentPlayer || !currentQuestion || hasAnswered || !room) return

    setSubmitting(true)
    setSelectedAnswer(choiceId)

    // Calculate elapsed time in milliseconds
    const elapsedMs = questionStartTime ? Date.now() - questionStartTime : 0
    
    console.log('👤 [PLAYER] Submitting answer:', {
      choice: choiceId,
      elapsedMs,
      elapsedSeconds: (elapsedMs / 1000).toFixed(2)
    })

    try {
      await submitAnswer({
        room_id: room.id,
        player_id: currentPlayer.id,
        question_id: currentQuestion.id,
        answer_choice_id: choiceId,
        answer_time_ms: elapsedMs,
      })

      setHasAnswered(true)
      
      // Save that we answered this question in localStorage
      if (typeof window !== 'undefined') {
        const gameState = room.game_state as any
        const questionId = `${gameState.current_round}-${gameState.current_question}`
        const hasAnsweredKey = `answered_${room.id}_${questionId}`
        localStorage.setItem(hasAnsweredKey, 'true')
      }
    } catch (error) {
      console.error('Failed to submit answer:', error)
      alert('Failed to submit answer. Please try again.')
      setSelectedAnswer(null)
    } finally {
      setSubmitting(false)
    }
  }

  // Load initial data
  useEffect(() => {
    if (!roomCode) {
      router.push('/player/join')
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
          console.log('👤 [PLAYER] Rejoining mid-game, showing continue screen')
          setShowContinueScreen(true)
        }

        // Find current player
        if (typeof window !== 'undefined') {
          const playerId = localStorage.getItem(`player_id_${data.room.id}`)
          const player = data.players?.find((p: Player) => p.id === playerId)
          if (player) {
            setCurrentPlayer(player)
          }
        }

        // If game is already playing trivia, load the current question
        if (gameState?.status === 'trivia') {
          console.log('👤 [PLAYER] Game already playing, loading question...')
          await loadCurrentQuestion(data.room.id, gameState.current_round, gameState.current_question)
          
          // Check if player already answered this question
          if (typeof window !== 'undefined') {
            const playerId = localStorage.getItem(`player_id_${data.room.id}`)
            if (playerId) {
              const questionId = `${gameState.current_round}-${gameState.current_question}`
              const hasAnsweredKey = `answered_${data.room.id}_${questionId}`
              const alreadyAnswered = localStorage.getItem(hasAnsweredKey)
              if (alreadyAnswered) {
                setHasAnswered(true)
                console.log('👤 [PLAYER] Already answered this question')
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to load room:', error)
        router.push('/player/join')
      } finally {
        setLoading(false)
      }
    }

    loadRoom()
  }, [roomCode, router])

  // Fallback polling if realtime doesn't work
  useEffect(() => {
    if (!roomCode || !room) return
    
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch('/api/room', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ room_code: roomCode }),
        })
        
        if (response.ok) {
          const data = await response.json()
          setRoom(data.room)
          setPlayers(data.players || [])
          
          // Check host presence
          const pollGameState = data.room.game_state as any
          const isGameActive = !['lobby', 'finished'].includes(pollGameState?.status)
          
          if (isGameActive && data.room.last_host_ping) {
            const lastPing = new Date(data.room.last_host_ping).getTime()
            const now = Date.now()
            const timeSinceLastPing = now - lastPing
            
            if (timeSinceLastPing > 10000) {
              setHostDisconnected(true)
            } else {
              setHostDisconnected(false)
            }
          } else if (!isGameActive) {
            setHostDisconnected(false)
          }
          
          // Update current player
          if (typeof window !== 'undefined') {
            const playerId = localStorage.getItem(`player_id_${data.room.id}`)
            const player = data.players?.find((p: Player) => p.id === playerId)
            if (player) {
              setCurrentPlayer(player)
            }
          }
          
          // Load question if playing trivia
          const pollGameState2 = data.room.game_state as any
          if (pollGameState2?.status === 'trivia' && !currentQuestion) {
            loadCurrentQuestion(data.room.id, pollGameState2.current_round, pollGameState2.current_question)
          }
        }
      } catch (error) {
        // Ignore polling errors
      }
    }, 2000)
    
    return () => clearInterval(pollInterval)
  }, [roomCode, room, currentQuestion])

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
            onClick={() => router.push('/player/join')}
            className="btn-primary"
          >
            Join Another Room
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-xl p-6 mb-6">
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
              </div>
            </div>
            {currentPlayer && (
              <div className="text-right">
                <p className="text-sm text-gray-400">You are</p>
                <p className="text-xl font-bold text-purple-400">{currentPlayer.display_name}</p>
              </div>
            )}
          </div>
        </div>

        {/* Host Disconnected Screen - shows when host exits/refreshes during active game */}
        {hostDisconnected && !showContinueScreen && (
          <div className="card text-center max-w-2xl mx-auto">
            <div className="mb-6">
              <div className="text-6xl mb-4 animate-pulse">⏸️</div>
              <h2 className="text-3xl font-bold text-white mb-2">Host Disconnected</h2>
              <p className="text-gray-400">Waiting for host to return...</p>
            </div>

            <div className="bg-gray-700/50 rounded-lg p-6 mb-6 space-y-3">
              <div className="text-gray-300">
                <span className="text-gray-500">Round:</span>{' '}
                <span className="text-white font-semibold">
                  {gameState?.current_round} of {settings?.number_of_rounds}
                </span>
              </div>
              <div className="text-gray-300">
                <span className="text-gray-500">Question:</span>{' '}
                <span className="text-white font-semibold">
                  {gameState?.current_question} of {settings?.questions_per_round}
                </span>
              </div>
              <div className="text-gray-300">
                <span className="text-gray-500">Phase:</span>{' '}
                <span className="text-orange-400 font-semibold capitalize">
                  {gameState?.status}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-orange-400">
              <div className="animate-pulse">⚠️</div>
              <span className="text-sm font-semibold">Game paused - Host will return shortly</span>
            </div>
          </div>
        )}

        {/* Continue Screen - shows when rejoining mid-game */}
        {showContinueScreen && (
          <div className="card text-center max-w-2xl mx-auto">
            <div className="mb-6">
              <div className="inline-block bg-purple-900/50 border border-purple-700 rounded-full px-6 py-2 mb-4">
                <span className="text-purple-300 font-semibold">Game in Progress</span>
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Waiting to Resume...</h2>
              <p className="text-gray-400">The host will continue the game shortly</p>
            </div>

            <div className="bg-gray-700/50 rounded-lg p-6 mb-6 space-y-3">
              <div className="text-gray-300">
                <span className="text-gray-500">Round:</span>{' '}
                <span className="text-white font-semibold">
                  {gameState?.current_round} of {settings?.number_of_rounds}
                </span>
              </div>
              <div className="text-gray-300">
                <span className="text-gray-500">Question:</span>{' '}
                <span className="text-white font-semibold">
                  {gameState?.current_question} of {settings?.questions_per_round}
                </span>
              </div>
              <div className="text-gray-300">
                <span className="text-gray-500">Phase:</span>{' '}
                <span className="text-purple-400 font-semibold capitalize">
                  {gameState?.status}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-gray-400">
              <div className="animate-pulse">●</div>
              <span className="text-sm">Waiting for host...</span>
            </div>
          </div>
        )}

        {/* Lobby State */}
        {!showContinueScreen && !hostDisconnected && isLobby && (
          <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-xl p-8 text-center">
            <div className="mb-8">
              <div className="animate-pulse text-6xl mb-4">⏳</div>
              <h2 className="text-2xl font-bold text-white mb-2">Waiting to Start</h2>
              <p className="text-gray-400">
                The host will start the game soon...
              </p>
            </div>

            <div className="bg-gray-700/50 rounded-lg p-6">
              <h3 className="font-semibold text-white mb-4">Players in Lobby</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {players.map((player) => (
                  <div
                    key={player.id}
                    className={`p-3 rounded-lg border-2 ${
                      player.id === currentPlayer?.id
                        ? 'border-purple-500 bg-purple-900/30'
                        : 'border-gray-600 bg-gray-800'
                    }`}
                  >
                    <p className="font-semibold text-white truncate">{player.display_name}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Trivia Phase */}
        {!showContinueScreen && !hostDisconnected && isTrivia && currentQuestion && (
          <div className="space-y-6">
            <div className="card">
              {/* Timer */}
              {!hasAnswered && (
                <div className="mb-6">
                  <Timer 
                    seconds={triviaTimer.secondsLeft}
                    totalSeconds={triviaTimer.totalSeconds}
                    isRunning={triviaTimer.isRunning}
                    variant="trivia"
                  />
                </div>
              )}

              <div className="text-center mb-6">
                <div className="text-sm text-gray-400 mb-2">
                  Round {(room.game_state as any).current_round} • Question {(room.game_state as any).current_question}
                </div>
                <h2 className="text-2xl font-bold text-white mb-4">{currentQuestion.stem}</h2>
              </div>

              {!hasAnswered ? (
                <div className="space-y-3">
                  {(currentQuestion.choices as any[])?.map((choice) => (
                    <button
                      key={choice.id}
                      onClick={() => handleSubmitAnswer(choice.id)}
                      disabled={submitting}
                      className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                        selectedAnswer === choice.id
                          ? 'border-purple-500 bg-purple-900/30 text-white'
                          : 'border-gray-600 bg-gray-700 hover:border-purple-500/50 hover:bg-gray-600 text-white'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <span className="font-semibold text-lg">{choice.label}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">✓</div>
                  <h3 className="text-2xl font-bold text-green-400 mb-2">Answer Submitted!</h3>
                  <p className="text-gray-400">
                    Waiting for other players...
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Scavenger Phase */}
        {!showContinueScreen && !hostDisconnected && isScavenger && currentQuestion && currentPlayer && (
          <div className="space-y-6">
            {/* Scavenger Timer */}
            <div className="card">
              <Timer 
                seconds={scavengerTimer.secondsLeft}
                totalSeconds={scavengerTimer.totalSeconds}
                isRunning={scavengerTimer.isRunning}
                variant="scavenger"
              />
            </div>

            <div className="flex justify-center">
              <ScavengerSubmit
                roomCode={roomCode}
                playerId={currentPlayer.id}
                questionId={currentQuestion.id}
                scavengerText={(currentQuestion as any).scavenger_instruction || 'Complete the scavenger challenge!'}
              />
            </div>
          </div>
        )}

        {/* Review Phase (Host is reviewing submissions) */}
        {!showContinueScreen && !hostDisconnected && isReview && (
          <div className="card text-center">
            <div className="mb-8">
              <div className="animate-pulse text-6xl mb-4">👀</div>
              <h2 className="text-2xl font-bold text-white mb-2">Host is Reviewing</h2>
              <p className="text-gray-400">
                Submissions are being approved or rejected...
              </p>
            </div>
          </div>
        )}

        {/* Finished State */}
        {!showContinueScreen && !hostDisconnected && isFinished && (
          <div className="card text-center">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 bg-clip-text text-transparent mb-6">Game Over!</h2>
            
            <p className="text-xl text-gray-300 mb-8">
              Great job {currentPlayer?.display_name}! 🎉
            </p>

            <div className="mt-8">
              <button
                onClick={() => router.push('/player/join')}
                className="btn-secondary"
              >
                Join Another Game
              </button>
            </div>
          </div>
        )}

        {/* Exit Button */}
        <div className="text-center mt-6">
          <button
            onClick={() => router.push('/player/join')}
            className="text-gray-400 hover:text-purple-400 transition-colors text-sm"
          >
            ← Leave Room
          </button>
        </div>
      </div>
    </div>
  )
}
