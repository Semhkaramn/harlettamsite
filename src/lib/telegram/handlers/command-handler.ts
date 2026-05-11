import { NextResponse } from 'next/server'
import { handleStartCommand } from '../commands/start-command'
import { handleMeCommand } from '../commands/me-command'
import { handleLeaderboardCommand } from '../commands/leaderboard-command'
import { handleRollCommand } from './roll-handler'

/**
 * Komut handler (/ ile başlayan mesajlar)
 *
 * 🚀 ULTRA OPTIMIZATION:
 * - Activity group kontrolü WEBHOOK'ta yapılıyor (burada YOK)
 * - Filter sistemi KALDIRILDI
 *
 * @param message Telegram message objesi
 */
export async function handleCommand(message: any) {
  const text = message.text.trim()
  const command = text.split(' ')[0].toLowerCase()

  switch (command) {
    case '/start':
      return await handleStartCommand(message)

    // .me, !me, /me - kullanıcı istatistikleri
    case '.ben':
    case '!ben':
    case '/ben':
      return await handleMeCommand(message)

    // .günlük - Günlük mesaj sıralaması (sadece adminler)
    case '.günlük':
    case '.gunluk':
      return await handleLeaderboardCommand(message, 'daily')

    // .haftalık - Haftalık mesaj sıralaması (sadece adminler)
    case '.haftalık':
    case '.haftalik':
      return await handleLeaderboardCommand(message, 'weekly')

    // .aylık - Aylık mesaj sıralaması (sadece adminler)
    case '.aylık':
    case '.aylik':
      return await handleLeaderboardCommand(message, 'monthly')

    // Roll komutları için roll handler'ı kullan
    case 'roll':
    case 'liste':
      return await handleRollCommand(message)

    default:
      // Bilinmeyen komut - sessiz kal
      return NextResponse.json({ ok: true })
  }
}
