'use client'

import type { Card, GameState, GameResult } from '../types'
import { CardHand, PlayingCard } from './PlayingCard'

interface GameBoardProps {
  // Dealer
  dealerHand: Card[]
  dealerDisplayValue: string
  isDealing: boolean
  isFlippingDealer: boolean
  dealerCardFlipped: boolean

  // Player
  playerHand: Card[]
  playerDisplayValue: string
  splitHand: Card[]
  splitDisplayValue: string
  hasSplit: boolean
  activeHand: 'main' | 'split'

  // Game state
  gameState: GameState
  result: GameResult
  splitResult: GameResult
  currentBet: number
  splitBet: number

  // Split animation
  isSplitAnimating: boolean
  splitAnimationPhase: 'idle' | 'separating' | 'dealing_right' | 'dealing_left' | 'done'
  splitCards: { left: Card | null; right: Card | null }

  // Double tracking
  mainHandDoubled?: boolean
  splitHandDoubled?: boolean
}

export function GameBoard({
  dealerHand,
  dealerDisplayValue,
  isDealing,
  isFlippingDealer,
  dealerCardFlipped,
  playerHand,
  playerDisplayValue,
  splitHand,
  splitDisplayValue,
  hasSplit,
  activeHand,
  gameState,
  result,
  splitResult,
  currentBet,
  splitBet,
  isSplitAnimating,
  splitAnimationPhase,
  splitCards,
  mainHandDoubled = false,
  splitHandDoubled = false
}: GameBoardProps) {
  return (
    <>
      {/* Dealer Area - Fixed height */}
      <div className="text-center h-[180px] sm:h-[200px] md:h-[220px] flex flex-col justify-end">
        <div className="text-white/60 text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 mb-2">
          <span>Krupiye</span>
          {gameState !== 'betting' && dealerDisplayValue && (
            <span className="bg-white/10 px-2 py-0.5 rounded text-white/80 font-bold">
              {dealerDisplayValue}
            </span>
          )}
        </div>
        <div className="flex items-center justify-center">
          <CardHand
            cards={dealerHand}
            isDealing={isDealing}
            isFlippingIndex={isFlippingDealer ? 1 : undefined}
            hasFlippedIndex={dealerCardFlipped ? 1 : undefined}
          />
        </div>
      </div>

      {/* Player Hands Area - Fixed height */}
      <div className="text-center h-[280px] sm:h-[320px] md:h-[360px] flex items-start justify-center pt-4">
        {isSplitAnimating && splitAnimationPhase === 'separating' && splitCards.left && splitCards.right ? (
          // Split animation phase - cards separating
          <div className="relative w-full flex items-start justify-center">
            {/* Left card animating */}
            <div
              className="transform transition-all duration-700 ease-out absolute"
              style={{
                transform: 'translateX(-80px)',
                left: 'calc(50% - 36px)'
              }}
            >
              <div className="relative">
                <PlayingCard card={splitCards.left} index={0} isDealing={false} delay={0} />
              </div>
            </div>

            {/* SPLIT! text */}
            <div className="absolute top-[60px] left-1/2 -translate-x-1/2 z-30">
              <div className="text-amber-400 text-xl sm:text-2xl font-bold animate-pulse drop-shadow-lg whitespace-nowrap">
                SPLIT!
              </div>
            </div>

            {/* Right card animating */}
            <div
              className="transform transition-all duration-700 ease-out absolute"
              style={{
                transform: 'translateX(80px)',
                left: 'calc(50% - 36px)'
              }}
            >
              <div className="relative">
                <PlayingCard card={splitCards.right} index={0} isDealing={false} delay={0} />
              </div>
            </div>
          </div>
        ) : hasSplit && splitHand.length > 0 ? (
          // Split hands display
          <div className="flex items-start justify-center gap-4 sm:gap-8 md:gap-12 relative w-full">
            {/* Left Hand (Main) */}
            <div className="flex-shrink-0">
              <CardHand
                cards={playerHand}
                value={playerDisplayValue}
                bet={currentBet}
                result={result}
                isActive={activeHand === 'main'}
                showActiveIndicator={!isSplitAnimating && (gameState === 'playing' || gameState === 'playing_split')}
                reserveInfoSpace={true}
                isDoubled={mainHandDoubled}
              />
            </div>

            {/* Divider */}
            <div className="hidden sm:flex items-center h-[160px]">
              <div className="w-px h-full bg-white/10" />
            </div>

            {/* Right Hand (Split) */}
            <div className="flex-shrink-0">
              <CardHand
                cards={splitHand}
                value={splitDisplayValue}
                bet={splitBet}
                result={splitResult}
                isActive={activeHand === 'split'}
                showActiveIndicator={!isSplitAnimating && (gameState === 'playing' || gameState === 'playing_split')}
                reserveInfoSpace={true}
                isDoubled={splitHandDoubled}
              />
            </div>
          </div>
        ) : (
          // Single hand display
          <div className="flex items-start justify-center">
            <CardHand
              cards={playerHand}
              isDealing={isDealing}
              label={gameState !== 'betting' ? 'Sen' : undefined}
              value={gameState !== 'betting' ? playerDisplayValue : undefined}
              isDoubled={mainHandDoubled}
            />
          </div>
        )}
      </div>
    </>
  )
}
