'use client'

import { RefreshCw } from 'lucide-react'
import { Chip } from './PlayingCard'

interface BettingPanelProps {
  bet: number
  maxBet: number
  chips: number[]
  selectedChip: number | null
  isActionLocked: boolean
  onAddChip: (value: number) => void
  onClearBet: () => void
  onDealCards: () => void
  userPoints: number
}

export function BettingPanel({
  bet,
  maxBet,
  chips,
  selectedChip,
  isActionLocked,
  onAddChip,
  onClearBet,
  onDealCards,
  userPoints
}: BettingPanelProps) {
  return (
    <>
      {/* Bet display */}
      <div className="text-center">
        <div className="text-white/40 text-[10px] sm:text-xs mb-1">
          Bahis Miktarı (Maks: {maxBet.toLocaleString()})
        </div>
        <div className="text-xl sm:text-3xl font-bold text-amber-400">
          {bet > 0 ? bet.toLocaleString() : '-'}
        </div>
      </div>

      {/* Chips */}
      <div className="flex items-center justify-center gap-1 sm:gap-2 md:gap-3 flex-wrap px-2">
        {chips.map((chip) => (
          <Chip
            key={chip}
            value={chip}
            selected={selectedChip === chip}
            onClick={() => onAddChip(chip)}
            disabled={isActionLocked || bet >= maxBet || (bet + chip > userPoints && bet >= userPoints)}
          />
        ))}
      </div>

      {/* Betting actions */}
      <div className="flex items-center justify-center gap-4 sm:gap-5">
        <button
          type="button"
          onClick={onClearBet}
          disabled={bet === 0 || isActionLocked}
          className="px-5 sm:px-7 py-2.5 sm:py-3 rounded-xl sm:rounded-xl font-bold text-sm sm:text-base transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed bg-gray-600 hover:bg-gray-700 active:scale-95 text-white"
        >
          Temizle
        </button>
        <button
          type="button"
          onClick={onDealCards}
          disabled={bet === 0 || isActionLocked}
          className="px-8 sm:px-12 py-3 sm:py-4 rounded-xl sm:rounded-xl text-base sm:text-xl font-bold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:scale-95 text-white shadow-lg shadow-emerald-500/30"
        >
          {isActionLocked ? (
            <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
          ) : (
            'DAĞIT'
          )}
        </button>
      </div>
    </>
  )
}
