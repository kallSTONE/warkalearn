"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { Award, CheckCircle2, Circle, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { ScrollArea, ScrollAreaViewport } from "@/components/ui/scroll-area"
import { useLanguage } from "@/components/providers/language-provider"
import { translate } from "@/lib/i18n"


interface Topic {
  title: string
  description: string
}

interface Lesson {
  id: string
  number: number
  title: string
  completed: boolean
  progress: number
  topics: Topic[]  // <- change this
}

interface CourseLessons {
  courseId: string
  lessons: Lesson[]
}

interface LessonSidebarProps {
  courseData: CourseLessons
  currentLessonId: string
  onLessonSelect: (lessonId: string) => void
  hasCertification?: boolean
  onCertificationSelect?: () => void
}

export function LessonSidebar({
  courseData,
  currentLessonId,
  onLessonSelect,
  hasCertification = false,
  onCertificationSelect,
}: LessonSidebarProps) {
  const { locale } = useLanguage()
  const t = (key: string, fallback?: string) => translate(locale, key, fallback)
  const [expandedItems, setExpandedItems] = useState<string[]>(["0"])
  const [isOpen, setIsOpen] = useState(true)

  return (
    <Card
      className={`flex h-full flex-col border-r rounded-none shadow-none bg-card transition-[width] duration-200 ${isOpen ? "w-80" : "w-12"
        } shrink-0`}
    >
      <div className="sticky top-0 border-b border-border bg-card p-4 z-10 flex items-start justify-between gap-3">
        {isOpen ? (
          <div>
            <h3 className="font-semibold text-primary text-sm">{t('lessonSidebar.title', 'Course Lessons')}</h3>
            <p className="inline text-muted-foreground/30 text-sm w-full text-center">{t('lessonSidebar.doubleClick', 'double click to open')}</p>
          </div>
        ) : (
          <span className="sr-only">{t('lessonSidebar.title', 'Course Lessons')}</span>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-pressed={!isOpen}
          aria-label={isOpen ? t('lessonSidebar.collapse', 'Collapse lesson sidebar') : t('lessonSidebar.expand', 'Expand lesson sidebar')}
        >
          {isOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
        </Button>
      </div>

      {isOpen && (
        <ScrollArea className="flex-1">
          <ScrollAreaViewport className="h-full w-full">
            <Accordion
              type="multiple"
              value={expandedItems}
              onValueChange={setExpandedItems}
              className="p-0"
            >
              {courseData.lessons.map((lesson, index) => (
                <AccordionItem
                  key={lesson.id}
                  value={index.toString()}
                  className="border-b last:border-b-0 px-4"
                >
                  <AccordionTrigger
                    className="hover:no-underline py-3 px-0 [&[data-state=open]>svg]:rotate-180"
                    onDoubleClick={() => onLessonSelect(lesson.id)}
                  >
                    <div className="flex items-start gap-3 flex-1 text-left">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground">
                          {lesson.number}. {lesson.title}
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          {lesson.completed ? (
                            <CheckCircle2 className="w-4 h-4 text-green-900 flex-shrink-0" />
                          ) : (
                            <>
                              <Circle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              <Progress value={lesson.progress} className="h-1 flex-1 max-w-xs" />
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>

                  <AccordionContent className="px-0 pb-2 text-sm text-muted-foreground">
                    <ul className="space-y-1.5">
                      {lesson.topics.map((topic, idx) => (
                        <li key={idx} className="flex gap-2 ml-6">
                          <span className="text-primary">•</span>
                          <span>{topic.title}</span>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              ))}

              {hasCertification && (
                <AccordionItem
                  value="certification"
                  className="border-b last:border-b-0 px-4"
                >
                  <AccordionTrigger
                    className="hover:no-underline py-3 px-0"
                    onClick={() => onCertificationSelect?.()}
                  >
                    <div className="flex items-center gap-3 flex-1 text-left">
                      <Award className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <div className="text-sm font-medium text-foreground">{t('cert.exam', 'Certification exam')}</div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-0 pb-2 text-sm text-muted-foreground">
                    <div className="ml-7">{t('lessonSidebar.certDescription', 'Open the final timed exam and get certified after passing.')}</div>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          </ScrollAreaViewport>
        </ScrollArea>
      )}
    </Card>
  )
}
