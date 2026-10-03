/**
 * db/schema.ts
 *
 * Drizzle ORM schema — mirrors every table from the Supabase migrations,
 * but with Supabase-specific constructs removed:
 *   • auth.users     → public.users  (managed by NextAuth + DrizzleAdapter)
 *   • RLS policies   → enforced in API route handlers
 *   • TABLESPACE     → stripped (not needed for local/standard Postgres)
 */

import {
  pgTable,
  uuid,
  text,
  integer,
  bigint,
  boolean,
  timestamp,
  serial,
  numeric,
  jsonb,
  varchar,
  inet,
  unique,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// Convenience alias: timestamptz = timestamp with timezone mode
// All "date" columns in this schema are timezone-aware.
const timestamptz = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' })


// ---------------------------------------------------------------------------
// NextAuth required tables (DrizzleAdapter)
// https://authjs.dev/getting-started/adapters/drizzle
// ---------------------------------------------------------------------------

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name'),
  email: text('email').unique(),
  emailVerified: timestamp('email_verified', { mode: 'date' }),
  image: text('image'),
  // Custom columns for this app
  phone: text('phone').unique(),
  passwordHash: text('password_hash'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const accounts = pgTable(
  'accounts',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })]
)

export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
})

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })]
)

// ---------------------------------------------------------------------------
// profiles
// ---------------------------------------------------------------------------

export const profiles = pgTable('profiles', {
  id: uuid('id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  bio: text('bio'),
  role: text('role').default('lawyer'),
  createdAt: timestamptz('created_at').defaultNow(),
  updatedAt: timestamptz('updated_at').defaultNow(),
})

// ---------------------------------------------------------------------------
// courses
// ---------------------------------------------------------------------------

export const courses = pgTable('courses', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).unique().notNull(),
  description: text('description'),
  heroImage: text('hero_image'),
  category: varchar('category', { length: 50 }),
  level: varchar('level', { length: 50 }),
  estimatedHours: integer('estimated_hours'),
  requirements: text('requirements'),
  skills: text('skills'),
  students: integer('students').default(0),
  rating: numeric('rating', { precision: 2, scale: 1 }).default('0'),
  featured: boolean('featured').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  status: text('status').default('published'),
  published: boolean('published').default(false),
  isPaid: boolean('is_paid').default(false).notNull(),
  price: numeric('price', { precision: 10, scale: 2 }),
})

// ---------------------------------------------------------------------------
// course_drafts
// ---------------------------------------------------------------------------

export const courseDrafts = pgTable('course_drafts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  data: jsonb('data').notNull(),
  updatedAt: timestamptz('updated_at').defaultNow().notNull(),
})

// ---------------------------------------------------------------------------
// lessons
// ---------------------------------------------------------------------------

export const lessons = pgTable('lessons', {
  id: serial('id').primaryKey(),
  courseId: integer('course_id')
    .notNull()
    .references(() => courses.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  estimatedTime: integer('estimated_time'),
  stepOrder: integer('step_order').default(1),
  topics: jsonb('topics'),
  videoUrl: text('video_url').default('https://www.youtube.com/watch?v=lEOad0pBh9s'),
})

// ---------------------------------------------------------------------------
// course_enrollments
// ---------------------------------------------------------------------------

export const courseEnrollments = pgTable(
  'course_enrollments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    courseId: integer('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    enrolledAt: timestamptz('enrolled_at').defaultNow(),
    progressId: uuid('progress_id'),
  },
  (t) => [unique().on(t.userId, t.courseId)]
)

// ---------------------------------------------------------------------------
// course_progress
// ---------------------------------------------------------------------------

export const courseProgress = pgTable('course_progress', {
  id: uuid('id').primaryKey().defaultRandom(),
  enrollmentId: uuid('enrollment_id')
    .notNull()
    .unique()
    .references(() => courseEnrollments.id, { onDelete: 'cascade' }),
  progressPercentage: integer('progress_percentage').default(0),
  lastAccessed: timestamptz('last_accessed').defaultNow(),
  completed: boolean('completed').default(false),
  completedAt: timestamptz('completed_at'),
  updatedAt: timestamptz('updated_at').defaultNow(),
})

// ---------------------------------------------------------------------------
// course_media
// ---------------------------------------------------------------------------

export const courseMedia = pgTable('course_media', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  courseId: integer('course_id')
    .notNull()
    .references(() => courses.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  url: text('url').notNull(),
  createdAt: timestamptz('created_at').defaultNow(),
})

// ---------------------------------------------------------------------------
// course_review_notes
// ---------------------------------------------------------------------------

export const courseReviewNotes = pgTable('course_review_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  courseId: integer('course_id').notNull(),
  reviewerId: uuid('reviewer_id').notNull(),
  content: text('content').notNull(),
  status: text('status').default('open').notNull(),
  createdAt: timestamptz('created_at').defaultNow().notNull(),
  updatedAt: timestamptz('updated_at').defaultNow().notNull(),
  addressed: boolean('addressed').default(false),
})

// ---------------------------------------------------------------------------
// quizzes
// ---------------------------------------------------------------------------

export const quizzes = pgTable('quizzes', {
  id: uuid('id').primaryKey().defaultRandom(),
  lessonId: integer('lesson_id')
    .notNull()
    .references(() => lessons.id, { onDelete: 'cascade' }),
  courseId: integer('course_id')
    .notNull()
    .references(() => courses.id, { onDelete: 'cascade' }),
  isRequired: boolean('is_required').default(false).notNull(),
  createdAt: timestamptz('created_at').defaultNow(),
})

// ---------------------------------------------------------------------------
// quiz_questions
// ---------------------------------------------------------------------------

export const quizQuestions = pgTable('quiz_questions', {
  id: uuid('id').primaryKey().defaultRandom(),
  quizId: uuid('quiz_id')
    .notNull()
    .references(() => quizzes.id, { onDelete: 'cascade' }),
  questions: jsonb('questions').notNull(),
  createdAt: timestamptz('created_at').defaultNow(),
})

// ---------------------------------------------------------------------------
// lesson_quiz_completions
// ---------------------------------------------------------------------------

export const lessonQuizCompletions = pgTable(
  'lesson_quiz_completions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    lessonId: integer('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),
    quizId: uuid('quiz_id')
      .notNull()
      .references(() => quizzes.id, { onDelete: 'cascade' }),
    completedAt: timestamptz('completed_at').defaultNow(),
  },
  (t) => [unique().on(t.userId, t.lessonId)]
)

// ---------------------------------------------------------------------------
// lesson_downloads
// ---------------------------------------------------------------------------

export const lessonDownloads = pgTable('lesson_downloads', {
  id: serial('id').primaryKey(),
  lessonId: integer('lesson_id')
    .notNull()
    .references(() => lessons.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  fileUrl: text('file_url').notNull(),
  fileType: varchar('file_type', { length: 50 }).notNull(),
  fileSize: integer('file_size'),
  uploadedAt: timestamptz('uploaded_at').defaultNow().notNull(),
  modifiedAt: timestamptz('modified_at').defaultNow().notNull(),
})

// ---------------------------------------------------------------------------
// reviews
// ---------------------------------------------------------------------------

export const reviews = pgTable('reviews', {
  id: serial('id').primaryKey(),
  courseId: integer('course_id').references(() => courses.id, { onDelete: 'cascade' }),
  userName: varchar('user_name', { length: 255 }),
  rating: numeric('rating', { precision: 2, scale: 1 }).notNull(),
  comment: text('comment'),
  createdAt: timestamp('created_at').defaultNow(),
})

// ---------------------------------------------------------------------------
// site_settings
// ---------------------------------------------------------------------------

export const siteSettings = pgTable('site_settings', {
  id: integer('id').primaryKey().default(1),
  heroTitle: text('hero_title'),
  heroSubtitle: text('hero_subtitle'),
  heroCtaText: text('hero_cta_text'),
  heroCtaLink: text('hero_cta_link'),
  heroVideoId: text('hero_video_id'),
  defaultTheme: text('default_theme'),
  createdAt: timestamptz('created_at').defaultNow().notNull(),
  updatedAt: timestamptz('updated_at').defaultNow().notNull(),
})

// ---------------------------------------------------------------------------
// forum_categories
// ---------------------------------------------------------------------------

export const forumCategories = pgTable('forum_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  slug: text('slug').unique().notNull(),
  createdAt: timestamptz('created_at').defaultNow(),
})

// ---------------------------------------------------------------------------
// forum_topics
// ---------------------------------------------------------------------------

export const forumTopics = pgTable('forum_topics', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  userId: uuid('user_id')
    .notNull()
    .references(() => profiles.id),
  categoryId: uuid('category_id')
    .notNull()
    .references(() => forumCategories.id, { onDelete: 'cascade' }),
  pinned: boolean('pinned').default(false),
  views: integer('views').default(0),
  createdAt: timestamptz('created_at').defaultNow(),
  updatedAt: timestamptz('updated_at').defaultNow(),
})

// ---------------------------------------------------------------------------
// forum_posts
// ---------------------------------------------------------------------------

export const forumPosts = pgTable('forum_posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  topicId: uuid('topic_id')
    .notNull()
    .references(() => forumTopics.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => profiles.id),
  content: text('content').notNull(),
  createdAt: timestamptz('created_at').defaultNow(),
  updatedAt: timestamptz('updated_at').defaultNow(),
})

// ---------------------------------------------------------------------------
// programs
// ---------------------------------------------------------------------------

export const programs = pgTable('programs', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  slug: text('slug').unique().notNull(),
  description: text('description'),
  thumbnail: text('thumbnail'),
  status: text('status').default('draft').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }),
  createdAt: timestamptz('created_at').defaultNow().notNull(),
  updatedAt: timestamptz('updated_at').defaultNow().notNull(),
})

// ---------------------------------------------------------------------------
// program_courses
// ---------------------------------------------------------------------------

export const programCourses = pgTable(
  'program_courses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    programId: uuid('program_id')
      .notNull()
      .references(() => programs.id, { onDelete: 'cascade' }),
    courseId: integer('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'restrict' }),
    sortOrder: integer('sort_order').default(0).notNull(),
    isRequired: boolean('is_required').default(true).notNull(),
    createdAt: timestamptz('created_at').defaultNow().notNull(),
  },
  (t) => [unique().on(t.programId, t.courseId)]
)

// ---------------------------------------------------------------------------
// program_enrollments
// ---------------------------------------------------------------------------

export const programEnrollments = pgTable(
  'program_enrollments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    programId: uuid('program_id')
      .notNull()
      .references(() => programs.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: text('status').default('active').notNull(),
    progressPercentage: numeric('progress_percentage', { precision: 5, scale: 2 }).default('0').notNull(),
    startedAt: timestamptz('started_at').defaultNow(),
    completedAt: timestamptz('completed_at'),
    createdAt: timestamptz('created_at').defaultNow().notNull(),
  },
  (t) => [unique().on(t.programId, t.userId)]
)

// ---------------------------------------------------------------------------
// phone_registration_tickets
// ---------------------------------------------------------------------------

export const phoneRegistrationTickets = pgTable('phone_registration_tickets', {
  id: uuid('id').primaryKey().defaultRandom(),
  tokenHash: text('token_hash').unique().notNull(),
  phoneE164: text('phone_e164').notNull(),
  fullName: text('full_name').notNull(),
  passwordEncrypted: text('password_encrypted').notNull(),
  referralCode: text('referral_code'),
  requestedIp: inet('requested_ip'),
  userAgent: text('user_agent'),
  createdAt: timestamptz('created_at').defaultNow().notNull(),
  expiresAt: timestamptz('expires_at').notNull(),
  consumedAt: timestamptz('consumed_at'),
})

// ---------------------------------------------------------------------------
// Certification system
// ---------------------------------------------------------------------------

export const certificationSettings = pgTable('certification_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  courseId: integer('course_id')
    .unique()
    .notNull()
    .references(() => courses.id, { onDelete: 'cascade' }),
  enabled: boolean('enabled').default(false).notNull(),
  passingScore: integer('passing_score').default(70).notNull(),
  timePerQuestionMinutes: integer('time_per_question_minutes').default(2).notNull(),
  retryCooldownHours: integer('retry_cooldown_hours').default(48).notNull(),
  questionLimit: integer('question_limit'),
  verificationBaseUrl: text('verification_base_url')
    .default('https://earn-neway.vercel.app/certverify')
    .notNull(),
  certificateTitle: text('certificate_title').default('Course Certification').notNull(),
  issuerName: text('issuer_name').default('Neway').notNull(),
  logoPath: text('logo_path').default('/assets/images/warkalogo.png').notNull(),
  templateVariant: text('template_variant').default('premium-minimal').notNull(),
  createdAt: timestamptz('created_at').defaultNow().notNull(),
  updatedAt: timestamptz('updated_at').defaultNow().notNull(),
})

export const certificationQuestions = pgTable('certification_questions', {
  id: uuid('id').primaryKey().defaultRandom(),
  courseId: integer('course_id')
    .notNull()
    .references(() => courses.id, { onDelete: 'cascade' }),
  question: text('question').notNull(),
  options: jsonb('options').notNull(),
  correctOption: integer('correct_option').notNull(),
  explanation: text('explanation'),
  sortOrder: integer('sort_order').default(1).notNull(),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamptz('created_at').defaultNow().notNull(),
  updatedAt: timestamptz('updated_at').defaultNow().notNull(),
})

export const certificationAttempts = pgTable(
  'certification_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    courseId: integer('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    attemptNumber: integer('attempt_number').default(1).notNull(),
    startedAt: timestamptz('started_at').defaultNow().notNull(),
    submittedAt: timestamptz('submitted_at'),
    durationSeconds: integer('duration_seconds'),
    score: integer('score').default(0).notNull(),
    passed: boolean('passed').default(false).notNull(),
    answers: jsonb('answers').default([]).notNull(),
    questionSnapshot: jsonb('question_snapshot').default([]).notNull(),
    nextRetryAt: timestamptz('next_retry_at'),
    createdAt: timestamptz('created_at').defaultNow().notNull(),
    updatedAt: timestamptz('updated_at').defaultNow().notNull(),
  },
  (t) => [unique().on(t.userId, t.courseId, t.attemptNumber)]
)

export const certificates = pgTable(
  'certificates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    courseId: integer('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    attemptId: uuid('attempt_id').references(() => certificationAttempts.id, {
      onDelete: 'set null',
    }),
    certificateCode: text('certificate_code').unique().notNull(),
    verificationUrl: text('verification_url').notNull(),
    pdfUrl: text('pdf_url'),
    status: text('status').default('active').notNull(),
    passScore: integer('pass_score').default(70).notNull(),
    issuedAt: timestamptz('issued_at').defaultNow().notNull(),
    revokedAt: timestamptz('revoked_at'),
    createdAt: timestamptz('created_at').defaultNow().notNull(),
    updatedAt: timestamptz('updated_at').defaultNow().notNull(),
  },
  (t) => [unique().on(t.userId, t.courseId)]
)

// ---------------------------------------------------------------------------
// Referral system
// ---------------------------------------------------------------------------

export const referralSystemSettings = pgTable('referral_system_settings', {
  // Single-row table — id is always true
  id: boolean('id').primaryKey().default(true),
  isActive: boolean('is_active').default(true).notNull(),
  updatedAt: timestamptz('updated_at').defaultNow().notNull(),
  updatedBy: uuid('updated_by').references(() => profiles.id, { onDelete: 'set null' }),
})

export const referralProfiles = pgTable('referral_profiles', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  referralCode: text('referral_code').unique().notNull(),
  referralPoints: integer('referral_points').default(0).notNull(),
  successfulInvites: integer('successful_invites').default(0).notNull(),
  freeCoursesAwarded: integer('free_courses_awarded').default(0).notNull(),
  createdAt: timestamptz('created_at').defaultNow().notNull(),
  updatedAt: timestamptz('updated_at').defaultNow().notNull(),
})

export const referralInvites = pgTable('referral_invites', {
  id: uuid('id').primaryKey().defaultRandom(),
  referrerUserId: uuid('referrer_user_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  referredUserId: uuid('referred_user_id')
    .notNull()
    .unique()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  referralCodeUsed: text('referral_code_used').notNull(),
  pointsAwarded: integer('points_awarded').default(100).notNull(),
  status: text('status').default('qualified').notNull(),
  createdAt: timestamptz('created_at').defaultNow().notNull(),
})

export const referralRewardRequests = pgTable('referral_reward_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  pointsSnapshot: integer('points_snapshot').notNull(),
  freeCoursesToAward: integer('free_courses_to_award').notNull(),
  status: text('status').default('pending').notNull(),
  adminNote: text('admin_note'),
  requestedAt: timestamptz('requested_at').defaultNow().notNull(),
  handledAt: timestamptz('handled_at'),
  handledBy: uuid('handled_by').references(() => profiles.id, { onDelete: 'set null' }),
})

export const referralRewardActivations = pgTable('referral_reward_activations', {
  id: uuid('id').primaryKey().defaultRandom(),
  requestId: uuid('request_id')
    .notNull()
    .unique()
    .references(() => referralRewardRequests.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  freeCoursesAwarded: integer('free_courses_awarded').notNull(),
  activatedBy: uuid('activated_by')
    .notNull()
    .references(() => profiles.id, { onDelete: 'restrict' }),
  activatedAt: timestamptz('activated_at').defaultNow().notNull(),
})

export const referralRewardCodes = pgTable('referral_reward_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  requestId: uuid('request_id')
    .notNull()
    .references(() => referralRewardRequests.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  code: text('code').notNull(),
  status: text('status').default('active').notNull(),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => profiles.id, { onDelete: 'restrict' }),
  createdAt: timestamptz('created_at').defaultNow().notNull(),
  expiresAt: timestamptz('expires_at'),
  usedAt: timestamptz('used_at'),
  usedByUserId: uuid('used_by_user_id').references(() => profiles.id, { onDelete: 'set null' }),
  usedForCourseId: integer('used_for_course_id').references(() => courses.id, {
    onDelete: 'set null',
  }),
  revokedAt: timestamptz('revoked_at'),
  revokedBy: uuid('revoked_by').references(() => profiles.id, { onDelete: 'set null' }),
  revokedReason: text('revoked_reason'),
})

// ---------------------------------------------------------------------------
// Shop
// ---------------------------------------------------------------------------

export const shopProducts = pgTable('shop_products', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').unique().notNull(),
  name: text('name').notNull(),
  shortDescription: text('short_description'),
  description: text('description'),
  category: text('category').notNull(),
  imageUrl: text('image_url'),
  priceEtb: numeric('price_etb', { precision: 10, scale: 2 }).notNull(),
  rating: numeric('rating', { precision: 3, scale: 2 }).default('0').notNull(),
  reviewCount: integer('review_count').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  isFeatured: boolean('is_featured').default(false).notNull(),
  isBestseller: boolean('is_bestseller').default(false).notNull(),
  stockQuantity: integer('stock_quantity').default(0).notNull(),
  createdAt: timestamptz('created_at').defaultNow().notNull(),
  updatedAt: timestamptz('updated_at').defaultNow().notNull(),
})

export const shopCartItems = pgTable(
  'shop_cart_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => shopProducts.id, { onDelete: 'cascade' }),
    quantity: integer('quantity').default(1).notNull(),
    createdAt: timestamptz('created_at').defaultNow().notNull(),
    updatedAt: timestamptz('updated_at').defaultNow().notNull(),
  },
  (t) => [unique().on(t.userId, t.productId)]
)

export const shopOrders = pgTable('shop_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  status: text('status').default('paid').notNull(),
  paymentMethod: text('payment_method').default('fake_checkout').notNull(),
  paymentReference: text('payment_reference'),
  currency: text('currency').default('ETB').notNull(),
  subtotal: numeric('subtotal', { precision: 10, scale: 2 }).notNull(),
  totalAmount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamptz('created_at').defaultNow().notNull(),
  updatedAt: timestamptz('updated_at').defaultNow().notNull(),
})

export const shopOrderItems = pgTable('shop_order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id')
    .notNull()
    .references(() => shopOrders.id, { onDelete: 'cascade' }),
  productId: uuid('product_id')
    .notNull()
    .references(() => shopProducts.id, { onDelete: 'restrict' }),
  productName: text('product_name').notNull(),
  unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  quantity: integer('quantity').notNull(),
  lineTotal: numeric('line_total', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamptz('created_at').defaultNow().notNull(),
})

// ---------------------------------------------------------------------------
// Live classes
// ---------------------------------------------------------------------------

export const liveClasses = pgTable('live_classes', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').unique().notNull(),
  title: text('title').notNull(),
  description: text('description'),
  instructorName: text('instructor_name').notNull(),
  instructorBio: text('instructor_bio'),
  instructorAvatarUrl: text('instructor_avatar_url'),
  coverImageUrl: text('cover_image_url'),
  meetingPlatform: text('meeting_platform').default('Zoom').notNull(),
  meetingUrl: text('meeting_url'),
  startAt: timestamptz('start_at').notNull(),
  endAt: timestamptz('end_at'),
  timezone: text('timezone').default('Africa/Addis_Ababa').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).default('0').notNull(),
  currency: text('currency').default('ETB').notNull(),
  seatsTotal: integer('seats_total'),
  status: text('status').default('draft').notNull(),
  registrationStatus: text('registration_status').default('open').notNull(),
  createdBy: uuid('created_by').references(() => profiles.id, { onDelete: 'set null' }),
  createdAt: timestamptz('created_at').defaultNow().notNull(),
  updatedAt: timestamptz('updated_at').defaultNow().notNull(),
})

export const liveClassRegistrations = pgTable(
  'live_class_registrations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    liveClassId: uuid('live_class_id')
      .notNull()
      .references(() => liveClasses.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    paymentStatus: text('payment_status').default('paid').notNull(),
    paymentMethod: text('payment_method').default('demo_checkout').notNull(),
    paymentReference: text('payment_reference'),
    amountPaid: numeric('amount_paid', { precision: 10, scale: 2 }).default('0').notNull(),
    registrationStatus: text('registration_status').default('registered').notNull(),
    notes: text('notes'),
    createdAt: timestamptz('created_at').defaultNow().notNull(),
    updatedAt: timestamptz('updated_at').defaultNow().notNull(),
  },
  (t) => [unique().on(t.liveClassId, t.userId)]
)

// ---------------------------------------------------------------------------
// Relations (enables db.query.* relational API & Drizzle Studio relations)
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles),
  accounts: many(accounts),
  sessions: many(sessions),
  programEnrollments: many(programEnrollments),
  lessonQuizCompletions: many(lessonQuizCompletions),
}))

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}))

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}))

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  user: one(users, { fields: [profiles.id], references: [users.id] }),
  enrollments: many(courseEnrollments),
  forumTopics: many(forumTopics),
  forumPosts: many(forumPosts),
  shopOrders: many(shopOrders),
  liveClassRegistrations: many(liveClassRegistrations),
}))

export const coursesRelations = relations(courses, ({ many }) => ({
  lessons: many(lessons),
  enrollments: many(courseEnrollments),
  media: many(courseMedia),
  quizzes: many(quizzes),
  programCourses: many(programCourses),
  reviews: many(reviews),
}))

export const courseMediaRelations = relations(courseMedia, ({ one }) => ({
  course: one(courses, { fields: [courseMedia.courseId], references: [courses.id] }),
}))

export const lessonsRelations = relations(lessons, ({ one, many }) => ({
  course: one(courses, { fields: [lessons.courseId], references: [courses.id] }),
  quiz: one(quizzes),
  downloads: many(lessonDownloads),
  quizCompletions: many(lessonQuizCompletions),
}))

export const quizzesRelations = relations(quizzes, ({ one, many }) => ({
  course: one(courses, { fields: [quizzes.courseId], references: [courses.id] }),
  lesson: one(lessons, { fields: [quizzes.lessonId], references: [lessons.id] }),
  questions: many(quizQuestions),
  completions: many(lessonQuizCompletions),
}))

export const quizQuestionsRelations = relations(quizQuestions, ({ one }) => ({
  quiz: one(quizzes, { fields: [quizQuestions.quizId], references: [quizzes.id] }),
}))

export const lessonDownloadsRelations = relations(lessonDownloads, ({ one }) => ({
  lesson: one(lessons, { fields: [lessonDownloads.lessonId], references: [lessons.id] }),
}))

export const lessonQuizCompletionsRelations = relations(lessonQuizCompletions, ({ one }) => ({
  lesson: one(lessons, { fields: [lessonQuizCompletions.lessonId], references: [lessons.id] }),
  quiz: one(quizzes, { fields: [lessonQuizCompletions.quizId], references: [quizzes.id] }),
  user: one(users, { fields: [lessonQuizCompletions.userId], references: [users.id] }),
}))

export const courseEnrollmentsRelations = relations(courseEnrollments, ({ one }) => ({
  user: one(profiles, { fields: [courseEnrollments.userId], references: [profiles.id] }),
  course: one(courses, { fields: [courseEnrollments.courseId], references: [courses.id] }),
  progress: one(courseProgress),
}))

export const courseProgressRelations = relations(courseProgress, ({ one }) => ({
  enrollment: one(courseEnrollments, {
    fields: [courseProgress.enrollmentId],
    references: [courseEnrollments.id],
  }),
}))

export const reviewsRelations = relations(reviews, ({ one }) => ({
  course: one(courses, { fields: [reviews.courseId], references: [courses.id] }),
}))

export const programsRelations = relations(programs, ({ many }) => ({
  programCourses: many(programCourses),
  enrollments: many(programEnrollments),
}))

export const programCoursesRelations = relations(programCourses, ({ one }) => ({
  program: one(programs, { fields: [programCourses.programId], references: [programs.id] }),
  course: one(courses, { fields: [programCourses.courseId], references: [courses.id] }),
}))

export const programEnrollmentsRelations = relations(programEnrollments, ({ one }) => ({
  program: one(programs, { fields: [programEnrollments.programId], references: [programs.id] }),
  user: one(users, { fields: [programEnrollments.userId], references: [users.id] }),
}))

export const shopOrdersRelations = relations(shopOrders, ({ one, many }) => ({
  user: one(profiles, { fields: [shopOrders.userId], references: [profiles.id] }),
  items: many(shopOrderItems),
}))

export const shopOrderItemsRelations = relations(shopOrderItems, ({ one }) => ({
  order: one(shopOrders, { fields: [shopOrderItems.orderId], references: [shopOrders.id] }),
  product: one(shopProducts, { fields: [shopOrderItems.productId], references: [shopProducts.id] }),
}))

export const shopProductsRelations = relations(shopProducts, ({ many }) => ({
  orderItems: many(shopOrderItems),
  cartItems: many(shopCartItems),
}))

export const shopCartItemsRelations = relations(shopCartItems, ({ one }) => ({
  user: one(profiles, { fields: [shopCartItems.userId], references: [profiles.id] }),
  product: one(shopProducts, { fields: [shopCartItems.productId], references: [shopProducts.id] }),
}))

export const liveClassesRelations = relations(liveClasses, ({ many }) => ({
  registrations: many(liveClassRegistrations),
}))

export const liveClassRegistrationsRelations = relations(liveClassRegistrations, ({ one }) => ({
  liveClass: one(liveClasses, { fields: [liveClassRegistrations.liveClassId], references: [liveClasses.id] }),
  user: one(profiles, { fields: [liveClassRegistrations.userId], references: [profiles.id] }),
}))

export const forumCategoriesRelations = relations(forumCategories, ({ many }) => ({
  topics: many(forumTopics),
}))

export const forumTopicsRelations = relations(forumTopics, ({ one, many }) => ({
  category: one(forumCategories, { fields: [forumTopics.categoryId], references: [forumCategories.id] }),
  author: one(profiles, { fields: [forumTopics.userId], references: [profiles.id] }),
  posts: many(forumPosts),
}))

export const forumPostsRelations = relations(forumPosts, ({ one }) => ({
  topic: one(forumTopics, { fields: [forumPosts.topicId], references: [forumTopics.id] }),
  author: one(profiles, { fields: [forumPosts.userId], references: [profiles.id] }),
}))
