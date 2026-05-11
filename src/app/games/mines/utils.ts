// Mines game utility functions

import type { Cell } from './types'

// Grid size
export const GRID_SIZE = 25 // 5x5

// Calculate multiplier based on mines and revealed cells
export function calculateMultiplier(mineCount: number, revealedCount: number): number {
  if (revealedCount === 0) return 1

  const safeSpots = GRID_SIZE - mineCount
  let multiplier = 1

  for (let i = 0; i < revealedCount; i++) {
    const remainingSafe = safeSpots - i
    const remainingTotal = GRID_SIZE - i
    // House edge of ~3%
    multiplier *= (remainingTotal / remainingSafe) * 0.97
  }

  return Math.round(multiplier * 100) / 100
}

// Calculate next multiplier (preview)
export function calculateNextMultiplier(mineCount: number, revealedCount: number): number {
  return calculateMultiplier(mineCount, revealedCount + 1)
}

// Create initial grid
export function createInitialGrid(): Cell[] {
  return Array.from({ length: GRID_SIZE }, (_, i) => ({
    id: i,
    state: 'hidden' as const,
    isMine: false,
    isRevealed: false
  }))
}

// Update grid with mine positions
export function updateGridWithMines(grid: Cell[], minePositions: number[]): Cell[] {
  return grid.map((cell) => ({
    ...cell,
    isMine: minePositions.includes(cell.id)
  }))
}

// Reveal a cell
export function revealCell(grid: Cell[], cellId: number): Cell[] {
  return grid.map((cell) => {
    if (cell.id === cellId) {
      return {
        ...cell,
        state: cell.isMine ? 'mine' : 'diamond',
        isRevealed: true
      }
    }
    return cell
  })
}

// Reveal all mines (game over)
export function revealAllMines(grid: Cell[]): Cell[] {
  return grid.map((cell) => {
    if (cell.isMine) {
      return {
        ...cell,
        state: 'mine',
        isRevealed: true
      }
    }
    return cell
  })
}

// Get mine count options with multipliers preview
export function getMineCountOptions(): { count: number; label: string; firstMultiplier: number }[] {
  return [
    { count: 1, label: '1', firstMultiplier: calculateMultiplier(1, 1) },
    { count: 3, label: '3', firstMultiplier: calculateMultiplier(3, 1) },
    { count: 5, label: '5', firstMultiplier: calculateMultiplier(5, 1) },
    { count: 10, label: '10', firstMultiplier: calculateMultiplier(10, 1) },
    { count: 15, label: '15', firstMultiplier: calculateMultiplier(15, 1) },
    { count: 20, label: '20', firstMultiplier: calculateMultiplier(20, 1) },
    { count: 24, label: '24', firstMultiplier: calculateMultiplier(24, 1) }
  ]
}

// Bet chip values
export const CHIP_VALUES = [10, 25, 50, 100, 250, 500]

// Format number with commas
export function formatNumber(num: number): string {
  return num.toLocaleString('tr-TR')
}
