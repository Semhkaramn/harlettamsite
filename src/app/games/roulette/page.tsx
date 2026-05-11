'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useUserTheme } from '@/components/providers/user-theme-provider'
import { useAuth } from '@/components/providers/auth-provider'
import { hexToRgba } from '@/components/ui/themed'
import {
  ArrowLeft,
  Coins,
  Trophy,
  Sparkles,
  AlertCircle,
  Info,
  Volume2,
  VolumeX,
  RefreshCw,
  X,
  Trash2
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

import type { Bet, BetType, GamePhase, RouletteSettings } from './types'
import { PAYOUT_RATES } from './types'
import {
  WHEEL_NUMBERS,
  RED_NUMBERS,
  CHIP_VALUES,
  getNumberColor,
  getWheelAngle,
  formatNumber,
  getBetTypeLabel
} from './utils'

// Rulet çarkı komponenti
function RouletteWheel({
  spinning,
  resultNumber,
  onSpinEnd,
  theme
}: {
  spinning: boolean
  resultNumber: number | null
  onSpinEnd: () => void
  theme: { colors: { primary: string; gradientTo: string; text: string; card: string } }
}) {
  const wheelRef = useRef<HTMLDivElement>(null)
  const ballRef = useRef<HTMLDivElement>(null)
  const [currentRotation, setCurrentRotation] = useState(0)

  useEffect(() => {
    if (spinning && resultNumber !== null) {
      // Çarkın dönüş açısını hesapla
      const targetAngle = getWheelAngle(resultNumber)
      // Birkaç tam tur + hedef açı
      const spins = 5 + Math.random() * 3 // 5-8 tur
      const totalRotation = spins * 360 + (360 - targetAngle)

      setCurrentRotation(prev => prev + totalRotation)

      // Animasyon bitince
      const timeout = setTimeout(() => {
        onSpinEnd()
      }, 5000)

      return () => clearTimeout(timeout)
    }
  }, [spinning, resultNumber, onSpinEnd])

  return (
    <div className="relative w-full max-w-[320px] mx-auto aspect-square">
      {/* Dış çerçeve - Altın rengi */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'linear-gradient(145deg, #d4af37, #b8860b, #d4af37)',
          boxShadow: '0 0 40px rgba(212, 175, 55, 0.5), inset 0 0 20px rgba(0,0,0,0.3)'
        }}
      />

      {/* Ahşap çerçeve */}
      <div
        className="absolute inset-[4px] rounded-full"
        style={{
          background: 'linear-gradient(145deg, #8B4513, #654321, #8B4513)',
          boxShadow: 'inset 0 0 30px rgba(0,0,0,0.5)'
        }}
      />

      {/* Çark - Dönen kısım */}
      <div
        ref={wheelRef}
        className="absolute inset-[12px] rounded-full overflow-hidden"
        style={{
          transform: `rotate(${currentRotation}deg)`,
          transition: spinning ? 'transform 5s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
          background: '#1a1a2e'
        }}
      >
        {/* Sayı dilimleri */}
        {WHEEL_NUMBERS.map((num, index) => {
          const angle = (index * 360) / 37
          const color = getNumberColor(num)

          return (
            <div
              key={num}
              className="absolute top-0 left-1/2 origin-bottom"
              style={{
                width: '2px',
                height: '50%',
                transform: `translateX(-50%) rotate(${angle}deg)`,
              }}
            >
              {/* Sayı dilimi rengi */}
              <div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[22px] h-[60px] flex items-end justify-center pb-1"
                style={{
                  background: color === 'green'
                    ? 'linear-gradient(to top, #00a651, #008c44)'
                    : color === 'red'
                    ? 'linear-gradient(to top, #c62828, #b71c1c)'
                    : 'linear-gradient(to top, #212121, #1a1a1a)',
                  borderRadius: '0 0 4px 4px',
                  clipPath: 'polygon(30% 0, 70% 0, 100% 100%, 0 100%)'
                }}
              >
                <span
                  className="text-[10px] font-bold text-white"
                  style={{
                    transform: 'rotate(180deg)',
                    textShadow: '0 1px 2px rgba(0,0,0,0.8)'
                  }}
                >
                  {num}
                </span>
              </div>
            </div>
          )
        })}

        {/* Altın iç halka */}
        <div
          className="absolute inset-[70px] rounded-full"
          style={{
            background: 'linear-gradient(145deg, #d4af37, #b8860b)',
            boxShadow: '0 0 15px rgba(212, 175, 55, 0.5)'
          }}
        />

        {/* Merkez dekor */}
        <div
          className="absolute inset-[80px] rounded-full"
          style={{
            background: 'linear-gradient(145deg, #8B4513, #654321)',
            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)'
          }}
        />

        {/* Merkez logo */}
        <div
          className="absolute inset-[90px] rounded-full flex items-center justify-center"
          style={{
            background: 'linear-gradient(145deg, #1a1a2e, #0f0f1a)',
            boxShadow: 'inset 0 0 10px rgba(0,0,0,0.8)'
          }}
        >
          <span className="text-xl font-bold text-amber-400">R</span>
        </div>
      </div>

      {/* Top işareti (sabit) */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-20"
        style={{
          width: 0,
          height: 0,
          borderLeft: '12px solid transparent',
          borderRight: '12px solid transparent',
          borderTop: '20px solid #d4af37',
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))'
        }}
      />

      {/* Top (ball) */}
      <div
        ref={ballRef}
        className={`absolute top-[20px] left-1/2 -translate-x-1/2 w-4 h-4 rounded-full z-10 ${
          spinning ? 'animate-pulse' : ''
        }`}
        style={{
          background: 'radial-gradient(circle at 30% 30%, #ffffff, #e0e0e0, #a0a0a0)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.5), inset 0 -2px 4px rgba(0,0,0,0.2)'
        }}
      />

      {/* Işık efekti */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%)'
        }}
      />
    </div>
  )
}

// Bahis tablosu komponenti
function BettingBoard({
  selectedChip,
  bets,
  onPlaceBet,
  onRemoveBet,
  disabled,
  theme
}: {
  selectedChip: number | null
  bets: Bet[]
  onPlaceBet: (type: BetType, value?: number) => void
  onRemoveBet: (type: BetType, value?: number) => void
  disabled: boolean
  theme: { colors: { primary: string; gradientTo: string; text: string; textSecondary: string; card: string } }
}) {
  const getBetAmount = (type: BetType, value?: number) => {
    const bet = bets.find(b => b.type === type && b.value === value)
    return bet?.amount || 0
  }

  const renderNumberButton = (num: number) => {
    const color = getNumberColor(num)
    const betAmount = getBetAmount('number', num)

    return (
      <button
        key={num}
        onClick={() => !disabled && onPlaceBet('number', num)}
        onContextMenu={(e) => {
          e.preventDefault()
          if (!disabled) onRemoveBet('number', num)
        }}
        disabled={disabled}
        className={`
          relative aspect-[1.2] rounded-lg font-bold text-white text-sm
          transition-all duration-200 flex items-center justify-center
          ${!disabled ? 'hover:scale-105 hover:brightness-110 active:scale-95' : 'opacity-70'}
        `}
        style={{
          background: color === 'green'
            ? 'linear-gradient(145deg, #00a651, #008c44)'
            : color === 'red'
            ? 'linear-gradient(145deg, #c62828, #b71c1c)'
            : 'linear-gradient(145deg, #2a2a2a, #1a1a1a)',
          border: betAmount > 0 ? '2px solid #d4af37' : '1px solid rgba(255,255,255,0.2)',
          boxShadow: betAmount > 0 ? '0 0 10px rgba(212, 175, 55, 0.5)' : '0 2px 4px rgba(0,0,0,0.3)'
        }}
      >
        {num}
        {betAmount > 0 && (
          <div className="absolute -top-2 -right-2 bg-amber-500 text-black text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {betAmount}
          </div>
        )}
      </button>
    )
  }

  const renderSpecialBet = (type: BetType, label: string, color?: string) => {
    const betAmount = getBetAmount(type)
    const bgColor = color || hexToRgba(theme.colors.primary, 0.3)

    return (
      <button
        onClick={() => !disabled && onPlaceBet(type)}
        onContextMenu={(e) => {
          e.preventDefault()
          if (!disabled) onRemoveBet(type)
        }}
        disabled={disabled}
        className={`
          relative px-3 py-2 rounded-lg font-semibold text-sm text-white
          transition-all duration-200
          ${!disabled ? 'hover:scale-105 hover:brightness-110 active:scale-95' : 'opacity-70'}
        `}
        style={{
          background: bgColor,
          border: betAmount > 0 ? '2px solid #d4af37' : '1px solid rgba(255,255,255,0.2)',
          boxShadow: betAmount > 0 ? '0 0 10px rgba(212, 175, 55, 0.5)' : '0 2px 4px rgba(0,0,0,0.3)'
        }}
      >
        {label}
        {betAmount > 0 && (
          <div className="absolute -top-2 -right-2 bg-amber-500 text-black text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {betAmount}
          </div>
        )}
      </button>
    )
  }

  return (
    <div className="space-y-3">
      {/* Ana sayı tablosu */}
      <div
        className="p-3 rounded-xl"
        style={{
          background: 'linear-gradient(145deg, #0f4c2e, #0a3621)',
          border: '2px solid #d4af37'
        }}
      >
        {/* 0 */}
        <div className="flex justify-center mb-2">
          {renderNumberButton(0)}
        </div>

        {/* Sayı grid'i (1-36) */}
        <div className="grid grid-cols-12 gap-1">
          {Array.from({ length: 36 }, (_, i) => i + 1).map(num => renderNumberButton(num))}
        </div>

        {/* Sütun bahisleri */}
        <div className="grid grid-cols-3 gap-2 mt-2">
          {renderSpecialBet('column1', '2:1 (1. Sütun)', 'linear-gradient(145deg, #4a4a4a, #3a3a3a)')}
          {renderSpecialBet('column2', '2:1 (2. Sütun)', 'linear-gradient(145deg, #4a4a4a, #3a3a3a)')}
          {renderSpecialBet('column3', '2:1 (3. Sütun)', 'linear-gradient(145deg, #4a4a4a, #3a3a3a)')}
        </div>

        {/* Düzine bahisleri */}
        <div className="grid grid-cols-3 gap-2 mt-2">
          {renderSpecialBet('first12', '1-12', 'linear-gradient(145deg, #4a4a4a, #3a3a3a)')}
          {renderSpecialBet('second12', '13-24', 'linear-gradient(145deg, #4a4a4a, #3a3a3a)')}
          {renderSpecialBet('third12', '25-36', 'linear-gradient(145deg, #4a4a4a, #3a3a3a)')}
        </div>

        {/* Dış bahisler */}
        <div className="grid grid-cols-6 gap-2 mt-2">
          {renderSpecialBet('low', '1-18', 'linear-gradient(145deg, #4a4a4a, #3a3a3a)')}
          {renderSpecialBet('even', 'Cift', 'linear-gradient(145deg, #4a4a4a, #3a3a3a)')}
          {renderSpecialBet('red', 'Kirmizi', 'linear-gradient(145deg, #c62828, #b71c1c)')}
          {renderSpecialBet('black', 'Siyah', 'linear-gradient(145deg, #2a2a2a, #1a1a1a)')}
          {renderSpecialBet('odd', 'Tek', 'linear-gradient(145deg, #4a4a4a, #3a3a3a)')}
          {renderSpecialBet('high', '19-36', 'linear-gradient(145deg, #4a4a4a, #3a3a3a)')}
        </div>
      </div>

      {/* Sağ tık ile bahis silme bilgisi */}
      <p className="text-center text-xs" style={{ color: theme.colors.textSecondary }}>
        Bahis koymak icin tiklayin, silmek icin sag tiklayin
      </p>
    </div>
  )
}

function RouletteGame() {
  const { theme } = useUserTheme()
  const { user, refreshUser } = useAuth()

  // Game state
  const [gamePhase, setGamePhase] = useState<GamePhase>('betting')
  const [bets, setBets] = useState<Bet[]>([])
  const [selectedChip, setSelectedChip] = useState<number>(10)
  const [resultNumber, setResultNumber] = useState<number | null>(null)
  const [resultColor, setResultColor] = useState<'red' | 'black' | 'green' | null>(null)
  const [totalWin, setTotalWin] = useState(0)
  const [netChange, setNetChange] = useState(0)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [showRules, setShowRules] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // Settings
  const [gameSettings, setGameSettings] = useState<RouletteSettings | null>(null)
  const [settingsLoading, setSettingsLoading] = useState(true)

  // Audio refs
  const spinSoundRef = useRef<HTMLAudioElement | null>(null)
  const winSoundRef = useRef<HTMLAudioElement | null>(null)
  const loseSoundRef = useRef<HTMLAudioElement | null>(null)
  const chipSoundRef = useRef<HTMLAudioElement | null>(null)

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch('/api/games/roulette/bet')
        if (res.ok) {
          const data = await res.json()
          setGameSettings({
            enabled: data.enabled ?? true,
            maxBet: data.maxBet ?? 500,
            minBet: data.minBet ?? 10
          })
        }
      } catch (error) {
        console.error('Failed to load settings:', error)
        setGameSettings({
          enabled: true,
          maxBet: 500,
          minBet: 10
        })
      } finally {
        setSettingsLoading(false)
      }
    }
    loadSettings()
  }, [])

  // Initialize audio
  useEffect(() => {
    spinSoundRef.current = new Audio('/sounds/chip.mp3')
    winSoundRef.current = new Audio('/sounds/win.mp3')
    loseSoundRef.current = new Audio('/sounds/lose.mp3')
    chipSoundRef.current = new Audio('/sounds/chip.mp3')
  }, [])

  const playSound = useCallback((type: 'spin' | 'win' | 'lose' | 'chip') => {
    if (!soundEnabled) return
    const audioMap = {
      spin: spinSoundRef.current,
      win: winSoundRef.current,
      lose: loseSoundRef.current,
      chip: chipSoundRef.current
    }
    const audio = audioMap[type]
    if (audio) {
      audio.currentTime = 0
      audio.volume = 0.5
      audio.play().catch(() => {})
    }
  }, [soundEnabled])

  // Toplam bahis hesapla
  const totalBet = bets.reduce((sum, bet) => sum + bet.amount, 0)

  // Bahis koy
  const handlePlaceBet = useCallback((type: BetType, value?: number) => {
    if (gamePhase !== 'betting') return

    const newTotalBet = totalBet + selectedChip
    const maxBet = gameSettings?.maxBet ?? 500

    if (newTotalBet > maxBet) {
      toast.error(`Maksimum bahis ${maxBet} puandır`)
      return
    }

    if (newTotalBet > (user?.points ?? 0)) {
      toast.error('Yetersiz puan!')
      return
    }

    playSound('chip')

    setBets(prev => {
      const existingIndex = prev.findIndex(b => b.type === type && b.value === value)
      if (existingIndex >= 0) {
        const updated = [...prev]
        updated[existingIndex] = {
          ...updated[existingIndex],
          amount: updated[existingIndex].amount + selectedChip
        }
        return updated
      }
      return [...prev, { type, value, amount: selectedChip }]
    })
  }, [gamePhase, selectedChip, totalBet, gameSettings, user, playSound])

  // Bahis sil
  const handleRemoveBet = useCallback((type: BetType, value?: number) => {
    if (gamePhase !== 'betting') return

    playSound('chip')

    setBets(prev => {
      const existingIndex = prev.findIndex(b => b.type === type && b.value === value)
      if (existingIndex >= 0) {
        const updated = [...prev]
        const newAmount = updated[existingIndex].amount - selectedChip
        if (newAmount <= 0) {
          updated.splice(existingIndex, 1)
        } else {
          updated[existingIndex] = { ...updated[existingIndex], amount: newAmount }
        }
        return updated
      }
      return prev
    })
  }, [gamePhase, selectedChip, playSound])

  // Tüm bahisleri temizle
  const handleClearBets = useCallback(() => {
    if (gamePhase !== 'betting') return
    playSound('chip')
    setBets([])
  }, [gamePhase, playSound])

  // Çarkı çevir
  const handleSpin = useCallback(async () => {
    if (bets.length === 0) {
      toast.error('Bahis yapmalısınız')
      return
    }
    if (totalBet < (gameSettings?.minBet ?? 10)) {
      toast.error(`Minimum bahis ${gameSettings?.minBet ?? 10} puandır`)
      return
    }
    if (isProcessing) return

    setIsProcessing(true)
    playSound('spin')
    setGamePhase('spinning')

    try {
      const res = await fetch('/api/games/roulette/bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'spin',
          bets: bets.map(b => ({
            type: b.type,
            value: b.value,
            amount: b.amount
          }))
        })
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Bir hata oluştu')
        setGamePhase('betting')
        setIsProcessing(false)
        return
      }

      // Sonucu ayarla
      setResultNumber(data.result.number)
      setResultColor(data.result.color)
      setTotalWin(data.totalWin)
      setNetChange(data.netChange)

    } catch (error) {
      toast.error('Bir hata oluştu')
      console.error(error)
      setGamePhase('betting')
      setIsProcessing(false)
    }
  }, [bets, totalBet, gameSettings, isProcessing, playSound])

  // Çark durduğunda
  const handleSpinEnd = useCallback(async () => {
    setGamePhase('result')
    setIsProcessing(false)

    if (netChange > 0) {
      playSound('win')
    } else {
      playSound('lose')
    }

    await refreshUser()
  }, [netChange, playSound, refreshUser])

  // Yeni oyun
  const handleNewGame = useCallback(() => {
    playSound('chip')
    setBets([])
    setResultNumber(null)
    setResultColor(null)
    setTotalWin(0)
    setNetChange(0)
    setGamePhase('betting')
  }, [playSound])

  // Loading state
  if (settingsLoading) {
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
            Oyun Devre Disi
          </h1>
          <p style={{ color: theme.colors.textSecondary }}>
            Rulet oyunu su anda kapalidir.
          </p>
          <Link
            href="/games"
            className="px-4 py-2 rounded-lg font-medium"
            style={{
              background: theme.colors.primary,
              color: 'white'
            }}
          >
            Oyunlara Don
          </Link>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div
        className="min-h-screen pb-20"
        style={{
          background: `linear-gradient(145deg, ${theme.colors.background}, #0a1628)`
        }}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-50 backdrop-blur-lg border-b"
          style={{
            background: hexToRgba(theme.colors.card, 0.9),
            borderColor: hexToRgba(theme.colors.primary, 0.2)
          }}
        >
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link
              href="/games"
              className="p-2 rounded-lg transition-colors"
              style={{ background: hexToRgba(theme.colors.primary, 0.1) }}
            >
              <ArrowLeft className="w-5 h-5" style={{ color: theme.colors.text }} />
            </Link>

            <h1 className="text-lg font-bold flex items-center gap-2" style={{ color: theme.colors.text }}>
              <span className="text-2xl">🎰</span>
              Rulet
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
              className="max-w-md w-full rounded-2xl p-6 max-h-[80vh] overflow-y-auto"
              style={{ background: theme.colors.card }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold" style={{ color: theme.colors.text }}>
                  Nasil Oynanir?
                </h2>
                <button onClick={() => setShowRules(false)}>
                  <X className="w-5 h-5" style={{ color: theme.colors.textSecondary }} />
                </button>
              </div>

              <div className="space-y-4 text-sm" style={{ color: theme.colors.textSecondary }}>
                <div>
                  <h3 className="font-bold mb-2" style={{ color: theme.colors.text }}>Bahis Turleri</h3>
                  <ul className="space-y-1 pl-4 list-disc">
                    <li><span className="text-amber-400">Tek Sayi</span>: 35:1 odeme (orn: 7 uzerine)</li>
                    <li><span className="text-red-500">Kirmizi</span> / <span className="text-gray-400">Siyah</span>: 1:1 odeme</li>
                    <li><span className="text-amber-400">Tek/Cift</span>: 1:1 odeme</li>
                    <li><span className="text-amber-400">1-18 / 19-36</span>: 1:1 odeme</li>
                    <li><span className="text-amber-400">Duzine (1-12, 13-24, 25-36)</span>: 2:1 odeme</li>
                    <li><span className="text-amber-400">Sutun</span>: 2:1 odeme</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-bold mb-2" style={{ color: theme.colors.text }}>Ipuclari</h3>
                  <ul className="space-y-1 pl-4 list-disc">
                    <li>Chip secip tablodaki alanlara tiklayin</li>
                    <li>Sag tiklayarak bahis silebilirsiniz</li>
                    <li>0 (yesil) kirmizi/siyah bahislerini kaybettirir</li>
                  </ul>
                </div>
              </div>

              <button
                onClick={() => setShowRules(false)}
                className="w-full mt-6 py-3 rounded-xl font-bold text-white"
                style={{ background: theme.colors.primary }}
              >
                Anladim
              </button>
            </div>
          </div>
        )}

        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
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

          {/* Roulette Wheel */}
          <div
            className="p-6 rounded-2xl"
            style={{
              background: `linear-gradient(145deg, ${hexToRgba(theme.colors.primary, 0.1)}, ${hexToRgba(theme.colors.gradientTo, 0.05)})`,
              border: `1px solid ${hexToRgba(theme.colors.primary, 0.2)}`
            }}
          >
            <RouletteWheel
              spinning={gamePhase === 'spinning'}
              resultNumber={resultNumber}
              onSpinEnd={handleSpinEnd}
              theme={theme}
            />

            {/* Result Display */}
            {gamePhase === 'result' && resultNumber !== null && (
              <div className="mt-6 text-center">
                <div
                  className="inline-flex items-center gap-3 px-6 py-4 rounded-xl"
                  style={{
                    background: resultColor === 'green'
                      ? 'linear-gradient(145deg, #00a651, #008c44)'
                      : resultColor === 'red'
                      ? 'linear-gradient(145deg, #c62828, #b71c1c)'
                      : 'linear-gradient(145deg, #2a2a2a, #1a1a1a)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
                  }}
                >
                  <span className="text-4xl font-black text-white">{resultNumber}</span>
                </div>

                {netChange !== 0 && (
                  <div className={`mt-4 text-2xl font-bold ${netChange > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {netChange > 0 ? '+' : ''}{formatNumber(netChange)} puan
                  </div>
                )}

                {netChange > 0 && (
                  <div className="mt-2 flex items-center justify-center gap-2">
                    <Trophy className="w-6 h-6 text-yellow-500" />
                    <span className="text-lg" style={{ color: theme.colors.text }}>
                      Kazandiniz!
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Chip Selection */}
          {gamePhase === 'betting' && (
            <div
              className="p-4 rounded-xl"
              style={{
                background: hexToRgba(theme.colors.primary, 0.05),
                border: `1px solid ${hexToRgba(theme.colors.primary, 0.2)}`
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium" style={{ color: theme.colors.text }}>
                  Chip Sec
                </span>
                <span style={{ color: theme.colors.textSecondary }}>
                  Toplam Bahis: <span className="font-bold text-amber-400">{formatNumber(totalBet)}</span>
                </span>
              </div>

              <div className="flex flex-wrap gap-2 justify-center">
                {CHIP_VALUES.map((value) => (
                  <button
                    key={value}
                    onClick={() => {
                      playSound('chip')
                      setSelectedChip(value)
                    }}
                    className={`
                      w-14 h-14 rounded-full font-bold text-white transition-all
                      ${selectedChip === value ? 'scale-110 ring-2 ring-amber-400' : 'opacity-70 hover:opacity-100 hover:scale-105'}
                    `}
                    style={{
                      background: `linear-gradient(145deg, ${theme.colors.primary}, ${theme.colors.gradientTo})`,
                      boxShadow: selectedChip === value
                        ? `0 4px 20px ${hexToRgba(theme.colors.primary, 0.6)}`
                        : '0 2px 8px rgba(0,0,0,0.3)'
                    }}
                  >
                    {value}
                  </button>
                ))}
              </div>

              {/* Clear All Button */}
              {bets.length > 0 && (
                <button
                  onClick={handleClearBets}
                  className="mt-3 flex items-center gap-2 mx-auto px-4 py-2 rounded-lg text-red-500 transition-all hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4" />
                  Tum Bahisleri Temizle
                </button>
              )}
            </div>
          )}

          {/* Betting Board */}
          {gamePhase === 'betting' && (
            <BettingBoard
              selectedChip={selectedChip}
              bets={bets}
              onPlaceBet={handlePlaceBet}
              onRemoveBet={handleRemoveBet}
              disabled={false}
              theme={theme}
            />
          )}

          {/* Active Bets Summary */}
          {bets.length > 0 && gamePhase === 'betting' && (
            <div
              className="p-4 rounded-xl"
              style={{
                background: hexToRgba(theme.colors.primary, 0.05),
                border: `1px solid ${hexToRgba(theme.colors.primary, 0.2)}`
              }}
            >
              <h3 className="font-medium mb-2" style={{ color: theme.colors.text }}>
                Aktif Bahisler
              </h3>
              <div className="flex flex-wrap gap-2">
                {bets.map((bet, index) => (
                  <div
                    key={index}
                    className="px-3 py-1 rounded-lg text-sm font-medium text-white"
                    style={{
                      background: bet.type === 'red'
                        ? 'linear-gradient(145deg, #c62828, #b71c1c)'
                        : bet.type === 'black'
                        ? 'linear-gradient(145deg, #2a2a2a, #1a1a1a)'
                        : `linear-gradient(145deg, ${theme.colors.primary}, ${theme.colors.gradientTo})`
                    }}
                  >
                    {bet.type === 'number' ? bet.value : getBetTypeLabel(bet.type)}: {bet.amount}p
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Spin Button */}
          {gamePhase === 'betting' && (
            <button
              onClick={handleSpin}
              disabled={bets.length === 0 || totalBet < (gameSettings?.minBet ?? 10) || isProcessing}
              className="w-full py-4 rounded-xl font-bold text-lg text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              style={{
                background: `linear-gradient(145deg, #d4af37, #b8860b)`,
                boxShadow: '0 4px 20px rgba(212, 175, 55, 0.4)'
              }}
            >
              {isProcessing ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Carki Cevir
                </>
              )}
            </button>
          )}

          {/* Spinning State */}
          {gamePhase === 'spinning' && (
            <div className="text-center py-4">
              <p className="text-lg font-medium animate-pulse" style={{ color: theme.colors.text }}>
                Cark dönuyor...
              </p>
            </div>
          )}

          {/* New Game Button */}
          {gamePhase === 'result' && (
            <button
              onClick={handleNewGame}
              className="w-full py-4 rounded-xl font-bold text-lg text-white transition-all flex items-center justify-center gap-2"
              style={{
                background: `linear-gradient(145deg, ${theme.colors.primary}, ${theme.colors.gradientTo})`,
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

export default function RoulettePage() {
  return <RouletteGame />
}
