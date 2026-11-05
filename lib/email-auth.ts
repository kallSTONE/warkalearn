import {
  createHash,
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from 'crypto'
import { Resend } from 'resend'

function getEmailSecret(): string {
  const secret =
    process.env.AUTH_SECRET ||
    process.env.EMAIL_OTP_SECRET ||
    'creator-edu-default-secure-email-secret-key-32'
  return secret
}

export function generateEmailOtpCode(length = 6): string {
  const max = 10 ** length
  const min = 10 ** (length - 1)
  return String(Math.floor(Math.random() * (max - min) + min))
}

export function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@')
  if (!localPart || !domain) return email
  if (localPart.length <= 2) return `${localPart[0]}***@${domain}`
  return `${localPart[0]}***${localPart[localPart.length - 1]}@${domain}`
}

export function encryptEmailTicketPayload(payload: {
  email: string
  fullName: string
  password: string
  referralCode?: string
}): string {
  const secret = getEmailSecret()
  const key = createHash('sha256').update(secret).digest()
  const iv = randomBytes(12)

  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const jsonStr = JSON.stringify(payload)
  const encrypted = Buffer.concat([cipher.update(jsonStr, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return `${iv.toString('base64url')}.${authTag.toString('base64url')}.${encrypted.toString('base64url')}`
}

export function decryptEmailTicketPayload(encryptedTicket: string): {
  email: string
  fullName: string
  password: string
  referralCode?: string
} {
  const secret = getEmailSecret()
  const key = createHash('sha256').update(secret).digest()
  const [ivPart, authTagPart, encryptedPart] = encryptedTicket.split('.')

  if (!ivPart || !authTagPart || !encryptedPart) {
    throw new Error('Invalid email registration ticket payload.')
  }

  const iv = Buffer.from(ivPart, 'base64url')
  const authTag = Buffer.from(authTagPart, 'base64url')
  const encrypted = Buffer.from(encryptedPart, 'base64url')

  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
  return JSON.parse(decrypted.toString('utf8'))
}

export function renderOtpEmailHtml(code: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CreatorEDU Verification Code</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <!-- Header -->
    <tr>
      <td style="background-color: #0f172a; padding: 28px 32px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">CreatorEDU</h1>
        <p style="color: #94a3b8; margin: 6px 0 0 0; font-size: 14px;">Next-Generation Education Platform</p>
      </td>
    </tr>
    <!-- Content -->
    <tr>
      <td style="padding: 36px 32px;">
        <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 600; color: #0f172a;">Verify your email address</h2>
        <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 24px; color: #475569;">
          Thank you for signing up for CreatorEDU. Please use the verification code below to verify your email and complete your registration.
        </p>

        <!-- Code Box -->
        <div style="background-color: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 10px; padding: 20px; text-align: center; margin-bottom: 24px;">
          <span style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #0f172a; display: inline-block;">${code}</span>
        </div>

        <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 20px; color: #64748b;">
          ⏱️ <strong>This verification code will expire in 10 minutes.</strong>
        </p>
        <p style="margin: 0; font-size: 13px; line-height: 20px; color: #94a3b8;">
          If you did not sign up for CreatorEDU, you can safely ignore this email. Someone may have entered your address by mistake.
        </p>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #94a3b8;">
          © ${new Date().getFullYear()} CreatorEDU. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

export function renderOtpEmailText(code: string): string {
  return `CreatorEDU Verification Code\n\nYour 6-digit verification code is: ${code}\n\nThis verification code will expire in 10 minutes.\n\nIf you did not sign up for CreatorEDU, you can safely ignore this email.`
}

export async function sendEmailVerificationCode(
  email: string,
  code: string
): Promise<{ success: boolean; error?: string; messageId?: string; debugOtp?: string }> {
  const isDebug =
    process.env.EMAIL_AUTH_DEBUG_OTP === 'true' ||
    process.env.NODE_ENV !== 'production'

  const resendApiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'CreatorEDU <onboarding@resend.dev>'

  // Console output for transparency and local dev inspection
  console.log(`\n============================================================`)
  console.log(`[EMAIL VERIFICATION OTP]`)
  console.log(`Recipient: ${email}`)
  console.log(`Verification Code: ${code}`)
  console.log(`Expires: In 10 minutes`)
  if (resendApiKey) {
    console.log(`Provider: Resend (${fromEmail})`)
  } else {
    console.log(`Provider: Resend [RESEND_API_KEY not configured in .env.local]`)
  }
  console.log(`============================================================\n`)

  if (!resendApiKey) {
    console.warn(
      `[Resend Notice] RESEND_API_KEY is not defined in .env.local. The verification code for ${email} is ${code}. Set RESEND_API_KEY in .env.local to deliver real emails.`
    )
    return {
      success: true,
      debugOtp: isDebug ? code : undefined,
    }
  }

  try {
    const resend = new Resend(resendApiKey)
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: `Your CreatorEDU Verification Code: ${code}`,
      html: renderOtpEmailHtml(code),
      text: renderOtpEmailText(code),
    })

    if (error) {
      console.error(`[Resend Error] Failed to send email to ${email}:`, error)
      return {
        success: false,
        error: error.message,
        debugOtp: isDebug ? code : undefined,
      }
    }

    console.log(`[Resend Success] Verification email successfully sent to ${email} (id: ${data?.id})`)
    return {
      success: true,
      messageId: data?.id,
      debugOtp: isDebug ? code : undefined,
    }
  } catch (err: any) {
    console.error(`[Resend Exception] Error sending email to ${email}:`, err)
    return {
      success: false,
      error: err?.message || 'Failed to dispatch email via Resend.',
      debugOtp: isDebug ? code : undefined,
    }
  }
}
