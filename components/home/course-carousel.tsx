'use client'

import { useEffect, useState } from 'react'
import { attachCreatorToCourse } from '@/lib/courseCreators'
import CourseSection from './courseSection'
import type { Creator } from '@/data/creators'
import staticCourses from '@/public/data/courses.json'

interface Course {
  id: number
  slug: string
  title: string
  description: string
  image: string
  category: string
  creator: Creator
  published: boolean
  available_label?: string
  introVideoUrl?: string
  url?: string
}

export default function CourseCarousel() {
  const [courses, setCourses] = useState<Course[]>([])

  useEffect(() => {
    const mapCourse = (c: any): Course => {
      const introVideo = c.course_media?.find(
        (m: any) => m.type === 'intro' && m.provider === 'youtube'
      )

      return attachCreatorToCourse({
        id: c.id,
        slug: c.slug,
        title: c.title,
        description: c.description,
        image: c.image || c.hero_image || '/assets/images/courceT.jpg',
        category: c.category,
        published: c.published ?? false,
        available_label: c.available_label,
        introVideoUrl: introVideo?.url,
      })
    }

    const cached = localStorage.getItem('home_courses')
    if (cached) {
      try {
        setCourses(JSON.parse(cached))
      } catch {
        localStorage.removeItem('home_courses')
      }
    } else {
      const fallback = (staticCourses as any[])
        .filter((c) => c.published !== false && c.status !== 'draft')
        .map(mapCourse)
      setCourses(fallback)
    }

    const fetchCourses = async () => {
      try {
        const res = await fetch('/api/courses')
        const json = await res.json()
        if (json?.data && Array.isArray(json.data)) {
          const mapped = json.data.map(mapCourse)
          setCourses(mapped)
          localStorage.setItem('home_courses', JSON.stringify(mapped))
        }
      } catch (err) {
        console.error('Failed to load home courses:', err)
      }
    }

    fetchCourses()
  }, [])

  return (
    <main className="w-full py-2">
      <div className="grid gap-6 px-6 md:grid-cols-2 lg:grid-cols-3 md:px-8">
        {courses.map((course) => (
          <CourseSection key={course.id} course={course} />
        ))}
      </div>
    </main>
  )
}
