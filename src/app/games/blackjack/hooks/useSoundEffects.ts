'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// Sound System Hook
export function useSoundEffects() {
  const [soundEnabled, setSoundEnabled] = useState(true)
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({})
  const audioContextRef = useRef<AudioContext | null>(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true

    if (typeof window !== 'undefined') {
      audioRefs.current = {
        cardDeal: new Audio('/sounds/card-deal.mp3'),
        cardFlip: new Audio('/sounds/card-flip.mp3'),
        chip: new Audio('/sounds/chip.mp3'),
        win: new Audio('/sounds/win.mp3'),
        lose: new Audio('/sounds/lose.mp3')
      }

      Object.values(audioRefs.current).forEach(audio => {
        if (audio) {
          audio.preload = 'auto'
          audio.volume = 0.5
        }
      })
    }

    return () => {
      isMountedRef.current = false
      Object.values(audioRefs.current).forEach(audio => {
        if (audio) {
          audio.pause()
          audio.src = ''
        }
      })
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  const playClickSound = useCallback(() => {
    if (!isMountedRef.current) return
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      }
      const ctx = audioContextRef.current

      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      oscillator.frequency.setValueAtTime(800, ctx.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.05)

      gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05)

      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.05)
    } catch (e) {
      console.warn('Click sound not supported:', e)
    }
  }, [])

  const playSound = useCallback((type: 'card' | 'cardFlip' | 'chip' | 'win' | 'lose' | 'blackjack' | 'click') => {
    if (!soundEnabled || !isMountedRef.current) return

    try {
      if (type === 'click') {
        playClickSound()
        return
      }

      let audio: HTMLAudioElement | null = null

      switch (type) {
        case 'card':
          audio = audioRefs.current.cardDeal
          break
        case 'cardFlip':
          audio = audioRefs.current.cardFlip
          break
        case 'chip':
          audio = audioRefs.current.chip
          break
        case 'win':
        case 'blackjack':
          audio = audioRefs.current.win
          break
        case 'lose':
          audio = audioRefs.current.lose
          break
      }

      if (audio) {
        const clone = audio.cloneNode() as HTMLAudioElement
        clone.volume = 0.5
        clone.play().catch(() => {})
        clone.onended = () => {
          clone.src = ''
        }
      }
    } catch (e) {
      console.warn('Audio not supported:', e)
    }
  }, [soundEnabled, playClickSound])

  return { soundEnabled, setSoundEnabled, playSound }
}
