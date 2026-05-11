'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'

import type { Card, GameState, GameResult } from '../types'
import { calculateHandDisplayValue } from '../utils'
import { DEFAULT_CHIPS, type BlackjackSettings } from '../lib/constants'
import {
  loadGameSettings,
  getActiveGame,
  startGame as apiStartGame,
  hitAction as apiHitAction,
  standAction as apiStandAction,
  doubleAction as apiDoubleAction,
  splitAction as apiSplitAction
} from '../lib/gameApi'

import { useSoundEffects } from './useSoundEffects'
import { useTimerManager } from './useTimerManager'
import { useGameLock } from './useGameLock'

// Auth context'ten user bilgilerini almak için
interface User {
  id: string
  points: number
  siteUsername?: string
}

export function useBlackjackGame() {
  const router = useRouter()

  // ========== CORE GAME STATE ==========
  const [playerHand, setPlayerHand] = useState<Card[]>([])
  const [splitHand, setSplitHand] = useState<Card[]>([])
  const [dealerHand, setDealerHand] = useState<Card[]>([])
  const [gameState, setGameState] = useState<GameState>('betting')
  const [result, setResult] = useState<GameResult>(null)
  const [splitResult, setSplitResult] = useState<GameResult>(null)
  const [gameId, setGameId] = useState<string>('')

  // ========== BETTING STATE ==========
  const [bet, setBet] = useState(0)
  const [currentBet, setCurrentBet] = useState(0)
  const [splitBet, setSplitBet] = useState(0)
  const splitBetRef = useRef(0)
  const [selectedChip, setSelectedChip] = useState<number | null>(null)

  // ========== UI STATE ==========
  const [isDealing, setIsDealing] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isFlippingDealer, setIsFlippingDealer] = useState(false)
  const [dealerCardFlipped, setDealerCardFlipped] = useState(false)
  const [winAmount, setWinAmount] = useState(0)
  const [animatingResult, setAnimatingResult] = useState(false)
  const [showRules, setShowRules] = useState(false)

  // ========== SPLIT STATE ==========
  const [hasSplit, setHasSplit] = useState(false)
  const [activeHand, setActiveHand] = useState<'main' | 'split'>('main')
  const [isSplitAnimating, setIsSplitAnimating] = useState(false)
  const [splitAnimationPhase, setSplitAnimationPhase] = useState<'idle' | 'separating' | 'dealing_right' | 'dealing_left' | 'done'>('idle')
  const [splitCards, setSplitCards] = useState<{ left: Card | null; right: Card | null }>({ left: null, right: null })

  // ========== ADDITIONAL STATE ==========
  const [isDoubleDown, setIsDoubleDown] = useState(false)
  const [mainHandDoubled, setMainHandDoubled] = useState(false)
  const [splitHandDoubled, setSplitHandDoubled] = useState(false)
  const [showBustIndicator, setShowBustIndicator] = useState<'main' | 'split' | null>(null)

  // ========== SERVER STATE FLAGS ==========
  const [serverCanSplit, setServerCanSplit] = useState(false)
  const [serverCanDouble, setServerCanDouble] = useState(false)

  // ========== SETTINGS & USER ==========
  const [settings, setSettings] = useState<BlackjackSettings | null>(null)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [userPoints, setUserPoints] = useState(0)
  const [user, setUser] = useState<User | null>(null)

  // ========== REFS ==========
  const mountedRef = useRef(true)
  const isActionLockedRef = useRef(false)

  // ========== CUSTOM HOOKS ==========
  const { soundEnabled, setSoundEnabled, playSound } = useSoundEffects()
  const { addTimer, clearAllTimers, isMounted } = useTimerManager()
  const { resetLocks, dedupedFetch } = useGameLock()

  // ========== COMPUTED VALUES ==========
  const isGameEnabled = settings?.enabled ?? false
  const maxBet = settings?.maxBet ?? 500
  const minBet = settings?.minBet ?? 10
  const chips = useMemo(() => DEFAULT_CHIPS.filter(c => c <= maxBet), [maxBet])
  const isActionLocked = isProcessing || isDealing || animatingResult

  // Display values
  const playerDisplayValue = useMemo(() => {
    if (playerHand.length === 0) return ''
    return calculateHandDisplayValue(playerHand, true)
  }, [playerHand])

  const splitDisplayValue = useMemo(() => {
    if (splitHand.length === 0) return ''
    return calculateHandDisplayValue(splitHand, true)
  }, [splitHand])

  const dealerDisplayValue = useMemo(() => {
    if (dealerHand.length === 0) return ''
    return calculateHandDisplayValue(dealerHand, dealerCardFlipped)
  }, [dealerHand, dealerCardFlipped])

  // Can split/double - use server flags
  const canSplit = serverCanSplit && !hasSplit && currentBet <= userPoints
  const canDouble = serverCanDouble && (
    (gameState === 'playing' && playerHand.length === 2 && currentBet <= userPoints) ||
    (gameState === 'playing_split' && splitHand.length === 2 && splitBet <= userPoints)
  )

  // Display bet amount
  const displayBet = gameState === 'betting' ? bet : currentBet

  // Display result for result screen
  const displayResult = useMemo(() => {
    if (hasSplit) {
      // Both hands have results - show combined or individual
      if (result && splitResult) {
        // If both same, show that. Otherwise prioritize win/blackjack
        if (result === splitResult) return result
        if (result === 'blackjack' || splitResult === 'blackjack') return 'blackjack'
        if (result === 'win' || splitResult === 'win') return 'win'
        if (result === 'push' || splitResult === 'push') return 'push'
        return 'lose'
      }
      return result || splitResult
    }
    return result
  }, [result, splitResult, hasSplit])

  // ========== HELPER FUNCTIONS ==========

  // Calculate payout based on result
  const calcPayout = useCallback((res: GameResult, betAmt: number): number => {
    switch (res) {
      case 'blackjack':
        return Math.floor(betAmt * 2.5)
      case 'win':
        return betAmt * 2
      case 'push':
        return betAmt
      case 'lose':
      default:
        return 0
    }
  }, [])

  // Get combined result for split hands
  const getCombinedResult = useCallback((
    mainRes: GameResult,
    splitRes: GameResult | null,
    mainBet: number,
    splitBetAmt: number
  ): GameResult => {
    if (!splitRes) return mainRes

    const mainPayout = calcPayout(mainRes, mainBet)
    const splitPayout = calcPayout(splitRes, splitBetAmt)
    const totalBet = mainBet + splitBetAmt
    const totalPayout = mainPayout + splitPayout

    if (totalPayout > totalBet) return 'win'
    if (totalPayout < totalBet) return 'lose'
    return 'push'
  }, [calcPayout])

  // Refresh user data
  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch('/api/user/me', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      if (res.ok) {
        const data = await res.json()
        // API doğrudan userData döndürüyor, { user: ... } formatında değil
        if (data && data.id) {
          setUser({
            id: data.id,
            points: data.points || 0,
            siteUsername: data.siteUsername
          })
          // Puanın number olduğundan emin ol
          const points = typeof data.points === 'number' ? data.points : 0
          setUserPoints(points)
          console.log('[Blackjack] User points updated:', points)
        }
      } else {
        console.error('[Blackjack] Failed to fetch user, status:', res.status)
      }
    } catch (error) {
      console.error('[Blackjack] Failed to refresh user:', error)
    }
  }, [])

  // Reset game to betting state
  const resetGame = useCallback(() => {
    setPlayerHand([])
    setSplitHand([])
    setDealerHand([])
    setGameState('betting')
    setResult(null)
    setSplitResult(null)
    setGameId('')
    setCurrentBet(0)
    setSplitBet(0)
    splitBetRef.current = 0
    setIsDealing(false)
    setIsProcessing(false)
    setIsFlippingDealer(false)
    setDealerCardFlipped(false)
    setWinAmount(0)
    setAnimatingResult(false)
    setHasSplit(false)
    setActiveHand('main')
    setIsSplitAnimating(false)
    setSplitAnimationPhase('idle')
    setSplitCards({ left: null, right: null })
    setIsDoubleDown(false)
    setMainHandDoubled(false)
    setSplitHandDoubled(false)
    setShowBustIndicator(null)
    setServerCanSplit(false)
    setServerCanDouble(false)
    isActionLockedRef.current = false
    resetLocks()
    clearAllTimers()
  }, [resetLocks, clearAllTimers])

  // Update state from API response (generic helper)
  const updateFromResponse = useCallback((response: {
    playerHand?: Card[]
    splitHand?: Card[]
    dealerHand?: Card[]
    phase?: GameState
    activeHand?: 'main' | 'split'
    hasSplit?: boolean
    canSplit?: boolean
    canDouble?: boolean
  }) => {
    if (response.playerHand) setPlayerHand(response.playerHand)
    if (response.splitHand) setSplitHand(response.splitHand)
    if (response.dealerHand) setDealerHand(response.dealerHand)
    if (response.phase) setGameState(response.phase)
    if (response.activeHand) setActiveHand(response.activeHand)
    if (response.hasSplit !== undefined) setHasSplit(response.hasSplit)
    if (response.canSplit !== undefined) setServerCanSplit(response.canSplit)
    if (response.canDouble !== undefined) setServerCanDouble(response.canDouble)
  }, [])

  // ========== EFFECTS ==========

  // Load settings on mount
  useEffect(() => {
    let cancelled = false

    const loadSettings = async () => {
      setSettingsLoading(true)
      try {
        const gameSettings = await loadGameSettings()
        if (!cancelled && gameSettings) {
          setSettings(gameSettings)
        }
      } catch (error) {
        console.error('[Blackjack] Failed to load settings:', error)
      } finally {
        if (!cancelled) {
          setSettingsLoading(false)
        }
      }
    }

    loadSettings()

    return () => {
      cancelled = true
    }
  }, [])

  // Load user on mount
  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  // Check for active game on mount
  useEffect(() => {
    let cancelled = false

    const checkActiveGame = async () => {
      try {
        const activeGame = await getActiveGame()

        if (cancelled) return

        if (activeGame.hasActiveGame && activeGame.gameId) {
          // Restore active game state
          setGameId(activeGame.gameId)
          setCurrentBet(activeGame.betAmount || 0)
          setSplitBet(activeGame.splitBetAmount || 0)
          splitBetRef.current = activeGame.splitBetAmount || 0

          if (activeGame.playerHand) setPlayerHand(activeGame.playerHand)
          if (activeGame.splitHand) setSplitHand(activeGame.splitHand)
          if (activeGame.dealerHand) setDealerHand(activeGame.dealerHand)
          if (activeGame.phase) setGameState(activeGame.phase)
          if (activeGame.activeHand) setActiveHand(activeGame.activeHand)
          if (activeGame.hasSplit) setHasSplit(activeGame.hasSplit)
          if (activeGame.canSplit !== undefined) setServerCanSplit(activeGame.canSplit)
          if (activeGame.canDouble !== undefined) setServerCanDouble(activeGame.canDouble)
        }

        if (activeGame.expired) {
          // Game expired - refresh user to get refund if any
          await refreshUser()
        }
      } catch (error) {
        console.error('[Blackjack] Failed to check active game:', error)
      }
    }

    checkActiveGame()

    return () => {
      cancelled = true
    }
  }, [refreshUser])

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
      clearAllTimers()
    }
  }, [clearAllTimers])

  // ========== LEGACY COMPATIBILITY (for old code) ==========
  // These are no longer needed with server-side game logic but kept for compatibility
  const deck: Card[] = [] // No longer used - server manages deck
  const setDeck = useCallback(() => {}, []) // No-op
  const ensureDeckHasCards = useCallback(() => [], []) // No-op
  const generateGameId = useCallback(() => `bj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, [])
  const determineResult = useCallback(() => null as GameResult, [])
  const sendGameResult = useCallback(async () => null, [])
  const placeBet = useCallback(async () => ({ success: true }), [])
  const placeSplitBet = useCallback(async () => ({ success: true }), [])
  const placeDoubleBet = useCallback(async () => ({ success: true }), [])

  // ========== RETURN ALL STATE AND FUNCTIONS ==========
  return {
    // Core game state
    playerHand,
    setPlayerHand,
    splitHand,
    setSplitHand,
    dealerHand,
    setDealerHand,
    gameState,
    setGameState,
    result,
    setResult,
    splitResult,
    setSplitResult,
    gameId,
    setGameId,

    // Betting state
    bet,
    setBet,
    currentBet,
    setCurrentBet,
    splitBet,
    setSplitBet,
    splitBetRef,
    selectedChip,
    setSelectedChip,
    chips,
    maxBet,
    minBet,

    // UI state
    isDealing,
    setIsDealing,
    isProcessing,
    setIsProcessing,
    isFlippingDealer,
    setIsFlippingDealer,
    dealerCardFlipped,
    setDealerCardFlipped,
    winAmount,
    setWinAmount,
    animatingResult,
    setAnimatingResult,
    showRules,
    setShowRules,

    // Split state
    hasSplit,
    setHasSplit,
    activeHand,
    setActiveHand,
    isSplitAnimating,
    setIsSplitAnimating,
    splitAnimationPhase,
    setSplitAnimationPhase,
    splitCards,
    setSplitCards,

    // Additional state
    isDoubleDown,
    setIsDoubleDown,
    mainHandDoubled,
    setMainHandDoubled,
    splitHandDoubled,
    setSplitHandDoubled,
    showBustIndicator,
    setShowBustIndicator,
    serverCanSplit,
    setServerCanSplit,
    serverCanDouble,
    setServerCanDouble,

    // Settings & user
    settings,
    settingsLoading,
    isGameEnabled,
    userPoints,
    user,

    // Sound
    soundEnabled,
    setSoundEnabled,
    playSound,

    // Computed values
    playerDisplayValue,
    splitDisplayValue,
    dealerDisplayValue,
    canSplit,
    canDouble,
    displayBet,
    displayResult,
    isActionLocked,
    isActionLockedRef,

    // Helper functions
    calcPayout,
    getCombinedResult,
    refreshUser,
    resetGame,
    updateFromResponse,
    addTimer,
    clearAllTimers,
    isMounted,
    resetLocks,
    dedupedFetch,

    // Legacy compatibility (no longer used but kept for old code)
    deck,
    setDeck,
    ensureDeckHasCards,
    generateGameId,
    determineResult,
    sendGameResult,
    placeBet,
    placeSplitBet,
    placeDoubleBet,

    // Server API functions (to be passed to useGameActions)
    startGame: apiStartGame,
    hitAction: apiHitAction,
    standAction: apiStandAction,
    doubleAction: apiDoubleAction,
    splitAction: apiSplitAction
  }
}
