import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config()

import { sendEmailVerificationCode } from './lib/email-auth'

async function testResend() {
  const targetEmail = process.argv[2] || 'test@example.com'
  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'CreatorEDU <onboarding@resend.dev>'

  console.log('--- Testing Resend Email Provider ---')
  console.log(`Target Email: ${targetEmail}`)
  console.log(`From Email:   ${fromEmail}`)
  console.log(`API Key:      ${apiKey ? `${apiKey.substring(0, 6)}...` : 'NOT CONFIGURED'}`)

  if (!apiKey) {
    console.log('\n⚠️  RESEND_API_KEY is not set in .env.local.')
    console.log('To send real emails:')
    console.log('1. Go to https://resend.com and sign up for a free account.')
    console.log('2. Create an API Key.')
    console.log('3. Add RESEND_API_KEY=re_xxxxxxx to your .env.local file.')
    console.log('4. Note: On Resend free tier (with onboarding@resend.dev), you can send test emails to your registered Resend account email.')
    return
  }

  const testCode = '839201'
  console.log(`\nDispatching real email via Resend...`)
  const result = await sendEmailVerificationCode(targetEmail, testCode)

  if (result.success && result.messageId) {
    console.log(`\n✅ Email successfully delivered via Resend!`)
    console.log(`Message ID: ${result.messageId}`)
    console.log(`Check inbox for: ${targetEmail}`)
  } else {
    console.log(`\n❌ Failed to send email via Resend:`)
    console.log(`Error: ${result.error}`)
    if (result.error?.includes('only send testing emails')) {
      console.log('\n💡 Resend Tip: With the default domain "onboarding@resend.dev", you can only send emails to the email address registered on your Resend account. To send to any recipient, verify your domain in the Resend dashboard.')
    }
  }
}

testResend().catch((err) => {
  console.error('Unhandled error in test-resend:', err)
})

