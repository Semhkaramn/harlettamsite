'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import type { Card } from '../types'
import { suitSymbols, suitColors } from '../utils'

// ============================================
// PlayingCard Component - Improved with smooth animations
// ============================================
export function PlayingCard({
  card,
  index,
  totalCards = 1,
  isDealing = false,
  delay = 0,
  isFlipping = false,
  hasFlipped = false,
  enableFan = true,
  animateFromDeck = false,
}: {
  card: Card
  index: number
  totalCards?: number
  isDealing?: boolean
  delay?: number
  isFlipping?: boolean
  hasFlipped?: boolean
  enableFan?: boolean
  animateFromDeck?: boolean
}) {
  const shouldAnimate = isDealing || card.isNew
  const [isVisible, setIsVisible] = useState(!shouldAnimate)
  const [hasAnimated, setHasAnimated] = useState(false)
  const [animationPhase, setAnimationPhase] = useState<'hidden' | 'flying' | 'arrived'>(!shouldAnimate ? 'arrived' : 'hidden')

  // Flip state
  const flipStartedRef = useRef(false)
  const [showFront, setShowFront] = useState(() => !card.hidden)

  // Handle dealing animation - improved
  useEffect(() => {
    if (shouldAnimate && !hasAnimated) {
      setAnimationPhase('hidden')
      setIsVisible(false)

      const timer1 = setTimeout(() => {
        setAnimationPhase('flying')
        setIsVisible(true)
      }, delay)

      const timer2 = setTimeout(() => {
        setAnimationPhase('arrived')
        setHasAnimated(true)
      }, delay + 400)

      return () => {
        clearTimeout(timer1)
        clearTimeout(timer2)
      }
    } else if (!shouldAnimate) {
      setIsVisible(true)
      setAnimationPhase('arrived')
    }
  }, [shouldAnimate, delay, hasAnimated])

  // Reset animation state when card changes
  useEffect(() => {
    if (card.isNew) {
      setHasAnimated(false)
      setIsVisible(false)
      setAnimationPhase('hidden')

      const timer1 = setTimeout(() => {
        setAnimationPhase('flying')
        setIsVisible(true)
      }, 50)

      const timer2 = setTimeout(() => {
        setAnimationPhase('arrived')
        setHasAnimated(true)
      }, 450)

      return () => {
        clearTimeout(timer1)
        clearTimeout(timer2)
      }
    }
  }, [card.id, card.isNew])

  // Handle flip animation
  useEffect(() => {
    if (isFlipping && !flipStartedRef.current) {
      flipStartedRef.current = true
      const timer = setTimeout(() => {
        setShowFront(true)
      }, 250)
      return () => clearTimeout(timer)
    }

    if (hasFlipped) {
      setShowFront(true)
      flipStartedRef.current = false
    }

    if (!isFlipping && !hasFlipped) {
      flipStartedRef.current = false
      setShowFront(!card.hidden)
    }
  }, [isFlipping, hasFlipped, card.hidden])

  // Reset showFront when card changes
  useEffect(() => {
    if (!isFlipping && !hasFlipped) {
      setShowFront(!card.hidden)
    }
  }, [card.id, isFlipping, hasFlipped, card.hidden])

  const symbol = suitSymbols[card.suit]
  const color = suitColors[card.suit]

  const shouldShowBack = card.hidden && !isFlipping && !hasFlipped
  const rotateY = shouldShowBack ? 180 : (isFlipping && !showFront ? 180 : 0)

  // Calculate fan angle for card spread
  const fanAngle = useMemo(() => {
    if (!enableFan || totalCards <= 1) return 0
    const maxAngle = Math.min(totalCards * 4, 15) // Max 15 degrees spread
    const startAngle = -maxAngle / 2
    return startAngle + (index * maxAngle) / (totalCards - 1)
  }, [enableFan, totalCards, index])

  // Animation styles
  const getAnimationStyle = () => {
    if (animateFromDeck && animationPhase === 'hidden') {
      return {
        transform: `rotate(${fanAngle}deg) translateY(-200px) scale(0.5)`,
        opacity: 0,
      }
    }
    if (animationPhase === 'flying') {
      return {
        transform: `rotate(${fanAngle}deg) translateY(0) scale(1)`,
        opacity: 1,
      }
    }
    return {
      transform: `rotate(${fanAngle}deg)`,
      opacity: isVisible ? 1 : 0,
    }
  }

  return (
    <div
      className={`relative w-[72px] h-[108px] sm:w-[80px] sm:h-[120px] md:w-[88px] md:h-[132px] lg:w-[96px] lg:h-[144px]
        transform transition-all duration-500 ease-out`}
      style={{
        transitionDelay: shouldAnimate && !hasAnimated ? `${delay}ms` : '0ms',
        perspective: '1000px',
        transformOrigin: 'bottom center',
        ...getAnimationStyle(),
      }}
    >
      <div
        className="relative w-full h-full transition-transform duration-500 ease-in-out"
        style={{
          transformStyle: 'preserve-3d',
          transform: `rotateY(${rotateY}deg)`
        }}
      >
        {/* Front of card */}
        <div
          className="absolute inset-0 rounded-lg sm:rounded-xl shadow-xl bg-white"
          style={{
            border: '1px solid #d1d5db',
            backfaceVisibility: 'hidden',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), inset 0 0 0 1px rgba(255, 255, 255, 0.5)'
          }}
        >
          {/* Top left corner */}
          <div className="absolute top-1 left-1 sm:top-1.5 sm:left-1.5 flex flex-col items-center leading-none">
            <span className="text-xs sm:text-sm md:text-base font-bold" style={{ color }}>{card.value}</span>
            <span className="text-sm sm:text-base md:text-lg -mt-0.5" style={{ color }}>{symbol}</span>
          </div>
          {/* Center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl" style={{ color }}>{symbol}</span>
          </div>
          {/* Bottom right corner */}
          <div className="absolute bottom-1 right-1 sm:bottom-1.5 sm:right-1.5 flex flex-col items-center leading-none rotate-180">
            <span className="text-xs sm:text-sm md:text-base font-bold" style={{ color }}>{card.value}</span>
            <span className="text-sm sm:text-base md:text-lg -mt-0.5" style={{ color }}>{symbol}</span>
          </div>
        </div>

        {/* Back of card */}
        <div
          className="absolute inset-0 rounded-lg sm:rounded-xl shadow-xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 50%, #172554 100%)',
            border: '2px solid #3b82f6',
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
        >
          <div
            className="absolute inset-1 sm:inset-1.5 rounded-md opacity-20"
            style={{
              backgroundImage: `repeating-linear-gradient(
                45deg,
                #60a5fa 0px,
                #60a5fa 1px,
                transparent 1px,
                transparent 6px
              )`
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full border-2 border-blue-400/40 flex items-center justify-center bg-blue-900/30">
              <span className="text-blue-300/60 text-sm sm:text-lg md:text-xl font-bold">BJ</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// Chip Component - Improved
// ============================================
export function Chip({ value, selected, onClick, disabled }: {
  value: number
  selected: boolean
  onClick: () => void
  disabled?: boolean
}) {
  const colors: Record<number, { bg: string; border: string; text: string }> = {
    10: { bg: 'from-blue-500 to-blue-700', border: 'border-blue-300', text: 'text-blue-100' },
    25: { bg: 'from-green-500 to-green-700', border: 'border-green-300', text: 'text-green-100' },
    50: { bg: 'from-red-500 to-red-700', border: 'border-red-300', text: 'text-red-100' },
    100: { bg: 'from-purple-500 to-purple-700', border: 'border-purple-300', text: 'text-purple-100' },
    250: { bg: 'from-amber-500 to-amber-700', border: 'border-amber-300', text: 'text-amber-100' },
    500: { bg: 'from-slate-600 to-slate-800', border: 'border-slate-400', text: 'text-slate-100' }
  }

  const chipStyle = colors[value] || colors[10]

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        relative w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-18 lg:h-18
        rounded-full shadow-lg transform transition-all duration-200
        ${selected ? 'scale-110 ring-4 ring-white/60 ring-offset-2 ring-offset-transparent' : 'hover:scale-105 hover:shadow-xl'}
        ${disabled ? 'opacity-40 cursor-not-allowed grayscale' : 'cursor-pointer active:scale-95'}
        bg-gradient-to-br ${chipStyle.bg}
      `}
      style={{
        boxShadow: selected
          ? '0 0 20px rgba(255, 255, 255, 0.4), 0 4px 6px rgba(0, 0, 0, 0.3)'
          : '0 4px 6px rgba(0, 0, 0, 0.3)'
      }}
    >
      {/* Inner border pattern */}
      <div className={`absolute inset-1 sm:inset-1.5 rounded-full border-2 border-dashed ${chipStyle.border} opacity-50`} />
      {/* Value */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`font-bold text-xs sm:text-sm md:text-base ${chipStyle.text} drop-shadow-md`}>
          {value}
        </span>
      </div>
    </button>
  )
}

// ============================================
// CardHand Component - Improved fan arrangement with fixed layout
// ============================================
export function CardHand({
  cards,
  isDealing,
  isFlippingIndex,
  hasFlippedIndex,
  label,
  value,
  bet,
  result,
  isActive,
  showActiveIndicator,
  dealingCardIndex,
  reserveInfoSpace = false,
  isDoubled = false,
}: {
  cards: Card[]
  isDealing?: boolean
  isFlippingIndex?: number
  hasFlippedIndex?: number
  label?: string
  value?: string
  bet?: number
  result?: string | null
  isActive?: boolean
  showActiveIndicator?: boolean
  dealingCardIndex?: number
  reserveInfoSpace?: boolean
  isDoubled?: boolean
}) {
  const resultMessages: Record<string, { title: string; color: string; bgColor: string }> = {
    blackjack: { title: 'BLACKJACK!', color: '#fbbf24', bgColor: 'rgba(251, 191, 36, 0.2)' },
    win: { title: 'KAZANDIN!', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.2)' },
    lose: { title: 'KAYBETTİN', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.2)' },
    push: { title: 'BERABERE', color: '#6b7280', bgColor: 'rgba(107, 114, 128, 0.2)' }
  }

  // Calculate card offsets for proper stacking
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const getCardOffset = (index: number, _total: number) => {
    const baseOffset = 32 // Base horizontal offset between cards
    const mobileOffset = 28
    return index * (isMobile ? mobileOffset : baseOffset)
  }

  const totalWidth = useMemo(() => {
    if (cards.length === 0) return 72
    const cardWidth = 72
    const offset = 32
    return cardWidth + (cards.length - 1) * offset
  }, [cards.length])

  // Calculate displayed bet (doubled if applicable)
  const displayedBet = isDoubled && bet ? bet * 2 : bet

  return (
    <div
      className={`relative p-2 sm:p-3 md:p-4 rounded-xl transition-all duration-300 ${
        isActive && showActiveIndicator ? 'ring-2 ring-amber-400/50 bg-amber-400/5' : ''
      }`}
    >
      {/* Active indicator - arrow pointing to active hand */}
      {showActiveIndicator && isActive && (
        <div className="absolute -top-6 sm:-top-8 left-1/2 -translate-x-1/2 flex items-center z-20">
          <span className="text-amber-400 text-xl sm:text-2xl animate-bounce drop-shadow-lg">▼</span>
        </div>
      )}

      {/* Cards container with fan arrangement - FIXED HEIGHT */}
      <div
        className="relative h-[115px] sm:h-[130px] md:h-[145px] lg:h-[160px] flex items-center justify-center"
        style={{ minWidth: `${Math.max(totalWidth, 80)}px` }}
      >
        {cards.length === 0 ? (
          <div className="w-[72px] h-[108px] sm:w-[80px] sm:h-[120px] md:w-[88px] md:h-[132px] rounded-lg sm:rounded-xl border-2 border-dashed border-white/20 flex items-center justify-center">
            <span className="text-white/30 text-xs">Kart</span>
          </div>
        ) : (
          cards.map((card, index) => {
            const offset = getCardOffset(index, cards.length)
            const isCardDealing = dealingCardIndex === index || (isDealing && card.isNew)

            return (
              <div
                key={card.id || `card-${index}-${card.suit}-${card.value}`}
                className="absolute transition-all duration-500 ease-out"
                style={{
                  left: `${offset}px`,
                  zIndex: index + 1
                }}
              >
                <PlayingCard
                  card={card}
                  index={index}
                  totalCards={cards.length}
                  isDealing={isCardDealing}
                  delay={index * 100}
                  isFlipping={isFlippingIndex === index}
                  hasFlipped={hasFlippedIndex === index}
                  enableFan={true}
                  animateFromDeck={card.isNew}
                />
              </div>
            )
          })
        )}
      </div>

      {/* Info section - FIXED HEIGHT to prevent layout shift */}
      <div className="h-[60px] sm:h-[70px] flex flex-col items-center justify-start mt-2 sm:mt-3 space-y-1">
        {/* Value display */}
        {value !== undefined && value !== '' && (
          <div className="bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10">
            <span className="text-white font-bold text-sm sm:text-base">
              {value}
            </span>
          </div>
        )}

        {/* Bet display */}
        {displayedBet !== undefined && displayedBet > 0 && (
          <div className={`inline-flex items-center gap-1 text-[10px] sm:text-xs px-2 py-0.5 rounded-full transition-all duration-300 ${
            isDoubled
              ? 'text-green-400 bg-green-400/10 ring-1 ring-green-400/30'
              : 'text-amber-400 bg-amber-400/10'
          }`}>
            <span className={isDoubled ? 'text-green-500' : 'text-amber-500'}>●</span>
            {displayedBet} puan
            {isDoubled && <span className="ml-1 text-green-300">(2x)</span>}
          </div>
        )}

        {/* Result display */}
        {result && resultMessages[result] && (
          <div
            className="inline-block text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1 rounded-full animate-pulse"
            style={{
              backgroundColor: resultMessages[result].bgColor,
              color: resultMessages[result].color,
              border: `1px solid ${resultMessages[result].color}40`
            }}
          >
            {resultMessages[result].title}
          </div>
        )}

        {/* Label (if provided) */}
        {label && (
          <div className="text-white/60 text-[10px] sm:text-xs">
            {label}
          </div>
        )}
      </div>
    </div>
  )
}
