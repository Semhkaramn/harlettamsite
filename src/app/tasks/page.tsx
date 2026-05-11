'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { useUserTheme } from '@/components/providers/user-theme-provider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import DashboardLayout from '@/components/DashboardLayout'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { hexToRgba } from '@/components/ui/themed'
import {
  FileText,
  CheckCircle2,
  Clock,
  Gift,
  Target,
  MessageSquare,
  TrendingUp,
  Calendar,
  History,
  Sparkles,
  Star,
  Flame,
  Trophy,
  Zap,
  Crown
} from 'lucide-react'
import { toast } from 'sonner'

type TaskCategory = 'streak' | 'daily' | 'weekly' | 'permanent'

interface Task {
  id: string
  title: string
  description?: string
  category: TaskCategory
  taskType: string
  targetValue: number
  currentProgress: number
  xpReward: number
  pointsReward: number
  progress: string
  completed: boolean
  rewardClaimed: boolean
}

interface TaskHistoryItem {
  id: string
  taskId: string
  title: string
  description?: string
  category: TaskCategory
  taskType: string
  targetValue: number
  completedProgress: number
  xpReward: number
  pointsReward: number
  completedAt: string
  claimedAt: string
}

const TASK_TYPE_ICONS: Record<string, any> = {
  send_messages: MessageSquare,
  spin_wheel: Target
}

const TASK_TYPE_LABELS: Record<string, string> = {
  send_messages: 'Mesaj Gönder',
  spin_wheel: 'Çark Çevir'
}

const getTaskTypeLabel = (taskType: string, category: string) => {
  if (category === 'streak' && taskType === 'spin_wheel') {
    return 'Ardışık Gün'
  }
  return TASK_TYPE_LABELS[taskType] || taskType
}

// Kategori ikonları ve renkleri - theme bağımlı olacak şekilde fonksiyon olarak kullanılacak
const getCategoryConfig = (primaryColor: string) => ({
  streak: { icon: Flame, color: primaryColor, bgColor: hexToRgba(primaryColor, 0.15), label: 'Seri Görevleri' },
  daily: { icon: Calendar, color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.15)', label: 'Günlük Görevler' },
  weekly: { icon: Clock, color: '#8b5cf6', bgColor: 'rgba(139, 92, 246, 0.15)', label: 'Haftalık Görevler' },
  permanent: { icon: Crown, color: '#eab308', bgColor: 'rgba(234, 179, 8, 0.15)', label: 'Kalıcı Görevler' }
})

function TasksContent() {
  const router = useRouter()
  const { user, setShowLoginModal } = useAuth()
  const { theme } = useUserTheme()

  const [dailyTasks, setDailyTasks] = useState<Task[]>([])
  const [weeklyTasks, setWeeklyTasks] = useState<Task[]>([])
  const [streakTasks, setStreakTasks] = useState<Task[]>([])
  const [permanentTasks, setPermanentTasks] = useState<Task[]>([])
  const [taskHistory, setTaskHistory] = useState<TaskHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('active')
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    loadTasks()
  }, [user])

  async function loadTasks() {
    try {
      const tasksRes = await fetch('/api/task')

      if (!tasksRes.ok) {
        throw new Error('Failed to fetch tasks')
      }

      const tasksData = await tasksRes.json()

      setDailyTasks(tasksData.dailyTasks || [])
      setWeeklyTasks(tasksData.weeklyTasks || [])
      setStreakTasks(tasksData.streakTasks || [])
      setPermanentTasks(tasksData.permanentTasks || [])
      setTaskHistory(tasksData.taskHistory || [])
      setIsAuthenticated(tasksData.isAuthenticated || false)
    } catch (error) {
      console.error('Error loading tasks:', error)
      toast.error('Görevler yüklenirken bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  async function claimReward(taskId: string) {
    if (!user) {
      toast.error('Ödül almak için giriş yapmalısınız')
      setShowLoginModal(true)
      return
    }

    setClaiming(taskId)
    try {
      const response = await fetch('/api/task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast.success(`Ödül alındı! +${data.rewards.points} puan, +${data.rewards.xp} XP`)
        await loadTasks()
      } else {
        toast.error(data.error || 'Ödül alınamadı')
      }
    } catch (error) {
      console.error('Error claiming reward:', error)
      toast.error('Bir hata oluştu')
    } finally {
      setClaiming(null)
    }
  }

  // Modern Task Card Component
  function TaskCard({ task }: { task: Task }) {
    const Icon = TASK_TYPE_ICONS[task.taskType] || FileText
    const canClaim = task.completed && !task.rewardClaimed
    const isStreak = task.category === 'streak'
    const percentage = Math.min((task.currentProgress / task.targetValue) * 100, 100)
    const categoryConfig = getCategoryConfig(theme.colors.primary)[task.category]

    return (
      <div
        className="relative group rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02]"
        style={{
          background: task.rewardClaimed
            ? `linear-gradient(145deg, ${hexToRgba(theme.colors.border, 0.3)}, ${hexToRgba(theme.colors.backgroundSecondary, 0.5)})`
            : canClaim
              ? `linear-gradient(145deg, ${hexToRgba('#22c55e', 0.2)}, ${hexToRgba('#16a34a', 0.15)})`
              : `linear-gradient(145deg, ${hexToRgba(theme.colors.primary, 0.15)}, ${hexToRgba(theme.colors.gradientTo, 0.1)})`,
          border: task.rewardClaimed
            ? `1px solid ${hexToRgba(theme.colors.border, 0.3)}`
            : canClaim
              ? `2px solid ${hexToRgba('#22c55e', 0.5)}`
              : `1px solid ${hexToRgba(theme.colors.primary, 0.3)}`,
          boxShadow: canClaim
            ? `0 8px 32px ${hexToRgba('#22c55e', 0.2)}, 0 0 0 1px ${hexToRgba('#22c55e', 0.1)}`
            : task.rewardClaimed
              ? 'none'
              : `0 4px 24px ${hexToRgba(theme.colors.primary, 0.1)}`
        }}
      >
        {/* Glow Effect for claimable tasks */}
        {canClaim && (
          <div
            className="absolute inset-0 opacity-30 animate-pulse"
            style={{
              background: `radial-gradient(ellipse at center, ${hexToRgba('#22c55e', 0.3)}, transparent 70%)`
            }}
          />
        )}

        {/* Decorative corner accent */}
        {!task.rewardClaimed && (
          <div
            className="absolute top-0 right-0 w-24 h-24 opacity-20"
            style={{
              background: `radial-gradient(circle at top right, ${canClaim ? '#22c55e' : theme.colors.primary}, transparent 70%)`
            }}
          />
        )}

        <div className="relative p-6">
          {/* Header with icon and status */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div
                className="p-3 rounded-xl transition-transform group-hover:scale-110"
                style={{
                  background: task.rewardClaimed
                    ? hexToRgba(theme.colors.border, 0.3)
                    : canClaim
                      ? `linear-gradient(135deg, ${hexToRgba('#22c55e', 0.3)}, ${hexToRgba('#16a34a', 0.2)})`
                      : `linear-gradient(135deg, ${hexToRgba(theme.colors.primary, 0.25)}, ${hexToRgba(theme.colors.gradientTo, 0.2)})`,
                  boxShadow: canClaim
                    ? `0 4px 12px ${hexToRgba('#22c55e', 0.25)}`
                    : `0 4px 12px ${hexToRgba(theme.colors.primary, 0.15)}`
                }}
              >
                {task.rewardClaimed ? (
                  <CheckCircle2 className="w-6 h-6" style={{ color: theme.colors.textMuted }} />
                ) : canClaim ? (
                  <CheckCircle2 className="w-6 h-6 text-green-400 animate-pulse" />
                ) : isStreak ? (
                  <Flame className="w-6 h-6" style={{ color: theme.colors.primary }} />
                ) : (
                  <Icon className="w-6 h-6" style={{ color: theme.colors.primary }} />
                )}
              </div>

              <div>
                <h3
                  className="font-bold text-base leading-tight"
                  style={{
                    color: task.rewardClaimed
                      ? theme.colors.textMuted
                      : canClaim
                        ? '#86efac'
                        : theme.colors.text
                  }}
                >
                  {task.title}
                </h3>
                {task.description && (
                  <p
                    className="text-sm mt-1 leading-relaxed"
                    style={{
                      color: task.rewardClaimed
                        ? hexToRgba(theme.colors.textMuted, 0.7)
                        : canClaim
                          ? 'rgba(134, 239, 172, 0.8)'
                          : theme.colors.textSecondary
                    }}
                  >
                    {task.description}
                  </p>
                )}
              </div>
            </div>

            {/* Streak fire indicator */}
            {isStreak && task.currentProgress > 0 && !task.rewardClaimed && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full" style={{ background: hexToRgba(theme.colors.primary, 0.2) }}>
                <Flame className="w-4 h-4 animate-pulse" style={{ color: theme.colors.primary }} />
                <span className="text-xs font-bold" style={{ color: theme.colors.primary }}>{task.currentProgress}</span>
              </div>
            )}
          </div>

          {/* Progress Section */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span
                className="text-xs font-medium px-2 py-1 rounded-full"
                style={{
                  background: hexToRgba(categoryConfig?.color || theme.colors.primary, 0.15),
                  color: categoryConfig?.color || theme.colors.textSecondary
                }}
              >
                {isStreak ? `${task.currentProgress} gün seri` : getTaskTypeLabel(task.taskType, task.category)}
              </span>
              <span
                className="text-sm font-semibold"
                style={{
                  color: task.rewardClaimed
                    ? theme.colors.textMuted
                    : canClaim
                      ? '#4ade80'
                      : theme.colors.text
                }}
              >
                {task.progress}
              </span>
            </div>

            {/* Custom Progress Bar */}
            <div
              className="h-2 rounded-full overflow-hidden"
              style={{ background: hexToRgba(theme.colors.border, 0.4) }}
            >
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${percentage}%`,
                  background: task.rewardClaimed
                    ? hexToRgba(theme.colors.textMuted, 0.5)
                    : canClaim
                      ? 'linear-gradient(90deg, #22c55e, #4ade80)'
                      : `linear-gradient(90deg, ${theme.colors.primary}, ${theme.colors.gradientTo})`
                }}
              />
            </div>
          </div>

          {/* Rewards & Action */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {task.xpReward > 0 && (
                <div
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold"
                  style={{
                    background: hexToRgba('#eab308', 0.15),
                    color: '#fbbf24'
                  }}
                >
                  <Star className="w-3 h-3" fill="currentColor" />
                  {task.xpReward} XP
                </div>
              )}
              {task.pointsReward > 0 && (
                <div
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold"
                  style={{
                    background: hexToRgba('#22c55e', 0.15),
                    color: '#4ade80'
                  }}
                >
                  <Sparkles className="w-3 h-3" />
                  {task.pointsReward} Puan
                </div>
              )}
            </div>

            {canClaim && (
              <button
                onClick={() => claimReward(task.id)}
                disabled={claiming === task.id}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all duration-200 hover:scale-105 hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:hover:brightness-100 disabled:hover:scale-100"
                style={{
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  color: '#ffffff',
                  boxShadow: '0 4px 14px rgba(34, 197, 94, 0.4)'
                }}
              >
                {claiming === task.id ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Alınıyor
                  </>
                ) : (
                  <>
                    <Gift className="w-4 h-4" />
                    Ödülü Al
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // History Card Component
  function HistoryCard({ item }: { item: TaskHistoryItem }) {
    return (
      <div
        className="relative rounded-xl p-4 transition-all duration-200 hover:translate-x-1"
        style={{
          background: hexToRgba(theme.colors.backgroundSecondary, 0.6),
          border: `1px solid ${hexToRgba(theme.colors.border, 0.3)}`
        }}
      >
        <div className="flex items-center gap-4">
          <div
            className="p-2 rounded-lg flex-shrink-0"
            style={{ background: hexToRgba(theme.colors.border, 0.3) }}
          >
            <CheckCircle2 className="w-5 h-5" style={{ color: theme.colors.textMuted }} />
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm truncate" style={{ color: theme.colors.text }}>
              {item.title}
            </h4>
            <p className="text-xs mt-0.5" style={{ color: theme.colors.textMuted }}>
              {new Date(item.claimedAt).toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {item.xpReward > 0 && (
              <span
                className="text-xs font-semibold px-2 py-1 rounded-md"
                style={{
                  background: hexToRgba('#eab308', 0.15),
                  color: '#fbbf24'
                }}
              >
                +{item.xpReward} XP
              </span>
            )}
            {item.pointsReward > 0 && (
              <span
                className="text-xs font-semibold px-2 py-1 rounded-md"
                style={{
                  background: hexToRgba('#22c55e', 0.15),
                  color: '#4ade80'
                }}
              >
                +{item.pointsReward} P
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Category Section Component
  function CategorySection({
    tasks,
    category
  }: {
    tasks: Task[]
    category: TaskCategory
  }) {
    if (tasks.length === 0) return null

    const categoryConfig = getCategoryConfig(theme.colors.primary)
    const config = categoryConfig[category]
    const CategoryIcon = config?.icon || Target
    const claimableCount = tasks.filter(t => t.completed && !t.rewardClaimed).length

    return (
      <div>
        {/* Section Header */}
        <div className="flex items-center gap-3 mb-5">
          <div
            className="p-2.5 rounded-xl"
            style={{ background: config?.bgColor || hexToRgba(theme.colors.primary, 0.15) }}
          >
            <CategoryIcon
              className="w-5 h-5"
              style={{ color: config?.color || theme.colors.primary }}
            />
          </div>
          <h2
            className="text-lg font-bold"
            style={{ color: theme.colors.text }}
          >
            {config?.label || 'Görevler'}
          </h2>
          {claimableCount > 0 && (
            <span
              className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold animate-pulse"
              style={{
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                color: '#ffffff',
                boxShadow: '0 2px 8px rgba(34, 197, 94, 0.4)'
              }}
            >
              {claimableCount}
            </span>
          )}
        </div>

        {/* Tasks Grid */}
        <div className={`grid gap-5 ${tasks.length === 1 ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
          {tasks.map(task => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout showYatayBanner={true}>
      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="user-page-container">
          <div className="user-page-inner">
            {/* Modern Header */}
            <div className="px-4 pt-6 pb-4">
              <div
                className="flex items-center gap-4 p-5 rounded-2xl"
                style={{
                  background: `linear-gradient(135deg, ${hexToRgba(theme.colors.primary, 0.1)}, ${hexToRgba(theme.colors.gradientTo, 0.05)})`,
                  border: `1px solid ${hexToRgba(theme.colors.primary, 0.2)}`
                }}
              >
                <div
                  className="p-3 rounded-xl"
                  style={{
                    background: `linear-gradient(135deg, ${hexToRgba(theme.colors.primary, 0.2)}, ${hexToRgba(theme.colors.gradientTo, 0.15)})`
                  }}
                >
                  <Trophy className="w-7 h-7" style={{ color: theme.colors.primary }} />
                </div>
                <div>
                  <h1 className="text-xl font-bold" style={{ color: theme.colors.text }}>
                    Görevler
                  </h1>
                  <p className="text-sm mt-0.5" style={{ color: theme.colors.textSecondary }}>
                    Görevleri tamamla, ödülleri topla
                  </p>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="px-4 pb-6">
              <Tabs defaultValue="active" value={activeTab} onValueChange={setActiveTab}>
                <TabsList
                  className="w-full p-1.5 rounded-xl mb-6"
                  style={{
                    background: hexToRgba(theme.colors.backgroundSecondary, 0.6),
                    border: `1px solid ${hexToRgba(theme.colors.border, 0.3)}`
                  }}
                >
                  <TabsTrigger
                    value="active"
                    className="flex-1 rounded-lg py-2.5 font-medium transition-all data-[state=active]:shadow-lg"
                    style={{
                      background: activeTab === 'active'
                        ? `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.gradientTo})`
                        : 'transparent',
                      color: activeTab === 'active' ? '#ffffff' : theme.colors.textMuted
                    }}
                  >
                    <Target className="w-4 h-4 mr-2" />
                    Aktif Görevler
                  </TabsTrigger>
                  {isAuthenticated && (
                    <TabsTrigger
                      value="history"
                      className="flex-1 rounded-lg py-2.5 font-medium transition-all data-[state=active]:shadow-lg"
                      style={{
                        background: activeTab === 'history'
                          ? hexToRgba(theme.colors.backgroundSecondary, 0.8)
                          : 'transparent',
                        color: activeTab === 'history' ? theme.colors.text : theme.colors.textMuted
                      }}
                    >
                      <History className="w-4 h-4 mr-2" />
                      Geçmiş ({taskHistory.length})
                    </TabsTrigger>
                  )}
                </TabsList>

                {/* Active Tasks Tab */}
                <TabsContent value="active" className="space-y-8">
                  {/* Task Categories */}
                  <div className="space-y-10">
                    <CategorySection tasks={streakTasks} category="streak" />
                    <CategorySection tasks={dailyTasks} category="daily" />
                    <CategorySection tasks={weeklyTasks} category="weekly" />
                    <CategorySection tasks={permanentTasks} category="permanent" />
                  </div>

                  {/* Empty State */}
                  {dailyTasks.length === 0 && weeklyTasks.length === 0 && streakTasks.length === 0 && permanentTasks.length === 0 && (
                    <div
                      className="text-center py-16 rounded-2xl"
                      style={{
                        background: hexToRgba(theme.colors.backgroundSecondary, 0.5),
                        border: `1px dashed ${hexToRgba(theme.colors.border, 0.5)}`
                      }}
                    >
                      <FileText className="w-16 h-16 mx-auto mb-4" style={{ color: theme.colors.textMuted }} />
                      <h3 className="text-lg font-semibold mb-2" style={{ color: theme.colors.text }}>
                        Henüz Görev Yok
                      </h3>
                      <p style={{ color: theme.colors.textMuted }}>
                        Yakında yeni görevler eklenecek!
                      </p>
                    </div>
                  )}

                  {/* Info Card */}
                  <div
                    className="mt-12 p-5 rounded-2xl"
                    style={{
                      background: `linear-gradient(135deg, ${hexToRgba(theme.colors.primary, 0.08)}, ${hexToRgba(theme.colors.gradientTo, 0.05)})`,
                      border: `1px solid ${hexToRgba(theme.colors.primary, 0.2)}`
                    }}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className="p-3 rounded-xl flex-shrink-0"
                        style={{ background: hexToRgba(theme.colors.primary, 0.15) }}
                      >
                        <Zap className="w-5 h-5" style={{ color: theme.colors.primary }} />
                      </div>
                      <div>
                        <h3 className="font-bold mb-3" style={{ color: theme.colors.text }}>
                          Görev Sistemi Nasıl Çalışır?
                        </h3>
                        <ul className="space-y-2 text-sm" style={{ color: theme.colors.textSecondary }}>
                          <li className="flex items-start gap-2">
                            <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: theme.colors.primary }} />
                            <span>Görevleri tamamlayın ve ödül kazanın</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <Flame className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: theme.colors.primary }} />
                            <span>Seri görevler ardışık günlerde tamamlanır, gün atlanırsa sıfırlanır</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <Calendar className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#3b82f6' }} />
                            <span>Günlük görevler her gün, haftalık görevler her hafta sıfırlanır</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <Crown className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#eab308' }} />
                            <span>Kalıcı görevler bir kez tamamlanabilir</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <Gift className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#22c55e' }} />
                            <span>Tamamlanan görevlerin ödüllerini "Ödülü Al" butonu ile talep edin</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* History Tab */}
                <TabsContent value="history" className="space-y-3">
                  {taskHistory.length === 0 ? (
                    <div
                      className="text-center py-16 rounded-2xl"
                      style={{
                        background: hexToRgba(theme.colors.backgroundSecondary, 0.5),
                        border: `1px dashed ${hexToRgba(theme.colors.border, 0.5)}`
                      }}
                    >
                      <History className="w-16 h-16 mx-auto mb-4" style={{ color: theme.colors.textMuted }} />
                      <h3 className="text-lg font-semibold mb-2" style={{ color: theme.colors.text }}>
                        Henüz Görev Geçmişi Yok
                      </h3>
                      <p style={{ color: theme.colors.textMuted }}>
                        Tamamladığınız görevler burada görünecek
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold" style={{ color: theme.colors.text }}>
                          Tamamlanan Görevler
                        </h2>
                        <span
                          className="text-xs font-medium px-3 py-1.5 rounded-full"
                          style={{
                            background: hexToRgba(theme.colors.border, 0.3),
                            color: theme.colors.textSecondary
                          }}
                        >
                          {taskHistory.length} görev
                        </span>
                      </div>
                      {taskHistory.map(item => (
                        <HistoryCard key={item.id} item={item} />
                      ))}
                    </>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

export default function TasksPage() {
  return <TasksContent />
}
