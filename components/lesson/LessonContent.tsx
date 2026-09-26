// components/lesson/LessonContent.tsx
'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useSupabase } from "@/components/providers/supabase-provider";
import { Loader2 } from "lucide-react";
   
export function LessonContent({
  slug,  
  courseId,
  lessonNumber,
}: {
  slug: string;
  courseId: string;
  lessonNumber: number;
}) {   
  const router = useRouter();
  const { user, loading: userLoading } = useSupabase();
  const [authorized, setAuthorized] = useState(false);
  const [lesson, setLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (userLoading) return;
      if (!user) {
        router.push("/login");
        return;
      }

      const numericCourseId = Number(courseId);
      if (!Number.isFinite(numericCourseId)) {
        router.push("/learn");
        return;
      }

      // Check enrollment
      const { data: enrollment } = await supabase
        .from("course_enrollments")
        .select("id")
        .eq("course_id", numericCourseId)
        .eq("user_id", user.id)
        .single();

      if (!enrollment) {
        router.push("/learn");
        return;
      }

      // Fetch lesson data
      const { data: lessonData } = await supabase
        .from("lessons")
        .select("*")
        .eq("course_id", numericCourseId)
        .eq("lesson_number", lessonNumber)
        .single();

      setLesson(lessonData);
      setAuthorized(true);
      setLoading(false);
    };

    checkAccess();
  }, [user, userLoading, courseId, lessonNumber]);

  if (loading || userLoading)
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        <Loader2 className="animate-spin mr-2" /> Loading lesson...
      </div>
    );

  if (!authorized) return null;

  return (
    <main className="flex h-screen">
      {/* Left Sidebar: Lesson List */}
      <aside className="w-64 border-r p-4 bg-gray-50">
        <h2 className="font-semibold mb-3">Course Lessons</h2>
        <ul className="space-y-2">
          <li className="text-blue-600 font-medium">Lesson {lessonNumber}</li>
          {/* later map real lessons here */}
        </ul>
      </aside>

      {/* Main Lesson Content */}
      <section className="flex-1 p-8 overflow-y-auto">
        <h1 className="text-2xl font-bold mb-4">
          {lesson?.title || `Lesson ${lessonNumber}`}
        </h1>
        <p className="text-gray-700 leading-relaxed">
          {lesson?.content || "Lesson content coming soon..."}
        </p>

        <div className="mt-8 flex justify-between">
          <button
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
            onClick={() =>
              router.push(`/learn/course/${slug}/lesson/${lessonNumber - 1}`)
            }
          >
            Previous
          </button>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            onClick={() =>
              router.push(`/learn/course/${slug}/lesson/${lessonNumber + 1}`)
            }
          >
            Next
          </button>
        </div>
      </section>

      {/* Right Sidebar: AI Assistant Placeholder */}
      <aside className="w-80 border-l p-4 bg-gray-50">
        <h2 className="font-semibold mb-3">AI Assistant</h2>
        <p className="text-gray-600 text-sm">
          Ask questions about this lesson here.
        </p>
      </aside>
    </main>
  );
}
