import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config()

import { db } from './db'
import { users, profiles } from './db/schema'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'

async function testAuth() {
  console.log('Testing Database and Auth Setup...')

  const testEmail = 'testuser@example.com'
  const testPassword = 'Password123!'
  const testName = 'Test User'

  // 1. Check if user already exists
  let user = await db.query.users.findFirst({
    where: eq(users.email, testEmail),
  })

  if (!user) {
    console.log('Creating test user in PostgreSQL...')
    const passwordHash = await bcrypt.hash(testPassword, 10)

    const [newUser] = await db
      .insert(users)
      .values({
        email: testEmail,
        name: testName,
        passwordHash,
      })
      .returning()

    await db.insert(profiles).values({
      id: newUser.id,
      fullName: testName,
      role: 'admin',
    })

    user = newUser
    console.log('✓ User and profile created successfully with ID:', user.id)
  } else {
    console.log('✓ Found existing user with ID:', user.id)
  }

  // 2. Test password verification (like NextAuth Credentials provider does)
  console.log('Testing password verification with bcrypt...')
  const isMatch = await bcrypt.compare(testPassword, user.passwordHash!)
  if (isMatch) {
    console.log('✓ Password match verified successfully!')
  } else {
    console.error('✗ Password verification failed!')
  }

  // 3. Test profile relation lookup
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, user.id),
  })

  console.log('✓ Profile loaded:', {
    fullName: profile?.fullName,
    role: profile?.role,
  })

  console.log('\n--- All Auth components verified successfully! ---')
}

testAuth()
  .catch((err) => {
    console.error('Auth test failed:', err)
    process.exit(1)
  })
  .then(() => process.exit(0))

