'use client'

import { useEffect, useRef, useState } from 'react'

let youtubeApiPromise: Promise<void> | null = null

const loadYouTubeIframeAPI = () => {
    if (typeof window === 'undefined') return Promise.resolve()
    if (window.YT?.Player) return Promise.resolve()

    if (!youtubeApiPromise) {
        youtubeApiPromise = new Promise((resolve) => {
            const existingScript = document.querySelector(
                'script[src="https://www.youtube.com/iframe_api"]'
            )

            if (!existingScript) {
                const tag = document.createElement('script')
                tag.src = 'https://www.youtube.com/iframe_api'
                document.body.appendChild(tag)
            }

            const previousReady = window.onYouTubeIframeAPIReady
            window.onYouTubeIframeAPIReady = () => {
                if (typeof previousReady === 'function') previousReady()
                resolve()
            }
        })
    }

    return youtubeApiPromise
}

const extractYouTubeId = (url: string) => {
    const match = url.match(
        /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&?/]+)/
    )
    return match?.[1] || null
}

interface YouTubePlayerProps {
    videoUrl?: string
    poster?: string
    title?: string
    className?: string
    autoPlay?: boolean
    loop?: boolean
    muted?: boolean
    showPlayPause?: boolean
    showMute?: boolean
    showSeekControls?: boolean
    seekSeconds?: number
}

export default function YouTubePlayer({
    videoUrl,
    poster,
    title = 'YouTube video',
    className,
    autoPlay = false,
    loop = false,
    muted = true,
    showPlayPause = true,
    showMute = true,
    showSeekControls = false,
    seekSeconds = 10,
}: YouTubePlayerProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const playerRef = useRef<any>(null)
    const [isMuted, setIsMuted] = useState(muted)
    const [isPlaying, setIsPlaying] = useState(autoPlay)

    const videoId = videoUrl ? extractYouTubeId(videoUrl) : null

    useEffect(() => {
        if (!videoId) return

        let isMounted = true

        loadYouTubeIframeAPI().then(() => {
            if (!isMounted || !containerRef.current) return

            if (playerRef.current?.destroy) {
                playerRef.current.destroy()
            }

            playerRef.current = new window.YT.Player(containerRef.current, {
                videoId,
                playerVars: {
                    autoplay: autoPlay ? 1 : 0,
                    mute: muted ? 1 : 0,
                    loop: loop ? 1 : 0,
                    playlist: loop ? videoId : undefined,
                    controls: 0,
                    rel: 0,
                    modestbranding: 1,
                    iv_load_policy: 3,
                    playsinline: 1,
                },
                events: {
                    onReady: (e: any) => {
                        if (autoPlay) e.target.playVideo()
                        else e.target.pauseVideo()
                        if (muted) e.target.mute()
                    },
                },
            })
        })

        return () => {
            isMounted = false
            if (playerRef.current?.destroy) {
                playerRef.current.destroy()
            }
        }
    }, [videoId, autoPlay, loop, muted])

    const toggleMute = () => {
        if (!playerRef.current) return

        if (isMuted) {
            playerRef.current.unMute()
            playerRef.current.setVolume(100)
        } else {
            playerRef.current.mute()
        }

        setIsMuted(!isMuted)
    }

    const togglePlayPause = () => {
        if (!playerRef.current) return

        if (isPlaying) {
            playerRef.current.pauseVideo()
        } else {
            playerRef.current.playVideo()
        }

        setIsPlaying(!isPlaying)
    }

    const seekBy = (seconds: number) => {
        if (!playerRef.current?.getCurrentTime) return
        const currentTime = playerRef.current.getCurrentTime()
        playerRef.current.seekTo(currentTime + seconds, true)
    }

    return (
        <div
            className={`relative w-full aspect-video rounded-lg overflow-hidden ${className ?? ''
                }`}
        >
            {!videoId ? (
                poster ? (
                    <img src={poster} alt={title} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg flex items-center justify-center border border-border">
                        <div className="text-center">
                            <div className="text-muted-foreground mb-2">Video Player</div>
                            <div className="text-sm text-muted-foreground">
                                Video will be integrated here
                            </div>
                        </div>
                    </div>
                )
            ) : (
                <div ref={containerRef} className="absolute w-full h-full inset-0" />
            )}

            {videoId && showPlayPause && (
                <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-auto">
                    <button
                        onClick={togglePlayPause}
                        className="h-12 w-12 flex items-center justify-center rounded-full bg-black/50 text-white/90 hover:bg-black/85 transition"
                        aria-label={isPlaying ? 'Pause video' : 'Play video'}
                    >
                        {isPlaying ? '⏸' : '▶️'}
                    </button>
                </div>
            )}

            {videoId && showSeekControls && (
                <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-3 pointer-events-auto">
                    <button
                        onClick={() => seekBy(-seekSeconds)}
                        className="h-10 w-10 flex items-center justify-center rounded-full bg-black/50 text-white/90 hover:bg-black/85 transition"
                        aria-label={`Rewind ${seekSeconds} seconds`}
                    >
                        ⏪
                    </button>
                    <button
                        onClick={() => seekBy(seekSeconds)}
                        className="h-10 w-10 flex items-center justify-center rounded-full bg-black/50 text-white/90 hover:bg-black/85 transition"
                        aria-label={`Forward ${seekSeconds} seconds`}
                    >
                        ⏩
                    </button>
                </div>
            )}

            {videoId && showMute && (
                <div className="absolute left-4 top-4 z-10 pointer-events-auto">
                    <button
                        onClick={toggleMute}
                        className="h-10 w-10 flex items-center justify-center rounded-full bg-black/50 text-white/87 hover:bg-black/85 transition"
                        aria-label={isMuted ? 'Unmute video' : 'Mute video'}
                    >
                        {isMuted ? '🔇' : '🔊'}
                    </button>
                </div>
            )}
        </div>
    )
}
