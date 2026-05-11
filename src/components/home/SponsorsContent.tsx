'use client'

import { useUserTheme } from '@/components/providers/user-theme-provider'
import CasinodostlarHome from './themes/CasinodostlarHome'
import LykibomHome from './themes/LykibomHome'
import Site1Home from './themes/Site1Home'
import Site2Home from './themes/Site2Home'

// Tema switcher - Aktif temaya göre doğru ana sayfa bileşenini gösterir
export default function SponsorsContent() {
  const { theme } = useUserTheme()

  switch (theme.name) {
    case 'casinodostlar':
      return <CasinodostlarHome />
    case 'lykibom':
      return <LykibomHome />
    case 'site1':
      return <Site1Home />
    case 'site2':
      return <Site2Home />
    default:
      return <CasinodostlarHome />
  }
}
