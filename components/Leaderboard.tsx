'use client'

import type { Player } from '@/types'

interface LeaderboardProps {
  players: Player[]
  currentPlayerId?: string
  maxVisible?: number
}

export function Leaderboard({ players, currentPlayerId, maxVisible }: LeaderboardProps) {
  const sortedPlayers = [...players].sort((a, b) => (b.points || 0) - (a.points || 0))
  const displayPlayers = maxVisible ? sortedPlayers.slice(0, maxVisible) : sortedPlayers

  return (
    <div className="space-y-3">
      {displayPlayers.map((player, index) => {
        const isCurrentPlayer = player.id === currentPlayerId
        const isTopThree = index < 3

        return (
          <div
            key={player.id}
            className={`
              flex items-center gap-4 p-4 rounded-lg transition-all
              ${isCurrentPlayer ? 'bg-purple-900/30 border-2 border-purple-500 scale-105' : 'bg-gray-800 border border-gray-700'}
              ${isTopThree ? 'shadow-md' : 'shadow-sm'}
            `}
          >
            {/* Rank Badge */}
            <div className={`
              flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold
              ${index === 0 ? 'bg-yellow-500 text-white text-lg' : ''}
              ${index === 1 ? 'bg-gray-400 text-white text-lg' : ''}
              ${index === 2 ? 'bg-orange-500 text-white text-lg' : ''}
              ${index > 2 ? 'bg-gray-700 text-gray-400 text-sm' : ''}
            `}>
              {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
            </div>

            {/* Player Name */}
            <div className="flex-1 min-w-0">
              <div className={`font-semibold truncate ${
                isCurrentPlayer ? 'text-purple-400' : 'text-white'
              }`}>
                {player.display_name}
                {isCurrentPlayer && <span className="ml-2 text-xs text-pink-400">(You)</span>}
              </div>
            </div>

            {/* Points */}
            <div className={`text-right font-bold text-xl ${
              isCurrentPlayer ? 'text-purple-400' : 'text-white'
            }`}>
              {player.points || 0}
            </div>
          </div>
        )
      })}

      {displayPlayers.length === 0 && (
        <div className="text-center text-gray-400 py-8">
          No players yet
        </div>
      )}
    </div>
  )
}

export default Leaderboard
