'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { AudioControls } from '@/types'

/**
 * Custom hook for managing game audio
 * Handles background music and sound effects with user controls
 */
export function useAudio(): AudioControls {
  const [isMusicPlaying, setIsMusicPlaying] = useState(false)
  const [isMusicMuted, setIsMusicMuted] = useState(false)
  const [areSoundEffectsMuted, setAreSoundEffectsMuted] = useState(false)

  // Audio context refs
  const audioContextRef = useRef<AudioContext | null>(null)
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null)

  // Initialize audio on first user interaction
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Check localStorage for saved preferences
    const savedMusicMuted = localStorage.getItem('music_muted') === 'true'
    const savedEffectsMuted = localStorage.getItem('effects_muted') === 'true'
    
    setIsMusicMuted(savedMusicMuted)
    setAreSoundEffectsMuted(savedEffectsMuted)

    // Create Audio Context
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext
    if (AudioContext) {
      audioContextRef.current = new AudioContext()
    }

    return () => {
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.pause()
        backgroundMusicRef.current = null
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  // Toggle background music playback
  const toggleMusic = useCallback(() => {
    if (!backgroundMusicRef.current) {
      // Create background music element
      // In a real app, you'd load an actual audio file
      // For now, we'll use a data URI or Web Audio API to generate simple tones
      backgroundMusicRef.current = new Audio()
      backgroundMusicRef.current.loop = true
      backgroundMusicRef.current.volume = 0.3
      // Note: You would set .src to your actual music file here
      // backgroundMusicRef.current.src = '/audio/background-music.mp3'
    }

    if (isMusicPlaying) {
      backgroundMusicRef.current.pause()
      setIsMusicPlaying(false)
    } else {
      // Resume AudioContext if suspended (browser autoplay policy)
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume()
      }
      
      backgroundMusicRef.current.play().catch((error) => {
        console.warn('Could not play background music:', error)
      })
      setIsMusicPlaying(true)
    }
  }, [isMusicPlaying])

  // Toggle music mute
  const toggleMusicMute = useCallback(() => {
    const newMuted = !isMusicMuted
    setIsMusicMuted(newMuted)
    localStorage.setItem('music_muted', String(newMuted))

    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.muted = newMuted
    }
  }, [isMusicMuted])

  // Toggle sound effects mute
  const toggleSoundEffects = useCallback(() => {
    const newMuted = !areSoundEffectsMuted
    setAreSoundEffectsMuted(newMuted)
    localStorage.setItem('effects_muted', String(newMuted))
  }, [areSoundEffectsMuted])

  // Play countdown beep
  const playCountdown = useCallback(() => {
    if (areSoundEffectsMuted || !audioContextRef.current) return

    const ctx = audioContextRef.current
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.frequency.value = 800 // Beep frequency
    oscillator.type = 'sine'

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.1)
  }, [areSoundEffectsMuted])

  // Play correct answer chime
  const playCorrect = useCallback(() => {
    if (areSoundEffectsMuted || !audioContextRef.current) return

    const ctx = audioContextRef.current
    
    // Play ascending notes for correct answer
    const frequencies = [523.25, 659.25, 783.99] // C, E, G (major chord)
    
    frequencies.forEach((freq, index) => {
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      oscillator.frequency.value = freq
      oscillator.type = 'sine'

      const startTime = ctx.currentTime + index * 0.1
      gainNode.gain.setValueAtTime(0.2, startTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2)

      oscillator.start(startTime)
      oscillator.stop(startTime + 0.2)
    })
  }, [areSoundEffectsMuted])

  // Play wrong answer sound
  const playWrong = useCallback(() => {
    if (areSoundEffectsMuted || !audioContextRef.current) return

    const ctx = audioContextRef.current
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.frequency.value = 200 // Lower frequency for wrong
    oscillator.type = 'sawtooth'

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.3)
  }, [areSoundEffectsMuted])

  // Play leaderboard reveal sound
  const playLeaderboard = useCallback(() => {
    if (areSoundEffectsMuted || !audioContextRef.current) return

    const ctx = audioContextRef.current
    
    // Play celebratory arpeggio
    const frequencies = [523.25, 659.25, 783.99, 1046.50] // C, E, G, C (octave up)
    
    frequencies.forEach((freq, index) => {
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      oscillator.frequency.value = freq
      oscillator.type = 'triangle'

      const startTime = ctx.currentTime + index * 0.08
      gainNode.gain.setValueAtTime(0.25, startTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.25)

      oscillator.start(startTime)
      oscillator.stop(startTime + 0.25)
    })
  }, [areSoundEffectsMuted])

  return {
    isMusicPlaying,
    isMusicMuted,
    areSoundEffectsMuted,
    toggleMusic,
    toggleMusicMute,
    toggleSoundEffects,
    playCountdown,
    playCorrect,
    playWrong,
    playLeaderboard,
  }
}
