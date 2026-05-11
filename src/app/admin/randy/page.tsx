'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, Play, Square, Trophy, Users, ChevronDown, ChevronUp, Bold, Italic, Underline, Code, Link } from 'lucide-react'
import { toast } from 'sonner'
import AdminPermissionGuard from '@/components/AdminPermissionGuard'

interface TelegramGroup {
  id: string
  name: string
}

interface Randy {
  id: string
  title: string
  message: string
  targetGroupId: string
  requirementType: string
  messageCountPeriod?: string
  messageCountRequired?: number
  postRandyMessages?: number
  requireChannelMembership: boolean
  membershipCheckChannelIds?: string
  winnerCount: number
  prizePoints: number
  pinMessage: boolean
  status: string
  messageId?: number
  participantCount?: number
  startedAt?: string
  endedAt?: string
  winners?: Array<{
    id: string
    telegramId: string
    username?: string
    firstName?: string
    lastName?: string
    pointsAwarded?: number
    hasLinkedUser?: boolean
  }>
}

// Rich Text Editor Component
function RichTextEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const insertTag = useCallback((openTag: string, closeTag: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = value.substring(start, end)

    const newText = value.substring(0, start) + openTag + selectedText + closeTag + value.substring(end)
    onChange(newText)

    // Cursor'u tag'ların arasına yerleştir
    setTimeout(() => {
      textarea.focus()
      if (selectedText) {
        textarea.setSelectionRange(start + openTag.length, end + openTag.length)
      } else {
        textarea.setSelectionRange(start + openTag.length, start + openTag.length)
      }
    }, 0)
  }, [value, onChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault()
          insertTag('<b>', '</b>')
          break
        case 'i':
          e.preventDefault()
          insertTag('<i>', '</i>')
          break
        case 'u':
          e.preventDefault()
          insertTag('<u>', '</u>')
          break
        case 'k':
          e.preventDefault()
          insertTag('<code>', '</code>')
          break
      }
    }
  }, [insertTag])

  return (
    <div className="space-y-1.5">
      <Label htmlFor="message" className="text-sm">Randy Mesajı (HTML destekli)</Label>

      {/* Toolbar */}
      <div className="flex gap-1 p-1.5 bg-muted/50 rounded-t-md border border-b-0 border-input">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => insertTag('<b>', '</b>')}
          title="Kalın (Ctrl+B)"
        >
          <Bold className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => insertTag('<i>', '</i>')}
          title="İtalik (Ctrl+I)"
        >
          <Italic className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => insertTag('<u>', '</u>')}
          title="Altı Çizili (Ctrl+U)"
        >
          <Underline className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => insertTag('<code>', '</code>')}
          title="Kod (Ctrl+K)"
        >
          <Code className="h-3.5 w-3.5" />
        </Button>
        <div className="w-px h-5 bg-border mx-1 self-center" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => insertTag('<a href="">', '</a>')}
          title="Link"
        >
          <Link className="h-3.5 w-3.5 mr-1" />
          Link
        </Button>
      </div>

      {/* Textarea */}
      <Textarea
        ref={textareaRef}
        id="message"
        name="message"
        autoComplete="off"
        placeholder="<b>Randy Çekilişi!</b>&#10;&#10;Katılmak için butona tıklayın..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={4}
        className="text-sm rounded-t-none font-mono"
      />

      {/* Kısayol bilgisi */}
      <p className="text-[10px] text-muted-foreground">
        Kısayollar: Ctrl+B (Kalın), Ctrl+I (İtalik), Ctrl+U (Altı Çizili), Ctrl+K (Kod)
      </p>
    </div>
  )
}

export default function RandyPage() {
  const [randies, setRandies] = useState<Randy[]>([])
  const [availableGroups, setAvailableGroups] = useState<TelegramGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [expandedRandy, setExpandedRandy] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    title: '',
    message: '',
    targetGroupId: '',
    requirementType: 'none',
    messageCountPeriod: 'daily',
    messageCountRequired: 10,
    postRandyMessages: 5,
    requireChannelMembership: false,
    membershipCheckChannelIds: '',
    winnerCount: 1,
    prizePoints: 0,
    pinMessage: false
  })

  useEffect(() => {
    fetchRandies()
    fetchAvailableGroups()
    // eslint-disable-next-line
  }, [])

  const fetchAvailableGroups = async () => {
    try {
      const response = await fetch('/api/admin/randy/groups')
      if (!response.ok) throw new Error('Gruplar yüklenemedi')
      const data = await response.json()
      setAvailableGroups(data)

      // İlk grubu default olarak seç
      if (data.length > 0 && !formData.targetGroupId) {
        setFormData(prev => ({ ...prev, targetGroupId: data[0].id }))
      }
    } catch (error) {
      toast.error('Telegram grupları yüklenirken hata oluştu')
    }
  }

  const fetchRandies = async () => {
    try {
      const response = await fetch('/api/admin/randy')
      if (!response.ok) throw new Error('Randy\'ler yüklenemedi')
      const data = await response.json()
      setRandies(data)
    } catch (error) {
      toast.error('Randy\'ler yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!formData.title.trim() || !formData.message.trim()) {
      toast.error('Başlık ve mesaj alanları zorunludur')
      return
    }

    if (!formData.targetGroupId) {
      toast.error('Hedef grup seçmelisiniz')
      return
    }

    setCreating(true)
    try {
      const response = await fetch('/api/admin/randy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) throw new Error('Randy oluşturulamadı')

      toast.success('Randy başarıyla oluşturuldu')
      setShowCreateForm(false)
      setFormData({
        title: '',
        message: '',
        targetGroupId: availableGroups[0]?.id || '',
        requirementType: 'none',
        messageCountPeriod: 'daily',
        messageCountRequired: 10,
        postRandyMessages: 5,
        requireChannelMembership: false,
        membershipCheckChannelIds: '',
        winnerCount: 1,
        prizePoints: 0,
        pinMessage: false
      })
      fetchRandies()
    } catch (error) {
      toast.error('Randy oluşturulurken hata oluştu')
    } finally {
      setCreating(false)
    }
  }

  const handleStart = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/randy/${id}/start`, {
        method: 'POST'
      })

      if (!response.ok) throw new Error('Randy başlatılamadı')

      toast.success('Randy başarıyla başlatıldı')
      fetchRandies()
    } catch (error) {
      toast.error('Randy başlatılırken hata oluştu')
    }
  }

  const handleEnd = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/randy/${id}/end`, {
        method: 'POST'
      })

      if (!response.ok) throw new Error('Randy sonlandırılamadı')

      const data = await response.json()
      toast.success(`Randy sonlandırıldı! ${data.winners?.length || 0} kazanan seçildi`)
      fetchRandies()
    } catch (error) {
      toast.error('Randy sonlandırılırken hata oluştu')
    }
  }

  return (
    <AdminPermissionGuard>
      <div className="admin-page-container">
        <div className="admin-page-inner space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Randy Çekilişleri</h1>
            <p className="text-sm text-muted-foreground">
              Telegram grubu için Randy çekilişleri yönetin
            </p>
          </div>
          <Button onClick={() => setShowCreateForm(!showCreateForm)} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Yeni Randy
          </Button>
        </div>

        {showCreateForm && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Yeni Randy Oluştur</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="title" className="text-sm">Başlık</Label>
                  <Input
                    id="title"
                    name="title"
                    autoComplete="off"
                    placeholder="Randy Başlığı"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="targetGroupId" className="text-sm">Hedef Grup/Kanal</Label>
                  <Select
                    value={formData.targetGroupId}
                    onValueChange={(value) => setFormData({ ...formData, targetGroupId: value })}
                  >
                    <SelectTrigger id="targetGroupId" className="h-9">
                      <SelectValue placeholder="Grup seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableGroups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Rich Text Editor */}
              <RichTextEditor
                value={formData.message}
                onChange={(value) => setFormData({ ...formData, message: value })}
              />

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="requirementType" className="text-sm">Katılım Şartı</Label>
                  <Select
                    value={formData.requirementType}
                    onValueChange={(value) => setFormData({ ...formData, requirementType: value })}
                  >
                    <SelectTrigger id="requirementType" className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Şartsız</SelectItem>
                      <SelectItem value="message_count">Mesaj Sayısı</SelectItem>
                      <SelectItem value="post_randy_messages">Randy Sonrası</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.requirementType === 'message_count' && (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="messageCountPeriod" className="text-sm">Periyod</Label>
                      <Select
                        value={formData.messageCountPeriod}
                        onValueChange={(value) => setFormData({ ...formData, messageCountPeriod: value })}
                      >
                        <SelectTrigger id="messageCountPeriod" className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Günlük</SelectItem>
                          <SelectItem value="weekly">Haftalık</SelectItem>
                          <SelectItem value="monthly">Aylık</SelectItem>
                          <SelectItem value="all_time">Tüm Zamanlar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="messageCountRequired" className="text-sm">Mesaj Sayısı</Label>
                      <Input
                        id="messageCountRequired"
                        name="messageCountRequired"
                        type="number"
                        min="1"
                        autoComplete="off"
                        value={formData.messageCountRequired}
                        onChange={(e) => setFormData({ ...formData, messageCountRequired: parseInt(e.target.value) || 0 })}
                        className="h-9"
                      />
                    </div>
                  </>
                )}

                {formData.requirementType === 'post_randy_messages' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="postRandyMessages" className="text-sm">Randy Sonrası Mesaj</Label>
                    <Input
                      id="postRandyMessages"
                      name="postRandyMessages"
                      type="number"
                      min="1"
                      autoComplete="off"
                      value={formData.postRandyMessages}
                      onChange={(e) => setFormData({ ...formData, postRandyMessages: parseInt(e.target.value) || 0 })}
                      className="h-9"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="winnerCount" className="text-sm">Kazanan Sayısı</Label>
                  <Input
                    id="winnerCount"
                    name="winnerCount"
                    type="number"
                    min="1"
                    autoComplete="off"
                    value={formData.winnerCount}
                    onChange={(e) => setFormData({ ...formData, winnerCount: parseInt(e.target.value) || 1 })}
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="prizePoints" className="text-sm">Ödül Puan</Label>
                  <Input
                    id="prizePoints"
                    name="prizePoints"
                    type="number"
                    min="0"
                    autoComplete="off"
                    placeholder="0 = Puan yok"
                    value={formData.prizePoints}
                    onChange={(e) => setFormData({ ...formData, prizePoints: parseInt(e.target.value) || 0 })}
                    className="h-9"
                  />
                </div>
              </div>

              <div className="space-y-3 border-t pt-3">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="requireChannelMembership"
                    checked={formData.requireChannelMembership}
                    onCheckedChange={(checked) => setFormData({ ...formData, requireChannelMembership: checked })}
                  />
                  <Label htmlFor="requireChannelMembership" className="text-sm">Kanal üyelik kontrolü</Label>
                </div>

                {formData.requireChannelMembership && (
                  <div className="space-y-1.5">
                    <Label htmlFor="membershipCheckChannelIds" className="text-sm">Zorunlu Grup/Kanal ID'leri</Label>
                    <Select
                      value=""
                      onValueChange={(value) => {
                        const current = formData.membershipCheckChannelIds
                        const newValue = current ? `${current}\n${value}` : value
                        setFormData({ ...formData, membershipCheckChannelIds: newValue })
                      }}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Grup/Kanal ekle" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableGroups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Textarea
                      id="membershipCheckChannelIds"
                      name="membershipCheckChannelIds"
                      autoComplete="off"
                      placeholder="Her satıra bir ID"
                      value={formData.membershipCheckChannelIds}
                      onChange={(e) => setFormData({ ...formData, membershipCheckChannelIds: e.target.value })}
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Switch
                    id="pinMessage"
                    checked={formData.pinMessage}
                    onCheckedChange={(checked) => setFormData({ ...formData, pinMessage: checked })}
                  />
                  <Label htmlFor="pinMessage" className="text-sm">Mesajı sabitle</Label>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={handleCreate} disabled={creating} size="sm">
                  {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Oluştur
                </Button>
                <Button variant="outline" onClick={() => setShowCreateForm(false)} size="sm">
                  İptal
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : randies.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Henüz Randy oluşturulmamış
            </CardContent>
          </Card>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted/50 px-4 py-2 grid grid-cols-12 gap-4 text-xs font-medium text-muted-foreground">
              <div className="col-span-2">Başlık</div>
              <div className="col-span-2">Durum</div>
              <div className="col-span-2">Katılım Şartı</div>
              <div className="col-span-1 text-center">Kazanan</div>
              <div className="col-span-1 text-center">Ödül</div>
              <div className="col-span-1 text-center">Katılımcı</div>
              <div className="col-span-1 text-center">Sabitle</div>
              <div className="col-span-2 text-right">İşlemler</div>
            </div>

            {randies.map((randy) => (
              <div key={randy.id} className="border-t">
                <div className="px-4 py-2.5 grid grid-cols-12 gap-4 items-center hover:bg-muted/30 transition-colors">
                  <div className="col-span-2">
                    <div className="font-medium text-sm truncate">{randy.title}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {randy.message.replace(/<[^>]*>/g, '').substring(0, 40)}...
                    </div>
                  </div>

                  <div className="col-span-2">
                    <Badge
                      variant={
                        randy.status === 'active' ? 'default' :
                        randy.status === 'ended' ? 'secondary' :
                        'outline'
                      }
                      className="text-xs"
                    >
                      {randy.status === 'active' ? 'Aktif' :
                       randy.status === 'ended' ? 'Bitti' :
                       'Taslak'}
                    </Badge>
                  </div>

                  <div className="col-span-2 text-sm">
                    {randy.requirementType === 'none' && 'Şartsız'}
                    {randy.requirementType === 'message_count' &&
                      `${randy.messageCountRequired} msg`
                    }
                    {randy.requirementType === 'post_randy_messages' &&
                      `Randy sonrası ${randy.postRandyMessages}`
                    }
                  </div>

                  <div className="col-span-1 text-center">
                    <div className="flex items-center justify-center gap-1 text-sm">
                      <Trophy className="h-3 w-3" />
                      {randy.winnerCount}
                    </div>
                  </div>

                  <div className="col-span-1 text-center">
                    <div className="text-sm font-medium">
                      {randy.prizePoints > 0 ? `${randy.prizePoints}P` : '—'}
                    </div>
                  </div>

                  <div className="col-span-1 text-center">
                    <div className="flex items-center justify-center gap-1 text-sm">
                      <Users className="h-3 w-3" />
                      {randy.participantCount || 0}
                    </div>
                  </div>

                  <div className="col-span-1 text-center text-sm">
                    {randy.pinMessage ? '✓' : '—'}
                  </div>

                  <div className="col-span-2 flex gap-2 justify-end">
                    {randy.status === 'draft' && (
                      <Button onClick={() => handleStart(randy.id)} size="sm" className="h-7 text-xs">
                        <Play className="mr-1 h-3 w-3" />
                        Başlat
                      </Button>
                    )}
                    {randy.status === 'active' && (
                      <Button onClick={() => handleEnd(randy.id)} size="sm" variant="destructive" className="h-7 text-xs">
                        <Square className="mr-1 h-3 w-3" />
                        Bitir
                      </Button>
                    )}
                    {randy.winners && randy.winners.length > 0 && (
                      <Button
                        onClick={() => setExpandedRandy(expandedRandy === randy.id ? null : randy.id)}
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                      >
                        {expandedRandy === randy.id ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                {expandedRandy === randy.id && randy.winners && randy.winners.length > 0 && (
                  <div className="px-4 pb-3 bg-muted/20">
                    <div className="text-xs font-medium mb-2 text-foreground">Kazananlar:</div>
                    <div className="flex flex-wrap gap-2">
                      {randy.winners.map((winner, index) => (
                        <div key={winner.id} className="flex items-center gap-1.5 text-xs bg-card px-2 py-1 rounded border text-foreground">
                          <Badge variant="secondary" className="w-5 h-5 flex items-center justify-center rounded-full p-0 text-[10px]">
                            {index + 1}
                          </Badge>
                          <span className="text-foreground">
                            {winner.username ? `@${winner.username}` :
                             `${winner.firstName}${winner.lastName ? ` ${winner.lastName}` : ''}`}
                          </span>
                          {randy.prizePoints > 0 && (
                            <span className={`text-[10px] ${winner.hasLinkedUser ? 'text-green-600' : 'text-muted-foreground'}`}>
                              {winner.hasLinkedUser && winner.pointsAwarded ? `+${winner.pointsAwarded}P` : '(üyelik yok)'}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        </div>
      </div>
    </AdminPermissionGuard>
  )
}
