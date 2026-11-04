import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config()

import { db } from '../db'
import { courses, lessons } from '../db/schema'
import fs from 'fs'
import path from 'path'

async function seed() {
    console.log('Checking courses in database...')
    const existing = await db.query.courses.findMany({ limit: 1 })
    if (existing.length > 0) {
        console.log(`Database already has ${existing.length}+ courses. Skipping seed.`)
        return
    }

    const dataPath = path.join(process.cwd(), 'public', 'data', 'courses.json')
    if (!fs.existsSync(dataPath)) {
        console.log('No courses.json found.')
        return
    }

    const raw = fs.readFileSync(dataPath, 'utf8')
    const list = JSON.parse(raw || '[]')

    console.log(`Seeding ${list.length} courses into PostgreSQL...`)

    for (const c of list) {
        const [insertedCourse] = await db
            .insert(courses)
            .values({
                title: c.title,
                slug: c.slug,
                description: c.description || '',
                heroImage: c.image || c.hero_image || null,
                category: c.category || 'General',
                level: c.level || 'Beginner',
                estimatedHours: Number(c.estimated_hours) || null,
                students: Number(c.students) || 0,
                rating: String(c.rating || '0'),
                published: c.published !== undefined ? Boolean(c.published) : true,
                status: 'published',
                isPaid: false,
                price: null,
            })
            .returning({ id: courses.id })

        if (Array.isArray(c.lessons_preview)) {
            for (let idx = 0; idx < c.lessons_preview.length; idx++) {
                const lp = c.lessons_preview[idx]
                await db.insert(lessons).values({
                    courseId: insertedCourse.id,
                    title: lp.title,
                    description: `Lesson ${idx + 1} for ${c.title}`,
                    estimatedTime: Number(lp.time) || 30,
                    stepOrder: idx + 1,
                    topics: {},
                    videoUrl: 'https://www.youtube.com/watch?v=lEOad0pBh9s',
                })
            }
        }
    }

    console.log('✓ Courses and lessons seeded successfully!')
}

seed()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('Seed error:', err)
        process.exit(1)
    })
