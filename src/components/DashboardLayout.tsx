'use client'

import { ReactNode } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import SponsorBanner from './SponsorBanner'
import YatayBanner from './YatayBanner'
import Footer from './Footer'
import { ThemeStyleInjector } from './providers/user-theme-provider'

interface DashboardLayoutProps {
  children: ReactNode
  showSponsorBanner?: boolean
  showYatayBanner?: boolean
}

// ✅ FIX: UserThemeProvider kaldırıldı - zaten layout.tsx'de var (duplicate provider sorunu)
export default function DashboardLayout({ children, showSponsorBanner = false, showYatayBanner = false }: DashboardLayoutProps) {

  return (
    <>
      <ThemeStyleInjector />
      <div className="min-h-screen flex flex-col overflow-x-hidden max-w-full">
        <Header />
        <Sidebar />

        {/* Header fixed olduğu için içeriğe padding-top ekliyoruz */}
        <div className="flex-1 flex flex-col transition-all duration-300 overflow-x-hidden pt-16 lg:pt-20">
          {/* Banner'lar sidebar'ın sağında görünecek şekilde */}
          {showSponsorBanner && <SponsorBanner />}
          {showYatayBanner && <YatayBanner />}

          <main className="flex-1 flex flex-col relative lg:ml-64 overflow-x-hidden max-w-full">
            {/* Content */}
            <div className="relative z-10 flex-1 flex flex-col">
              <div className="flex-1">
                {children}
              </div>
              <Footer />
            </div>
          </main>
        </div>
      </div>
    </>
  )
}
