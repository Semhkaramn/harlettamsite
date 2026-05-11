// Oyun ayarları tipi
export interface BlackjackSettings {
  enabled: boolean
  maxBet: number
  minBet: number
  pendingDisable: boolean
}

// Sonuç mesajları
export const resultMessages: Record<string, { title: string; color: string; bgColor: string }> = {
  blackjack: { title: 'BLACKJACK!', color: '#fbbf24', bgColor: 'rgba(251, 191, 36, 0.2)' },
  win: { title: 'KAZANDIN!', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.2)' },
  lose: { title: 'KAYBETTİN', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.2)' },
  push: { title: 'BERABERE', color: '#6b7280', bgColor: 'rgba(107, 114, 128, 0.2)' }
}

// Default chip values
export const DEFAULT_CHIPS = [10, 25, 50, 100, 250, 500]
