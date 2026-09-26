'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Quote, ChevronLeft, ChevronRight } from 'lucide-react'

// Fake success stories data for demo purposes
const successStories = [
  {
    id: 1,
    name: 'Sara Bekele',
    role: 'Customer Success Lead',
    image: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    quote: 'Warka Learn helped me lead onboarding sessions with confidence. The practice and feedback made a big difference.',
    course: 'Customer Success Essentials',
  },
  {
    id: 2,
    name: 'Daniel Tesfaye',
    role: 'Software Engineer',
    image: 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    quote: 'I shipped a real project and sharpened my interview answers in just a few weeks. The feedback was practical and clear.',
    course: 'Full-Stack Starter Project',
  },
  {
    id: 3,
    name: 'Lily Joseph',
    role: 'Entrepreneur',
    image: 'https://images.pexels.com/photos/1181690/pexels-photo-1181690.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    quote: 'The growth and storytelling lessons boosted my confidence with customers and partners.',
    course: 'Growth Marketing Sprint',
  },
]

export default function SuccessStories() {
  const [activeIndex, setActiveIndex] = useState(0)
  const totalStories = successStories.length

  const nextStory = () => {
    setActiveIndex((prev) => (prev + 1) % totalStories)
  }

  const prevStory = () => {
    setActiveIndex((prev) => (prev - 1 + totalStories) % totalStories)
  }

  const prevIndex = (activeIndex - 1 + totalStories) % totalStories
  const nextIndex = (activeIndex + 1) % totalStories

  const visibleStories = [
    { story: successStories[prevIndex], position: 'left' as const },
    { story: successStories[activeIndex], position: 'center' as const },
    { story: successStories[nextIndex], position: 'right' as const },
  ]

  return (
    <div className="relative max-w-6xl mx-auto">
      <div className="overflow-hidden py-2">
        <div className="flex items-stretch justify-center gap-3 md:gap-4">
          {visibleStories.map(({ story, position }) => {
            const isActive = position === 'center'

            return (
              <Card
                key={`${position}-${story.id}`}
                className={[
                  'border-none bg-background transition-all duration-300 shrink-0',
                  isActive
                    ? 'w-[84%] sm:w-[72%] md:w-[54%] lg:w-[46%] shadow-lg opacity-100 scale-100'
                    : 'w-[42%] sm:w-[36%] md:w-[28%] lg:w-[24%] shadow-sm opacity-60 scale-95',
                ].join(' ')}
              >
                <CardContent className="p-5 md:p-6 h-full flex flex-col items-center text-center">
                  <img
                    src={story.image}
                    alt={story.name}
                    className="h-16 w-16 md:h-20 md:w-20 rounded-full object-cover border-2 border-primary/20"
                  />

                  <Quote
                    className={[
                      'text-primary/25 mt-4',
                      isActive ? 'h-8 w-8 md:h-9 md:w-9' : 'h-6 w-6',
                    ].join(' ')}
                  />

                  <blockquote
                    className={[
                      'italic mt-3',
                      isActive ? 'text-base md:text-lg' : 'text-xs md:text-sm line-clamp-4',
                    ].join(' ')}
                  >
                    {story.quote}
                  </blockquote>

                  <div className="mt-4 md:mt-5">
                    <h3 className={isActive ? 'text-lg md:text-xl font-bold' : 'text-sm md:text-base font-semibold'}>
                      {story.name}
                    </h3>
                    <p className={isActive ? 'text-sm md:text-base text-muted-foreground' : 'text-xs text-muted-foreground'}>
                      {story.role}
                    </p>
                    <p className={isActive ? 'text-sm mt-2' : 'text-xs mt-2 text-muted-foreground'}>
                      <span className="text-muted-foreground">Course completed: </span>
                      <span className="font-medium">{story.course}</span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      <div className="flex justify-center items-center mt-6 gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={prevStory}
          className="h-9 w-9 rounded-full"
          aria-label="Show previous success story"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex space-x-1.5">
          {successStories.map((story, index) => (
            <button
              key={story.id}
              onClick={() => setActiveIndex(index)}
              className={`h-2 rounded-full transition-all ${
                activeIndex === index ? 'w-6 bg-primary' : 'w-2 bg-primary/30'
              }`}
              aria-label={`Go to success story ${index + 1}`}
            />
          ))}
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={nextStory}
          className="h-9 w-9 rounded-full"
          aria-label="Show next success story"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}