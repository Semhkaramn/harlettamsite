'use client'

import Link from 'next/link'
import { ArrowLeft, Volume2, VolumeX, Info, Coins } from 'lucide-react'
import { ThemedCard, ThemedButton } from '@/components/ui/themed'
import { useUserTheme } from '@/components/providers/user-theme-provider'

interface GameHeaderProps {
  userPoints: number
  soundEnabled: boolean
  onSoundToggle: () => void
  onShowRules: () => void
  playSound: (type: 'click') => void
}

export function GameHeader({
  userPoints,
  soundEnabled,
  onSoundToggle,
  onShowRules,
  playSound
}: GameHeaderProps) {
  const { theme } = useUserTheme()

  return (
    <div className="flex flex-col items-center p-2 sm:p-4 md:p-5">
      <div className="w-full max-w-4xl flex items-center justify-between mb-2 sm:mb-4">
        <Link href="/games">
          <ThemedButton variant="secondary" className="gap-1.5 sm:gap-2 text-sm sm:text-base px-3 sm:px-4 py-2 sm:py-2.5">
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Geri</span>
          </ThemedButton>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => {
              playSound('click')
              onSoundToggle()
            }}
            className="p-2.5 sm:p-3 rounded-xl transition-all duration-200 hover:scale-105"
            style={{
              background: soundEnabled ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              color: soundEnabled ? '#22c55e' : '#ef4444'
            }}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5 sm:w-6 sm:h-6" /> : <VolumeX className="w-5 h-5 sm:w-6 sm:h-6" />}
          </button>
          <button
            type="button"
            onClick={() => {
              playSound('click')
              onShowRules()
            }}
            className="p-2.5 sm:p-3 rounded-xl transition-all duration-200 hover:scale-105"
            style={{
              background: theme.colors.backgroundSecondary,
              color: theme.colors.textMuted
            }}
          >
            <Info className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
      </div>

      {/* Score Display */}
      <div className="flex flex-col items-center">
        <ThemedCard className="px-4 sm:px-6 py-2 sm:py-3 flex items-center gap-2 sm:gap-3 shadow-xl">
          <Coins className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
          <div className="flex flex-col items-center">
            <span className="text-[9px] sm:text-xs text-white/50 uppercase tracking-wider">Puanın</span>
            <span className="text-lg sm:text-2xl font-bold text-amber-400">
              {userPoints.toLocaleString()}
            </span>
          </div>
        </ThemedCard>
      </div>
    </div>
  )
}
