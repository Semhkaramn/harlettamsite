// Rulet oyunu tipleri

export type BetType =
  | 'number' // Tek sayı (0-36)
  | 'red' // Kırmızı
  | 'black' // Siyah
  | 'odd' // Tek
  | 'even' // Çift
  | 'low' // 1-18
  | 'high' // 19-36
  | 'first12' // 1-12
  | 'second12' // 13-24
  | 'third12' // 25-36
  | 'column1' // 1. sütun (1,4,7,10,13,16,19,22,25,28,31,34)
  | 'column2' // 2. sütun (2,5,8,11,14,17,20,23,26,29,32,35)
  | 'column3' // 3. sütun (3,6,9,12,15,18,21,24,27,30,33,36)

export interface Bet {
  type: BetType
  value?: number // Sadece 'number' tipi için
  amount: number
}

export interface RouletteResult {
  number: number
  color: 'red' | 'black' | 'green'
}

export type GamePhase = 'betting' | 'spinning' | 'result'

export interface RouletteSettings {
  enabled: boolean
  maxBet: number
  minBet: number
}

export interface GameSession {
  gameId: string
  bets: Bet[]
  result?: RouletteResult
  totalBet: number
  totalWin: number
}

// Ödeme oranları
export const PAYOUT_RATES: Record<BetType, number> = {
  number: 35, // 35:1
  red: 1, // 1:1
  black: 1, // 1:1
  odd: 1, // 1:1
  even: 1, // 1:1
  low: 1, // 1:1
  high: 1, // 1:1
  first12: 2, // 2:1
  second12: 2, // 2:1
  third12: 2, // 2:1
  column1: 2, // 2:1
  column2: 2, // 2:1
  column3: 2, // 2:1
}
