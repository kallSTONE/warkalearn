'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Lock } from 'lucide-react'
import type { Creator } from '@/data/creators'

interface Course {
  id: number
  slug: string
  title: string
  description: string
  image: string
  category: string
  creator: Creator
  available: boolean
  available_label?: string
}

export default function CourseSlide({ course }: { course: Course }) {
  return (
    <section
      className="
        relative
        h-screen
        w-full
        snap-start
        overflow-hidden
      "
    >
      {/* Background image */}
      <img
        src={course.image}
        alt={course.title}
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/60 to-black/30" />

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col justify-end px-6 pb-20 text-white md:px-16">
        <span className="mb-3 text-sm font-semibold uppercase tracking-widest text-emerald-400">
          {course.category}
        </span>

        <h1 className="max-w-4xl text-3xl font-bold leading-tight md:text-5xl">
          {course.title}
        </h1>

        <p className="mt-4 max-w-2xl text-sm text-white/80 md:text-base">
          {course.description}
        </p>

        {/* Creator */}
        <div className="mt-6 flex items-center gap-3">
          <img
            src={course.creator.avatar}
            alt={course.creator.name}
            className="h-10 w-10 rounded-full"
          />
          <span className="text-sm text-white/80">
            By {course.creator.name}
          </span>
        </div>

        {/* CTA */}
        <div className="mt-8">
          {course.available ? (
            <Button asChild size="lg">
              <Link href={`/learn/course/${course.slug}`}>
                Register
              </Link>
            </Button>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-md bg-black/50 px-5 py-3 text-sm font-medium">
              <Lock className="h-4 w-4" />
              {course.available_label ?? 'Coming Soon'}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
