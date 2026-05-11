'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import {
  Send,
  Image as ImageIcon,
  Bold,
  Italic,
  Code,
  Link as LinkIcon,
  X,
  Plus,
  Search,
  Users,
  UserCheck,
  EyeOff,
  History
} from 'lucide-react'
import Link from 'next/link'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'

interface User {
  id: string
  siteUsername: string | null
  username: string | null  // Telegram username (@olmadan)
  telegramUsername?: string | null // Backward compatibility
  telegramId?: string | null // Telegram ID
  firstName: string | null
  lastName?: string | null
  points: number
  xp: number
  messageCount: number
  rank: { name: string } | null
  isBanned: boolean
  hadStart: boolean
}

interface InlineButton {
  text: string
  url: string
}

export default function BroadcastPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  // Message content
  const [messageText, setMessageText] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [mediaType, setMediaType] = useState<'photo' | 'video' | 'animation'>('photo')
  const [buttons, setButtons] = useState<InlineButton[]>([])
  const [newButtonText, setNewButtonText] = useState('')
  const [newButtonUrl, setNewButtonUrl] = useState('')

  // User selection
  const [sendToAll, setSendToAll] = useState(true)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [showUserModal, setShowUserModal] = useState(false)

  // Modal search
  const [searchQuery, setSearchQuery] = useState('')
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.push('/admin')
      return
    }
  }, [])

  // Load all users when modal opens
  useEffect(() => {
    if (showUserModal && allUsers.length === 0) {
      loadAllUsers()
    }
  }, [showUserModal])

  // Filter users based on search
  useEffect(() => {
    let filtered = [...allUsers]

    // Search filter - Tüm alanlarda ara
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(user =>
        user.siteUsername?.toLowerCase().includes(query) ||
        user.username?.toLowerCase().includes(query) ||
        user.telegramUsername?.toLowerCase().includes(query) ||
        user.firstName?.toLowerCase().includes(query) ||
        user.lastName?.toLowerCase().includes(query) ||
        user.telegramId?.toLowerCase().includes(query) ||
        user.id?.toLowerCase().includes(query)
      )
    }

    setFilteredUsers(filtered)
  }, [searchQuery, allUsers])

  async function loadAllUsers() {
    setLoadingUsers(true)
    try {
      const response = await fetch('/api/admin/users/search')
      const data = await response.json()

      if (data.success) {
        setAllUsers(data.users)
        setFilteredUsers(data.users)
      }
    } catch (error) {
      console.error('Error loading users:', error)
      toast.error('Kullanıcılar yüklenirken hata oluştu')
    } finally {
      setLoadingUsers(false)
    }
  }

  function handleSendToAllChange(checked: boolean) {
    setSendToAll(checked)
    if (!checked) {
      // Open modal when switching to select users
      setShowUserModal(true)
    }
  }

  function insertFormatting(format: string) {
    const textarea = document.getElementById('message-text') as HTMLTextAreaElement
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = messageText.substring(start, end)

    let formattedText = ''
    switch (format) {
      case 'bold':
        formattedText = `<b>${selectedText || 'kalın metin'}</b>`
        break
      case 'italic':
        formattedText = `<i>${selectedText || 'italik metin'}</i>`
        break
      case 'code':
        formattedText = `<code>${selectedText || 'kod'}</code>`
        break
      case 'spoiler':
        formattedText = `<span class="tg-spoiler">${selectedText || 'gizli metin'}</span>`
        break
      case 'link':
        formattedText = `<a href="URL">${selectedText || 'link metni'}</a>`
        break
    }

    const newText = messageText.substring(0, start) + formattedText + messageText.substring(end)
    setMessageText(newText)
  }

  function insertTag(tag: string) {
    const newText = messageText + ` {${tag}}`
    setMessageText(newText)
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Accept images, videos, and GIFs
    const validTypes = ['image/', 'video/']
    const isValid = validTypes.some(type => file.type.startsWith(type))

    if (!isValid) {
      toast.error('Lütfen bir görsel veya video dosyası seçin')
      return
    }

    setImageFile(file)
    setUploadingImage(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()
      if (data.success) {
        setImageUrl(data.url)

        // Determine media type
        if (file.type.startsWith('video/')) {
          setMediaType('video')
        } else if (file.type === 'image/gif') {
          setMediaType('animation')
        } else {
          setMediaType('photo')
        }

        toast.success('Medya yüklendi')
      } else {
        toast.error('Medya yüklenirken hata oluştu')
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      toast.error('Resim yüklenirken hata oluştu')
    } finally {
      setUploadingImage(false)
    }
  }

  function removeImage() {
    setImageUrl('')
    setImageFile(null)
    setMediaType('photo')
  }

  function addButton() {
    if (!newButtonText || !newButtonUrl) {
      toast.error('Buton metni ve URL gerekli')
      return
    }

    // URL validation - must start with http://, https://, or www.
    const urlPattern = /^(https?:\/\/|www\.)/i
    if (!urlPattern.test(newButtonUrl)) {
      toast.error('URL https://, http:// veya www. ile başlamalıdır')
      return
    }

    // Auto-add https:// if URL starts with www.
    let finalUrl = newButtonUrl
    if (newButtonUrl.toLowerCase().startsWith('www.')) {
      finalUrl = `https://${newButtonUrl}`
    }

    setButtons([...buttons, { text: newButtonText, url: finalUrl }])
    setNewButtonText('')
    setNewButtonUrl('')
    toast.success('Buton eklendi')
  }

  function removeButton(index: number) {
    setButtons(buttons.filter((_, i) => i !== index))
  }

  function toggleUserSelection(userId: string) {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId))
    } else {
      setSelectedUsers([...selectedUsers, userId])
    }
  }

  function selectAllFilteredUsers() {
    const newSelected = [...selectedUsers]
    filteredUsers.forEach(user => {
      if (!newSelected.includes(user.id)) {
        newSelected.push(user.id)
      }
    })
    setSelectedUsers(newSelected)
    toast.success(`${filteredUsers.length} kullanıcı seçildi`)
  }

  function deselectAllFilteredUsers() {
    const filteredUserIds = filteredUsers.map(u => u.id)
    setSelectedUsers(selectedUsers.filter(id => !filteredUserIds.includes(id)))
    toast.success('Seçim temizlendi')
  }

  function clearAllSelections() {
    setSelectedUsers([])
    toast.success('Tüm seçimler temizlendi')
  }

  function clearSearch() {
    setSearchQuery('')
  }

  async function sendBroadcast() {
    // At least one content should exist: message text or image
    if (!messageText.trim() && !imageUrl) {
      toast.error('En az bir mesaj metni veya görsel gerekli')
      return
    }

    if (!sendToAll && selectedUsers.length === 0) {
      toast.error('En az bir kullanıcı seçmelisiniz')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          imageUrl,
          buttons,
          sendToAll,
          userIds: sendToAll ? [] : selectedUsers
        })
      })

      const data = await response.json()
      if (data.success) {
        if (data.queued) {
          toast.success(`${data.queuedCount} mesaj kuyruğa eklendi. Arka planda gönderilecek.`)
        } else {
          toast.success(`Mesaj ${data.sentCount || data.queuedCount || 0} kullanıcıya gönderildi!`)
        }
        // Reset form
        setMessageText('')
        setImageUrl('')
        setImageFile(null)
        setButtons([])
        setSelectedUsers([])
      } else {
        toast.error(data.error || 'Mesaj gönderilemedi')
      }
    } catch (error) {
      console.error('Error sending broadcast:', error)
      toast.error('Mesaj gönderilirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-page-container">
      <div className="admin-page-inner">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Toplu Mesaj Gönder</h1>
            <p className="text-gray-400">Kullanıcılara özel mesajlar gönderin</p>
          </div>
          <Link href="/admin/broadcast/history">
            <Button
              variant="outline"
              className="border-white/20 hover:bg-white/10 gap-2"
            >
              <History className="w-4 h-4" />
              Geçmiş Mesajlar
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Message Composer */}
          <div className="lg:col-span-2 space-y-5">
            {/* Media Upload */}
            <Card className="admin-card p-5 border-white/10">
              <Label className="text-white mb-3 block font-semibold">Medya (Opsiyonel)</Label>
              <div className="space-y-4">
                {imageUrl ? (
                  <div className="relative">
                    {imageFile?.type.startsWith('video/') ? (
                      <video src={imageUrl} controls className="w-full max-h-64 rounded-lg" />
                    ) : (
                      <img src={imageUrl} alt="Preview" className="w-full max-h-64 object-cover rounded-lg" />
                    )}
                    <Button
                      onClick={removeImage}
                      size="icon"
                      variant="destructive"
                      className="absolute top-2 right-2"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-white/20 rounded-xl p-10 text-center hover:border-white/30 transition-colors">
                    <input
                      type="file"
                      id="image-upload"
                      accept="image/*,video/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <label htmlFor="image-upload" className="cursor-pointer">
                      <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <ImageIcon className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-white font-medium mb-1">
                        {uploadingImage ? 'Yükleniyor...' : 'Medya yüklemek için tıklayın'}
                      </p>
                      <p className="text-xs text-gray-400">
                        JPG, PNG, GIF, MP4, WebM
                      </p>
                    </label>
                  </div>
                )}
              </div>
            </Card>

            {/* Message Text */}
            <Card className="admin-card p-5 border-white/10">
              <Label className="text-white mb-3 block font-semibold">Mesaj Metni</Label>

              {/* Formatting Toolbar */}
              <div className="flex flex-wrap gap-2 mb-3 p-3 bg-white/5 rounded-xl border border-white/5">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => insertFormatting('bold')}
                  className="border-white/20"
                  title="Kalın"
                >
                  <Bold className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => insertFormatting('italic')}
                  className="border-white/20"
                  title="İtalik"
                >
                  <Italic className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => insertFormatting('code')}
                  className="border-white/20"
                  title="Kod"
                >
                  <Code className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => insertFormatting('spoiler')}
                  className="border-white/20"
                  title="Spoiler"
                >
                  <EyeOff className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => insertFormatting('link')}
                  className="border-white/20"
                  title="Link"
                >
                  <LinkIcon className="w-4 h-4" />
                </Button>

                <div className="border-l border-white/20 mx-2" />

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => insertTag('username')}
                  className="border-white/20"
                  title="Telegram Kullanıcı Adı (@username)"
                >
                  {'{username}'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => insertTag('firstname')}
                  className="border-white/20"
                  title="İsim"
                >
                  {'{firstname}'}
                </Button>
              </div>

              <Textarea
                id="message-text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Mesajınızı buraya yazın... HTML etiketleri kullanabilirsiniz."
                className="bg-white/10 border-white/20 text-white min-h-[200px] rounded-xl resize-none"
              />
            </Card>

            {/* Buttons */}
            <Card className="admin-card p-5 border-white/10">
              <Label className="text-white mb-3 block font-semibold">Butonlar (Opsiyonel)</Label>

              <div className="space-y-3">
                {buttons.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {buttons.map((button, index) => (
                      <div key={index} className="flex items-center gap-3 bg-white/10 p-3 rounded-xl border border-white/10">
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">{button.text}</p>
                          <p className="text-gray-400 text-sm truncate">{button.url}</p>
                        </div>
                        <Button
                          onClick={() => removeButton(index)}
                          size="icon"
                          variant="ghost"
                          className="hover:bg-red-500/20 hover:text-red-300 shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3">
                  <Input
                    placeholder="Buton metni"
                    value={newButtonText}
                    onChange={(e) => setNewButtonText(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-gray-500"
                  />
                  <Input
                    placeholder="Buton URL'si (https://, http:// veya www. ile başlamalı)"
                    value={newButtonUrl}
                    onChange={(e) => setNewButtonUrl(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-gray-500"
                  />
                </div>
                <Button
                  onClick={addButton}
                  variant="outline"
                  className="w-full border-white/20 hover:bg-white/10"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Buton Ekle
                </Button>
              </div>
            </Card>
          </div>

          {/* Right Column - User Selection */}
          <div className="space-y-5">
            {/* Send To Options */}
            <Card className="admin-card p-5 border-white/10">
              <Label className="text-white mb-4 block font-semibold">Alıcılar</Label>

              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl mb-4">
                <span className="text-white font-medium">Tüm Kullanıcılara Gönder</span>
                <Switch
                  checked={sendToAll}
                  onCheckedChange={handleSendToAllChange}
                />
              </div>

              {!sendToAll && (
                <div className="space-y-3">
                  <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="w-5 h-5 text-blue-300" />
                      <p className="text-blue-100 font-semibold">
                        {selectedUsers.length} kullanıcı seçildi
                      </p>
                    </div>
                    <Button
                      onClick={() => setShowUserModal(true)}
                      className="w-full bg-blue-500 hover:bg-blue-600 h-10"
                    >
                      <UserCheck className="w-4 h-4 mr-2" />
                      Kullanıcı Seç
                    </Button>
                  </div>

                  {selectedUsers.length > 0 && (
                    <Button
                      onClick={clearAllSelections}
                      variant="outline"
                      className="w-full border-white/20 hover:bg-white/10"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Seçimleri Temizle
                    </Button>
                  )}
                </div>
              )}
            </Card>

            {/* Send Button */}
            <Button
              onClick={sendBroadcast}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 h-12 text-base font-semibold shadow-lg shadow-blue-500/20"
            >
              <Send className="w-5 h-5 mr-2" />
              {loading ? 'Gönderiliyor...' : 'Mesajı Gönder'}
            </Button>
          </div>
        </div>

        {/* User Selection Modal */}
        <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-gray-900 border-white/20 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-white text-2xl font-bold">Kullanıcı Seç</DialogTitle>
              <DialogDescription className="text-gray-400 text-base">
                Mesaj göndermek istediğiniz kullanıcıları seçin
              </DialogDescription>
            </DialogHeader>

            {loadingUsers ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="flex-1 overflow-hidden flex flex-col">
                {/* Search */}
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      placeholder="Site adı, telegram adı, username, ID ile ara..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-white/10 border-white/20 text-white pl-12 pr-12 h-12 text-base rounded-xl"
                    />
                    {searchQuery && (
                      <button
                        onClick={clearSearch}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {filteredUsers.length > 0 && (
                  <div className="flex items-center justify-between mb-4 p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl border border-white/10">
                    <div>
                      <p className="text-white font-semibold text-sm">
                        {selectedUsers.length} kullanıcı seçildi
                      </p>
                      <p className="text-gray-400 text-xs mt-0.5">
                        {filteredUsers.length} gösteriliyor / {allUsers.length} toplam
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={selectAllFilteredUsers}
                        size="sm"
                        className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 border-0 h-9 px-4"
                      >
                        Tümünü Seç
                      </Button>
                      {selectedUsers.length > 0 && (
                        <Button
                          onClick={deselectAllFilteredUsers}
                          size="sm"
                          variant="outline"
                          className="border-white/20 text-gray-300 h-9 px-4"
                        >
                          Temizle
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* User List */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                  {filteredUsers.length === 0 ? (
                    <div className="text-center py-16">
                      <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400">Kullanıcı bulunamadı</p>
                      {searchQuery && (
                        <p className="text-gray-500 text-sm mt-1">Arama kriterlerinizi değiştirin</p>
                      )}
                    </div>
                  ) : (
                    filteredUsers.map(user => (
                      <div
                        key={user.id}
                        onClick={() => toggleUserSelection(user.id)}
                        className={`px-3 py-2 rounded-lg cursor-pointer transition-all flex items-center gap-3 ${
                          selectedUsers.includes(user.id)
                            ? 'bg-blue-500/20 border border-blue-500/40'
                            : 'bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <Checkbox
                          checked={selectedUsers.includes(user.id)}
                          onCheckedChange={() => toggleUserSelection(user.id)}
                        />
                        <span className="text-white font-medium truncate flex-1">
                          {user.siteUsername || user.firstName || user.username || 'Kullanıcı'}
                        </span>
                        {(user.username || user.telegramUsername) && (
                          <span className="text-gray-500 text-sm truncate">
                            @{user.username || user.telegramUsername}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Modal Footer */}
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
                  <Button
                    onClick={() => setShowUserModal(false)}
                    variant="outline"
                    className="border-white/20 px-6"
                  >
                    İptal
                  </Button>
                  <Button
                    onClick={() => {
                      setShowUserModal(false)
                      if (selectedUsers.length > 0) {
                        toast.success(`${selectedUsers.length} kullanıcı seçildi`)
                      }
                    }}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-6"
                  >
                    <UserCheck className="w-4 h-4 mr-2" />
                    Tamam ({selectedUsers.length})
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
