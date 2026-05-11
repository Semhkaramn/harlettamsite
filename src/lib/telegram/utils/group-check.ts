import { SiteConfig } from '@/lib/site-config'

/**
 * Mesajın aktif bir gruptan gelip gelmediğini kontrol et
 * @param chatId Chat ID (grup ID'si)
 * @returns Aktif grup mu?
 */
export function checkActiveGroup(chatId: string): boolean {
  try {
    // ✅ ENV'den direkt al (DB sorgusu YOK)
    const activeGroupId = SiteConfig.activityGroupId || process.env.activity_group_id

    // Aktif grup ID'si ayarlanmamışsa tüm gruplar kabul edilir
    if (!activeGroupId) {
      return true
    }

    // Chat ID'yi normalize et (- işareti olmadan karşılaştır)
    const normalizedChatId = chatId.replace('-', '')
    const normalizedActiveGroupId = activeGroupId.replace('-', '')

    return normalizedChatId === normalizedActiveGroupId
  } catch (error) {
    console.error('Active group check error:', error)
    return true // Hata durumunda tüm grupları kabul et
  }
}
