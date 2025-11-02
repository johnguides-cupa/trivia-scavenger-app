'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getClientUUID, sanitizeDisplayName } from '@/lib/utils'
import { joinRoom } from '@/app/actions'

export default function JoinPage() {
  const router = useRouter()
  const [roomCode, setRoomCode] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [clientUuid, setClientUuid] = useState('')

  useEffect(() => {
    setClientUuid(getClientUUID())
    
    // Load saved display name if exists
    const savedName = localStorage.getItem('player_display_name')
    if (savedName) {
      setDisplayName(savedName)
    }
  }, [])

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!roomCode.trim() || !displayName.trim()) {
      setError('Please enter both room code and display name')
      return
    }

    setIsLoading(true)

    try {
      const sanitized = sanitizeDisplayName(displayName)
      const response = await joinRoom({
        room_code: roomCode.toUpperCase(),
        client_uuid: clientUuid,
        display_name: sanitized,
      })

      // Save display name for future sessions
      localStorage.setItem('player_display_name', sanitized)
      localStorage.setItem(`player_id_${response.room.id}`, response.player.id)

      // Navigate to player room
      router.push(`/player/${response.room.room_code}`)
    } catch (err: any) {
      setError(err.message || 'Failed to join room. Please check the room code.')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8 animate-fadeIn">
          <h1 className="text-4xl md:text-5xl font-bold font-display mb-2">
            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">Join Game</span>
          </h1>
          <p className="text-gray-400">Enter the room code to start playing</p>
        </div>

        {/* Join Form */}
        <div className="card animate-slideIn">
          <form onSubmit={handleJoin} className="space-y-6">
            {/* Room Code Input */}
            <div>
              <label htmlFor="roomCode" className="block text-sm font-semibold text-white mb-2">
                Room Code
              </label>
              <input
                id="roomCode"
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                maxLength={6}
                className="input text-center text-2xl font-bold tracking-wider uppercase"
                disabled={isLoading}
                autoComplete="off"
              />
              <p className="text-xs text-gray-500 mt-1">6-character code from your host</p>
            </div>

            {/* Display Name Input */}
            <div>
              <label htmlFor="displayName" className="block text-sm font-semibold text-white mb-2">
                Your Name
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
                maxLength={20}
                className="input"
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500 mt-1">This is how other players will see you</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !roomCode.trim() || !displayName.trim()}
              className="btn-primary w-full text-lg"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Joining...
                </span>
              ) : (
                'Join Game'
              )}
            </button>
          </form>
        </div>

        {/* Back Link */}
        <div className="text-center mt-6">
          <a href="/" className="text-sm text-gray-400 hover:text-purple-400 transition-colors">
            ← Back to Home
          </a>
        </div>

        {/* Device Info */}
        <div className="mt-8 p-4 bg-blue-900/50 border border-blue-700 rounded-lg text-sm text-blue-300">
          <div className="flex gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="font-semibold mb-1">Mobile Tip</p>
              <p className="text-xs">Use portrait mode for the best experience. Keep this tab open during the game!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
