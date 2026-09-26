export interface Lesson {
  id: number;
  title: string;
  description: string;
  estimated_time: number;
  topics: string[];
  step_order: number;
}

export interface Review {
  id: number;
  user_name: string;
  rating: number;
  comment: string;
}
export interface CourseMedia {
  id: number
  course_id: number
  type: 'intro' | 'lesson' | 'trailer'
  provider: 'youtube'
  url: string
}

export interface Course {
  id: number
  title: string
  slug: string
  description: string
  hero_image: string
  category: string
  level: string
  estimated_hours: number
  requirements: string
  skills: string
  students: number
  rating: number
  featured: boolean
  lessons: Lesson[]
  reviews: Review[]
  media?: CourseMedia[]   // 👈 new
}

export interface ProgramCourse {
  course: Course
  sort_order: number
  is_required: boolean
}

export interface Program {
  id: string
  courses: ProgramCourse[]
}