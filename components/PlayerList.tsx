'use client'

import type { Player } from '@/types'

interface PlayerListProps {
  players: Player[]
  showPoints?: boolean
  onKick?: (playerId: string) => void | Promise<void>
}

export function PlayerList({ players, showPoints = false, onKick }: PlayerListProps) {
  const connectedPlayers = players.filter(p => p.connected)
  const disconnectedPlayers = players.filter(p => !p.connected)

  return (
    <div className="space-y-4">
      {/* Connected Players */}
      {connectedPlayers.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Connected ({connectedPlayers.length})
          </h3>
          <div className="space-y-2">
            {connectedPlayers.map(player => (
              <div
                key={player.id}
                className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg border border-gray-600 shadow-sm"
              >
                {/* Status Indicator */}
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />

                {/* Player Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white truncate">
                    {player.display_name}
                  </div>
                </div>

                {/* Points (if shown) */}
                {showPoints && (
                  <div className="text-right">
                    <div className="text-lg font-bold text-purple-400">
                      {player.points}
                    </div>
                    <div className="text-xs text-gray-400">pts</div>
                  </div>
                )}

                {/* Kick Button (only in lobby) */}
                {onKick && (
                  <button
                    onClick={() => onKick(player.id)}
                    className="text-red-500 hover:text-red-700 text-sm font-medium"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disconnected Players */}
      {disconnectedPlayers.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Disconnected ({disconnectedPlayers.length})
          </h3>
          <div className="space-y-2">
            {disconnectedPlayers.map(player => (
              <div
                key={player.id}
                className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg border border-gray-700 opacity-50"
              >
                {/* Status Indicator */}
                <div className="w-3 h-3 bg-gray-500 rounded-full" />

                {/* Player Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-300 truncate">
                    {player.display_name}
                  </div>
                </div>

                {/* Points (if shown) */}
                {showPoints && (
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-400">
                      {player.points}
                    </div>
                    <div className="text-xs text-gray-500">pts</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {players.length === 0 && (
        <div className="text-center text-gray-400 py-8">
          No players have joined yet
        </div>
      )}
    </div>
  )
}

export default PlayerList
