'use client'

import { useCallback, useRef } from 'react'

// Oyun kilidi hook'u - Aynı oyun için çoklu istek engelleme
export function useGameLock() {
  // Tamamlanmış oyunların ID'lerini takip et
  const completedGamesRef = useRef<Set<string>>(new Set())
  // Şu an işlenen oyun ID'leri
  const processingGamesRef = useRef<Set<string>>(new Set())
  // Request ID'leri (aynı isteğin tekrarını engelle)
  const pendingRequestsRef = useRef<Map<string, Promise<Response>>>(new Map())

  // Oyun tamamlandı mı kontrol et
  const isGameCompleted = useCallback((gameId: string): boolean => {
    return completedGamesRef.current.has(gameId)
  }, [])

  // Oyun işleniyor mu kontrol et
  const isGameProcessing = useCallback((gameId: string): boolean => {
    return processingGamesRef.current.has(gameId)
  }, [])

  // Oyunu tamamlandı olarak işaretle
  const markGameCompleted = useCallback((gameId: string) => {
    completedGamesRef.current.add(gameId)
    processingGamesRef.current.delete(gameId)
  }, [])

  // Oyunu işleniyor olarak işaretle
  const markGameProcessing = useCallback((gameId: string): boolean => {
    // Zaten tamamlanmışsa false dön
    if (completedGamesRef.current.has(gameId)) {
      console.log(`[GameLock] Oyun zaten tamamlanmış: ${gameId}`)
      return false
    }
    // Zaten işleniyorsa false dön
    if (processingGamesRef.current.has(gameId)) {
      console.log(`[GameLock] Oyun zaten işleniyor: ${gameId}`)
      return false
    }
    processingGamesRef.current.add(gameId)
    return true
  }, [])

  // İşleme başarısız oldu, kilidi kaldır
  const clearGameProcessing = useCallback((gameId: string) => {
    processingGamesRef.current.delete(gameId)
  }, [])

  // Tüm kilitleri temizle (yeni oyun başlarken)
  const resetLocks = useCallback(() => {
    completedGamesRef.current.clear()
    processingGamesRef.current.clear()
    pendingRequestsRef.current.clear()
  }, [])

  // Dedupe edilmiş fetch - Aynı istek için tek bir promise döner
  const dedupedFetch = useCallback(async (
    requestKey: string,
    url: string,
    options: RequestInit
  ): Promise<Response> => {
    // Aynı istek zaten pending mi?
    const pendingRequest = pendingRequestsRef.current.get(requestKey)
    if (pendingRequest) {
      console.log(`[GameLock] Aynı istek zaten pending: ${requestKey}`)
      return pendingRequest
    }

    // Yeni istek oluştur
    const fetchPromise = fetch(url, options).finally(() => {
      pendingRequestsRef.current.delete(requestKey)
    })

    pendingRequestsRef.current.set(requestKey, fetchPromise)
    return fetchPromise
  }, [])

  return {
    isGameCompleted,
    isGameProcessing,
    markGameCompleted,
    markGameProcessing,
    clearGameProcessing,
    resetLocks,
    dedupedFetch
  }
}
