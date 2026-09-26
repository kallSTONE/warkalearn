'use client'

import TransitionLink from '@/components/transition-link'
import { Button } from '@/components/ui/button'
import { Lock } from 'lucide-react'
import type { Creator } from '@/data/creators'
import { useLanguage } from '@/components/providers/language-provider'

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
}

export default function CourseSection({ course }: { course: Course }) {
  const { t } = useLanguage()

  return (
    <section className="group flex h-full w-full flex-col overflow-hidden rounded-2xl border bg-card p-0 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <div className="relative h-40 overflow-hidden">
        <img
          src={course.image}
          alt={course.title}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-200">
            {course.category}
          </span>
          <h3 className="mt-1 text-xl font-semibold leading-tight">
            {course.title}
          </h3>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <p className="text-sm text-muted-foreground max-h-12 overflow-hidden">
          {course.description}
        </p>

        <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-3">
          <img
            src={course.creator.avatar}
            alt={course.creator.name}
            className="h-8 w-8 rounded-full object-cover"
          />
          <div>
            <p className="text-xs text-muted-foreground">{t('learn.card.instructor', 'Instructor')}</p>
            <p className="text-sm font-medium text-foreground">{course.creator.name}</p>
          </div>
        </div>

        <div className="mt-auto">
          {course.published ? (
            <Button
              asChild
              className="home-card-cta"
            >
              <TransitionLink href={`/learn/course/${course.slug}`}>
                {t('learn.card.viewCourse', 'View Course')}
              </TransitionLink>
            </Button>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-md bg-muted px-4 py-2 text-sm font-medium text-muted-foreground">
              <Lock className="h-4 w-4" />
              {course.available_label ?? t('learn.card.comingSoon', 'Coming soon')}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
