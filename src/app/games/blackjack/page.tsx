'use client'

import ProtectedRoute from '@/components/ProtectedRoute'
import { BlackjackGame } from './components'

export default function BlackjackPage() {
  return (
    <ProtectedRoute requireAuth={true}>
      <BlackjackGame />
    </ProtectedRoute>
  )
}
