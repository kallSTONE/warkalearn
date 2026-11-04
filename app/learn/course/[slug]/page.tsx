import EnrollClient from './enroll/EnrollClient'
import { db } from '@/db'
import { courses } from '@/db/schema'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function generateStaticParams() {
  try {
    const allCourses = await db.query.courses.findMany({
      columns: { slug: true },
    })
    return allCourses.map((c) => ({ slug: c.slug }))
  } catch {
    const localCourses = (await import('@/public/data/courses.json')).default
    return localCourses.map((c: any) => ({ slug: c.slug }))
  }
}

export default async function EnrollPage({ params }: { params: { slug: string } }) {
  let initialCourse: any = null
  try {
    const course = await db.query.courses.findFirst({
      where: eq(courses.slug, params.slug),
      with: {
        lessons: {
          orderBy: (lessons, { asc }) => [asc(lessons.stepOrder)],
        },
        media: true,
      },
    })

    if (course) {
      initialCourse = {
        ...course,
        hero_image: course.heroImage || '/assets/images/default.jpg',
        estimated_hours: course.estimatedHours || 0,
        is_paid: Boolean(course.isPaid),
        course_media: course.media || [],
        lessons: (course.lessons || []).map((lesson) => ({
          ...lesson,
          estimated_time: lesson.estimatedTime,
          step_order: lesson.stepOrder,
          video_url: lesson.videoUrl,
        })),
      }
    }
  } catch (err) {
    console.error('Error fetching course for EnrollPage:', err)
  }

  return <EnrollClient slug={params.slug} initialCourse={initialCourse} />
}
