import { QueryClient } from '@tanstack/react-query'

// 🚀 OPTIMIZED: Query client for 200-300 concurrent users + Background Prefetching
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 🚀 OPTIMIZATION: Reasonable stale time
      staleTime: 1000 * 60 * 2, // 2 minutes

      // 🚀 OPTIMIZATION: Longer garbage collection time
      gcTime: 1000 * 60 * 15, // 15 minutes

      // 🚀 OPTIMIZATION: Reduce refetch frequency to avoid overloading
      refetchOnWindowFocus: false, // Disabled to reduce unnecessary requests

      // ✅ FIX: refetchOnMount true yapıldı - sayfa geçişlerinde güncel veri
      // 'always' yerine true kullanarak staleTime'a saygı duyar, sadece stale ise refetch yapar
      refetchOnMount: true,

      refetchOnReconnect: true, // Refetch when reconnecting

      // 🚀 Background refetching disabled by default
      refetchInterval: false, // Her query kendi interval'ını belirleyecek

      // 🚀 OPTIMIZATION: Retry strategy
      retry: 2, // Retry failed requests twice
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff

      // 🚀 OPTIMIZATION: Network mode
      networkMode: 'online', // Only fetch when online

      // 🚀 Instant loading from cache - eski veriyi göster, yeni veri gelene kadar
      placeholderData: (previousData: unknown) => previousData,
    },
    mutations: {
      // 🚀 OPTIMIZATION: Retry mutations once
      retry: 1,
      retryDelay: 1000,

      // Automatically invalidate queries after mutations
      onSuccess: () => {
        // This will be handled per-mutation in the components
      },
    },
  },
})
