import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { getTurkeyDate } from '@/lib/utils'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// 6 haneli doğrulama kodu oluştur
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request)

    // Kullanıcıyı bul
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        email: true,
        emailVerified: true,
        emailVerificationTokenExpiry: true
      }
    })

    if (!user || !user.email) {
      return NextResponse.json(
        { error: 'Email adresi bulunamadı' },
        { status: 404 }
      )
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { error: 'Email adresi zaten doğrulanmış' },
        { status: 400 }
      )
    }

    // Rate limiting: Son kod gönderiminden 1 dakika geçmeli
    if (user.emailVerificationTokenExpiry) {
      const now = new Date()
      const timeSinceLastSend = now.getTime() - user.emailVerificationTokenExpiry.getTime()
      const oneMinute = 60 * 1000

      if (timeSinceLastSend < oneMinute && user.emailVerificationTokenExpiry > now) {
        const waitSeconds = Math.ceil((oneMinute - timeSinceLastSend) / 1000)
        return NextResponse.json(
          { error: `Lütfen ${waitSeconds} saniye bekleyin` },
          { status: 429 }
        )
      }
    }

    // Doğrulama kodu oluştur
    const verificationCode = generateVerificationCode()
    const expiryDate = new Date(getTurkeyDate().getTime() + 10 * 60 * 1000) // 10 dakika geçerli

    // Kodu veritabanına kaydet
    await prisma.user.update({
      where: { id: session.userId },
      data: {
        emailVerificationToken: verificationCode,
        emailVerificationTokenExpiry: expiryDate
      }
    })

    // Email gönder
    try {
      if (!process.env.RESEND_API_KEY) {
        console.warn('RESEND_API_KEY not configured, skipping email send')
        console.log(`Verification code for ${user.email}: ${verificationCode}`)
      } else {
        await resend.emails.send({
          from: process.env.EMAIL_FROM || 'noreply@yourdomain.com',
          to: user.email,
          subject: 'Email Doğrulama Kodu',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #333; text-align: center;">Email Doğrulama</h2>
              <p style="color: #666; line-height: 1.6;">
                Merhaba,
              </p>
              <p style="color: #666; line-height: 1.6;">
                Email adresinizi doğrulamak için aşağıdaki kodu kullanabilirsiniz:
              </p>
              <div style="background: #f4f4f4; padding: 20px; text-align: center; margin: 30px 0; border-radius: 8px;">
                <h1 style="color: #333; margin: 0; font-size: 32px; letter-spacing: 5px;">${verificationCode}</h1>
              </div>
              <p style="color: #666; line-height: 1.6;">
                Bu kod 10 dakika boyunca geçerlidir.
              </p>
              <p style="color: #999; font-size: 12px; margin-top: 30px;">
                Bu email'i siz talep etmediyseniz lütfen dikkate almayın.
              </p>
            </div>
          `
        })
      }
    } catch (emailError) {
      console.error('Email send error:', emailError)
      // Email gönderimi başarısız olsa bile devam et
    }

    return NextResponse.json({
      success: true,
      message: 'Doğrulama kodu email adresinize gönderildi',
      // Development için kodu döndürelim (production'da kaldırılmalı)
      ...(process.env.NODE_ENV === 'development' && { code: verificationCode })
    })
  } catch (error) {
    console.error('Send verification email error:', error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Giriş yapmalısınız' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Bir hata oluştu' },
      { status: 500 }
    )
  }
}
