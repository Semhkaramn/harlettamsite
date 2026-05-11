'use client'

import { useEffect, useCallback, useRef } from 'react'

// Timer management hook
export function useTimerManager() {
  const isMountedRef = useRef(true)
  const timersRef = useRef<NodeJS.Timeout[]>([])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      timersRef.current.forEach(timer => clearTimeout(timer))
      timersRef.current = []
    }
  }, [])

  const addTimer = useCallback((callback: () => void, delay: number) => {
    const timer = setTimeout(() => {
      if (isMountedRef.current) {
        callback()
      }
      // Timer tamamlandıktan sonra array'den çıkar
      timersRef.current = timersRef.current.filter(t => t !== timer)
    }, delay)
    timersRef.current.push(timer)
    return timer
  }, [])

  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach(timer => clearTimeout(timer))
    timersRef.current = []
  }, [])

  return { addTimer, clearAllTimers, isMounted: () => isMountedRef.current }
}
