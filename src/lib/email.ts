import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = process.env.EMAIL_FROM || 'onboarding@resend.dev'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'Site'

/**
 * Email doğrulama maili gönder
 */
export async function sendVerificationEmail(
  email: string,
  token: string,
  username?: string
) {
  const verifyUrl = `${APP_URL}/verify-email?token=${token}`

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `${SITE_NAME} - Email Doğrulama`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0;">✉️ Email Doğrulama</h1>
            </div>

            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px;">Merhaba${username ? ` <strong>${username}</strong>` : ''},</p>

              <p>${SITE_NAME} hesabınızı oluşturduğunuz için teşekkür ederiz! 🎉</p>

              <p>Email adresinizi doğrulamak için aşağıdaki butona tıklayın:</p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${verifyUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                  Email Doğrula
                </a>
              </div>

              <p style="font-size: 14px; color: #666;">Veya bu linki tarayıcınıza kopyalayın:</p>
              <p style="background: white; padding: 10px; border-radius: 5px; word-break: break-all; font-size: 12px;">
                ${verifyUrl}
              </p>

              <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">

              <p style="font-size: 12px; color: #999;">
                Bu email 24 saat içinde geçerliliğini yitirecektir.<br>
                Eğer bu hesabı oluşturmadıysanız, bu emaili görmezden gelebilirsiniz.
              </p>
            </div>
          </body>
        </html>
      `
    })

    console.log('✅ Verification email sent to:', email)
    return true
  } catch (error) {
    console.error('❌ Error sending verification email:', error)
    return false
  }
}

/**
 * Şifre sıfırlama maili gönder
 */
export async function sendPasswordResetEmail(
  email: string,
  token: string,
  username?: string
) {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `${SITE_NAME} - Şifre Sıfırlama`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0;">🔐 Şifre Sıfırlama</h1>
            </div>

            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px;">Merhaba${username ? ` <strong>${username}</strong>` : ''},</p>

              <p>Şifrenizi sıfırlamak için bir talepte bulundunuz.</p>

              <p>Şifrenizi sıfırlamak için aşağıdaki butona tıklayın:</p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                  Şifreyi Sıfırla
                </a>
              </div>

              <p style="font-size: 14px; color: #666;">Veya bu linki tarayıcınıza kopyalayın:</p>
              <p style="background: white; padding: 10px; border-radius: 5px; word-break: break-all; font-size: 12px;">
                ${resetUrl}
              </p>

              <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">

              <p style="font-size: 12px; color: #999;">
                Bu link 1 saat içinde geçerliliğini yitirecektir.<br>
                Eğer bu talebi siz yapmadıysanız, bu emaili görmezden gelinebilir.
              </p>
            </div>
          </body>
        </html>
      `
    })

    console.log('✅ Password reset email sent to:', email)
    return true
  } catch (error) {
    console.error('❌ Error sending password reset email:', error)
    return false
  }
}
