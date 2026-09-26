// LessonCarousel.tsx
'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen } from 'lucide-react'

interface LessonCarouselProps {
  topics: Record<string, string>; // key = topic title, value = description
}

export const LessonCarousel = ({ topics }: LessonCarouselProps) => {
  const topicEntries = Object.entries(topics)

  return (
    <div className="flex overflow-x-auto gap-4 py-2">
      {topicEntries.map(([title, description]) => (
        <Card key={title} className="flex-shrink-0 w-64 h-40 p-4 flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> {title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">{description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
