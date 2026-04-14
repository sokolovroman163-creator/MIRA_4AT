/**
 * AudioMessage — waveform voice message player.
 *
 * Renders a compact player bubble:
 *   [Play/Pause]  ████░░░░░░░░░░  0:15 / 1:03
 *
 * Uses wavesurfer.js for waveform visualisation & playback.
 * Falls back to a simple <audio> element if wavesurfer fails to load.
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import WaveSurfer from 'wavesurfer.js'

interface Props {
  src: string
  /** Pre-computed duration in seconds (from server) — shown before playback */
  duration?: number
  /** isOwn changes waveform color */
  isOwn?: boolean
}

function formatDur(s: number): string {
  if (!isFinite(s) || s < 0) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function AudioMessage({ src, duration, isOwn }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WaveSurfer | null>(null)
  const [ready, setReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [totalDuration, setTotalDuration] = useState(duration ?? 0)
  const [error, setError] = useState(!src)

  const waveColor = isOwn ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.2)'
  const progressColor = isOwn ? 'rgba(255,255,255,0.9)' : 'var(--accent)'
  const cursorColor = 'transparent'

  useEffect(() => {
    if (!containerRef.current || !src) return

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor,
      progressColor,
      cursorColor,
      height: 32,
      barWidth: 2,
      barGap: 2,
      barRadius: 2,
      normalize: true,
      interact: true,
      url: src,
    })

    wsRef.current = ws

    ws.on('ready', () => {
      setReady(true)
      setTotalDuration(ws.getDuration())
    })

    ws.on('timeupdate', (t) => {
      setCurrentTime(t)
    })

    ws.on('play', () => setPlaying(true))
    ws.on('pause', () => setPlaying(false))
    ws.on('finish', () => {
      setPlaying(false)
      setCurrentTime(0)
      ws.seekTo(0)
    })

    ws.on('error', () => {
      setError(true)
    })

    return () => {
      ws.destroy()
      wsRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src])

  const togglePlay = useCallback(() => {
    wsRef.current?.playPause()
  }, [])

  const displayTime = playing ? currentTime : (totalDuration || duration || 0)

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8" />
          <line x1="12" y1="8" x2="12" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="16" r="1" fill="currentColor" />
        </svg>
        <span style={{ fontSize: 12, opacity: 0.7 }}>Не удалось загрузить</span>
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        minWidth: 200,
        maxWidth: 280,
      }}
    >
      {/* Play / Pause button */}
      <button
        onClick={togglePlay}
        disabled={!ready}
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          background: isOwn ? 'rgba(255,255,255,0.2)' : 'rgba(0,122,255,0.1)',
          border: 'none',
          cursor: ready ? 'pointer' : 'default',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'opacity 0.15s',
          opacity: ready ? 1 : 0.5,
        }}
        aria-label={playing ? 'Пауза' : 'Воспроизвести'}
      >
        {!ready ? (
          /* Spinner while loading */
          <div
            style={{
              width: 16,
              height: 16,
              border: '2px solid',
              borderColor: isOwn ? 'rgba(255,255,255,0.6)' : 'var(--accent)',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
        ) : playing ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <rect x="6" y="4" width="4" height="16" rx="1" fill={isOwn ? 'white' : 'var(--accent)'} />
            <rect x="14" y="4" width="4" height="16" rx="1" fill={isOwn ? 'white' : 'var(--accent)'} />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M5 3l14 9-14 9V3z" fill={isOwn ? 'white' : 'var(--accent)'} />
          </svg>
        )}
      </button>

      {/* Waveform + time */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Waveform container */}
        <div ref={containerRef} style={{ width: '100%' }} />

        {/* Duration */}
        <span
          style={{
            fontSize: 11,
            opacity: 0.65,
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1,
          }}
        >
          {formatDur(displayTime)}
        </span>
      </div>
    </div>
  )
}
