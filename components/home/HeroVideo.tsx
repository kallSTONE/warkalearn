'use client'

import { useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    YT: any
    onYouTubeIframeAPIReady: () => void
  }
}

export default function HeroVideo({ videoId }: { videoId: string }) {
  const playerRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [muted, setMuted] = useState(true)

  useEffect(() => {
    if (window.YT) {
      createPlayer()
      return
    }

    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.body.appendChild(tag)

    window.onYouTubeIframeAPIReady = createPlayer
  }, [])

  const createPlayer = () => {
    if (!containerRef.current) return

    playerRef.current = new window.YT.Player(containerRef.current, {
      videoId,
      playerVars: {
        autoplay: 1,
        mute: 0,
        loop: 1,
        playlist: videoId,
        controls: 0,
        rel: 0,
        modestbranding: 1,
        iv_load_policy: 3,
        playsinline: 1,
      },
      events: {
        onReady: (e: any) => e.target.playVideo(),
      },
    })
  }

  const toggleMute = () => {
    if (!playerRef.current) return

    if (muted) {
      playerRef.current.unMute()
      playerRef.current.setVolume(100)
    } else {
      playerRef.current.mute()
    }

    setMuted(!muted)
  }

  return (
    <div className="relative w-full max-w-3xl aspect-video rounded-xl overflow-hidden shadow-lg">
      {/* YouTube player */}
      <div ref={containerRef} className="absolute w-full h-full aspect-video inset-0 pointer-events-none" />

      {/* Custom mute button */}
      <button
        onClick={toggleMute}
        className="relative mt-2 ml-2 h-10 w-fit flex flex-row justify-center items-center z-112 rounded-full bg-black/50 p-4 text-white/87 hover:bg-black/85 transition"
        aria-label={muted ? 'Unmute video' : 'Mute video'}
      >
        {muted ? '🔇 unmute' : '🔊 mute'}
      </button>
    </div>
  )
}
