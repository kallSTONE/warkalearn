import TransitionLink from '@/components/transition-link'
import { Button } from '@/components/ui/button' 
import CourseCarousel from '@/components/home/course-carousel'
import ArticleGrid from '@/components/home/article-grid'
import SuccessStories from '@/components/home/success-stories'
import NewsletterSignup from '@/components/home/newsletter-signup'
import { getSiteSettings } from '@/lib/site-settings'
import ProgramSpotlightModal from '@/components/programs/program-spotlight-modal'
import { getSupabaseAdminClient } from '@/lib/server/supabase-admin'
import { cookies } from 'next/headers'
import {
  DEFAULT_LOCALE, 
  LANGUAGE_COOKIE_KEY,
  readLocaleFromCookieValue,
  translate,
} from '@/lib/i18n'   
import Image from 'next/image'


export const revalidate = 0

type HomeLiveClass = {
  id: string
  slug: string
  title: string
  description: string | null
  instructor_name: string
  meeting_platform: string
  start_at: string
  end_at: string | null
  price: number
  currency: string
  registration_status: string
  cover_image_url: string | null
}

export default async function Home() {
  const cookieStore = cookies()
  const locale =
    readLocaleFromCookieValue(cookieStore.get(LANGUAGE_COOKIE_KEY)?.value) ??
    DEFAULT_LOCALE

  const t = (key: string, fallback: string) => translate(locale, key, fallback)

  const settings = await getSiteSettings()
  const heroTitle =
    settings?.hero_title ??
    t('home.hero.title', 'Build skills for work, business, and life')
  const heroSubtitle =
    settings?.hero_subtitle ??
    t(
      'home.hero.subtitle',
      'Neway Learn offers expert-led courses in tech, language, and business with live sessions, projects, and flexible programs.'
    )
  const heroCtaText = settings?.hero_cta_text ?? t('home.hero.cta', 'Explore programs ->')
  const heroCtaLink = settings?.hero_cta_link ?? '/learn'
  const heroVideoId = settings?.hero_video_id ?? 'mSs5scC7hsI'
  
  const admin = getSupabaseAdminClient() 
  const { data: liveClassRows } = await admin
    .from('live_classes')
    .select('id, slug, title, description, instructor_name, meeting_platform, start_at, end_at, price, currency, registration_status, cover_image_url')
    .eq('status', 'published')
    .order('start_at', { ascending: true }) 
    .limit(3)

  const liveClassDemos: HomeLiveClass[] =
    (liveClassRows as HomeLiveClass[] | null | undefined)?.length
      ? (liveClassRows as HomeLiveClass[])
      : [
          {
            id: 'demo-monthly',
            slug: 'demo-monthly',
            title: t('home.live.demo.monthly.title', 'Neway Premium Monthly (1 month)'),
            instructor_name: 'Lidia M.',
            meeting_platform: t('home.live.demo.monthly.mode', 'Live on Zoom'),
            start_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString(),
            end_at: null,
            price: 1500,
            currency: 'ETB',
            registration_status: 'open',
            description: t('home.live.subtitle', 'Join instructor-led sessions to practice speaking, ask questions in real time, and learn with peers.'),
            cover_image_url: '/assets/images/courses-Thumbnail/DefaultThumbnail.png',
          },
          {
            id: 'demo-quarterly', 
            slug: 'demo-quarterly',
            title: t('home.live.demo.quarterly.title', 'Neway Premium Quarterly (3 months)'),
            instructor_name: 'Samuel T.',
            meeting_platform: t('home.live.demo.quarterly.mode', 'Live on Google Meet'),
            start_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 4).toISOString(),
            end_at: null, 
            price: 3600,
            currency: 'ETB',
            registration_status: 'open',
            description: t('home.live.subtitle', 'Join instructor-led sessions to practice speaking, ask questions in real time, and learn with peers.'),
            cover_image_url: '/assets/images/courses-Thumbnail/DefaultThumbnail.png',
          },
        ]

  const companyLogos = [
    { file: 'Addis Ababa University Logo.png', name: 'Addis Ababa University' },
    { file: 'Amole Logo.png', name: 'Amole' },
    { file: 'Awash International Bank Logo.svg', name: 'Awash International Bank' },
    { file: 'Bank of Abyssinia Logo.svg', name: 'Bank of Abyssinia' },
    { file: 'blueMoon Logo.svg', name: 'BlueMoon' },
    { file: 'CBE Birr ( No background ) Logo.svg', name: 'CBE Birr' },
    { file: 'Chapa Logo.svg', name: 'Chapa' },
    { file: 'Commercial Bank of Ethiopia Logo.png', name: 'Commercial Bank of Ethiopia' },
    { file: 'Dashen Bank Logo.png', name: 'Dashen Bank' },
    { file: 'Ethio Telecom Logo.svg', name: 'Ethio Telecom' },
    { file: 'Gasha Digital Logo.svg', name: 'Gasha Digital' },
    { file: 'Hibret Bank Logo.png', name: 'Hibret Bank' },
    { file: 'Hibret Bank Logo.svg', name: 'Hibret Bank' },
    { file: 'iceaddis Logo.svg', name: 'iceaddis' },
    { file: 'Loline Mag Logo.png', name: 'Loline Mag' },
    { file: 'Ministry of Transport Logo.png', name: 'Ministry of Transport' },
    { file: 'Office of The Prime Minister Logo.png', name: 'Office of the Prime Minister' },
  ]

  const homeCtaClass =
    'bg-primary text-primary-foreground font-semibold shadow-lg transition-all duration-300 hover:scale-105 hover:bg-primary/90 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'

  return (
    <div className="flex flex-col sm:items-center">
      <ProgramSpotlightModal variant="home" />
      {/* Hero Section */}
      <section id="home-hero" className="relative flex flex-col items-center w-full overflow-hidden bg-gradient-to-r from-background via-blue-900/15 dark:via-blue-900/20 to-transparent py-2 pl-6 pr-6 md:flex-row md:items-center md:justify-between md:gap-10">

 
        {/* Text */}
        <div className="z-10 py-6 text-center hidden md:block md:py-20 md:w-[55%] md:flex md:flex-col md:justify-center">
          <h1 className="font-montserrat text-3xl font-bold tracking-tight md:text-5xl lg:text-6xl select-none">
            {heroTitle}
          </h1>

          <p className="mt-4 text-lg text-muted-foreground md:text-xl select-none">
            {heroSubtitle}
          </p>

          <div className="mt-6">
            <Button
              size="lg"
              asChild
              className={homeCtaClass}
            >
              <TransitionLink href={heroCtaLink} className="relative z-10 px-8 py-4">
                {heroCtaText}
              </TransitionLink>
            </Button>
          </div>

        </div>


        {/* Hero Video (desktop only) */}
        <div className="z-10 w-full justify-center py-12 md:flex md:w-[45%] md:items-center md:py-20">
          <div className="relative w-full max-w-3xl overflow-hidden rounded-xl shadow-lg aspect-video">
            <iframe
              title={t('home.hero.video.title', 'Neway Learn Hero Video')}
              className="h-full w-full"
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              src={`https://www.youtube-nocookie.com/embed/${heroVideoId}?autoplay=1&rel=0`}
              srcDoc={`
                <style>
                  * { padding: 0; margin: 0; overflow: hidden; }
                  html, body { height: 100%; }
                  img, span { position: absolute; width: 100%; top: 0; bottom: 0; margin: auto; }
                  img { object-fit: cover; height: 100%; }
                  span {
                    height: 3.2rem;
                    width: 3.2rem;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(0, 0, 0, 0.65);
                    border-radius: 9999px;
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font: 700 1.2rem/1 sans-serif;
                  }
                </style>
                <a href='https://www.youtube-nocookie.com/embed/${heroVideoId}?autoplay=1&rel=0'>
                  <img src='https://i.ytimg.com/vi/${heroVideoId}/hqdefault.jpg' alt='${t('home.hero.video.playAlt', 'Play hero video')}' />
                  <span>▶</span>
                </a>
              `}
            />
          </div>
        </div>


        {/* Text */}
        <div className="z-10 py-6 md:hidden text-center md:py-20 md:w-[55%]">
          <h1 className="font-montserrat text-3xl font-bold tracking-tight md:text-5xl lg:text-6xl select-none">
            {heroTitle}
          </h1>

          <p className="mt-4 text-lg text-muted-foreground md:text-xl select-none">
            {heroSubtitle}
          </p>

          <div className="mt-6">
            <Button
              size="lg"
              asChild
              className={homeCtaClass}
            >
              <TransitionLink href={heroCtaLink} className="relative z-10 px-8 py-4">
                {heroCtaText}
              </TransitionLink>
            </Button>
          </div>

        </div>


        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/10 via-background to-transparent" />
      </section>

      {/* Trusted By */}
      <section className="py-12 my-2 w-full bg-gradient-to-r from-background via-blue-900/15 dark:via-blue-900/20 to-transparent overflow-hidden">

        <h2 className="text-center text-xl sm:text-2xl font-semibold mb-8">
          {t('home.orgs.title', 'We train Students from these organizations')}
        </h2>

        <div className="relative w-full overflow-hidden">
          {/* Scrolling container */}
          <div className="flex w-max animate-scroll gap-8 px-6">
            {[...companyLogos, ...companyLogos].map((logo, index) => (
              <div
                key={index}
                className="flex items-center justify-center min-w-[140px] opacity-80 hover:opacity-100 transition"
              >
                <Image
                  src={encodeURI(`/assets/images/companyLogos/${logo.file}`)}
                  alt={`${logo.name} logo`}
                  width={140}
                  height={40}
                  className="h-10 w-auto object-contain opacity-60"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Classes */}
      <section className="py-16 bg-background w-full px-8">
        <div className="container">

          <div className="text-center mb-10">
            <h2 className="text-3xl font-montserrat font-bold">{t('home.live.title', 'Live classes this week')}</h2>
            <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
              {t(
                'home.live.subtitle',
                'Join instructor-led sessions to practice speaking, ask questions in real time, and learn with peers.'
              )}
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {liveClassDemos.map((session) => (
              <article
                key={session.id}
                className="overflow-hidden rounded-2xl border bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-md text-center"
              >
                <Image
                  src={session.cover_image_url || '/assets/images/courses-Thumbnail/DefaultThumbnail.png'}
                  alt={`${session.title} live class thumbnail`}
                  width={800}
                  height={500}
                  className="h-44 w-full object-cover"
                />

                <div className="p-6">
                  <h3 className="text-lg font-semibold leading-snug">{session.title}</h3>

                  <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground">{t('home.live.instructor', 'Instructor:')}</span> {session.instructor_name}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">{t('home.live.time', 'Time:')}</span>{' '}
                      {new Date(session.start_at).toLocaleString(locale, {
                        weekday: 'short',
                        hour: 'numeric',
                        minute: '2-digit',
                        timeZoneName: 'short',
                      })}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">{t('home.live.format', 'Format:')}</span> {session.meeting_platform}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">{t('home.live.price', 'Price:')}</span> {session.currency} {Number(session.price || 0).toLocaleString(locale)}
                    </p>
                  </div>

                  <Button className="mt-6 home-card-cta" asChild>
                    <TransitionLink href={`/learn/live?focus=${encodeURIComponent(session.slug)}`}>
                      {t('home.live.reserve', 'Reserve spot')}
                    </TransitionLink>
                  </Button>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-10 flex justify-center">
            <Button
              size="lg"
              asChild
              className={homeCtaClass}
            >
              <TransitionLink href="/learn/live">{t('home.live.all', 'View all live schedules')}</TransitionLink>
            </Button>
          </div>
          
        </div>
      </section>

      {/* Featured Courses Section */}
      <section className="py-16 bg-background w-full">
        <div className=" w-full">
          <div className="mb-10 px-6 text-center">
            <div>
              <h2 className="text-3xl font-montserrat font-bold">{t('home.paced.title', 'Learn at Your Own Pace')}</h2>
              <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
                {t('home.paced.subtitle', 'Learn Grammar, Speaking, Writing, and creative skills.')}
              </p>
            </div>
          </div>

          <CourseCarousel />

          <div className="mt-10 flex justify-center">
            <Button
              size="lg"
              asChild
              className={homeCtaClass}
            >
              <TransitionLink href="/learn">{t('home.paced.browse', 'Browse all courses')}</TransitionLink>
            </Button>
          </div>
        </div>
      </section>

      {/* Benefits of learning with Neway Learn */}
      <section className="py-16 bg-gradient-to-r from-background via-blue-900/15 dark:via-blue-900/20 to-transparent w-full px-8">
        <div className="container ">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-montserrat font-bold">{t('home.why.title', 'Why Neway Learn')}</h2>
            <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
              {t(
                'home.why.subtitle',
                'Learn with expert guidance, practical projects, and clear progress at every level.'
              )}
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="group rounded-2xl border bg-background/80 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-blue-600/10 text-blue-700 mx-auto">
                <span className="text-lg">🎬</span>
              </div>
              <h3 className="text-center text-lg font-semibold">{t('home.why.card.project.title', 'Project-based learning')}</h3>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                {t('home.why.card.project.body', 'Build real outcomes with guided projects and mentor feedback.')}
              </p>
            </div>

            <div className="group rounded-2xl border bg-background/80 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600/10 text-emerald-700 mx-auto">
                <span className="text-lg"> 📱 </span>
              </div>
              <h3 className="text-center text-lg font-semibold">{t('home.why.card.pathways.title', 'Structured pathways')}</h3>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                {t('home.why.card.pathways.body', 'Lessons follow clear goals with repeatable practice and checkpoints.')}
              </p>
            </div>

            <div className="group rounded-2xl border bg-background/80 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-amber-600/10 text-amber-700 mx-auto">
                <span className="text-lg">⚡</span>
              </div>
              <h3 className="text-center text-lg font-semibold">{t('home.why.card.flexible.title', 'Flexible schedules')}</h3>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                {t(
                  'home.why.card.flexible.body',
                  'Join live cohorts or learn on your schedule with recordings and guided exercises.'
                )}
              </p>
            </div>

            <div className="group rounded-2xl border bg-background/80 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-purple-600/10 text-purple-700 mx-auto">
                <span className="text-lg">🧠</span>
              </div>
              <h3 className="text-center text-lg font-semibold">{t('home.why.card.feedback.title', 'Mentor feedback')}</h3>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                {t('home.why.card.feedback.body', 'Targeted feedback helps you improve faster and stay on track.')}
              </p>
            </div>

            <div className="group rounded-2xl border bg-background/80 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-rose-600/10 text-rose-700 mx-auto">
                <span className="text-lg">💼</span>
              </div>
              <h3 className="text-center text-lg font-semibold">{t('home.why.card.career.title', 'Career-ready skills')}</h3>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                {t('home.why.card.career.body', 'Build portfolio pieces, interview prep, and workplace tools.')}
              </p>
            </div>

            <div className="group rounded-2xl border bg-background/80 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-slate-600/10 text-slate-700 mx-auto">
                <span className="text-lg">🤝</span>
              </div>
              <h3 className="text-center text-lg font-semibold">{t('home.why.card.community.title', 'Supportive community')}</h3>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                {t('home.why.card.community.body', 'Learn with peers, get feedback, and stay motivated with study circles.')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* About the Instructor */}
      <section className="py-16 bg-background w-full px-8">
        <div className="container mx-auto flex max-w-5xl flex-col items-center gap-10 p-8 text-center lg:flex-row lg:items-center lg:text-left">
          <div className="w-full lg:flex-1">
            <h2 className="text-3xl font-montserrat font-bold mb-4">{t('home.mentors.title', 'Meet the mentors')}</h2>
            <p className="text-muted-foreground mb-6">
              {t(
                'home.mentors.p1',
                'Neway Learn instructors are experienced practitioners across tech, language, and business.'
              )}
            </p>
            <p className="text-muted-foreground mb-6">
              {t('home.mentors.p2', 'We focus on practical skills, hands-on projects, and clear outcomes.')}
            </p>
            <p className="text-muted-foreground mb-6">
              {t(
                'home.mentors.p3',
                'Every course includes guided practice, feedback, and learning plans tailored to your goals.'
              )}
            </p>
          </div>
          <div className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-sm lg:self-center">
            <Image
              src="/assets/images/instructors/avatar1.png"
              alt={t('home.mentors.imageAlt', 'Instructor image')}
              width={640}
              height={800}
              className="h-auto w-full rounded-lg object-cover shadow-lg"
            />
          </div>
        </div>
      </section>





      {/* Latest Articles Section */}
      <section className="p-16 bg-muted/30 w-full">
        <div className="container">
          <div className="mb-8 text-center">
            <div>
              <h2 className="text-3xl font-montserrat font-bold">{t('home.articles.title', 'Latest articles')}</h2>
              <p className="text-muted-foreground mt-2">
                {t(
                  'home.articles.subtitle',
                  'Practical tips, study plans, and skill-building strategies for modern learners.'
                )}
              </p>
            </div>
            <Button size="lg" className={`mt-6 ${homeCtaClass}`} asChild>
              <TransitionLink href="/blog">{t('home.articles.cta', 'View all articles')}</TransitionLink>
            </Button>
          </div>

          <ArticleGrid />
        </div>
      </section>


      {/* Success Stories Section */}
      <section className="py-16 bg-background">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-montserrat font-bold">{t('home.success.title', 'Learner success stories')}</h2>
            <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
              {t(
                'home.success.subtitle',
                'See how learners improved confidence, clarity, and real-world communication.'
              )}
            </p>
          </div>

          <SuccessStories />
        </div>
      </section>


      {/* Newsletter Section */}
      <section className="py-16 bg-gradient-to-r from-primary/10 to-secondary/10 w-full">
        <div className="container">
          <NewsletterSignup />
        </div>
      </section>
    </div>
  )
}
