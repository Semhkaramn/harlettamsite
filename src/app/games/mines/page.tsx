'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useUserTheme } from '@/components/providers/user-theme-provider'
import { useAuth } from '@/components/providers/auth-provider'
import { hexToRgba } from '@/components/ui/themed'
import {
  ArrowLeft,
  Bomb,
  Diamond,
  Coins,
  Trophy,
  Sparkles,
  AlertCircle,
  Info,
  Volume2,
  VolumeX,
  RefreshCw,
  Play
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

import type { Cell, GameState, MinesSettings, GameSession } from './types'
import {
  GRID_SIZE,
  CHIP_VALUES,
  calculateMultiplier,
  calculateNextMultiplier,
  createInitialGrid,
  updateGridWithMines,
  revealCell,
  revealAllMines,
  getMineCountOptions,
  formatNumber
} from './utils'

// ========== AKTIF OYUN TİPİ ==========
interface ActiveGameData {
  hasActiveGame: boolean
  gameId?: string
  betAmount?: number
  mineCount?: number
  revealedPositions?: number[]
  revealedCount?: number
  currentMultiplier?: number
  potentialWin?: number
  gamePhase?: string
  gameState?: {
    grid?: Cell[]
  }
  expired?: boolean
  refunded?: boolean
}

function MinesGame() {
  const { theme } = useUserTheme()
  const { user, refreshUser } = useAuth()

  // Game state
  const [grid, setGrid] = useState<Cell[]>(createInitialGrid())
  const [gameState, setGameState] = useState<GameState>('betting')
  const [bet, setBet] = useState(0)
  const [mineCount, setMineCount] = useState(3)
  const [selectedChip, setSelectedChip] = useState<number | null>(null)
  const [revealedCount, setRevealedCount] = useState(0)
  const [currentMultiplier, setCurrentMultiplier] = useState(1)
  const [potentialWin, setPotentialWin] = useState(0)
  const [winAmount, setWinAmount] = useState(0)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [showRules, setShowRules] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [animatingResult, setAnimatingResult] = useState(false)

  // Game session
  const [gameSession, setGameSession] = useState<GameSession | null>(null)
  const gameSessionRef = useRef<GameSession | null>(null)

  // Settings & Loading
  const [gameSettings, setGameSettings] = useState<MinesSettings | null>(null)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [checkingActiveGame, setCheckingActiveGame] = useState(true)
  const [hasActiveGame, setHasActiveGame] = useState(false)
  const [activeGameData, setActiveGameData] = useState<ActiveGameData | null>(null)

  // Audio refs
  const clickSoundRef = useRef<HTMLAudioElement | null>(null)
  const winSoundRef = useRef<HTMLAudioElement | null>(null)
  const loseSoundRef = useRef<HTMLAudioElement | null>(null)
  const diamondSoundRef = useRef<HTMLAudioElement | null>(null)

  // ========== AKTİF OYUN KONTROLÜ ==========
  const checkActiveGame = useCallback(async () => {
    try {
      const res = await fetch('/api/games/mines/bet')
      if (res.ok) {
        const data: ActiveGameData = await res.json()

        if (data.hasActiveGame && data.gameId) {
          setHasActiveGame(true)
          setActiveGameData(data)
        } else {
          setHasActiveGame(false)
          setActiveGameData(null)

          // Zaman aşımı iadesi
          if (data.expired && data.refunded) {
            toast.info('Önceki oyun zaman aşımına uğradı. Bahsiniz iade edildi.')
            await refreshUser()
          }
        }
      }
    } catch (error) {
      console.error('Active game check error:', error)
    } finally {
      setCheckingActiveGame(false)
    }
  }, [refreshUser])

  // ========== AKTİF OYUNA DEVAM ET ==========
  const resumeActiveGame = useCallback(async () => {
    if (!activeGameData || !activeGameData.gameId) return

    setIsProcessing(true)

    try {
      // Session'ı geri yükle
      const session: GameSession = {
        gameId: activeGameData.gameId,
        bet: activeGameData.betAmount || 0,
        mineCount: activeGameData.mineCount || 3,
        minePositions: [], // Sunucuda saklanıyor, client'a verilmiyor
        revealedPositions: activeGameData.revealedPositions || [],
        currentMultiplier: activeGameData.currentMultiplier || 1,
        potentialWin: activeGameData.potentialWin || 0
      }

      setGameSession(session)
      gameSessionRef.current = session

      // Grid'i güncelle - açılmış kareleri göster
      let newGrid = createInitialGrid()
      if (activeGameData.revealedPositions && activeGameData.revealedPositions.length > 0) {
        for (const pos of activeGameData.revealedPositions) {
          newGrid = revealCell(newGrid, pos)
        }
      }

      // Kayıtlı grid durumu varsa kullan
      if (activeGameData.gameState?.grid) {
        newGrid = activeGameData.gameState.grid
      }

      setGrid(newGrid)
      setBet(activeGameData.betAmount || 0)
      setMineCount(activeGameData.mineCount || 3)
      setRevealedCount(activeGameData.revealedCount || 0)
      setCurrentMultiplier(activeGameData.currentMultiplier || 1)
      setPotentialWin(activeGameData.potentialWin || 0)
      setGameState('playing')
      setHasActiveGame(false)
      setActiveGameData(null)

      toast.success('Oyuna devam ediliyor!')
    } catch (error) {
      console.error('Resume game error:', error)
      toast.error('Oyuna devam edilemedi')
    } finally {
      setIsProcessing(false)
    }
  }, [activeGameData])

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch('/api/games/settings')
        if (res.ok) {
          const data = await res.json()
          setGameSettings({
            enabled: data.minesEnabled ?? true,
            winRate: 50,
            maxBet: data.minesMaxBet ?? 500,
            minBet: data.minesMinBet ?? 10,
            maxMines: 24,
            minMines: 1
          })
        }
      } catch (error) {
        console.error('Failed to load settings:', error)
        setGameSettings({
          enabled: true,
          winRate: 50,
          maxBet: 500,
          minBet: 10,
          maxMines: 24,
          minMines: 1
        })
      } finally {
        setSettingsLoading(false)
      }
    }
    loadSettings()
  }, [])

  // Aktif oyun kontrolü
  useEffect(() => {
    checkActiveGame()
  }, [checkActiveGame])

  // Initialize audio
  useEffect(() => {
    clickSoundRef.current = new Audio('/sounds/chip.mp3')
    winSoundRef.current = new Audio('/sounds/win.mp3')
    loseSoundRef.current = new Audio('/sounds/lose.mp3')
    diamondSoundRef.current = new Audio('/sounds/card-flip.mp3')
  }, [])

  const playSound = useCallback((type: 'click' | 'win' | 'lose' | 'diamond') => {
    if (!soundEnabled) return
    const audioMap = {
      click: clickSoundRef.current,
      win: winSoundRef.current,
      lose: loseSoundRef.current,
      diamond: diamondSoundRef.current
    }
    const audio = audioMap[type]
    if (audio) {
      audio.currentTime = 0
      audio.volume = 0.5
      audio.play().catch(() => {})
    }
  }, [soundEnabled])

  // Update multiplier when revealed count changes
  useEffect(() => {
    const multiplier = calculateMultiplier(mineCount, revealedCount)
    setCurrentMultiplier(multiplier)
    setPotentialWin(Math.floor(bet * multiplier))
  }, [mineCount, revealedCount, bet])

  // ========== OYUN DURUMUNU KAYDET ==========
  const saveGameState = useCallback(async () => {
    if (!gameSessionRef.current?.gameId || gameState !== 'playing') return

    try {
      await fetch('/api/games/mines/bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_state',
          gameId: gameSessionRef.current.gameId,
          gameState: { grid },
          gamePhase: 'playing'
        })
      })
    } catch (error) {
      console.error('Save state error:', error)
    }
  }, [grid, gameState])

  // Periyodik state kaydetme
  useEffect(() => {
    if (gameState !== 'playing') return

    const interval = setInterval(saveGameState, 10000) // Her 10 saniyede bir
    return () => clearInterval(interval)
  }, [gameState, saveGameState])

  // Sayfa kapatılmadan önce kaydet
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (gameSessionRef.current?.gameId && gameState === 'playing') {
        // Sync request - beforeunload'da async çalışmaz
        navigator.sendBeacon('/api/games/mines/bet', JSON.stringify({
          action: 'save_state',
          gameId: gameSessionRef.current.gameId,
          gameState: { grid },
          gamePhase: 'playing'
        }))
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [grid, gameState])

  // Handle chip selection
  const handleChipSelect = useCallback((value: number) => {
    if (gameState !== 'betting') return
    playSound('click')
    setSelectedChip(value)

    const maxBet = gameSettings?.maxBet ?? 500
    const newBet = Math.min(bet + value, maxBet, user?.points ?? 0)
    setBet(newBet)
  }, [gameState, bet, gameSettings, user, playSound])

  // Clear bet
  const handleClearBet = useCallback(() => {
    if (gameState !== 'betting') return
    playSound('click')
    setBet(0)
    setSelectedChip(null)
  }, [gameState, playSound])

  // Half bet
  const handleHalfBet = useCallback(() => {
    if (gameState !== 'betting') return
    playSound('click')
    setBet(Math.floor(bet / 2))
  }, [gameState, bet, playSound])

  // Double bet
  const handleDoubleBet = useCallback(() => {
    if (gameState !== 'betting') return
    playSound('click')
    const maxBet = gameSettings?.maxBet ?? 500
    setBet(Math.min(bet * 2, maxBet, user?.points ?? 0))
  }, [gameState, bet, gameSettings, user, playSound])

  // Max bet
  const handleMaxBet = useCallback(() => {
    if (gameState !== 'betting') return
    playSound('click')
    const maxBet = gameSettings?.maxBet ?? 500
    setBet(Math.min(maxBet, user?.points ?? 0))
  }, [gameState, gameSettings, user, playSound])

  // Start game
  const handleStartGame = useCallback(async () => {
    if (bet < (gameSettings?.minBet ?? 10)) {
      toast.error(`Minimum bahis ${gameSettings?.minBet ?? 10} puan`)
      return
    }
    if (bet > (user?.points ?? 0)) {
      toast.error('Yetersiz puan!')
      return
    }
    if (isProcessing) return

    setIsProcessing(true)
    playSound('click')

    try {
      const res = await fetch('/api/games/mines/bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          bet,
          mineCount
        })
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Oyun başlatılamadı')
        return
      }

      // Set game session
      const session: GameSession = {
        gameId: data.gameId,
        bet,
        mineCount,
        minePositions: [],
        revealedPositions: [],
        currentMultiplier: 1,
        potentialWin: bet
      }
      setGameSession(session)
      gameSessionRef.current = session

      // Reset grid
      setGrid(createInitialGrid())
      setRevealedCount(0)
      setCurrentMultiplier(1)
      setPotentialWin(bet)
      setGameState('playing')

      await refreshUser()
    } catch (error) {
      toast.error('Bir hata oluştu')
      console.error(error)
    } finally {
      setIsProcessing(false)
    }
  }, [bet, mineCount, gameSettings, user, isProcessing, playSound, refreshUser])

  // Reveal a cell
  const handleRevealCell = useCallback(async (cellId: number) => {
    if (gameState !== 'playing' || isProcessing) return
    if (grid[cellId].isRevealed) return

    setIsProcessing(true)

    try {
      const res = await fetch('/api/games/mines/bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reveal',
          gameId: gameSessionRef.current?.gameId,
          cellId
        })
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Bir hata oluştu')
        return
      }

      if (data.isMine) {
        // Hit a mine - game over
        playSound('lose')

        // Update grid with all mines
        const newGrid = updateGridWithMines(grid, data.minePositions)
        const revealedGrid = revealAllMines(revealCell(newGrid, cellId))
        setGrid(revealedGrid)

        setGameState('lost')
        setAnimatingResult(true)

        setTimeout(() => {
          setAnimatingResult(false)
        }, 2000)

        await refreshUser()
      } else {
        // Safe cell - diamond found
        playSound('diamond')

        const newGrid = revealCell(grid, cellId)
        setGrid(newGrid)

        const newRevealedCount = revealedCount + 1
        setRevealedCount(newRevealedCount)

        // Update session
        if (gameSessionRef.current) {
          gameSessionRef.current.revealedPositions.push(cellId)
          gameSessionRef.current.currentMultiplier = data.multiplier
          gameSessionRef.current.potentialWin = data.potentialWin
        }

        setCurrentMultiplier(data.multiplier)
        setPotentialWin(data.potentialWin)

        // Check if all safe cells revealed
        if (data.allRevealed) {
          // Auto cashout - all diamonds found!
          playSound('win')
          setWinAmount(data.winAmount)
          setGameState('won')
          setAnimatingResult(true)

          // Reveal all mines
          const minesGrid = updateGridWithMines(newGrid, data.minePositions)
          const finalGrid = revealAllMines(minesGrid)
          setGrid(finalGrid)

          toast.success(`Tüm elmasları buldun! +${formatNumber(data.winAmount)} puan kazandın!`)

          await refreshUser()

          setTimeout(() => {
            setAnimatingResult(false)
          }, 2000)
        }
      }
    } catch (error) {
      toast.error('Bir hata oluştu')
      console.error(error)
    } finally {
      setIsProcessing(false)
    }
  }, [gameState, grid, isProcessing, revealedCount, playSound, refreshUser])

  // Cash out
  const handleCashout = useCallback(async () => {
    if (gameState !== 'playing' || isProcessing || revealedCount === 0) return

    setIsProcessing(true)
    playSound('win')

    try {
      const res = await fetch('/api/games/mines/bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cashout',
          gameId: gameSessionRef.current?.gameId
        })
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Bir hata oluştu')
        return
      }

      setWinAmount(data.winAmount)
      setGameState('won')
      setAnimatingResult(true)

      // Reveal all mines
      const newGrid = updateGridWithMines(grid, data.minePositions)
      const revealedGrid = revealAllMines(newGrid)
      setGrid(revealedGrid)

      toast.success(`+${formatNumber(data.winAmount)} puan kazandın!`)

      await refreshUser()

      setTimeout(() => {
        setAnimatingResult(false)
      }, 2000)
    } catch (error) {
      toast.error('Bir hata oluştu')
      console.error(error)
    } finally {
      setIsProcessing(false)
    }
  }, [gameState, isProcessing, revealedCount, grid, playSound, refreshUser])

  // New game
  const handleNewGame = useCallback(() => {
    playSound('click')
    setGrid(createInitialGrid())
    setGameState('betting')
    setRevealedCount(0)
    setCurrentMultiplier(1)
    setPotentialWin(0)
    setWinAmount(0)
    setGameSession(null)
    gameSessionRef.current = null
  }, [playSound])

  // Render cell
  const renderCell = (cell: Cell, index: number) => {
    const isClickable = gameState === 'playing' && !cell.isRevealed && !isProcessing
    const row = Math.floor(index / 5)
    const col = index % 5

    return (
      <button
        key={cell.id}
        onClick={() => handleRevealCell(cell.id)}
        disabled={!isClickable}
        className={`
          aspect-square rounded-xl transition-all duration-300 transform
          flex items-center justify-center text-2xl font-bold
          ${isClickable ? 'hover:scale-105 cursor-pointer active:scale-95' : 'cursor-default'}
          ${cell.isRevealed ? 'scale-100' : 'hover:brightness-110'}
        `}
        style={{
          background: cell.isRevealed
            ? cell.isMine
              ? 'linear-gradient(135deg, #ef4444, #dc2626)'
              : 'linear-gradient(135deg, #22c55e, #16a34a)'
            : `linear-gradient(135deg, ${hexToRgba(theme.colors.primary, 0.3)}, ${hexToRgba(theme.colors.gradientTo, 0.2)})`,
          border: cell.isRevealed
            ? cell.isMine
              ? '2px solid #fca5a5'
              : '2px solid #86efac'
            : `2px solid ${hexToRgba(theme.colors.primary, 0.4)}`,
          boxShadow: cell.isRevealed
            ? cell.isMine
              ? '0 4px 20px rgba(239, 68, 68, 0.4)'
              : '0 4px 20px rgba(34, 197, 94, 0.4)'
            : `0 4px 15px ${hexToRgba(theme.colors.primary, 0.2)}`,
          animationDelay: `${(row + col) * 50}ms`
        }}
      >
        {cell.isRevealed ? (
          cell.isMine ? (
            <Bomb className="w-8 h-8 text-white drop-shadow-lg" />
          ) : (
            <Diamond className="w-8 h-8 text-white drop-shadow-lg" />
          )
        ) : (
          <div
            className="w-4 h-4 rounded-full opacity-50"
            style={{ background: theme.colors.primary }}
          />
        )}
      </button>
    )
  }

  // Loading state
  if (settingsLoading || checkingActiveGame) {
    return (
      <ProtectedRoute>
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ background: theme.colors.background }}
        >
          <RefreshCw className="w-8 h-8 animate-spin" style={{ color: theme.colors.primary }} />
        </div>
      </ProtectedRoute>
    )
  }

  // Game disabled
  if (!gameSettings?.enabled) {
    return (
      <ProtectedRoute>
        <div
          className="min-h-screen flex flex-col items-center justify-center gap-4 p-4"
          style={{ background: theme.colors.background }}
        >
          <AlertCircle className="w-16 h-16 text-red-500" />
          <h1 className="text-xl font-bold" style={{ color: theme.colors.text }}>
            Oyun Devre Dışı
          </h1>
          <p style={{ color: theme.colors.textSecondary }}>
            Mines oyunu şu anda kapalıdır.
          </p>
          <Link
            href="/games"
            className="px-4 py-2 rounded-lg font-medium"
            style={{
              background: theme.colors.primary,
              color: 'white'
            }}
          >
            Oyunlara Dön
          </Link>
        </div>
      </ProtectedRoute>
    )
  }

  // ========== AKTİF OYUN DEVAM MODAL ==========
  if (hasActiveGame && activeGameData) {
    return (
      <ProtectedRoute>
        <div
          className="min-h-screen flex items-center justify-center p-4"
          style={{ background: theme.colors.background }}
        >
          <div
            className="max-w-md w-full rounded-2xl p-6 space-y-6"
            style={{
              background: theme.colors.card,
              border: `1px solid ${hexToRgba(theme.colors.primary, 0.3)}`
            }}
          >
            <div className="text-center">
              <Bomb className="w-16 h-16 mx-auto mb-4" style={{ color: theme.colors.primary }} />
              <h2 className="text-2xl font-bold mb-2" style={{ color: theme.colors.text }}>
                Devam Eden Oyun
              </h2>
              <p style={{ color: theme.colors.textSecondary }}>
                Tamamlanmamış bir oyununuz bulundu.
              </p>
            </div>

            <div
              className="p-4 rounded-xl space-y-3"
              style={{ background: hexToRgba(theme.colors.primary, 0.1) }}
            >
              <div className="flex justify-between">
                <span style={{ color: theme.colors.textSecondary }}>Bahis</span>
                <span className="font-bold" style={{ color: theme.colors.text }}>
                  {formatNumber(activeGameData.betAmount || 0)} puan
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: theme.colors.textSecondary }}>Mayın Sayısı</span>
                <span className="font-bold" style={{ color: theme.colors.text }}>
                  {activeGameData.mineCount}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: theme.colors.textSecondary }}>Açılan Kareler</span>
                <span className="font-bold" style={{ color: theme.colors.text }}>
                  {activeGameData.revealedCount} / {GRID_SIZE - (activeGameData.mineCount || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: theme.colors.textSecondary }}>Mevcut Çarpan</span>
                <span className="font-bold text-green-500">
                  {(activeGameData.currentMultiplier || 1).toFixed(2)}x
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: theme.colors.textSecondary }}>Potansiyel Kazanç</span>
                <span className="font-bold text-green-500">
                  {formatNumber(activeGameData.potentialWin || 0)} puan
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={resumeActiveGame}
                disabled={isProcessing}
                className="w-full py-4 rounded-xl font-bold text-lg text-white flex items-center justify-center gap-2 transition-all"
                style={{
                  background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.gradientTo})`,
                  boxShadow: `0 4px 20px ${hexToRgba(theme.colors.primary, 0.4)}`
                }}
              >
                {isProcessing ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Oyuna Devam Et
                  </>
                )}
              </button>

              <Link
                href="/games"
                className="block w-full py-3 rounded-xl font-medium text-center transition-all"
                style={{
                  background: hexToRgba(theme.colors.primary, 0.1),
                  color: theme.colors.textSecondary
                }}
              >
                Oyunlara Dön
              </Link>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  const nextMultiplier = calculateNextMultiplier(mineCount, revealedCount)
  const mineOptions = getMineCountOptions()

  return (
    <ProtectedRoute>
      <div
        className="min-h-screen pb-20"
        style={{ background: theme.colors.background }}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-50 backdrop-blur-lg border-b"
          style={{
            background: hexToRgba(theme.colors.card, 0.9),
            borderColor: hexToRgba(theme.colors.primary, 0.2)
          }}
        >
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
            <Link
              href="/games"
              className="p-2 rounded-lg transition-colors"
              style={{ background: hexToRgba(theme.colors.primary, 0.1) }}
            >
              <ArrowLeft className="w-5 h-5" style={{ color: theme.colors.text }} />
            </Link>

            <h1 className="text-lg font-bold flex items-center gap-2" style={{ color: theme.colors.text }}>
              <Bomb className="w-5 h-5" style={{ color: theme.colors.primary }} />
              Mines
            </h1>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-2 rounded-lg transition-colors"
                style={{ background: hexToRgba(theme.colors.primary, 0.1) }}
              >
                {soundEnabled ? (
                  <Volume2 className="w-5 h-5" style={{ color: theme.colors.text }} />
                ) : (
                  <VolumeX className="w-5 h-5" style={{ color: theme.colors.textSecondary }} />
                )}
              </button>
              <button
                onClick={() => setShowRules(!showRules)}
                className="p-2 rounded-lg transition-colors"
                style={{ background: hexToRgba(theme.colors.primary, 0.1) }}
              >
                <Info className="w-5 h-5" style={{ color: theme.colors.text }} />
              </button>
            </div>
          </div>
        </div>

        {/* Rules Modal */}
        {showRules && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
            <div
              className="max-w-md w-full rounded-2xl p-6"
              style={{ background: theme.colors.card }}
            >
              <h2 className="text-xl font-bold mb-4" style={{ color: theme.colors.text }}>
                Nasıl Oynanır?
              </h2>
              <ul className="space-y-3 text-sm" style={{ color: theme.colors.textSecondary }}>
                <li className="flex items-start gap-2">
                  <Diamond className="w-4 h-4 mt-0.5 text-green-500 flex-shrink-0" />
                  <span>5x5 ızgarada gizli elmasları bul</span>
                </li>
                <li className="flex items-start gap-2">
                  <Bomb className="w-4 h-4 mt-0.5 text-red-500 flex-shrink-0" />
                  <span>Mayına basarsan tüm bahsini kaybedersin</span>
                </li>
                <li className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: theme.colors.primary }} />
                  <span>Her bulunan elmas çarpanı artırır</span>
                </li>
                <li className="flex items-start gap-2">
                  <Coins className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: theme.colors.primary }} />
                  <span>İstediğin zaman "Çek" diyerek kazancını al</span>
                </li>
                <li className="flex items-start gap-2">
                  <Trophy className="w-4 h-4 mt-0.5 text-yellow-500 flex-shrink-0" />
                  <span>Daha fazla mayın = Daha yüksek çarpan</span>
                </li>
              </ul>
              <button
                onClick={() => setShowRules(false)}
                className="w-full mt-6 py-3 rounded-xl font-bold text-white"
                style={{ background: theme.colors.primary }}
              >
                Anladım
              </button>
            </div>
          </div>
        )}

        <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
          {/* Balance Display */}
          <div
            className="flex items-center justify-between p-4 rounded-xl"
            style={{
              background: hexToRgba(theme.colors.primary, 0.1),
              border: `1px solid ${hexToRgba(theme.colors.primary, 0.2)}`
            }}
          >
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5" style={{ color: theme.colors.primary }} />
              <span style={{ color: theme.colors.textSecondary }}>Bakiye</span>
            </div>
            <span className="text-xl font-bold" style={{ color: theme.colors.text }}>
              {formatNumber(user?.points ?? 0)}
            </span>
          </div>

          {/* Game Grid */}
          <div
            className="p-4 rounded-2xl"
            style={{
              background: hexToRgba(theme.colors.primary, 0.05),
              border: `1px solid ${hexToRgba(theme.colors.primary, 0.2)}`
            }}
          >
            {/* Multiplier Display */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span style={{ color: theme.colors.textSecondary }}>Çarpan</span>
                <span
                  className="text-xl font-bold"
                  style={{ color: revealedCount > 0 ? '#22c55e' : theme.colors.text }}
                >
                  {currentMultiplier.toFixed(2)}x
                </span>
              </div>
              {gameState === 'playing' && revealedCount > 0 && (
                <div className="flex items-center gap-2">
                  <span style={{ color: theme.colors.textSecondary }}>Sonraki</span>
                  <span className="font-bold" style={{ color: theme.colors.primary }}>
                    {nextMultiplier.toFixed(2)}x
                  </span>
                </div>
              )}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-5 gap-2">
              {grid.map((cell, index) => renderCell(cell, index))}
            </div>

            {/* Potential Win */}
            {gameState === 'playing' && revealedCount > 0 && (
              <div
                className="mt-4 p-3 rounded-xl text-center"
                style={{ background: hexToRgba('#22c55e', 0.1) }}
              >
                <span style={{ color: theme.colors.textSecondary }}>Potansiyel Kazanç: </span>
                <span className="text-lg font-bold text-green-500">
                  {formatNumber(potentialWin)} puan
                </span>
              </div>
            )}

            {/* Result Display */}
            {animatingResult && (
              <div
                className={`mt-4 p-4 rounded-xl text-center ${
                  gameState === 'won' ? 'bg-green-500/20' : 'bg-red-500/20'
                }`}
              >
                {gameState === 'won' ? (
                  <>
                    <Trophy className="w-12 h-12 mx-auto mb-2 text-yellow-500" />
                    <p className="text-2xl font-bold text-green-500">
                      +{formatNumber(winAmount)} Puan!
                    </p>
                  </>
                ) : (
                  <>
                    <Bomb className="w-12 h-12 mx-auto mb-2 text-red-500" />
                    <p className="text-2xl font-bold text-red-500">
                      Mayına bastın!
                    </p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Controls */}
          {gameState === 'betting' && (
            <div className="space-y-4">
              {/* Mine Count Selection */}
              <div
                className="p-4 rounded-xl"
                style={{
                  background: hexToRgba(theme.colors.primary, 0.05),
                  border: `1px solid ${hexToRgba(theme.colors.primary, 0.2)}`
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium" style={{ color: theme.colors.text }}>
                    Mayın Sayısı
                  </span>
                  <span style={{ color: theme.colors.textSecondary }}>
                    İlk çarpan: {calculateMultiplier(mineCount, 1).toFixed(2)}x
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {mineOptions.map((option) => (
                    <button
                      key={option.count}
                      onClick={() => {
                        playSound('click')
                        setMineCount(option.count)
                      }}
                      className={`
                        px-4 py-2 rounded-lg font-medium transition-all
                        ${mineCount === option.count ? 'scale-105' : 'opacity-70 hover:opacity-100'}
                      `}
                      style={{
                        background: mineCount === option.count
                          ? theme.colors.primary
                          : hexToRgba(theme.colors.primary, 0.2),
                        color: mineCount === option.count ? 'white' : theme.colors.text
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bet Controls */}
              <div
                className="p-4 rounded-xl"
                style={{
                  background: hexToRgba(theme.colors.primary, 0.05),
                  border: `1px solid ${hexToRgba(theme.colors.primary, 0.2)}`
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium" style={{ color: theme.colors.text }}>
                    Bahis Miktarı
                  </span>
                  <span className="text-xl font-bold" style={{ color: theme.colors.primary }}>
                    {formatNumber(bet)}
                  </span>
                </div>

                {/* Chip Selection */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {CHIP_VALUES.map((value) => (
                    <button
                      key={value}
                      onClick={() => handleChipSelect(value)}
                      disabled={value > (user?.points ?? 0) - bet}
                      className={`
                        px-3 py-2 rounded-lg font-medium transition-all text-sm
                        ${value <= (user?.points ?? 0) - bet ? 'hover:scale-105' : 'opacity-40 cursor-not-allowed'}
                      `}
                      style={{
                        background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.gradientTo})`,
                        color: 'white'
                      }}
                    >
                      +{value}
                    </button>
                  ))}
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={handleClearBet}
                    disabled={bet === 0}
                    className="flex-1 py-2 rounded-lg font-medium text-sm transition-all disabled:opacity-40"
                    style={{
                      background: hexToRgba(theme.colors.primary, 0.2),
                      color: theme.colors.text
                    }}
                  >
                    Temizle
                  </button>
                  <button
                    onClick={handleHalfBet}
                    disabled={bet < 2}
                    className="flex-1 py-2 rounded-lg font-medium text-sm transition-all disabled:opacity-40"
                    style={{
                      background: hexToRgba(theme.colors.primary, 0.2),
                      color: theme.colors.text
                    }}
                  >
                    1/2
                  </button>
                  <button
                    onClick={handleDoubleBet}
                    disabled={bet * 2 > (user?.points ?? 0)}
                    className="flex-1 py-2 rounded-lg font-medium text-sm transition-all disabled:opacity-40"
                    style={{
                      background: hexToRgba(theme.colors.primary, 0.2),
                      color: theme.colors.text
                    }}
                  >
                    2x
                  </button>
                  <button
                    onClick={handleMaxBet}
                    disabled={(user?.points ?? 0) === 0}
                    className="flex-1 py-2 rounded-lg font-medium text-sm transition-all disabled:opacity-40"
                    style={{
                      background: hexToRgba(theme.colors.primary, 0.2),
                      color: theme.colors.text
                    }}
                  >
                    Max
                  </button>
                </div>
              </div>

              {/* Start Button */}
              <button
                onClick={handleStartGame}
                disabled={bet < (gameSettings?.minBet ?? 10) || isProcessing}
                className="w-full py-4 rounded-xl font-bold text-lg text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                style={{
                  background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.gradientTo})`,
                  boxShadow: `0 4px 20px ${hexToRgba(theme.colors.primary, 0.4)}`
                }}
              >
                {isProcessing ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Oyunu Başlat
                  </>
                )}
              </button>
            </div>
          )}

          {/* Playing Controls */}
          {gameState === 'playing' && (
            <div className="space-y-4">
              <button
                onClick={handleCashout}
                disabled={revealedCount === 0 || isProcessing}
                className="w-full py-4 rounded-xl font-bold text-lg text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                style={{
                  background: revealedCount > 0
                    ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                    : hexToRgba(theme.colors.primary, 0.3),
                  boxShadow: revealedCount > 0 ? '0 4px 20px rgba(34, 197, 94, 0.4)' : 'none'
                }}
              >
                {isProcessing ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Coins className="w-5 h-5" />
                    Çek ({formatNumber(potentialWin)} puan)
                  </>
                )}
              </button>

              <p className="text-center text-sm" style={{ color: theme.colors.textSecondary }}>
                Bir kareye tıklayarak elmas ara veya "Çek" diyerek kazancını al
              </p>
            </div>
          )}

          {/* Game Over Controls */}
          {(gameState === 'won' || gameState === 'lost') && !animatingResult && (
            <button
              onClick={handleNewGame}
              className="w-full py-4 rounded-xl font-bold text-lg text-white transition-all flex items-center justify-center gap-2"
              style={{
                background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.gradientTo})`,
                boxShadow: `0 4px 20px ${hexToRgba(theme.colors.primary, 0.4)}`
              }}
            >
              <RefreshCw className="w-5 h-5" />
              Yeni Oyun
            </button>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}

export default function MinesPage() {
  return <MinesGame />
}
