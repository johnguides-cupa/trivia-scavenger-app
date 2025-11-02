'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getClientUUID } from '@/lib/utils'
import { getUserRooms } from '@/app/actions'

export default function HomePage() {
  const router = useRouter()
  const [clientUuid, setClientUuid] = useState('')
  const [mounted, setMounted] = useState(false)
  const [savedRooms, setSavedRooms] = useState<any[]>([])
  const [loadingRooms, setLoadingRooms] = useState(true)

  const loadRooms = async (uuid: string) => {
    setLoadingRooms(true)
    try {
      console.log('🔍 Loading rooms for UUID:', uuid)
      const rooms = await getUserRooms(uuid)
      console.log('✅ Loaded rooms:', rooms)
      setSavedRooms(rooms)
    } catch (error) {
      console.error('❌ Error loading rooms:', error)
      setSavedRooms([])
    } finally {
      setLoadingRooms(false)
    }
  }

  useEffect(() => {
    setMounted(true)
    const uuid = getClientUUID()
    setClientUuid(uuid)
    loadRooms(uuid)

    // Reload rooms when page becomes visible (e.g., when navigating back)
    const handleVisibilityChange = () => {
      if (!document.hidden && uuid) {
        console.log('👀 Page visible, refreshing rooms...')
        loadRooms(uuid)
      }
    }

    // Also reload when window gains focus
    const handleFocus = () => {
      if (uuid) {
        console.log('🎯 Window focused, refreshing rooms...')
        loadRooms(uuid)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  const handleRoomClick = (room: any) => {
    const roomCode = room.room_code
    if (room.role === 'host') {
      // Check if we have the host key
      const hostKey = typeof window !== 'undefined' 
        ? localStorage.getItem(`host_key_${roomCode}`)
        : null
      
      if (hostKey) {
        router.push(`/host/${roomCode}`)
      } else {
        alert('Host key not found. Please create a new room.')
      }
    } else {
      router.push(`/player/${roomCode}`)
    }
  }

  const getStatusBadge = (gameState: any) => {
    const status = gameState?.status || 'lobby'
    const colors: Record<string, string> = {
      lobby: 'bg-blue-900/50 text-blue-300 border border-blue-700',
      trivia: 'bg-green-900/50 text-green-300 border border-green-700',
      scavenger: 'bg-purple-900/50 text-purple-300 border border-purple-700',
      review: 'bg-yellow-900/50 text-yellow-300 border border-yellow-700',
      finished: 'bg-gray-700 text-gray-300 border border-gray-600',
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colors[status] || colors.lobby}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  if (!mounted) {
    return null // Prevent hydration mismatch
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-900">
      <div className="max-w-4xl w-full">
        {/* Hero Section */}
        <div className="text-center mb-12 animate-fadeIn">
          <h1 className="text-6xl md:text-8xl font-bold font-display mb-8">
            <span className="bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 text-transparent bg-clip-text">
              Trivia
            </span>
            <br />
            <span className="bg-gradient-to-r from-cyan-400 to-blue-500 text-transparent bg-clip-text">
              Scavenger
            </span>
          </h1>
        </div>

        {/* Action Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Host Card */}
          <Link href="/host/create" className="card-hover group bg-gray-800 border-gray-700">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold font-display text-white mb-2">
                Host a Game
              </h2>
              <p className="text-gray-400 mb-4">
                Create a room & invite friends
              </p>
            </div>
          </Link>

          {/* Player Card */}
          <Link href="/player/join" className="card-hover group bg-gray-800 border-gray-700">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold font-display text-white mb-2">
                Join a Game
              </h2>
              <p className="text-gray-400 mb-4">
                Enter a room code & play
              </p>
            </div>
          </Link>
        </div>

        {/* Saved Rooms Section */}
        {loadingRooms && (
          <div className="card mb-8 animate-pulse bg-gray-800 border-gray-700">
            <div className="h-4 bg-gray-700 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              <div className="h-20 bg-gray-700 rounded"></div>
              <div className="h-20 bg-gray-700 rounded"></div>
            </div>
          </div>
        )}

        {!loadingRooms && savedRooms.length > 0 && (
          <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-xl p-8 mb-8 animate-slideIn">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">
                Your Recent Rooms
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-400">{savedRooms.length} room{savedRooms.length !== 1 ? 's' : ''}</span>
                <button
                  onClick={() => loadRooms(clientUuid)}
                  className="text-sm text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1"
                  disabled={loadingRooms}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              </div>
            </div>
            <div className="space-y-3">
              {savedRooms.map((room: any) => (
                <button
                  key={room.id}
                  onClick={() => handleRoomClick(room)}
                  className="w-full text-left p-4 bg-gray-700/50 hover:bg-gray-700 rounded-lg border border-gray-600 transition-colors group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-white group-hover:text-purple-400 transition-colors">
                          {room.title || 'Trivia Scavenger Game'}
                        </h4>
                        {getStatusBadge(room.game_state)}
                      </div>
                      <p className="text-sm text-gray-300">
                        Room Code: <span className="font-mono font-bold text-purple-400">{room.room_code}</span>
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        room.role === 'host' 
                          ? 'bg-purple-900/50 text-purple-300 border border-purple-700' 
                          : 'bg-cyan-900/50 text-cyan-300 border border-cyan-700'
                      }`}>
                        {room.role === 'host' ? '👑 Host' : '👤 Player'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(room.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {room.game_state?.status && (
                    <div className="text-xs text-gray-400">
                      {room.game_state.status === 'lobby' && 'Waiting for players...'}
                      {room.game_state.status === 'trivia' && `Round ${room.game_state.current_round}, Question ${room.game_state.current_question}`}
                      {room.game_state.status === 'scavenger' && 'Scavenger hunt in progress'}
                      {room.game_state.status === 'review' && 'Reviewing submissions'}
                      {room.game_state.status === 'finished' && 'Game completed 🎉'}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Features Section */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-xl p-8 animate-slideIn">
          <h3 className="text-lg font-bold text-white mb-4 text-center">
            How It Works
          </h3>
          <div className="grid sm:grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-3xl mb-2">🎯</div>
              <h4 className="font-semibold text-white mb-1">Answer Trivia</h4>
              <p className="text-sm text-gray-400">Faster answers = more points!</p>
            </div>
            <div>
              <div className="text-3xl mb-2">🏃</div>
              <h4 className="font-semibold text-white mb-1">Scavenger Hunt</h4>
              <p className="text-sm text-gray-400">Complete silly challenges</p>
            </div>
            <div>
              <div className="text-3xl mb-2">🏆</div>
              <h4 className="font-semibold text-white mb-1">Win Points</h4>
              <p className="text-sm text-gray-400">Top the leaderboard!</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>Your session ID: <code className="bg-gray-100 px-2 py-1 rounded text-xs">{clientUuid.slice(0, 8)}...</code></p>
          <p className="mt-2">Powered by Next.js + Supabase</p>
        </div>
      </div>
    </div>
  )
}
