'use client'

import { useCallback } from 'react'
import { toast } from 'sonner'

import type { Card, GameState, GameResult } from '../types'
import type { GameResponse } from '../lib/gameApi'

interface UseGameActionsProps {
  // State
  playerHand: Card[]
  setPlayerHand: (hand: Card[]) => void
  splitHand: Card[]
  setSplitHand: (hand: Card[]) => void
  dealerHand: Card[]
  setDealerHand: (hand: Card[]) => void
  gameState: GameState
  setGameState: (state: GameState) => void
  result: GameResult
  setResult: (result: GameResult) => void
  splitResult: GameResult
  setSplitResult: (result: GameResult) => void
  bet: number
  setBet: (bet: number) => void
  setSelectedChip: (chip: number | null) => void
  setIsDealing: (dealing: boolean) => void
  setIsProcessing: (processing: boolean) => void
  setWinAmount: (amount: number) => void
  setAnimatingResult: (animating: boolean) => void
  currentBet: number
  setCurrentBet: (bet: number) => void
  splitBet: number
  setSplitBet: (bet: number) => void
  splitBetRef: React.MutableRefObject<number>
  setIsFlippingDealer: (flipping: boolean) => void
  setDealerCardFlipped: (flipped: boolean) => void
  activeHand: 'main' | 'split'
  setActiveHand: (hand: 'main' | 'split') => void
  hasSplit: boolean
  setHasSplit: (hasSplit: boolean) => void
  gameId: string
  setGameId: (id: string) => void
  setIsSplitAnimating: (animating: boolean) => void
  setSplitAnimationPhase: (phase: 'idle' | 'separating' | 'dealing_right' | 'dealing_left' | 'done') => void
  setSplitCards: (cards: { left: Card | null; right: Card | null }) => void
  setShowBustIndicator: (indicator: 'main' | 'split' | null) => void
  isDoubleDown: boolean
  setIsDoubleDown: (isDouble: boolean) => void
  mainHandDoubled: boolean
  setMainHandDoubled: (doubled: boolean) => void
  splitHandDoubled: boolean
  setSplitHandDoubled: (doubled: boolean) => void
  settingsLoading: boolean
  isGameEnabled: boolean
  userPoints: number
  maxBet: number
  isActionLocked: boolean
  isActionLockedRef: React.MutableRefObject<boolean>
  setServerCanSplit: (can: boolean) => void
  setServerCanDouble: (can: boolean) => void

  // Functions
  playSound: (type: 'card' | 'cardFlip' | 'chip' | 'win' | 'lose' | 'blackjack' | 'click') => void
  addTimer: (callback: () => void, delay: number) => NodeJS.Timeout
  clearAllTimers: () => void
  isMounted: () => boolean
  calcPayout: (res: GameResult | null, betAmt: number) => number
  getCombinedResult: (mainRes: GameResult, splitRes: GameResult | null, mainBet: number, splitBet: number) => GameResult
  updateFromResponse: (response: GameResponse) => void
  resetGame: () => void
  refreshUser: () => Promise<void>

  // API functions
  startGame: (betAmount: number) => Promise<GameResponse>
  hitAction: (gameId: string) => Promise<GameResponse>
  standAction: (gameId: string) => Promise<GameResponse>
  doubleAction: (gameId: string) => Promise<GameResponse>
  splitAction: (gameId: string) => Promise<GameResponse>
}

export function useGameActions(props: UseGameActionsProps) {
  const {
    playerHand, setPlayerHand,
    splitHand, setSplitHand,
    dealerHand, setDealerHand,
    gameState, setGameState,
    setResult,
    setSplitResult,
    bet, setBet,
    setSelectedChip,
    setIsDealing, setIsProcessing,
    setWinAmount, setAnimatingResult,
    currentBet, setCurrentBet,
    setSplitBet, splitBetRef,
    setIsFlippingDealer, setDealerCardFlipped,
    setActiveHand,
    hasSplit, setHasSplit,
    gameId, setGameId,
    setIsSplitAnimating, setSplitAnimationPhase, setSplitCards,
    setShowBustIndicator,
    setIsDoubleDown,
    setMainHandDoubled, setSplitHandDoubled,
    settingsLoading, isGameEnabled, userPoints, maxBet,
    isActionLocked, isActionLockedRef,
    setServerCanSplit, setServerCanDouble,
    playSound, addTimer, isMounted,
    calcPayout, getCombinedResult,
    refreshUser, resetGame,
    startGame, hitAction, standAction, doubleAction, splitAction
  } = props

  // Helper to process game result from server
  const processGameResult = useCallback(async (
    response: GameResponse,
    mainBet: number,
    splitBetAmt: number
  ) => {
    if (response.gameOver) {
      const mainResult = response.result || null
      const splitResultVal = response.splitResult || null

      setResult(mainResult)
      if (splitResultVal) setSplitResult(splitResultVal)
      setGameState('game_over')
      setAnimatingResult(true)

      const payout = response.payout || 0
      setWinAmount(payout)

      const combinedResult = hasSplit && splitResultVal
        ? getCombinedResult(mainResult, splitResultVal, mainBet, splitBetAmt)
        : mainResult

      if (combinedResult === 'win' || combinedResult === 'blackjack') {
        playSound('win')
      } else if (combinedResult === 'lose') {
        playSound('lose')
      } else {
        playSound('click')
      }

      // Her zaman kullanıcı puanını yenile (kazanç olsa da olmasa da)
      // Bu sayede her durumda güncel puan gösterilir
      await refreshUser()

      addTimer(() => setAnimatingResult(false), 2500)
    }
  }, [hasSplit, getCombinedResult, playSound, refreshUser, addTimer, setResult, setSplitResult, setGameState, setAnimatingResult, setWinAmount])

  // Stand action - server-side
  const stand = useCallback(async () => {
    if (isActionLockedRef.current) return
    if (isActionLocked) return
    if (gameState !== 'playing' && gameState !== 'playing_split') return
    if (!gameId) return

    setIsProcessing(true)
    isActionLockedRef.current = true

    const mainBetCopy = currentBet
    const splitBetCopy = splitBetRef.current

    try {
      const response = await standAction(gameId)

      if (!response.success) {
        toast.error(response.error || 'Stand yapılamadı!')
        setIsProcessing(false)
        isActionLockedRef.current = false
        return
      }

      // Handle split hand stand - transition to main hand
      if (gameState === 'playing_split' && !response.gameOver) {
        if (response.phase) setGameState(response.phase)
        if (response.activeHand) setActiveHand(response.activeHand)
        setIsProcessing(false)
        isActionLockedRef.current = false
        return
      }

      // Game is over - dealer played
      if (response.gameOver) {
        // Animate dealer card flip first
        setIsFlippingDealer(true)
        playSound('cardFlip')

        addTimer(() => {
          if (!isMounted()) return

          setIsFlippingDealer(false)
          setDealerCardFlipped(true)

          // Dealer kartlarını animasyonlu göster
          if (response.dealerHand && response.dealerHand.length > 0) {
            const dealerCards = response.dealerHand.map(c => ({ ...c, hidden: false }))

            // İlk iki kartı göster (zaten var)
            const initialCards = dealerCards.slice(0, 2)
            setDealerHand(initialCards)

            // Eğer dealer ek kart çektiyse, her birini animasyonlu göster
            const additionalCards = dealerCards.slice(2)

            if (additionalCards.length === 0) {
              // Ek kart yok, sonucu göster
              addTimer(async () => {
                if (!isMounted()) return
                await processGameResult(response, mainBetCopy, splitBetCopy)
                setIsProcessing(false)
                isActionLockedRef.current = false
              }, 600)
            } else {
              // Her ek kartı sırayla animasyonlu göster
              let currentCards = [...initialCards]
              let delay = 0

              additionalCards.forEach((card, index) => {
                addTimer(() => {
                  if (!isMounted()) return
                  playSound('card')
                  currentCards = [...currentCards, { ...card, isNew: true }]
                  setDealerHand([...currentCards])
                }, delay)
                delay += 600 // Her kart arasında 600ms
              })

              // Tüm kartlar gösterildikten sonra sonucu göster
              addTimer(async () => {
                if (!isMounted()) return
                // Son kartların isNew flag'ini kaldır
                setDealerHand(dealerCards.map(c => ({ ...c, isNew: false })))
                await processGameResult(response, mainBetCopy, splitBetCopy)
                setIsProcessing(false)
                isActionLockedRef.current = false
              }, delay + 500)
            }
          } else {
            // Process result after animation
            addTimer(async () => {
              if (!isMounted()) return
              await processGameResult(response, mainBetCopy, splitBetCopy)
              setIsProcessing(false)
              isActionLockedRef.current = false
            }, 600)
          }
        }, 700)
      } else {
        setIsProcessing(false)
        isActionLockedRef.current = false
      }
    } catch (error) {
      console.error('[Blackjack] Stand error:', error)
      toast.error('Bir hata oluştu!')
      setIsProcessing(false)
      isActionLockedRef.current = false
    }
  }, [
    gameState, isActionLocked, gameId, currentBet, standAction, processGameResult,
    playSound, addTimer, isMounted, setIsProcessing, setGameState, setActiveHand,
    setIsFlippingDealer, setDealerCardFlipped, setDealerHand, isActionLockedRef, splitBetRef
  ])

  // Hit action - server-side
  const hit = useCallback(async () => {
    if (isActionLockedRef.current) return
    if (isActionLocked) return
    if (gameState !== 'playing' && gameState !== 'playing_split') return
    if (!gameId) return

    setIsProcessing(true)
    isActionLockedRef.current = true

    const isPlayingSplit = gameState === 'playing_split'
    const mainBetCopy = currentBet
    const splitBetCopy = splitBetRef.current

    try {
      playSound('card')

      const response = await hitAction(gameId)

      if (!response.success) {
        toast.error(response.error || 'Kart çekilemedi!')
        setIsProcessing(false)
        isActionLockedRef.current = false
        return
      }

      // Update hands from response with animation
      if (response.playerHand) {
        const existingIds = new Set(playerHand.map(c => c.id))
        setPlayerHand(response.playerHand.map(c => ({
          ...c,
          isNew: !existingIds.has(c.id)
        })))
      }
      if (response.splitHand) {
        const existingIds = new Set(splitHand.map(c => c.id))
        setSplitHand(response.splitHand.map(c => ({
          ...c,
          isNew: !existingIds.has(c.id)
        })))
      }

      // Update server flags
      if (response.canSplit !== undefined) setServerCanSplit(response.canSplit)
      if (response.canDouble !== undefined) setServerCanDouble(response.canDouble)

      // Check for bust
      if (response.bust) {
        const bustHand = isPlayingSplit ? 'split' : 'main'
        setShowBustIndicator(bustHand)
        playSound('lose')

        addTimer(async () => {
          if (!isMounted()) return

          setShowBustIndicator(null)

          if (response.gameOver) {
            // Game is completely over
            if (response.dealerHand && response.dealerHand.length > 0) {
              setIsFlippingDealer(true)
              playSound('cardFlip')

              addTimer(() => {
                if (!isMounted()) return
                setIsFlippingDealer(false)
                setDealerCardFlipped(true)

                const dealerCards = response.dealerHand!.map(c => ({ ...c, hidden: false }))

                // İlk iki kartı göster
                const initialCards = dealerCards.slice(0, 2)
                setDealerHand(initialCards)

                // Ek kartları animasyonlu göster
                const additionalCards = dealerCards.slice(2)

                if (additionalCards.length === 0) {
                  addTimer(async () => {
                    if (!isMounted()) return
                    await processGameResult(response, mainBetCopy, splitBetCopy)
                    setIsProcessing(false)
                    isActionLockedRef.current = false
                  }, 600)
                } else {
                  let currentCards = [...initialCards]
                  let delay = 0

                  additionalCards.forEach((card, index) => {
                    addTimer(() => {
                      if (!isMounted()) return
                      playSound('card')
                      currentCards = [...currentCards, { ...card, isNew: true }]
                      setDealerHand([...currentCards])
                    }, delay)
                    delay += 600
                  })

                  addTimer(async () => {
                    if (!isMounted()) return
                    setDealerHand(dealerCards.map(c => ({ ...c, isNew: false })))
                    await processGameResult(response, mainBetCopy, splitBetCopy)
                    setIsProcessing(false)
                    isActionLockedRef.current = false
                  }, delay + 500)
                }
              }, 700)
            } else {
              await processGameResult(response, mainBetCopy, splitBetCopy)
              setIsProcessing(false)
              isActionLockedRef.current = false
            }
          } else {
            // Transition to next phase (e.g., split bust -> main hand)
            if (response.phase) setGameState(response.phase)
            if (response.activeHand) setActiveHand(response.activeHand)
            setIsProcessing(false)
            isActionLockedRef.current = false
          }
        }, 1200)
        return
      }

      // Check for 21 or game over
      if (response.gameOver) {
        setIsFlippingDealer(true)
        playSound('cardFlip')

        addTimer(() => {
          if (!isMounted()) return

          setIsFlippingDealer(false)
          setDealerCardFlipped(true)

          // Dealer kartlarını animasyonlu göster
          if (response.dealerHand && response.dealerHand.length > 0) {
            const dealerCards = response.dealerHand.map(c => ({ ...c, hidden: false }))

            // İlk iki kartı göster (zaten var)
            const initialCards = dealerCards.slice(0, 2)
            setDealerHand(initialCards)

            // Eğer dealer ek kart çektiyse, her birini animasyonlu göster
            const additionalCards = dealerCards.slice(2)

            if (additionalCards.length === 0) {
              // Ek kart yok, sonucu göster
              addTimer(async () => {
                if (!isMounted()) return
                await processGameResult(response, mainBetCopy, splitBetCopy)
                setIsProcessing(false)
                isActionLockedRef.current = false
              }, 600)
            } else {
              // Her ek kartı sırayla animasyonlu göster
              let currentCards = [...initialCards]
              let delay = 0

              additionalCards.forEach((card, index) => {
                addTimer(() => {
                  if (!isMounted()) return
                  playSound('card')
                  currentCards = [...currentCards, { ...card, isNew: true }]
                  setDealerHand([...currentCards])
                }, delay)
                delay += 600 // Her kart arasında 600ms
              })

              // Tüm kartlar gösterildikten sonra sonucu göster
              addTimer(async () => {
                if (!isMounted()) return
                setDealerHand(dealerCards.map(c => ({ ...c, isNew: false })))
                await processGameResult(response, mainBetCopy, splitBetCopy)
                setIsProcessing(false)
                isActionLockedRef.current = false
              }, delay + 500)
            }
          } else {
            addTimer(async () => {
              await processGameResult(response, mainBetCopy, splitBetCopy)
              setIsProcessing(false)
              isActionLockedRef.current = false
            }, 600)
          }
        }, 700)
        return
      }

      // Normal hit - continue playing
      if (response.phase) setGameState(response.phase)
      if (response.activeHand) setActiveHand(response.activeHand)

      addTimer(() => {
        setIsProcessing(false)
        isActionLockedRef.current = false
      }, 300)
    } catch (error) {
      console.error('[Blackjack] Hit error:', error)
      toast.error('Bir hata oluştu!')
      setIsProcessing(false)
      isActionLockedRef.current = false
    }
  }, [
    gameState, isActionLocked, gameId, currentBet, playerHand, splitHand,
    hitAction, processGameResult, playSound, addTimer, isMounted,
    setIsProcessing, setPlayerHand, setSplitHand, setShowBustIndicator,
    setGameState, setActiveHand, setIsFlippingDealer, setDealerCardFlipped,
    setDealerHand, setServerCanSplit, setServerCanDouble,
    isActionLockedRef, splitBetRef
  ])

  // Split action - server-side
  const split = useCallback(async () => {
    if (isActionLockedRef.current) return
    if (isActionLocked) return
    if (gameState !== 'playing') return
    if (!gameId) return

    setIsProcessing(true)
    isActionLockedRef.current = true
    setIsSplitAnimating(true)

    playSound('chip')

    try {
      const response = await splitAction(gameId)

      if (!response.success) {
        toast.error(response.error || 'Split yapılamadı!')
        setIsProcessing(false)
        setIsSplitAnimating(false)
        isActionLockedRef.current = false
        return
      }

      await refreshUser()

      // Animate split
      const card1 = playerHand[0]
      const card2 = playerHand[1]

      setSplitAnimationPhase('separating')
      setSplitCards({ left: card1, right: card2 })

      addTimer(() => {
        if (!isMounted()) return

        // Update hands from response
        if (response.playerHand) {
          setPlayerHand(response.playerHand.map((c, i) => ({
            ...c,
            isNew: i === response.playerHand!.length - 1
          })))
        }
        if (response.splitHand) {
          setSplitHand(response.splitHand.map((c, i) => ({
            ...c,
            isNew: i === response.splitHand!.length - 1
          })))
        }

        setSplitBet(currentBet)
        splitBetRef.current = currentBet
        setHasSplit(true)
        setSplitAnimationPhase('idle')
        setSplitCards({ left: null, right: null })

        // Play card deal sounds
        playSound('card')

        addTimer(() => {
          if (!isMounted()) return
          playSound('card')

          addTimer(() => {
            if (!isMounted()) return

            if (response.activeHand) setActiveHand(response.activeHand)
            if (response.phase) setGameState(response.phase)
            if (response.canSplit !== undefined) setServerCanSplit(response.canSplit)
            if (response.canDouble !== undefined) setServerCanDouble(response.canDouble)

            setIsSplitAnimating(false)
            setIsProcessing(false)
            isActionLockedRef.current = false
          }, 500)
        }, 600)
      }, 700)
    } catch (error) {
      console.error('[Blackjack] Split error:', error)
      toast.error('Bir hata oluştu!')
      setIsProcessing(false)
      setIsSplitAnimating(false)
      isActionLockedRef.current = false
    }
  }, [
    gameState, isActionLocked, gameId, playerHand, currentBet, splitAction,
    playSound, addTimer, isMounted, refreshUser,
    setIsProcessing, setIsSplitAnimating, setSplitAnimationPhase, setSplitCards,
    setPlayerHand, setSplitHand, setSplitBet, setHasSplit,
    setActiveHand, setGameState, setServerCanSplit, setServerCanDouble,
    isActionLockedRef, splitBetRef
  ])

  // Deal initial cards - server-side
  const dealCards = useCallback(async () => {
    if (isActionLockedRef.current) return
    if (isActionLocked) return
    if (settingsLoading) {
      toast.error('Ayarlar yükleniyor...')
      return
    }
    if (!isGameEnabled) {
      toast.error('Blackjack şu anda kapalı!')
      return
    }
    if (bet === 0) {
      toast.error('Lütfen bahis miktarını seçin!')
      return
    }
    if (bet > userPoints) {
      toast.error('Yetersiz puan!')
      return
    }

    setIsProcessing(true)
    isActionLockedRef.current = true
    setIsDealing(true)

    // Reset state
    setCurrentBet(bet)
    setDealerCardFlipped(false)
    setHasSplit(false)
    setSplitHand([])
    setSplitBet(0)
    splitBetRef.current = 0
    setSplitResult(null)
    setActiveHand('main')
    setWinAmount(0)
    setShowBustIndicator(null)
    setResult(null)
    setIsDoubleDown(false)
    setMainHandDoubled(false)
    setSplitHandDoubled(false)

    try {
      const response = await startGame(bet)

      if (!response.success) {
        toast.error(response.error || 'Oyun başlatılamadı!')
        setIsProcessing(false)
        setIsDealing(false)
        isActionLockedRef.current = false
        return
      }

      await refreshUser()

      // Set game ID
      if (response.gameId) setGameId(response.gameId)

      // Update server flags
      if (response.canSplit !== undefined) setServerCanSplit(response.canSplit)
      if (response.canDouble !== undefined) setServerCanDouble(response.canDouble)

      // Animate card dealing
      const pCards = response.playerHand || []
      const dCards = response.dealerHand || []

      setGameState('playing')

      // Deal first player card
      playSound('card')
      if (pCards.length > 0) {
        setPlayerHand([{ ...pCards[0], isNew: true }])
      }

      // Deal first dealer card
      addTimer(() => {
        if (!isMounted()) return
        playSound('card')
        if (dCards.length > 0) {
          setDealerHand([{ ...dCards[0], isNew: true }])
        }
      }, 450)

      // Deal second player card
      addTimer(() => {
        if (!isMounted()) return
        playSound('card')
        if (pCards.length > 1) {
          setPlayerHand([
            { ...pCards[0], isNew: false },
            { ...pCards[1], isNew: true }
          ])
        }
      }, 900)

      // Deal second dealer card (hidden)
      addTimer(() => {
        if (!isMounted()) return
        playSound('card')
        if (dCards.length > 1) {
          setDealerHand([
            { ...dCards[0], isNew: false },
            { ...dCards[1], hidden: true, isNew: true }
          ])
        }
      }, 1350)

      // Check for immediate result (blackjack)
      addTimer(async () => {
        if (!isMounted()) return

        if (response.immediateResult) {
          // Server determined immediate result (player/dealer blackjack)
          setIsFlippingDealer(true)
          playSound('cardFlip')

          addTimer(() => {
            if (!isMounted()) return

            setIsFlippingDealer(false)
            setDealerCardFlipped(true)

            // Reveal all dealer cards
            if (dCards.length > 1) {
              setDealerHand([
                { ...dCards[0], isNew: false },
                { ...dCards[1], hidden: false, isNew: false }
              ])
            }

            addTimer(async () => {
              if (!isMounted()) return

              const immResult = response.immediateResult!.result as GameResult
              const immPayout = response.immediateResult!.payout

              setResult(immResult)
              setGameState('game_over')
              setAnimatingResult(true)
              setWinAmount(immPayout)

              if (immResult === 'blackjack') {
                playSound('blackjack')
              } else if (immResult === 'push') {
                playSound('click')
              } else {
                playSound('lose')
              }

              if (immPayout > 0) {
                await refreshUser()
              }

              setIsDealing(false)
              setIsProcessing(false)
              isActionLockedRef.current = false
              addTimer(() => setAnimatingResult(false), 2500)
            }, 400)
          }, 700)
        } else {
          // Normal game continues
          setIsDealing(false)
          setIsProcessing(false)
          isActionLockedRef.current = false
        }
      }, 1800)
    } catch (error) {
      console.error('[Blackjack] Deal error:', error)
      toast.error('Bir hata oluştu!')
      setIsProcessing(false)
      setIsDealing(false)
      isActionLockedRef.current = false
    }
  }, [
    bet, userPoints, startGame, refreshUser, playSound, addTimer,
    isActionLocked, isMounted, settingsLoading, isGameEnabled,
    setIsProcessing, setIsDealing, setCurrentBet, setDealerCardFlipped,
    setHasSplit, setSplitHand, setSplitBet, setSplitResult, setActiveHand,
    setWinAmount, setShowBustIndicator, setResult, setIsDoubleDown,
    setMainHandDoubled, setSplitHandDoubled,
    setGameId, setServerCanSplit, setServerCanDouble, setPlayerHand,
    setDealerHand, setGameState, setIsFlippingDealer, setAnimatingResult,
    isActionLockedRef, splitBetRef
  ])

  // Double down - server-side
  const doubleDown = useCallback(async () => {
    if (isActionLockedRef.current) return
    if (isActionLocked) return
    if (gameState !== 'playing' && gameState !== 'playing_split') return
    if (!gameId) return

    const isPlayingSplit = gameState === 'playing_split'
    const currentHand = isPlayingSplit ? splitHand : playerHand

    if (currentHand.length !== 2) return

    setIsProcessing(true)
    isActionLockedRef.current = true

    playSound('chip')

    const mainBetCopy = currentBet
    const splitBetCopy = splitBetRef.current

    try {
      const response = await doubleAction(gameId)

      if (!response.success) {
        toast.error(response.error || 'Double yapılamadı!')
        setIsProcessing(false)
        isActionLockedRef.current = false
        return
      }

      await refreshUser()
      setIsDoubleDown(true)

      // Track which hand was doubled
      if (isPlayingSplit) {
        setSplitHandDoubled(true)
      } else {
        setMainHandDoubled(true)
      }

      // Play card sound and update hand
      playSound('card')

      if (response.playerHand) {
        const existingIds = new Set(playerHand.map(c => c.id))
        setPlayerHand(response.playerHand.map(c => ({
          ...c,
          isNew: !existingIds.has(c.id)
        })))
      }
      if (response.splitHand) {
        const existingIds = new Set(splitHand.map(c => c.id))
        setSplitHand(response.splitHand.map(c => ({
          ...c,
          isNew: !existingIds.has(c.id)
        })))
      }

      // Wait for card animation
      addTimer(async () => {
        if (!isMounted()) return

        // Check for bust
        if (response.bust) {
          const bustHand = isPlayingSplit ? 'split' : 'main'
          setShowBustIndicator(bustHand)
          playSound('lose')

          addTimer(async () => {
            if (!isMounted()) return
            setShowBustIndicator(null)

            if (response.gameOver) {
              if (response.dealerHand && response.dealerHand.length > 0) {
                setIsFlippingDealer(true)
                playSound('cardFlip')

                addTimer(() => {
                  if (!isMounted()) return
                  setIsFlippingDealer(false)
                  setDealerCardFlipped(true)

                  const dealerCards = response.dealerHand!.map(c => ({ ...c, hidden: false }))

                  // İlk iki kartı göster
                  const initialCards = dealerCards.slice(0, 2)
                  setDealerHand(initialCards)

                  // Ek kartları animasyonlu göster
                  const additionalCards = dealerCards.slice(2)

                  if (additionalCards.length === 0) {
                    addTimer(async () => {
                      if (!isMounted()) return
                      await processGameResult(response, mainBetCopy, splitBetCopy)
                      setIsProcessing(false)
                      isActionLockedRef.current = false
                    }, 600)
                  } else {
                    let currentCards = [...initialCards]
                    let delay = 0

                    additionalCards.forEach((card, index) => {
                      addTimer(() => {
                        if (!isMounted()) return
                        playSound('card')
                        currentCards = [...currentCards, { ...card, isNew: true }]
                        setDealerHand([...currentCards])
                      }, delay)
                      delay += 600
                    })

                    addTimer(async () => {
                      if (!isMounted()) return
                      setDealerHand(dealerCards.map(c => ({ ...c, isNew: false })))
                      await processGameResult(response, mainBetCopy, splitBetCopy)
                      setIsProcessing(false)
                      isActionLockedRef.current = false
                    }, delay + 500)
                  }
                }, 700)
              } else {
                await processGameResult(response, mainBetCopy, splitBetCopy)
                setIsProcessing(false)
                isActionLockedRef.current = false
              }
            } else {
              // Transition to next phase
              if (response.phase) setGameState(response.phase)
              if (response.activeHand) setActiveHand(response.activeHand)
              setIsProcessing(false)
              isActionLockedRef.current = false
            }
          }, 1200)
          return
        }

        // Check for game over (dealer played)
        if (response.gameOver) {
          setIsFlippingDealer(true)
          playSound('cardFlip')

          addTimer(() => {
            if (!isMounted()) return

            setIsFlippingDealer(false)
            setDealerCardFlipped(true)

            // Dealer kartlarını animasyonlu göster
            if (response.dealerHand && response.dealerHand.length > 0) {
              const dealerCards = response.dealerHand.map(c => ({ ...c, hidden: false }))

              // İlk iki kartı göster (zaten var)
              const initialCards = dealerCards.slice(0, 2)
              setDealerHand(initialCards)

              // Eğer dealer ek kart çektiyse, her birini animasyonlu göster
              const additionalCards = dealerCards.slice(2)

              if (additionalCards.length === 0) {
                // Ek kart yok, sonucu göster
                addTimer(async () => {
                  if (!isMounted()) return
                  await processGameResult(response, mainBetCopy, splitBetCopy)
                  setIsProcessing(false)
                  isActionLockedRef.current = false
                }, 600)
              } else {
                // Her ek kartı sırayla animasyonlu göster
                let currentCards = [...initialCards]
                let delay = 0

                additionalCards.forEach((card, index) => {
                  addTimer(() => {
                    if (!isMounted()) return
                    playSound('card')
                    currentCards = [...currentCards, { ...card, isNew: true }]
                    setDealerHand([...currentCards])
                  }, delay)
                  delay += 600 // Her kart arasında 600ms
                })

                // Tüm kartlar gösterildikten sonra sonucu göster
                addTimer(async () => {
                  if (!isMounted()) return
                  setDealerHand(dealerCards.map(c => ({ ...c, isNew: false })))
                  await processGameResult(response, mainBetCopy, splitBetCopy)
                  setIsProcessing(false)
                  isActionLockedRef.current = false
                }, delay + 500)
              }
            } else {
              addTimer(async () => {
                await processGameResult(response, mainBetCopy, splitBetCopy)
                setIsProcessing(false)
                isActionLockedRef.current = false
              }, 600)
            }
          }, 700)
          return
        }

        // Transition to next phase (e.g., split double -> main hand)
        if (response.phase) setGameState(response.phase)
        if (response.activeHand) setActiveHand(response.activeHand)
        setIsProcessing(false)
        isActionLockedRef.current = false
      }, 700)
    } catch (error) {
      console.error('[Blackjack] Double error:', error)
      toast.error('Bir hata oluştu!')
      setIsProcessing(false)
      isActionLockedRef.current = false
    }
  }, [
    gameState, isActionLocked, gameId, playerHand, splitHand, currentBet,
    doubleAction, processGameResult, playSound, addTimer, isMounted, refreshUser,
    setIsProcessing, setIsDoubleDown, setMainHandDoubled, setSplitHandDoubled,
    setPlayerHand, setSplitHand, setShowBustIndicator, setGameState, setActiveHand,
    setIsFlippingDealer, setDealerCardFlipped, setDealerHand,
    isActionLockedRef, splitBetRef
  ])

  // New game
  const newGame = useCallback(() => {
    if (isActionLockedRef.current) return
    if (isActionLocked) return

    playSound('click')
    resetGame()
  }, [playSound, isActionLocked, resetGame, isActionLockedRef])

  // Add chip
  const addChip = useCallback((value: number) => {
    if (isActionLockedRef.current) return
    if (isActionLocked) return

    let newBet = bet + value

    if (newBet > maxBet) {
      newBet = maxBet
    }

    if (newBet > userPoints) {
      newBet = Math.min(userPoints, maxBet)
    }

    if (newBet <= 0) {
      toast.error('Yetersiz puan!')
      return
    }

    playSound('chip')
    setBet(newBet)
    setSelectedChip(value)
  }, [bet, userPoints, playSound, isActionLocked, maxBet, setBet, setSelectedChip, isActionLockedRef])

  // Clear bet
  const clearBet = useCallback(() => {
    if (isActionLockedRef.current) return
    if (isActionLocked) return
    playSound('click')
    setBet(0)
    setSelectedChip(null)
  }, [playSound, isActionLocked, setBet, setSelectedChip, isActionLockedRef])

  return {
    hit,
    stand,
    split,
    doubleDown,
    dealCards,
    newGame,
    addChip,
    clearBet
  }
}
