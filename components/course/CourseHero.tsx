import YouTubePlayer from '@/components/display/YouTubePlayer'

interface CourseHeroProps {
  videoUrl?: string
  poster: string
  title: string
  description: string
  autoPlay?: boolean
  loop?: boolean
  muted?: boolean 
  showSeekControls?: boolean
}

export function CourseHero({
  videoUrl,
  poster,
  title,
  description,
  showSeekControls = false,  
  autoPlay = false,
  loop = false,
  muted = true,
}: CourseHeroProps) {
  return (
    <div className="relative w-full aspect-video rounded-lg overflow-hidden">
      <YouTubePlayer
        videoUrl={videoUrl}
        poster={poster}
        title={title}
        autoPlay={autoPlay}
        loop={loop}
        muted={muted}
        showPlayPause={true}
        showMute={true}
        showSeekControls={showSeekControls}
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 flex flex-col justify-end p-6 pointer-events-none">
        <h1 className="hidden text-4xl font-bold text-white">{title}</h1>
        <p className="hidden text-white mt-2 line-clamp-2">{description}</p>
      </div>

    </div>
  )
}
