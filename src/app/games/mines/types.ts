// Mines game types

export type CellState = 'hidden' | 'revealed' | 'mine' | 'diamond'

export interface Cell {
  id: number
  state: CellState
  isMine: boolean
  isRevealed: boolean
}

export type GameState = 'betting' | 'playing' | 'won' | 'lost'

export interface MinesSettings {
  enabled: boolean
  winRate: number
  maxBet: number
  minBet: number
  maxMines: number
  minMines: number
}

export interface GameSession {
  gameId: string
  bet: number
  mineCount: number
  minePositions: number[]
  revealedPositions: number[]
  currentMultiplier: number
  potentialWin: number
}
