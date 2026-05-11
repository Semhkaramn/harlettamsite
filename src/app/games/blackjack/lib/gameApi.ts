'use client'

import type { BlackjackSettings } from './constants'
import type { Card, GameState, GameResult } from '../types'

// API Response types
export interface GameResponse {
  success: boolean
  error?: string
  gameId?: string
  playerHand?: Card[]
  splitHand?: Card[]
  dealerHand?: Card[]
  playerValue?: number
  splitValue?: number | null
  dealerValue?: number
  phase?: GameState
  activeHand?: 'main' | 'split'
  hasSplit?: boolean
  canSplit?: boolean
  canDouble?: boolean
  bust?: boolean
  gameOver?: boolean
  result?: GameResult
  splitResult?: GameResult
  payout?: number
  balanceAfter?: number
  immediateResult?: { result: string; payout: number } | null
}

export interface ActiveGameResponse {
  hasActiveGame: boolean
  expired?: boolean
  gameId?: string
  betAmount?: number
  splitBetAmount?: number
  playerHand?: Card[]
  splitHand?: Card[]
  dealerHand?: Card[]
  playerValue?: number
  splitValue?: number | null
  dealerValue?: number
  phase?: GameState
  activeHand?: 'main' | 'split'
  hasSplit?: boolean
  canSplit?: boolean
  canDouble?: boolean
}

// Load game settings
export async function loadGameSettings(): Promise<BlackjackSettings | null> {
  try {
    const res = await fetch('/api/games/settings')
    if (res.ok) {
      const data = await res.json()
      return data.blackjack
    }
    return null
  } catch (error) {
    console.error('Error loading game settings:', error)
    return null
  }
}

// Get active game from server
export async function getActiveGame(): Promise<ActiveGameResponse> {
  try {
    const response = await fetch('/api/games/blackjack/bet', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })

    if (!response.ok) {
      return { hasActiveGame: false }
    }

    return await response.json()
  } catch (error) {
    console.error('[Blackjack] Get active game error:', error)
    return { hasActiveGame: false }
  }
}

// Start a new game (server-side card dealing)
export async function startGame(betAmount: number): Promise<GameResponse> {
  try {
    const response = await fetch('/api/games/blackjack/bet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start', amount: betAmount })
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error || 'Oyun başlatılamadı!' }
    }

    return { success: true, ...data }
  } catch (error) {
    console.error('[Blackjack] Start game error:', error)
    return { success: false, error: 'Bir hata oluştu!' }
  }
}

// Hit action - draw a card from server
export async function hitAction(gameId: string): Promise<GameResponse> {
  try {
    const response = await fetch('/api/games/blackjack/bet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'hit', gameId })
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error || 'Kart çekilemedi!' }
    }

    return { success: true, ...data }
  } catch (error) {
    console.error('[Blackjack] Hit error:', error)
    return { success: false, error: 'Bir hata oluştu!' }
  }
}

// Stand action - end player turn
export async function standAction(gameId: string): Promise<GameResponse> {
  try {
    const response = await fetch('/api/games/blackjack/bet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'stand', gameId })
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error || 'Stand yapılamadı!' }
    }

    return { success: true, ...data }
  } catch (error) {
    console.error('[Blackjack] Stand error:', error)
    return { success: false, error: 'Bir hata oluştu!' }
  }
}

// Double action - double bet and draw one card
export async function doubleAction(gameId: string): Promise<GameResponse> {
  try {
    const response = await fetch('/api/games/blackjack/bet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'double', gameId })
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error || 'Double yapılamadı!' }
    }

    return { success: true, ...data }
  } catch (error) {
    console.error('[Blackjack] Double error:', error)
    return { success: false, error: 'Bir hata oluştu!' }
  }
}

// Split action - split the hand
export async function splitAction(gameId: string): Promise<GameResponse> {
  try {
    const response = await fetch('/api/games/blackjack/bet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'split', gameId })
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error || 'Split yapılamadı!' }
    }

    return { success: true, ...data }
  } catch (error) {
    console.error('[Blackjack] Split error:', error)
    return { success: false, error: 'Bir hata oluştu!' }
  }
}

// Legacy functions (will be removed after migration)
export async function placeBet(amount: number, gameId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/games/blackjack/bet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, action: 'bet', gameId })
    })

    if (!response.ok) {
      const data = await response.json()
      return { success: false, error: data.error || 'Bahis yapılamadı!' }
    }

    return { success: true }
  } catch (error) {
    console.error('[Blackjack] Bet API error:', error)
    return { success: false, error: 'Bir hata oluştu!' }
  }
}

export async function placeSplitBet(
  amount: number,
  gameId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/games/blackjack/bet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount,
        action: 'split',
        gameId
      })
    })

    if (!response.ok) {
      const data = await response.json()
      return { success: false, error: data.error || 'Split yapılamadı!' }
    }

    return { success: true }
  } catch (error) {
    console.error('[Blackjack] Split API error:', error)
    return { success: false, error: 'Bir hata oluştu!' }
  }
}

export async function placeDoubleBet(
  amount: number,
  gameId: string,
  isSplit: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/games/blackjack/bet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount,
        action: 'double',
        gameId,
        isSplit
      })
    })

    if (!response.ok) {
      const data = await response.json()
      return { success: false, error: data.error || 'Double yapılamadı!' }
    }

    return { success: true }
  } catch (error) {
    console.error('[Blackjack] Double down API error:', error)
    return { success: false, error: 'Bir hata oluştu!' }
  }
}

export async function sendGameResult(
  action: 'win' | 'lose',
  payload: Record<string, unknown>,
  dedupedFetch: (key: string, url: string, options: RequestInit) => Promise<Response>
): Promise<Response | null> {
  const gameId = payload.gameId as string
  if (!gameId) return null

  try {
    const requestKey = `${gameId}_${action}`
    return await dedupedFetch(
      requestKey,
      '/api/games/blackjack/bet',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, action })
      }
    )
  } catch (error) {
    console.error(`[Blackjack] ${action} request error:`, error)
    throw error
  }
}
