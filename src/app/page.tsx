import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { getQueryClient } from '@/lib/get-query-client'
import { fetchSponsorsServer, fetchBannersServer, fetchSocialMediaServer } from '@/lib/server-fetchers'
import DashboardLayout from '@/components/DashboardLayout'
import SponsorsContent from '@/components/home/SponsorsContent'

// SSR + ISR: Her 60 saniyede bir revalidate
export const revalidate = 60

export default async function HomePage() {
  const queryClient = getQueryClient()

  // 🚀 Server'da TÜM verileri paralel prefetch - Client'ta anında yüklenir
  // ⚠️ visitStats prefetch'ten çıkarıldı - anlık veri olması için client'ta çekilecek
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ['sponsors'],
      queryFn: fetchSponsorsServer,
    }),
    queryClient.prefetchQuery({
      queryKey: ['sideBanners'],
      queryFn: async () => {
        const data = await fetchBannersServer()
        return {
          leftBanner: data.left ? { enabled: true, imageUrl: data.left.imageUrl, sponsorId: data.left.sponsorId } : null,
          leftSponsor: data.left?.sponsor || null,
          rightBanner: data.right ? { enabled: true, imageUrl: data.right.imageUrl, sponsorId: data.right.sponsorId } : null,
          rightSponsor: data.right?.sponsor || null,
        }
      },
    }),
    // 🚀 Social Media SSR prefetch - Sidebar anında yüklenir
    queryClient.prefetchQuery({
      queryKey: ['socialMedia'],
      queryFn: fetchSocialMediaServer,
    }),
  ])

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardLayout showSponsorBanner={true} showYatayBanner={true}>
        <SponsorsContent />
      </DashboardLayout>
    </HydrationBoundary>
  )
}
