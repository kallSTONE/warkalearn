export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      course_drafts: {
        Row: {
          data: Json
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          data: Json
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          data?: Json
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      course_enrollments: {
        Row: {
          amount_paid: number
          course_id: number
          enrolled_at: string | null
          id: string
          progress_id: string | null
          user_id: string
        }
        Insert: {
          amount_paid?: number
          course_id: number
          enrolled_at?: string | null
          id?: string
          progress_id?: string | null
          user_id: string
        }
        Update: {
          amount_paid?: number
          course_id?: number
          enrolled_at?: string | null
          id?: string
          progress_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_enrollments_progress_id_fkey"
            columns: ["progress_id"]
            isOneToOne: false
            referencedRelation: "course_progress"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      live_class_registrations: {
        Row: {
          amount_paid: number
          created_at: string
          id: string
          live_class_id: string
          notes: string | null
          payment_method: string
          payment_reference: string | null
          payment_status: string
          registration_status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_paid?: number
          created_at?: string
          id?: string
          live_class_id: string
          notes?: string | null
          payment_method?: string
          payment_reference?: string | null
          payment_status?: string
          registration_status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_paid?: number
          created_at?: string
          id?: string
          live_class_id?: string
          notes?: string | null
          payment_method?: string
          payment_reference?: string | null
          payment_status?: string
          registration_status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_class_registrations_live_class_id_fkey"
            columns: ["live_class_id"]
            isOneToOne: false
            referencedRelation: "live_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_class_registrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      live_classes: {
        Row: {
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          end_at: string | null
          id: string
          instructor_avatar_url: string | null
          instructor_bio: string | null
          instructor_name: string
          meeting_platform: string
          meeting_url: string | null
          price: number
          registration_status: string
          seats_total: number | null
          slug: string
          start_at: string
          status: string
          timezone: string
          title: string
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          end_at?: string | null
          id?: string
          instructor_avatar_url?: string | null
          instructor_bio?: string | null
          instructor_name: string
          meeting_platform?: string
          meeting_url?: string | null
          price?: number
          registration_status?: string
          seats_total?: number | null
          slug: string
          start_at: string
          status?: string
          timezone?: string
          title: string
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          end_at?: string | null
          id?: string
          instructor_avatar_url?: string | null
          instructor_bio?: string | null
          instructor_name?: string
          meeting_platform?: string
          meeting_url?: string | null
          price?: number
          registration_status?: string
          seats_total?: number | null
          slug?: string
          start_at?: string
          status?: string
          timezone?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_classes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_media: {
        Row: {
          course_id: number
          created_at: string | null
          id: number
          provider: string
          type: string
          url: string
        }
        Insert: {
          course_id: number
          created_at?: string | null
          id?: number
          provider: string
          type: string
          url: string
        }
        Update: {
          course_id?: number
          created_at?: string | null
          id?: number
          provider?: string
          type?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_media_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_progress: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          enrollment_id: string
          id: string
          last_accessed: string | null
          progress_percentage: number | null
          updated_at: string | null
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          enrollment_id: string
          id?: string
          last_accessed?: string | null
          progress_percentage?: number | null
          updated_at?: string | null
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          enrollment_id?: string
          id?: string
          last_accessed?: string | null
          progress_percentage?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      course_review_notes: {
        Row: {
          addressed: boolean | null
          content: string
          course_id: number
          created_at: string
          id: string
          reviewer_id: string
          status: string
          updated_at: string
        }
        Insert: {
          addressed?: boolean | null
          content: string
          course_id: number
          created_at?: string
          id?: string
          reviewer_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          addressed?: boolean | null
          content?: string
          course_id?: number
          created_at?: string
          id?: string
          reviewer_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          estimated_hours: number | null
          featured: boolean | null
          hero_image: string | null
          id: number
          is_paid: boolean
          level: string | null
          price: number | null
          published: boolean | null
          rating: number | null
          requirements: string | null
          skills: string | null
          slug: string
          status: string | null
          students: number | null
          title: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          estimated_hours?: number | null
          featured?: boolean | null
          hero_image?: string | null
          id?: number
          is_paid?: boolean
          level?: string | null
          price?: number | null
          published?: boolean | null
          rating?: number | null
          requirements?: string | null
          skills?: string | null
          slug: string
          status?: string | null
          students?: number | null
          title: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          estimated_hours?: number | null
          featured?: boolean | null
          hero_image?: string | null
          id?: number
          is_paid?: boolean
          level?: string | null
          price?: number | null
          published?: boolean | null
          rating?: number | null
          requirements?: string | null
          skills?: string | null
          slug?: string
          status?: string | null
          students?: number | null
          title?: string
        }
        Relationships: []
      }
      certification_attempts: {
        Row: {
          answers: Json
          attempt_number: number
          course_id: number
          created_at: string
          duration_seconds: number | null
          id: string
          next_retry_at: string | null
          passed: boolean
          question_snapshot: Json
          score: number
          started_at: string
          submitted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          attempt_number?: number
          course_id: number
          created_at?: string
          duration_seconds?: number | null
          id?: string
          next_retry_at?: string | null
          passed?: boolean
          question_snapshot?: Json
          score?: number
          started_at?: string
          submitted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          attempt_number?: number
          course_id?: number
          created_at?: string
          duration_seconds?: number | null
          id?: string
          next_retry_at?: string | null
          passed?: boolean
          question_snapshot?: Json
          score?: number
          started_at?: string
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certification_attempts_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      certification_questions: {
        Row: {
          active: boolean
          correct_option: number
          course_id: number
          created_at: string
          explanation: string | null
          id: string
          options: Json
          question: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          correct_option: number
          course_id: number
          created_at?: string
          explanation?: string | null
          id?: string
          options: Json
          question: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          correct_option?: number
          course_id?: number
          created_at?: string
          explanation?: string | null
          id?: string
          options?: Json
          question?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "certification_questions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      certification_settings: {
        Row: {
          certificate_title: string
          course_id: number
          created_at: string
          enabled: boolean
          id: string
          issuer_name: string
          logo_path: string
          passing_score: number
          question_limit: number | null
          retry_cooldown_hours: number
          template_variant: string
          time_per_question_minutes: number
          updated_at: string
          verification_base_url: string
        }
        Insert: {
          certificate_title?: string
          course_id: number
          created_at?: string
          enabled?: boolean
          id?: string
          issuer_name?: string
          logo_path?: string
          passing_score?: number
          question_limit?: number | null
          retry_cooldown_hours?: number
          template_variant?: string
          time_per_question_minutes?: number
          updated_at?: string
          verification_base_url?: string
        }
        Update: {
          certificate_title?: string
          course_id?: number
          created_at?: string
          enabled?: boolean
          id?: string
          issuer_name?: string
          logo_path?: string
          passing_score?: number
          question_limit?: number | null
          retry_cooldown_hours?: number
          template_variant?: string
          time_per_question_minutes?: number
          updated_at?: string
          verification_base_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "certification_settings_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          attempt_id: string | null
          certificate_code: string
          course_id: number
          created_at: string
          id: string
          issued_at: string
          pass_score: number
          pdf_url: string | null
          revoked_at: string | null
          status: string
          updated_at: string
          user_id: string
          verification_url: string
        }
        Insert: {
          attempt_id?: string | null
          certificate_code: string
          course_id: number
          created_at?: string
          id?: string
          issued_at?: string
          pass_score?: number
          pdf_url?: string | null
          revoked_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
          verification_url: string
        }
        Update: {
          attempt_id?: string | null
          certificate_code?: string
          course_id?: number
          created_at?: string
          id?: string
          issued_at?: string
          pass_score?: number
          pdf_url?: string | null
          revoked_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          verification_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "certification_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      forum_posts: {
        Row: {
          content: string
          created_at: string | null
          id: string
          topic_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          topic_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          topic_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_posts_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "forum_topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_topics: {
        Row: {
          category_id: string
          created_at: string | null
          id: string
          pinned: boolean | null
          title: string
          updated_at: string | null
          user_id: string
          views: number | null
        }
        Insert: {
          category_id: string
          created_at?: string | null
          id?: string
          pinned?: boolean | null
          title: string
          updated_at?: string | null
          user_id: string
          views?: number | null
        }
        Update: {
          category_id?: string
          created_at?: string | null
          id?: string
          pinned?: boolean | null
          title?: string
          updated_at?: string | null
          user_id?: string
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "forum_topics_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "forum_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_topics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_downloads: {
        Row: {
          description: string | null
          file_size: number | null
          file_type: string
          file_url: string
          id: number
          lesson_id: number
          modified_at: string
          title: string
          uploaded_at: string
        }
        Insert: {
          description?: string | null
          file_size?: number | null
          file_type: string
          file_url: string
          id?: number
          lesson_id: number
          modified_at?: string
          title: string
          uploaded_at?: string
        }
        Update: {
          description?: string | null
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: number
          lesson_id?: number
          modified_at?: string
          title?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_downloads_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_quiz_completions: {
        Row: {
          completed_at: string | null
          id: string
          lesson_id: number
          quiz_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          lesson_id: number
          quiz_id: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          lesson_id?: number
          quiz_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_quiz_completions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_quiz_completions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          course_id: number
          description: string | null
          estimated_time: number | null
          id: number
          step_order: number | null
          title: string
          topics: Json | null
          video_url: string | null
        }
        Insert: {
          course_id: number
          description?: string | null
          estimated_time?: number | null
          id?: number
          step_order?: number | null
          title: string
          topics?: Json | null
          video_url?: string | null
        }
        Update: {
          course_id?: number
          description?: string | null
          estimated_time?: number | null
          id?: number
          step_order?: number | null
          title?: string
          topics?: Json | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          full_name: string | null
          id: string
          role: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      program_courses: {
        Row: {
          course_id: number
          created_at: string
          id: string
          is_required: boolean
          program_id: string
          sort_order: number
        }
        Insert: {
          course_id: number
          created_at?: string
          id?: string
          is_required?: boolean
          program_id: string
          sort_order?: number
        }
        Update: {
          course_id?: number
          created_at?: string
          id?: string
          is_required?: boolean
          program_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "program_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_courses_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      program_enrollments: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          program_id: string
          progress_percentage: number
          started_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          program_id: string
          progress_percentage?: number
          started_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          program_id?: string
          progress_percentage?: number
          started_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_enrollments_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          created_at: string
          description: string | null
          id: string
          price: number | null
          slug: string
          status: string
          thumbnail: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          price?: number | null
          slug: string
          status?: string
          thumbnail?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          price?: number | null
          slug?: string
          status?: string
          thumbnail?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      quiz_questions: {
        Row: {
          created_at: string | null
          id: string
          questions: Json
          quiz_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          questions: Json
          quiz_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          questions?: Json
          quiz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          course_id: number
          created_at: string | null
          id: string
          is_required: boolean
          lesson_id: number
        }
        Insert: {
          course_id: number
          created_at?: string | null
          id?: string
          is_required?: boolean
          lesson_id: number
        }
        Update: {
          course_id?: number
          created_at?: string | null
          id?: string
          is_required?: boolean
          lesson_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          course_id: number | null
          created_at: string | null
          id: number
          rating: number
          user_name: string | null
        }
        Insert: {
          comment?: string | null
          course_id?: number | null
          created_at?: string | null
          id?: number
          rating: number
          user_name?: string | null
        }
        Update: {
          comment?: string | null
          course_id?: number | null
          created_at?: string | null
          id?: number
          rating?: number
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_cart_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_cart_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_order_items: {
        Row: {
          created_at: string
          id: string
          line_total: number
          order_id: string
          product_id: string
          product_name: string
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          line_total: number
          order_id: string
          product_id: string
          product_name: string
          quantity: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          line_total?: number
          order_id?: string
          product_id?: string
          product_name?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "shop_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "shop_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_orders: {
        Row: {
          created_at: string
          currency: string
          id: string
          payment_method: string
          payment_reference: string | null
          status: string
          subtotal: number
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          payment_method?: string
          payment_reference?: string | null
          status?: string
          subtotal: number
          total_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          payment_method?: string
          payment_reference?: string | null
          status?: string
          subtotal?: number
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_products: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_bestseller: boolean
          is_featured: boolean
          name: string
          price_etb: number
          rating: number
          review_count: number
          short_description: string | null
          slug: string
          stock_quantity: number
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_bestseller?: boolean
          is_featured?: boolean
          name: string
          price_etb: number
          rating?: number
          review_count?: number
          short_description?: string | null
          slug: string
          stock_quantity?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_bestseller?: boolean
          is_featured?: boolean
          name?: string
          price_etb?: number
          rating?: number
          review_count?: number
          short_description?: string | null
          slug?: string
          stock_quantity?: number
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          created_at: string
          default_theme: string | null
          hero_cta_link: string | null
          hero_cta_text: string | null
          hero_subtitle: string | null
          hero_title: string | null
          hero_video_id: string | null
          id: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_theme?: string | null
          hero_cta_link?: string | null
          hero_cta_text?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          hero_video_id?: string | null
          id?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_theme?: string | null
          hero_cta_link?: string | null
          hero_cta_text?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          hero_video_id?: string | null
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_program_progress: {
        Args: { p_program_id: string; p_user_id: string }
        Returns: number
      }
      checkout_shop_cart: {
        Args: { p_payment_method?: string }
        Returns: string
      }
      is_admin: { Args: never; Returns: boolean }
      update_course_progress_for_quiz: {
        Args: { p_quiz_id: string; p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
