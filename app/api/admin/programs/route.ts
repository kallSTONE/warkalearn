import { NextResponse } from 'next/server'
import { db } from '@/db'
import { programs, programCourses } from '@/db/schema'
import { desc } from 'drizzle-orm'
import { requireAdminRequest } from '@/lib/server/api-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const rows = await db.query.programs.findMany({
            orderBy: [desc(programs.createdAt)],
            with: {
                programCourses: {
                    orderBy: (pc, { asc }) => [asc(pc.sortOrder)],
                    with: {
                        course: true,
                    },
                },
            },
        })

        return NextResponse.json(rows)
    } catch (err: any) {
        console.error('Error fetching admin programs:', err)
        return NextResponse.json(
            { error: err?.message || 'Failed to fetch programs' },
            { status: 500 }
        )
    }
}

