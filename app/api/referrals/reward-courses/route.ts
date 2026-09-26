import { NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/server/api-auth'
import { getSupabaseAdminClient } from '@/lib/server/supabase-admin'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

type CourseRow = {
  id: number
  title: string
  slug: string
  is_paid: boolean
  published: boolean | null
  status: string | null
}

export async function GET(request: Request) {
  const authResult = await authenticateRequest(request)

  if (!authResult.ok) {
    return authResult.response
  }

  try {
    const admin = getSupabaseAdminClient()

    const { data, error } = await admin
      .from('courses')
      .select('id, title, slug, is_paid, published, status')
      .or('published.eq.true,status.eq.published')
      .order('title', { ascending: true })
      .returns<CourseRow[]>()

    if (error) {
      console.error('Reward courses fetch error:', error)
      return NextResponse.json({ error: 'Unable to load courses.' }, { status: 500 })
    }

    return NextResponse.json({ courses: data ?? [] }, { status: 200 })
  } catch (error: any) {
    console.error('Reward courses GET error:', error)
    return NextResponse.json(
      { error: error?.message ?? 'Unable to load courses.' },
      { status: 500 }
    )
  }
}
