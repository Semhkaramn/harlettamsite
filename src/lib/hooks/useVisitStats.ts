import { useQuery } from '@tanstack/react-query'

interface VisitStats {
  totalVisits: number
  todayVisits: number
  uniqueVisitors: number
  totalUniqueVisitors: number
}

async function fetchVisitStats() {
  const response = await fetch('/api/visit/count', {
    cache: 'no-store' // Cache'leme yapma, her zaman fresh data
  })
  if (!response.ok) throw new Error('Failed to fetch visit stats')
  return response.json() as Promise<VisitStats>
}

export function useVisitStats() {
  return useQuery({
    queryKey: ['visitStats'],
    queryFn: fetchVisitStats,
    staleTime: 0, // Her zaman stale kabul et
    refetchInterval: 30000, // 30 saniyede bir yenile
    refetchOnWindowFocus: true, // Sayfa fokuslandığında yenile
  })
}
