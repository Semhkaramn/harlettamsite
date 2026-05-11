/**
 * 📝 Telegram Bot Mesaj Taslakları
 *
 * Tüm bot mesajları bu dosyada merkezi olarak tutulur.
 * Değişiklik yapmak için sadece bu dosyayı düzenleyin.
 *
 * 🎯 Kategoriler:
 * - GENEL: Hoş geldin, hata mesajları
 * - ISTATISTIK: .ben komutu mesajları
 * - ROLL: Roll sistemi mesajları
 * - RANDY: Randy/çekiliş mesajları
 * - BAGLANTI: Hesap bağlama mesajları
 */

import { SITE_CONFIG } from '@/lib/site-config'

// ============================================
// 🏠 GENEL MESAJLAR
// ============================================

export const GENEL = {
  // /start komutu - özel sohbet
  HOŞGELDİN: (firstName: string) =>
    `🎉 Merhaba ${firstName}!\n\n` +
    `${SITE_CONFIG.siteName}'a hoş geldin! İşte seni bekleyen fırsatlar:\n\n` +
    `💬 Gruplarda mesaj atarak puan ve XP kazan\n` +
    `🎡 Her gün şans çarkını çevir, ekstra puan topla\n` +
    `🛒 Kazandığın puanlarla marketten ödüller al\n` +
    `🏆 Liderlik tablosunda en üste çık!\n\n` +
    `👉 Hemen hesabını bağla: <a href="${SITE_CONFIG.appUrl}/profile/social-media">${SITE_CONFIG.siteName}</a>`,

  // Hata mesajları
  HATA_GENEL: '❌ Bir hata oluştu. Lütfen tekrar deneyin.',

  // Ban mesajları
  YASAKLANDI: '🚫 Yasaklandınız ve Randy\'lere katılamazsınız.',
}

// ============================================
// 📊 İSTATİSTİK MESAJLARI (.ben komutu)
// ============================================

export const ISTATISTIK = {
  // Kullanıcı istatistikleri
  FORMAT: (firstName: string, stats: {
    dailyMessageCount: number
    weeklyMessageCount: number
    monthlyMessageCount: number
    messageCount: number
  }) =>
    `📊 <b>${firstName} - Mesaj İstatistiklerin</b>\n\n` +
    `📅 <b>Bugün:</b> ${stats.dailyMessageCount.toLocaleString()} mesaj\n` +
    `📆 <b>Bu Hafta:</b> ${stats.weeklyMessageCount.toLocaleString()} mesaj\n` +
    `🗓️ <b>Bu Ay:</b> ${stats.monthlyMessageCount.toLocaleString()} mesaj\n` +
    `📈 <b>Toplam:</b> ${stats.messageCount.toLocaleString()} mesaj`,

  // Kayıt yok
  KAYIT_YOK: (mention: string) =>
    `${mention} Henüz mesaj istatistiğin bulunmuyor. Grupta mesaj yaz ve tekrar dene!`,

  // Özel mesaj gönderildi bildirimi
  OZELDEN_GONDERILDI: (botUsername: string) =>
    `<a href="https://t.me/${botUsername}">Özelden gönderildi!</a>`,

  // İstatistik butonu metni
  ISTATISTIK_BUTONU: '... BURAYA TIKLA',

  // Butonlu mesaj
  BUTONA_TIKLA: (mention: string) =>
    `${mention} İstatistiklerin için...`,

  // Başkasının istatistiği
  BASKASININ_ISTATISTIGI: '❌ Bu istatistikler size ait değil.',
}

// ============================================
// 🎲 ROLL SİSTEMİ MESAJLARI
// ============================================

export const ROLL = {
  // Roll başladı
  BASLADI: (dakika: number) =>
    `✅ Roll Başladı!\n⏳ ${dakika} dakika içinde mesaj yazmayan listeden çıkarılır.`,

  // Adım kaydedildi
  ADIM_KAYDEDILDI: (stepNumber: number, stepList: string) =>
    `📌 Adım ${stepNumber} Kaydedildi!\n\n${stepList}`,

  // Mola
  MOLA_BASLADI: '☕ Mola başladı. "roll devam" ile devam edilebilir.',
  ZATEN_MOLADA: '⚠️ Zaten molada.',
  MOLA_YOK: '⚠️ Mola veya duraklama yok.',

  // Mola + Kilit durumunda mola başlatma
  MOLA_BASLADI_KILITLI: '☕🔒 Mola başladı (kilit aktif). "roll devam" ile devam edilebilir.',

  // Devam
  DEVAM_EDIYOR: (dakika: number) =>
    `✅ Roll devam ediyor!\n⏳ ${dakika} dakika içinde mesaj yazmayan listeden çıkarılır.`,

  // Devam - kilitli durumdan
  DEVAM_EDIYOR_KILITLI: (dakika: number) =>
    `✅🔒 Roll devam ediyor (kilit aktif)!\n⏳ ${dakika} dakika içinde mesaj yazmayan listeden çıkarılır.`,

  // Kilit
  KILITLENDI: '🔒 Roll kilitlendi. Artık yeni kullanıcı eklenmiyor.',
  KILITLENDI_MOLADA: '🔒☕ Roll kilitlendi (mola devam ediyor). Artık yeni kullanıcı eklenmiyor.',
  KILIT_ACILDI: (oncekiDurum: string) => {
    switch (oncekiDurum) {
      case 'active':
        return '🔓 Roll kilidi açıldı. Yeni kullanıcılar eklenebilir.'
      case 'paused':
        return '🔓 Roll kilidi açıldı. Roll duraklatılmış durumda.'
      case 'break':
        return '🔓 Roll kilidi açıldı. Roll molada.'
      default:
        return '🔓 Roll kilidi açıldı.'
    }
  },
  ZATEN_KILITLI: '⚠️ Roll zaten kilitli.',
  KILITLI_DEGIL: '⚠️ Roll kilitli değil.',

  // Bitir
  SONLANDIRILDI: (stepList: string) =>
    `🏁 Roll sonlandırıldı!\n\n${stepList}`,

  // Hatalar
  ROLL_AKTIF_DEGIL: '⚠️ Roll aktif değil.',
  ZATEN_DURDURULMUS: '⚠️ Roll zaten durdurulmuş.',
  MOLA_BASLATILMAZ: '⚠️ Roll aktif değil. Mola başlatılamaz.',
}

// ============================================
// 🎉 RANDY (ÇEKİLİŞ) MESAJLARI
// ============================================

export const RANDY = {
  // Katılım butonu
  KATIL_BUTONU: '🎉 Katıl',

  // Callback cevapları
  BASARIYLA_KATILDIN: '🎉 Başarıyla katıldınız!',
  ZATEN_KATILDIN: '✅ Zaten katıldınız!',
  RANDY_BULUNAMADI: '❌ Randy bulunamadı.',
  RANDY_AKTIF_DEGIL: '❌ Randy aktif değil.',

  // Şart mesajları
  KANAL_UYESI_DEGIL: '❌ Belirtilen kanallara üye olmanız gerekiyor.',
  MESAJ_YAZ_ONCE: '❌ Önce grupta en az bir mesaj yazmanız gerekiyor.',

  // Mesaj şartı
  MESAJ_SARTI: (kalan: number, period: string) =>
    `❌ ${period} ${kalan} mesaj daha yazın.`,

  // Post-randy mesaj şartı
  MESAJ_DAHA_YAZ: (kalan: number) =>
    `❌ ${kalan} mesaj daha yazın.`,

  // Randy START mesajı (aktif çekiliş)
  START_MESAJI: (
    baslik: string,
    aciklama: string,
    katilimciSayisi: number,
    kazananSayisi: number,
    odul?: number
  ) => {
    let mesaj = `🎰 <b>${baslik}</b>\n\n`
    if (aciklama && aciklama.trim()) {
      mesaj += `${aciklama}\n\n`
    }
    mesaj += `👥 ${katilimciSayisi} katılımcı | 🎁 ${odul || 0} puan\n\n`
    mesaj += `🏆 <b>Kazanan:</b> ${kazananSayisi} kişi`
    return mesaj
  },

  // Randy KAZANAN mesajı (sona erdi)
  KAZANAN_MESAJI: (
    katilimciSayisi: number,
    odul: number,
    kazananlar: Array<{
      sira: number
      isim: string
      puanEklendi: boolean
      uyelikYok: boolean
    }>,
    baslik?: string
  ) => {
    let mesaj = baslik ? `🎉 <b>${baslik} - Sona Erdi!</b>\n\n` : `🎉 <b>Randy Sona Erdi!</b>\n\n`
    mesaj += `👥 ${katilimciSayisi} katılımcı | 🎁 ${odul} puan\n\n`
    mesaj += `🏆 <b>Kazananlar:</b>\n`

    kazananlar.forEach(k => {
      if (k.puanEklendi) {
        mesaj += `${k.sira}. ${k.isim} (+${odul} puan)\n`
      } else if (k.uyelikYok) {
        mesaj += `${k.sira}. ${k.isim} (üyelik yok)\n`
      } else {
        mesaj += `${k.sira}. ${k.isim}\n`
      }
    })

    mesaj += `\nTebrikler! 🎊`
    return mesaj
  },

  // Kanal zorunlu
  ZORUNLU_KANALLAR: (channelLinks: string) =>
    `\n\n<b>Katılım Zorunlu Kanallar:</b>\n${channelLinks}`,

  // Şartlar bölümü
  SARTLAR_BOLUMU: (sartlar: string[]) =>
    sartlar.length > 0 ? `\n\n<b>Şartlar:</b>\n${sartlar.join('\n')}` : '',

  // Period metinleri
  PERIOD_TEXT: {
    daily: 'bugün',
    weekly: 'bu hafta',
    monthly: 'bu ay',
    all_time: 'toplam'
  } as Record<string, string>,
}

// ============================================
// 🔗 HESAP BAĞLAMA MESAJLARI
// ============================================

export const BAGLANTI = {
  // Başarıyla bağlandı
  BASARILI: (firstName: string, mesajSayisi?: number) => {
    const mesajInfo = mesajSayisi && mesajSayisi > 0
      ? `\n📊 ${mesajSayisi} geçmiş mesajınız hesabınıza aktarıldı!`
      : ''
    return `✅ **Hesabınız Başarıyla Bağlandı!**\n\nMerhaba ${firstName}!${mesajInfo}`.trim()
  },

  // Token geçersiz
  TOKEN_GECERSIZ: '❌ Bağlantı kodu geçersiz veya süresi dolmuş. Lütfen yeni bir kod alın.',

  // Telegram zaten başka hesaba bağlı
  ZATEN_BAGLI_BASKA_HESAP: '❌ Bu Telegram hesabı başka bir üyeye bağlı. Önce o hesaptan bağlantıyı koparın.',
}

// ============================================
// 📢 BROADCAST MESAJLARI
// ============================================

export const BROADCAST = {
  // Broadcast başlığı
  BASLIK: (baslik: string, icerik: string) =>
    `📢 <b>${baslik}</b>\n\n${icerik}`,
}

// ============================================
// 🎡 ÇARK MESAJLARI (Wheel)
// ============================================

export const CARK = {
  // Çark sıfırlama bildirimi
  SIFIRLAMA_BILDIRIMI: '🎡 Şans çarkın sıfırlandı! Hemen çevirmek için tıkla:',
  SIFIRLAMA_BUTONU: '🎡 Çarkı Çevir',
}

// ============================================
// 🛒 SİPARİŞ BİLDİRİMLERİ (Market)
// ============================================

export const SIPARIS = {
  // Tamamlandı
  TAMAMLANDI: (itemName: string, pointsSpent: number, deliveryInfo?: string) => {
    const teslimatBilgisi = deliveryInfo ? `📝 Teslimat Bilgisi:\n${deliveryInfo}\n\n` : ''
    return `🎉 <b>Siparişiniz Tamamlandı!</b>

✅ Ürün: ${itemName}
💰 Fiyat: ${pointsSpent.toLocaleString()} puan

${teslimatBilgisi}Siparişiniz onaylandı ve teslim edildi!`
  },

  // İşleme alındı
  ISLEME_ALINDI: (itemName: string, pointsSpent: number, deliveryInfo?: string) => {
    const not = deliveryInfo ? `📝 Not:\n${deliveryInfo}\n\n` : ''
    return `⏳ <b>Siparişiniz İşleme Alındı</b>

📦 Ürün: ${itemName}
💰 Fiyat: ${pointsSpent.toLocaleString()} puan

${not}Siparişiniz hazırlanıyor. Lütfen bekleyiniz...`
  },

  // İptal edildi
  IPTAL_EDILDI: (itemName: string, pointsSpent: number, deliveryInfo?: string) => {
    const iptalNedeni = deliveryInfo ? `📝 İptal Nedeni:\n${deliveryInfo}\n\n` : ''
    return `❌ <b>Siparişiniz İptal Edildi</b>

📦 Ürün: ${itemName}
💰 İade Edilen Puan: ${pointsSpent.toLocaleString()}

${iptalNedeni}Puanlarınız hesabınıza iade edildi.`
  },

  // Beklemede
  BEKLEMEDE: (itemName: string, pointsSpent: number) =>
    `🔔 <b>Sipariş Durumu Güncellendi</b>

📦 Ürün: ${itemName}
💰 Fiyat: ${pointsSpent.toLocaleString()} puan

Siparişiniz beklemede. En kısa sürede işleme alınacak.`,

  // Genel durum
  GENEL_DURUM: (status: string, itemName: string, pointsSpent: number, deliveryInfo?: string) => {
    const not = deliveryInfo ? `📝 Not:\n${deliveryInfo}` : ''
    return `🔔 <b>Sipariş Durumu: ${status}</b>

📦 Ürün: ${itemName}
💰 Fiyat: ${pointsSpent.toLocaleString()} puan

${not}`
  },
}

// ============================================
// 🏆 RÜTBE BİLDİRİMLERİ
// ============================================

export const RUTBE = {
  // Rütbe atlama - tek satırda mention ile
  SEVIYE_ATLADI: (icon: string, name: string, xp: number, userId?: string, displayName?: string) => {
    const mention = userId && displayName
      ? `<a href="tg://user?id=${userId}">${displayName}</a>`
      : 'Kullanıcı'
    return `🎉 ${mention} seviye atladı! ${icon} <b>${name}</b> 💎 ${xp.toLocaleString()} XP`
  },
}

// ============================================
// 📝 YARDIMCI FONKSİYONLAR
// ============================================

/**
 * Kullanıcı mention oluştur (her zaman tıklanabilir link)
 * @param userId Telegram user ID
 * @param username Telegram username (kullanılmıyor artık)
 * @param firstName Kullanıcının adı
 */
export function formatMention(userId: string, username: string | null, firstName: string): string {
  // ✅ Her zaman tıklanabilir mention döndür
  return `<a href="tg://user?id=${userId}">${firstName}</a>`
}

/**
 * Kazanan listesi formatla
 * @param winners Kazanan listesi
 */
export function formatWinnerList(winners: Array<{
  username: string | null
  firstName: string | null
  lastName?: string | null
}>): string {
  return winners.map(w =>
    w.username ? `@${w.username}` : `${w.firstName}${w.lastName ? ` ${w.lastName}` : ''}`
  ).join('\n')
}
