'use client'

import { ReactNode, useEffect } from 'react'
import { useAuth, useModalState } from '@/components/providers/auth-provider'
import Header from './Header'
import Sidebar from './Sidebar'
import { LoadingSpinner } from './LoadingSpinner'

interface ProtectedRouteProps {
  children: ReactNode
  requireAuth?: boolean
}

export default function ProtectedRoute({ children, requireAuth = false }: ProtectedRouteProps) {
  const { user, initialCheckDone } = useAuth()
  const { setShowLoginModal } = useModalState()

  // 🚀 OPTIMISTIC UI: Loading durumunda artık spinner göstermiyoruz
  // İçeriği hemen göster, auth kontrolü arka planda yapılacak

  // If auth is required but user is not logged in, show login modal
  useEffect(() => {
    if (requireAuth && !user && initialCheckDone) {
      setShowLoginModal(true)
    }
  }, [requireAuth, user, initialCheckDone, setShowLoginModal])

  // If auth is not required or user is logged in, show children
  if (!requireAuth || user) {
    return <>{children}</>
  }

  // 🚀 Auth kontrolü henüz tamamlanmadıysa, içeriği göster (optimistic)
  // Kullanıcı giriş yapmamışsa modal açılacak
  if (!initialCheckDone) {
    return <>{children}</>
  }

  // If auth is required but user is not logged in, show message with login button
  return (
    <div className="min-h-screen bg-slate-950">
      <Header />
      <Sidebar />
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Giriş Gerekli</h2>
          <p className="text-gray-400 mb-6">
            Bu sayfayı görüntülemek için giriş yapmanız gerekiyor.
          </p>
          <button
            onClick={() => setShowLoginModal(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white font-medium px-6 py-3 rounded-lg transition-colors"
          >
            Giriş Yap
          </button>
        </div>
      </div>
    </div>
  )
}
