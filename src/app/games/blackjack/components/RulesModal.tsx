'use client'

import { ThemedCard, ThemedButton } from '@/components/ui/themed'
import { useUserTheme } from '@/components/providers/user-theme-provider'

interface RulesModalProps {
  onClose: () => void
}

export function RulesModal({ onClose }: RulesModalProps) {
  const { theme } = useUserTheme()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
      <ThemedCard className="max-w-md w-full p-4 sm:p-6 space-y-3 sm:space-y-4">
        <h3 className="text-lg sm:text-xl font-bold" style={{ color: theme.colors.text }}>
          Blackjack Kuralları
        </h3>
        <div className="space-y-2 text-xs sm:text-sm" style={{ color: theme.colors.textMuted }}>
          <p><strong>1.</strong> Amaç: Elinizin değerini 21'e yaklaştırmak, ama 21'i geçmemek.</p>
          <p><strong>2.</strong> Kart değerleri: 2-10 kendi değerleri, J/Q/K = 10, A = 1 veya 11</p>
          <p><strong>3.</strong> Blackjack: İlk 2 kart ile 21 = 3:2 ödeme</p>
          <p><strong>4.</strong> <span className="text-green-400">HIT</span>: Yeni kart çek</p>
          <p><strong>5.</strong> <span className="text-red-400">STAND</span>: Kartlarınla kal</p>
          <p><strong>6.</strong> <span className="text-amber-400">DOUBLE</span>: Bahsi ikiye katla, tek kart çek</p>
          <p><strong>7.</strong> <span className="text-purple-400">SPLIT</span>: Aynı değerde 2 kart varsa eli böl</p>
          <p><strong>8.</strong> Krupiye 17'ye kadar çekmek zorunda</p>
          <p><strong>9.</strong> 21'i geçersen kaybedersin (Bust)</p>
        </div>
        <ThemedButton onClick={onClose} className="w-full text-sm sm:text-base">
          Anladım
        </ThemedButton>
      </ThemedCard>
    </div>
  )
}
