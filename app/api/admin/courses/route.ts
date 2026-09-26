import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const DATA_PATH = path.join(process.cwd(), 'public', 'data', 'courses.json')

export async function POST(request: Request) {
    try {
        const body = await request.json()

        const raw = await fs.readFile(DATA_PATH, 'utf8')
        const list = JSON.parse(raw || '[]')

        const maxId = list.reduce((acc: number, cur: any) => Math.max(acc, cur.id || 0), 0)
        const id = maxId + 1

        // make slug unique if needed
        let slug = body.slug || (body.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')
        if (list.some((c: any) => c.slug === slug)) {
            slug = `${slug}-${id}`
        }

        const newCourse = {
            id,
            slug,
            title: body.title || '',
            description: body.description || '',
            image: body.image || '',
            category: body.category || '',
            level: body.level || '',
            estimated_hours: body.estimated_hours || '',
            students: body.students || 0,
            rating: body.rating || 0,
            lessons_preview: body.lessons_preview || [],
        }

        list.push(newCourse)

        await fs.writeFile(DATA_PATH, JSON.stringify(list, null, 2), 'utf8')

        return NextResponse.json(newCourse)
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err)
        return new NextResponse('Error saving course', { status: 500 })
    }
}

export async function GET() {
    try {
        const raw = await fs.readFile(DATA_PATH, 'utf8')
        const list = JSON.parse(raw || '[]')
        return NextResponse.json(list)
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err)
        return new NextResponse('Error reading courses', { status: 500 })
    }
}
