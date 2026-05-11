'use client'

import { Trophy, Sparkles, AlertCircle, RefreshCw } from 'lucide-react'
import type { GameResult } from '../types'

interface ResultDisplayProps {
  result: GameResult
  winAmount: number
  animatingResult: boolean
}

const resultMessages: Record<string, { title: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  blackjack: {
    title: 'BLACKJACK!',
    color: '#fbbf24',
    bgColor: 'rgba(251, 191, 36, 0.15)',
    icon: <Sparkles className="w-5 h-5 sm:w-7 sm:h-7" />
  },
  win: {
    title: 'KAZANDIN!',
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.15)',
    icon: <Trophy className="w-5 h-5 sm:w-7 sm:h-7" />
  },
  lose: {
    title: 'KAYBETTİN',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.15)',
    icon: <AlertCircle className="w-5 h-5 sm:w-7 sm:h-7" />
  },
  push: {
    title: 'BERABERE',
    color: '#6b7280',
    bgColor: 'rgba(107, 114, 128, 0.15)',
    icon: <RefreshCw className="w-5 h-5 sm:w-7 sm:h-7" />
  }
}

export function ResultDisplay({ result, winAmount, animatingResult }: ResultDisplayProps) {
  if (!result) return null

  const resultInfo = resultMessages[result]
  if (!resultInfo) return null

  return (
    <div
      className={`absolute inset-x-0 flex justify-center transition-all duration-500 ${
        animatingResult ? 'scale-110' : 'scale-100'
      }`}
    >
      <div
        className="inline-flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-4 rounded-xl sm:rounded-2xl shadow-2xl"
        style={{
          background: resultInfo.bgColor,
          border: `2px solid ${resultInfo.color}`,
          color: resultInfo.color
        }}
      >
        {resultInfo.icon}
        <div>
          <div className="text-base sm:text-2xl font-bold">
            {resultInfo.title}
          </div>
          {winAmount > 0 && (
            <div className="text-xs sm:text-base font-medium opacity-80">
              +{winAmount.toLocaleString()} puan
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
