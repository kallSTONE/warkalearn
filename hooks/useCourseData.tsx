import { useEffect, useState } from "react";

type Lesson = {
  id: string;
  title: string; 
  description?: string;
  step_order: number;
  estimated_time?: number;
  topics?: string[];
  completed?: boolean;
  hasResources?: boolean;
};   
    
export function useCourseData(slug: string) {
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
    
  useEffect(() => {
    if (!slug) return;
   
    const cached = localStorage.getItem(`course_${slug}`);
    if (cached) {
      try {
        setCourse(JSON.parse(cached));
      } catch {
        console.warn("Failed to parse cached course data");
      }
    }
 
    const fetchCourse = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/courses/${encodeURIComponent(slug)}`);
        if (!res.ok) {
          setLoading(false);
          return;
        }
        const data = await res.json();
        if (data && !data.error) {
          const normalizeTopics = (topics: any): string[] => {
            if (Array.isArray(topics)) {
              return topics.filter((t) => typeof t === "string");
            }
            if (topics && typeof topics === "object") {
              return Object.keys(topics);
            }
            return [];
          };

          const normalizedLessons: Lesson[] = (data.lessons || [])
            .map((lesson: any) => ({
              id: String(lesson.id),
              title: lesson.title ?? "",
              description: lesson.description ?? undefined,
              step_order: lesson.step_order ?? 0,
              estimated_time: lesson.estimated_time ?? undefined,
              topics: normalizeTopics(lesson.topics),
            }))
            .sort((a: Lesson, b: Lesson) => a.step_order - b.step_order);

          const normalizedCourse = {
            ...data,
            lessons: normalizedLessons,
          };
          setCourse(normalizedCourse);
          localStorage.setItem(`course_${slug}`, JSON.stringify(normalizedCourse));
        }
      } catch (err) {
        console.error("Failed to fetch course data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [slug]);

  return { course, loading };
}
