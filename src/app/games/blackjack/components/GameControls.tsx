'use client'

import { Hand, Square, Coins, SplitSquareVertical, RefreshCw } from 'lucide-react'
import type { GameState } from '../types'

interface GameControlsProps {
  gameState: GameState
  isActionLocked: boolean
  canDouble: boolean
  canSplit: boolean
  displayBet: number
  hasSplit: boolean
  currentBet: number
  splitBet: number
  onHit: () => void
  onStand: () => void
  onDoubleDown: () => void
  onSplit: () => void
  onNewGame: () => void
}

export function GameControls({
  gameState,
  isActionLocked,
  canDouble,
  canSplit,
  displayBet,
  hasSplit,
  currentBet,
  splitBet,
  onHit,
  onStand,
  onDoubleDown,
  onSplit,
  onNewGame
}: GameControlsProps) {
  // Bet display for active game
  const betDisplay = hasSplit && gameState !== 'betting'
    ? `${currentBet + splitBet}`
    : displayBet.toLocaleString()

  return (
    <div className="w-full max-w-xl space-y-3 sm:space-y-4 flex-1 flex flex-col justify-end pb-3 sm:pb-4 px-2">
      {/* Bet display */}
      <div className="text-center">
        <div className="text-white/40 text-[10px] sm:text-xs mb-1">
          Bahis
        </div>
        <div className="text-xl sm:text-3xl font-bold text-amber-400">
          {displayBet > 0 ? betDisplay : '-'}
        </div>
      </div>

      {(gameState === 'playing' || gameState === 'playing_split') && (
        <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap px-2">
          {/* STAND */}
          <button
            type="button"
            onClick={onStand}
            disabled={isActionLocked}
            className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-xl sm:rounded-xl text-sm sm:text-base font-bold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 active:scale-95 text-white shadow-lg shadow-red-500/30"
          >
            <Square className="w-4 h-4 sm:w-5 sm:h-5" />
            STAND
          </button>
          {/* HIT */}
          <button
            type="button"
            onClick={onHit}
            disabled={isActionLocked}
            className="flex items-center gap-1.5 sm:gap-2 px-6 sm:px-10 py-3 sm:py-4 rounded-xl sm:rounded-xl text-base sm:text-lg font-bold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 active:scale-95 text-white shadow-lg shadow-green-500/30 scale-105"
          >
            <Hand className="w-5 h-5 sm:w-6 sm:h-6" />
            HIT
          </button>
          {/* DOUBLE */}
          {canDouble && (
            <button
              type="button"
              onClick={onDoubleDown}
              disabled={isActionLocked}
              className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-xl sm:rounded-xl text-sm sm:text-base font-bold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 text-white shadow-lg shadow-amber-500/30"
            >
              <Coins className="w-4 h-4 sm:w-5 sm:h-5" />
              DOUBLE
            </button>
          )}
          {/* SPLIT */}
          {canSplit && (
            <button
              type="button"
              onClick={onSplit}
              disabled={isActionLocked}
              className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2.5 sm:py-3.5 rounded-xl sm:rounded-xl text-sm sm:text-base font-bold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 active:scale-95 text-white shadow-lg shadow-purple-500/30"
            >
              <SplitSquareVertical className="w-3 h-3 sm:w-4 sm:h-4" />
              SPLIT
            </button>
          )}
        </div>
      )}

      {gameState === 'dealer_turn' && (
        <div className="text-center text-white/60 text-sm sm:text-base">
          <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6 animate-spin mx-auto mb-2" />
          Krupiye oynuyor...
        </div>
      )}

      {gameState === 'game_over' && (
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={onNewGame}
            disabled={isActionLocked}
            className="px-6 sm:px-10 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl text-sm sm:text-lg font-bold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:scale-95 text-white shadow-lg shadow-emerald-500/30"
          >
            YENİ OYUN
          </button>
        </div>
      )}
    </div>
  )
}
