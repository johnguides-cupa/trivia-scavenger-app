'use client'

import { useAudio } from '@/hooks/useAudio'

export function AudioControls() {
  const {
    isMusicPlaying,
    isMusicMuted,
    areSoundEffectsMuted,
    toggleMusic,
    toggleMusicMute,
    toggleSoundEffects,
  } = useAudio()

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-3 space-y-2 z-50">
      <div className="text-xs font-semibold text-gray-700 mb-2">Audio Controls</div>
      
      {/* Music Toggle */}
      <button
        onClick={toggleMusic}
        className="flex items-center gap-2 w-full px-3 py-2 rounded hover:bg-gray-100 transition-colors"
        title={isMusicPlaying ? 'Pause music' : 'Play music'}
      >
        <span className="text-lg">{isMusicPlaying ? '⏸️' : '▶️'}</span>
        <span className="text-sm">{isMusicPlaying ? 'Pause' : 'Play'} Music</span>
      </button>

      {/* Music Mute */}
      <button
        onClick={toggleMusicMute}
        className="flex items-center gap-2 w-full px-3 py-2 rounded hover:bg-gray-100 transition-colors"
        title={isMusicMuted ? 'Unmute music' : 'Mute music'}
      >
        <span className="text-lg">{isMusicMuted ? '🔇' : '🎵'}</span>
        <span className="text-sm">Music {isMusicMuted ? 'Off' : 'On'}</span>
      </button>

      {/* Sound Effects Mute */}
      <button
        onClick={toggleSoundEffects}
        className="flex items-center gap-2 w-full px-3 py-2 rounded hover:bg-gray-100 transition-colors"
        title={areSoundEffectsMuted ? 'Enable sound effects' : 'Disable sound effects'}
      >
        <span className="text-lg">{areSoundEffectsMuted ? '🔕' : '🔔'}</span>
        <span className="text-sm">Sounds {areSoundEffectsMuted ? 'Off' : 'On'}</span>
      </button>
    </div>
  )
}

export default AudioControls
