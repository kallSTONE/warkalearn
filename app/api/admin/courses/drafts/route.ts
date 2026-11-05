import { NextResponse } from 'next/server'
import { db } from '@/db'
import { courseDrafts } from '@/db/schema'
import { desc, eq } from 'drizzle-orm'
import { authenticateRequest } from '@/lib/server/api-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const authResult = await authenticateRequest(request)
    if (!authResult.ok) {
      return authResult.response
    }

    const { searchParams } = new URL(request.url)
    const isMine = searchParams.get('mine') === 'true'
    const userId = authResult.context.userId

    if (isMine) {
      const draft = await db.query.courseDrafts.findFirst({
        where: eq(courseDrafts.userId, userId),
      })
      return NextResponse.json({ data: draft ? draft.data : null })
    }

    const rows = await db.query.courseDrafts.findMany({
      orderBy: [desc(courseDrafts.updatedAt)],
      columns: {
        id: true,
        userId: true,
        updatedAt: true,
      },
    })

    const formatted = rows.map((r) => ({
      id: r.id,
      user_id: r.userId,
      updated_at: r.updatedAt.toISOString(),
    }))

    return NextResponse.json({ data: formatted })
  } catch (err: any) {
    console.error('Error fetching course drafts:', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch course drafts' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await authenticateRequest(request)
    if (!authResult.ok) {
      return authResult.response
    }

    const userId = authResult.context.userId
    const body = await request.json()
    const payload = body?.data ?? body

    // Check if draft already exists for this user
    const existing = await db.query.courseDrafts.findFirst({
      where: eq(courseDrafts.userId, userId),
    })

    if (existing) {
      await db
        .update(courseDrafts)
        .set({
          data: payload,
          updatedAt: new Date(),
        })
        .where(eq(courseDrafts.id, existing.id))
    } else {
      await db.insert(courseDrafts).values({
        userId,
        data: payload,
        updatedAt: new Date(),
      })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Error saving course draft:', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to save course draft' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const authResult = await authenticateRequest(request)
    if (!authResult.ok) {
      return authResult.response
    }

    const { searchParams } = new URL(request.url)
    const deleteAll = searchParams.get('all') === 'true'
    const userId = authResult.context.userId

    if (deleteAll) {
      // Require admin to delete all
      if (authResult.context.role !== 'admin') {
        return NextResponse.json({ error: 'Admin role required' }, { status: 403 })
      }
      await db.delete(courseDrafts)
    } else {
      await db.delete(courseDrafts).where(eq(courseDrafts.userId, userId))
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Error deleting course draft:', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to delete course draft' },
      { status: 500 }
    )
  }
}

