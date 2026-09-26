'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Course } from '@/lib/types'
import { BookOpen, Clock, Star, Users, Signal, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import staticCourses from '@/public/data/courses.json'
import { LessonCarousel } from './LessonCarousel'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/components/providers/supabase-provider'


 
export function CourseDetails() {
    const { slug: rawSlug } = useParams()
    const slug = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug
    const [course, setCourse] = useState<Course | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!slug) return

        // 🧩 Try to load from static JSON first (instant render)
        const staticCourse = staticCourses.find((c: any) => c.slug === slug)
        if (staticCourse) {
            // Map to match Course interface (handles shortDescription etc.)
            setCourse({
                id: staticCourse.id,
                title: staticCourse.title,
                slug: staticCourse.slug,
                description: staticCourse.description || '',
                hero_image: staticCourse.image,
                category: staticCourse.category,
                level: staticCourse.level,
                estimated_hours: staticCourse.estimated_hours || 0,
                requirements: 'Basic',
                skills: 'Basic',
                students: staticCourse.students,
                rating: staticCourse.rating,
                featured: false,
                lessons: staticCourse.lessons_preview?.map((l: any) => ({
                    id: l.id || 0,
                    title: l.title,
                    description: l.description || '',
                    estimated_time: l.time,
                    topics: l.topics || [],
                    step_order: l.step_order || 0
                })) || [],
                reviews: [],
            } as Course)
        }
 
        // 🧠 Try to load from localStorage cache
        const cached = localStorage.getItem(`course_${slug}`)
        if (cached) {
            try {
                const parsed = JSON.parse(cached)
                setCourse(parsed)
            } catch {
                console.warn('Failed to parse cached course data.')
            }
        }

        // 🔄 Fetch fresh data from Supabase in background
        const fetchCourse = async () => {
            setLoading(true)
            const { data, error } = await supabase
                .from('courses')
                .select('*, lessons(*)')
                .eq('slug', slug)
                .single()


 
            if (!error && data) {
                // 🔹 Normalize the Supabase data structure
                const updatedCourse: Course = {
                    id: data.id,
                    title: data.title,
                    slug: data.slug,
                    description: data.description || '',
                    hero_image: data.hero_image || '/assets/images/default.jpg',
                    category: data.category ?? '',
                    level: data.level ?? '',
                    estimated_hours: data.estimated_hours || 0,
                    requirements: data.requirements || 'Basic',
                    skills: data.skills || '',
                    students: data.students || 0,
                    rating: data.rating || 0,
                    featured: data.featured || false,
                    // ✅ Always REPLACE lessons instead of merging
                    lessons: (data.lessons || []).map((lesson: any) => ({
                        id: lesson.id,
                        title: lesson.title,
                        description: lesson.description || '',
                        estimated_time: lesson.estimated_time || 0,
                        topics: lesson.topics || [],
                        step_order: lesson.step_order || 0,
                    })),
                    reviews: [],
                }

                // 🧠 Replace the entire course — do NOT merge
                setCourse(() => updatedCourse)

                // 🗄️ Cache the new data for future fast loads
                localStorage.setItem(`course_${slug}`, JSON.stringify(updatedCourse))
            }
 

            setLoading(false)
        }

        fetchCourse()
    }, [slug])

    if (!course)
        return <p className="text-center mt-10">loading...</p>

    const router = useRouter()
    const { user } = useSupabase()

    const handleEnrollClick = () => {
        const courseSlug = course.slug

        if (!user) {
            // Save course slug temporarily so we can redirect after login
            localStorage.setItem('redirectAfterLogin', `/learn/course/${courseSlug}/enroll`)
            router.push('/login')
        } else {
            router.push(`/learn/course/${courseSlug}/enroll`)
        }
    }
 

    return (
        <div className="container mx-auto py-8 space-y-10">
            {/* Hero Section */}
            <div className="relative w-full h-72 rounded-lg overflow-hidden">
                <div className="absolute inset-0 bg-blue-900" >
                    <img
                        src={course.hero_image}
                        alt={course.title}
                        className="w-full h-full object-cover opacity-80"
                    />
                </div>

                <div className="absolute right-0 inset-0 bg-black/40 flex flex-col justify-start text-right p-6">
                    <h1 className="text-4xl font-bold text-white">{course.title}</h1>
                    <p className="text-white mt-2 line-clamp-2">{course.description}</p>
                    <div className="mt-8 ">
                        <button className="btn-primary border border-blue-600 w-fit p-2 text-blue-600">ስርዓተ-ትምህርት አውርድ</button>
                    </div>
                </div>
            </div>
 
            {/* Course Info */}
            <div className="flex justify-end p-6">
                <div className="w-full md:w-[60%] flex flex-col gap-y-7">
                    <div className="flex gap-x-4">
                        <Badge variant="secondary" className="h-6">
                            <span className="flex items-center gap-1">
                                <TrendingUp className="h-5 w-5" /> {course.category}
                            </span>
                        </Badge>
                        <Badge variant="secondary" className="h-6">
                            <span className="flex items-center gap-1">
                                <Signal className="h-5 w-5" /> {course.level}
                            </span>
                        </Badge>
                        <Badge variant="secondary" className="h-6">
                            <span className="flex items-center gap-1">
                                <Clock className="h-5 w-5" /> {course.estimated_hours} hrs
                            </span>
                        </Badge>
                    </div>

                    {/* Lessons */}
                    {course.lessons && course.lessons.length > 0 && (
                        <div className="lg:col-span-2 space-y-6">
                            <h2 className="flex items-center gap-3 text-2xl font-bold">
                                <BookOpen className="w-6 h-6 align-middle" />
                                ትምህርቶች
                            </h2>
                            {course.lessons.map((lesson: any) => (
                                <Card key={lesson.id} className="overflow-hidden">
                                    <CardHeader className="flex justify-between items-center bg-gradient-to-r from-blue-300 to-indigo-900 text-white">
                                        <CardTitle className="text-lg font-semibold">
                                            {lesson.step_order}. {lesson.title}
                                        </CardTitle>
                                        <span className="flex items-center gap-1 text-sm">
                                            <Clock className="h-4 w-4" /> {lesson.estimated_time} ደቂቃ
                                        </span> 
                                    </CardHeader> 
                                    <CardContent>
                                        <p className="text-sm mb-2 text-muted-foreground text-center">
                                            {lesson.description}
                                        </p>
                                        <div className="my-4">
                                            {lesson.topics && <LessonCarousel topics={lesson.topics} />}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}   
                </div>
            </div>

            {/* Sidebar / Enrollment */}
            <div className="md:sticky w-full md:w-[30%] p-4 bottom-10 z-49 bg-background space-y-4 shadow-md dark:shadow-[0_4px_10px_rgba(255,255,255,0.2)] border border-blue-300">
                <div className="flex items-center space-x-4">
                    <span className="flex items-center gap-1">
                        <Star className="h-5 w-5 text-yellow-400" /> {course.rating}
                    </span>
                    <span className="flex items-center gap-1">
                        <Users className="h-5 w-5" /> {course.students?.toLocaleString()}{' '}
                        ተማሪዎች
                    </span>
                    <span className="flex items-center gap-1">
                        <Clock className="h-5 w-5" /> {course.estimated_hours} ሰዓታት
                    </span>
                </div>

                <div>
                    <h3 className="font-semibold mb-1">ደረጃ</h3>
                    <p>{course.level}</p>
                </div>

                {course.requirements && (
                    <div>
                        <h3 className="font-semibold mb-1">መስፈርቶች</h3>
                        <p>{course.requirements}</p>
                    </div>
                )}

                {course.skills && (
                    <div className="hidden sm:block">
                        <h3 className="font-semibold mb-1">የምትማሩ ክህሎቶች</h3>
                        <ul className="list-disc list-inside">
                            {course.skills.split(',').map((skill) => (
                                <li key={skill}>{skill.trim()}</li>
                            ))}
                        </ul>
                    </div>
                )}

                <Button onClick={handleEnrollClick} className="w-full mt-4 shadow-[0px_1px_5px_rgba(255,255,0,0.5)]">
                    <h3 className='bold tx-xl'>አሁን ይመዘገቡ</h3>
                </Button> 
            </div> 
 
            {loading && ( 
                 <p className="text-center text-sm text-gray-500">መረጃ በማዘመን ላይ...</p>
            )}
         </div>    
    )    
}     
 