/**
 * 🚀 Profile Page Hook - Performance Optimized
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// User data hook
export function useUserProfile() {
  return useQuery({
    queryKey: ['user', 'me'],
    queryFn: async () => {
      const res = await fetch('/api/user/me')
      if (!res.ok) throw new Error('Failed to fetch user')
      return res.json()
    },
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  })
}

// Purchases hook
export function useUserPurchases() {
  return useQuery({
    queryKey: ['user', 'purchases'],
    queryFn: async () => {
      const res = await fetch('/api/user/me/purchases')
      if (!res.ok) throw new Error('Failed to fetch purchases')
      const data = await res.json()
      return data.purchases || []
    },
    staleTime: 60000,
    gcTime: 10 * 60 * 1000,
  })
}

// Sponsor info hook
export function useUserSponsorInfo() {
  return useQuery({
    queryKey: ['user', 'sponsorInfo'],
    queryFn: async () => {
      const res = await fetch('/api/user/sponsor-info')
      if (!res.ok) throw new Error('Failed to fetch sponsor info')
      const data = await res.json()
      return data.sponsorInfos || []
    },
    staleTime: 60000,
    gcTime: 10 * 60 * 1000,
  })
}

// Telegram status hook
export function useTelegramStatus() {
  return useQuery({
    queryKey: ['user', 'telegramStatus'],
    queryFn: async () => {
      const res = await fetch('/api/user/telegram-status')
      if (!res.ok) throw new Error('Failed to fetch telegram status')
      return res.json()
    },
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  })
}

// Wallet mutations
export function useWalletMutations() {
  const queryClient = useQueryClient()

  const saveWallet = useMutation({
    mutationFn: async (walletAddress: string) => {
      const res = await fetch('/api/user/wallet', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress })
      })
      if (!res.ok) throw new Error('Failed to save wallet')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] })
    }
  })

  const deleteWallet = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/user/wallet', { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete wallet')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] })
    }
  })

  return { saveWallet, deleteWallet }
}
