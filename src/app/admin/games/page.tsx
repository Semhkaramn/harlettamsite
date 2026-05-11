'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import {
  Gamepad2,
  Spade,
  RefreshCw,
  Loader2,
  Coins,
  Trophy,
  TrendingDown,
  BarChart3,
  Bomb,
  ArrowDownRight,
  ArrowUpRight,
  Target
} from 'lucide-react'
import AdminPermissionGuard from '@/components/AdminPermissionGuard'

interface GameSettings {
  blackjack: {
    enabled: boolean
    pendingDisable: boolean
  }
  mines: {
    enabled: boolean
  }
  roulette: {
    enabled: boolean
  }
}

interface GameStatistics {
  totalGames: number
  completedGames: number
  wins: number
  losses: number
  pushes: number
  blackjacks: number
  winRate: number
  totalBet: number
  totalPayout: number
  houseProfit: number
  houseProfitPercent: number
}

interface MinesStatistics {
  totalGames: number
  completedGames: number
  wins: number
  losses: number
  winRate: number
  totalBet: number
  totalPayout: number
  houseProfit: number
  houseProfitPercent: number
}

interface RouletteStatistics {
  totalGames: number
  completedGames: number
  wins: number
  losses: number
  winRate: number
  totalBet: number
  totalPayout: number
  houseProfit: number
  houseProfitPercent: number
}

interface DetailedStats {
  totalGames: number
  gamesToday: number
  gamesWeek: number
  gamesMonth: number
  totalBets: number
  totalWins: number
  betsToday: number
  winsToday: number
  netProfit: number
}

interface MinesDetailedStats {
  totalGames: number
  gamesToday: number
  gamesWeek: number
  gamesMonth: number
  totalBets: number
  totalWins: number
  betsToday: number
  winsToday: number
  netProfit: number
}

interface RouletteDetailedStats {
  totalGames: number
  gamesToday: number
  gamesWeek: number
  gamesMonth: number
  totalBets: number
  totalWins: number
  betsToday: number
  winsToday: number
  netProfit: number
}

export default function GamesPage() {
  const [settings, setSettings] = useState<GameSettings | null>(null)
  const [statistics, setStatistics] = useState<GameStatistics | null>(null)
  const [minesStatistics, setMinesStatistics] = useState<MinesStatistics | null>(null)
  const [rouletteStatistics, setRouletteStatistics] = useState<RouletteStatistics | null>(null)
  const [detailedStats, setDetailedStats] = useState<DetailedStats | null>(null)
  const [minesDetailedStats, setMinesDetailedStats] = useState<MinesDetailedStats | null>(null)
  const [rouletteDetailedStats, setRouletteDetailedStats] = useState<RouletteDetailedStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Ayarları yükle
  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/games/settings')
      if (res.ok) {
        const data = await res.json()
        setSettings(data.settings)
        setStatistics(data.statistics)
        setMinesStatistics(data.minesStatistics)
        setRouletteStatistics(data.rouletteStatistics)
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      toast.error('Ayarlar yüklenemedi')
    } finally {
      setLoading(false)
    }
  }, [])

  // Detaylı istatistikleri yükle
  const loadDetailedStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stats')
      if (res.ok) {
        const data = await res.json()
        setDetailedStats(data.blackjack)
        setMinesDetailedStats(data.mines)
        setRouletteDetailedStats(data.roulette)
      }
    } catch (error) {
      console.error('Error loading detailed stats:', error)
    }
  }, [])

  useEffect(() => {
    loadSettings()
    loadDetailedStats()
  }, [loadSettings, loadDetailedStats])

  // Ayarları kaydet
  const saveSettings = async (game: 'blackjack' | 'mines' | 'roulette', enabled: boolean) => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/games/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game, settings: { enabled } })
      })

      if (res.ok) {
        const gameNames: Record<string, string> = {
          blackjack: 'Blackjack',
          mines: 'Mines',
          roulette: 'Rulet'
        }
        toast.success(`${gameNames[game]} ${enabled ? 'açıldı' : 'kapatıldı'}`)
        await loadSettings()
      } else {
        toast.error('Ayarlar kaydedilemedi')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Bir hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  const handleRefresh = () => {
    loadSettings()
    loadDetailedStats()
  }

  if (loading) {
    return (
      <AdminPermissionGuard permission="canAccessGames">
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-fuchsia-500" />
        </div>
      </AdminPermissionGuard>
    )
  }

  return (
    <AdminPermissionGuard permission="canAccessGames">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-3">
              <Gamepad2 className="w-7 h-7 text-fuchsia-500" />
              Oyun Yönetimi
            </h1>
            <p className="text-gray-400 mt-1">
              Oyunları açın/kapatın ve istatistikleri takip edin
            </p>
          </div>
          <Button
            onClick={handleRefresh}
            variant="outline"
            className="border-slate-600 hover:bg-slate-800"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Yenile
          </Button>
        </div>

        {/* Oyun Toggle Kartları - Minimal */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Blackjack */}
          <Card className="bg-slate-900 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-600">
                    <Spade className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-100">Blackjack</h3>
                    <p className="text-xs text-gray-500">21 kart oyunu</p>
                  </div>
                </div>
                <Switch
                  checked={settings?.blackjack.enabled}
                  onCheckedChange={(checked) => saveSettings('blackjack', checked)}
                  disabled={saving}
                />
              </div>
            </CardContent>
          </Card>

          {/* Mines */}
          <Card className="bg-slate-900 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600">
                    <Bomb className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-100">Mines</h3>
                    <p className="text-xs text-gray-500">Mayın tarlası oyunu</p>
                  </div>
                </div>
                <Switch
                  checked={settings?.mines?.enabled}
                  onCheckedChange={(checked) => saveSettings('mines', checked)}
                  disabled={saving}
                />
              </div>
            </CardContent>
          </Card>

          {/* Rulet */}
          <Card className="bg-slate-900 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-100">Rulet</h3>
                    <p className="text-xs text-gray-500">Klasik casino ruleti</p>
                  </div>
                </div>
                <Switch
                  checked={settings?.roulette?.enabled}
                  onCheckedChange={(checked) => saveSettings('roulette', checked)}
                  disabled={saving}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Oyun İstatistikleri */}
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-gray-100 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-fuchsia-500" />
              Oyun İstatistikleri
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* İstatistik Tablosu */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Oyun</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">Toplam</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">Bugün</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">Hafta</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">Ay</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">
                      <span className="flex items-center justify-center gap-1">
                        <ArrowDownRight className="w-3 h-3 text-rose-400" />
                        Bahis
                      </span>
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">
                      <span className="flex items-center justify-center gap-1">
                        <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                        Kazanç
                      </span>
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">Site Karı</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Blackjack Satırı */}
                  <tr className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-fuchsia-500/20 to-purple-600/20 border border-fuchsia-500/30">
                          <Spade className="w-4 h-4 text-fuchsia-400" />
                        </div>
                        <span className="font-medium text-gray-200">Blackjack</span>
                      </div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <span className="text-gray-100 font-semibold">
                        {detailedStats?.totalGames?.toLocaleString('tr-TR') || statistics?.totalGames?.toLocaleString('tr-TR') || 0}
                      </span>
                    </td>
                    <td className="text-center py-4 px-4">
                      <span className="text-emerald-400 font-medium">
                        {detailedStats?.gamesToday?.toLocaleString('tr-TR') || 0}
                      </span>
                    </td>
                    <td className="text-center py-4 px-4">
                      <span className="text-blue-400 font-medium">
                        {detailedStats?.gamesWeek?.toLocaleString('tr-TR') || 0}
                      </span>
                    </td>
                    <td className="text-center py-4 px-4">
                      <span className="text-amber-400 font-medium">
                        {detailedStats?.gamesMonth?.toLocaleString('tr-TR') || 0}
                      </span>
                    </td>
                    <td className="text-center py-4 px-4">
                      <span className="text-rose-400 font-medium">
                        {detailedStats?.totalBets?.toLocaleString('tr-TR') || statistics?.totalBet?.toLocaleString('tr-TR') || 0}
                      </span>
                    </td>
                    <td className="text-center py-4 px-4">
                      <span className="text-emerald-400 font-medium">
                        {detailedStats?.totalWins?.toLocaleString('tr-TR') || statistics?.totalPayout?.toLocaleString('tr-TR') || 0}
                      </span>
                    </td>
                    <td className="text-center py-4 px-4">
                      <span className={`font-bold ${(detailedStats?.netProfit || statistics?.houseProfit || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {(detailedStats?.netProfit || statistics?.houseProfit || 0) >= 0 ? '+' : ''}
                        {(detailedStats?.netProfit || statistics?.houseProfit || 0).toLocaleString('tr-TR')}
                      </span>
                    </td>
                  </tr>

                  {/* Mines Satırı */}
                  <tr className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/30">
                          <Bomb className="w-4 h-4 text-amber-400" />
                        </div>
                        <span className="font-medium text-gray-200">Mines</span>
                      </div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <span className="text-gray-100 font-semibold">
                        {minesDetailedStats?.totalGames?.toLocaleString('tr-TR') || minesStatistics?.totalGames?.toLocaleString('tr-TR') || 0}
                      </span>
                    </td>
                    <td className="text-center py-4 px-4">
                      <span className="text-emerald-400 font-medium">
                        {minesDetailedStats?.gamesToday?.toLocaleString('tr-TR') || 0}
                      </span>
                    </td>
                    <td className="text-center py-4 px-4">
                      <span className="text-blue-400 font-medium">
                        {minesDetailedStats?.gamesWeek?.toLocaleString('tr-TR') || 0}
                      </span>
                    </td>
                    <td className="text-center py-4 px-4">
                      <span className="text-amber-400 font-medium">
                        {minesDetailedStats?.gamesMonth?.toLocaleString('tr-TR') || 0}
                      </span>
                    </td>
                    <td className="text-center py-4 px-4">
                      <span className="text-rose-400 font-medium">
                        {minesDetailedStats?.totalBets?.toLocaleString('tr-TR') || minesStatistics?.totalBet?.toLocaleString('tr-TR') || 0}
                      </span>
                    </td>
                    <td className="text-center py-4 px-4">
                      <span className="text-emerald-400 font-medium">
                        {minesDetailedStats?.totalWins?.toLocaleString('tr-TR') || minesStatistics?.totalPayout?.toLocaleString('tr-TR') || 0}
                      </span>
                    </td>
                    <td className="text-center py-4 px-4">
                      <span className={`font-bold ${(minesDetailedStats?.netProfit || minesStatistics?.houseProfit || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {(minesDetailedStats?.netProfit || minesStatistics?.houseProfit || 0) >= 0 ? '+' : ''}
                        {(minesDetailedStats?.netProfit || minesStatistics?.houseProfit || 0).toLocaleString('tr-TR')}
                      </span>
                    </td>
                  </tr>

                  {/* Rulet Satırı */}
                  <tr className="hover:bg-slate-800/50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500/20 to-green-600/20 border border-emerald-500/30">
                          <Target className="w-4 h-4 text-emerald-400" />
                        </div>
                        <span className="font-medium text-gray-200">Rulet</span>
                      </div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <span className="text-gray-100 font-semibold">
                        {rouletteDetailedStats?.totalGames?.toLocaleString('tr-TR') || rouletteStatistics?.totalGames?.toLocaleString('tr-TR') || 0}
                      </span>
                    </td>
                    <td className="text-center py-4 px-4">
                      <span className="text-emerald-400 font-medium">
                        {rouletteDetailedStats?.gamesToday?.toLocaleString('tr-TR') || 0}
                      </span>
                    </td>
                    <td className="text-center py-4 px-4">
                      <span className="text-blue-400 font-medium">
                        {rouletteDetailedStats?.gamesWeek?.toLocaleString('tr-TR') || 0}
                      </span>
                    </td>
                    <td className="text-center py-4 px-4">
                      <span className="text-amber-400 font-medium">
                        {rouletteDetailedStats?.gamesMonth?.toLocaleString('tr-TR') || 0}
                      </span>
                    </td>
                    <td className="text-center py-4 px-4">
                      <span className="text-rose-400 font-medium">
                        {rouletteDetailedStats?.totalBets?.toLocaleString('tr-TR') || rouletteStatistics?.totalBet?.toLocaleString('tr-TR') || 0}
                      </span>
                    </td>
                    <td className="text-center py-4 px-4">
                      <span className="text-emerald-400 font-medium">
                        {rouletteDetailedStats?.totalWins?.toLocaleString('tr-TR') || rouletteStatistics?.totalPayout?.toLocaleString('tr-TR') || 0}
                      </span>
                    </td>
                    <td className="text-center py-4 px-4">
                      <span className={`font-bold ${(rouletteDetailedStats?.netProfit || rouletteStatistics?.houseProfit || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {(rouletteDetailedStats?.netProfit || rouletteStatistics?.houseProfit || 0) >= 0 ? '+' : ''}
                        {(rouletteDetailedStats?.netProfit || rouletteStatistics?.houseProfit || 0).toLocaleString('tr-TR')}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Özet Kartları */}
            {statistics && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-700">
                <div className="p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-600/10 border border-green-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="w-4 h-4 text-green-400" />
                    <span className="text-xs text-gray-400">Kazanç</span>
                  </div>
                  <p className="text-2xl font-bold text-green-400">
                    {(statistics.wins + statistics.blackjacks).toLocaleString('tr-TR')}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-gradient-to-br from-red-500/10 to-rose-600/10 border border-red-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="w-4 h-4 text-red-400" />
                    <span className="text-xs text-gray-400">Kayıp</span>
                  </div>
                  <p className="text-2xl font-bold text-red-400">
                    {statistics.losses.toLocaleString('tr-TR')}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-gradient-to-br from-yellow-500/10 to-amber-600/10 border border-yellow-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="w-4 h-4 text-yellow-400" />
                    <span className="text-xs text-gray-400">Kazanma Oranı</span>
                  </div>
                  <p className="text-2xl font-bold text-yellow-400">
                    %{statistics.winRate}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-fuchsia-600/10 border border-purple-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Coins className="w-4 h-4 text-purple-400" />
                    <span className="text-xs text-gray-400">Toplam Bahis</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-400">
                    {statistics.totalBet.toLocaleString('tr-TR')}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminPermissionGuard>
  )
}
