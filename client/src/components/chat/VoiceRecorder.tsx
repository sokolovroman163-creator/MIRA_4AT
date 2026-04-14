/**
 * VoiceRecorder — hold-to-record voice message component.
 *
 * Usage:
 *   <VoiceRecorder onSend={(blob, duration) => ...} disabled={false} />
 *
 * Behaviour:
 *  - Tap & hold mic button → starts recording
 *  - Release → sends audio blob + duration
 *  - Slide left (> 60 px) while holding → cancels recording
 *  - Max recording time: 120 s (auto-send)
 */
import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'

const MAX_DURATION_S = 120

interface Props {
  onSend: (blob: Blob, duration: number) => void
  disabled?: boolean
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function VoiceRecorder({ onSend, disabled }: Props) {
  const { t } = useTranslation()
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [cancelled, setCancelled] = useState(false)
  // slide-to-cancel offset
  const [dragX, setDragX] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)
  const startPointerXRef = useRef<number>(0)
  const isCancelledRef = useRef(false)

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const doCancel = useCallback(() => {
    isCancelledRef.current = true
    setCancelled(true)
    mediaRecorderRef.current?.stop()
    stopTimer()
    setRecording(false)
    setElapsed(0)
    setDragX(0)
    setTimeout(() => setCancelled(false), 800)
  }, [])

  const doSend = useCallback(() => {
    if (isCancelledRef.current) return
    const duration = Math.round((Date.now() - startTimeRef.current) / 1000)
    stopTimer()
    setRecording(false)
    setElapsed(0)
    setDragX(0)
    // mediaRecorder stop triggers ondataavailable + onstop which calls onSend
    mediaRecorderRef.current?.stop()
    // duration is stored so onstop can access it
    startTimeRef.current = duration
  }, [])

  const startRecording = useCallback(async () => {
    if (disabled || recording) return
    isCancelledRef.current = false
    setCancelled(false)

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      alert(t('messages.micPermissionDenied'))
      return
    }

    chunksRef.current = []
    const mr = new MediaRecorder(stream, { mimeType: getSupportedMimeType() })
    mediaRecorderRef.current = mr

    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    mr.onstop = () => {
      stream.getTracks().forEach(t => t.stop())
      if (isCancelledRef.current) return
      const blob = new Blob(chunksRef.current, { type: mr.mimeType })
      const dur = startTimeRef.current // we stored duration here
      onSend(blob, Math.max(1, dur))
    }

    startTimeRef.current = Date.now()
    mr.start(200) // collect every 200ms
    setRecording(true)
    setElapsed(0)

    timerRef.current = setInterval(() => {
      const sec = Math.round((Date.now() - startTimeRef.current) / 1000)
      setElapsed(sec)
      if (sec >= MAX_DURATION_S) {
        doSend()
      }
    }, 500)
  }, [disabled, recording, onSend, doSend, t])

  // pointer events on the mic button
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      startPointerXRef.current = e.clientX
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      startRecording()
    },
    [startRecording]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!recording) return
      const dx = e.clientX - startPointerXRef.current
      if (dx < 0) setDragX(dx)
      if (dx < -60) {
        doCancel()
      }
    },
    [recording, doCancel]
  )

  const handlePointerUp = useCallback(() => {
    if (!recording) return
    doSend()
  }, [recording, doSend])

  // cleanup on unmount
  useEffect(() => {
    return () => {
      isCancelledRef.current = true
      mediaRecorderRef.current?.stop()
      stopTimer()
    }
  }, [])

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
      {/* Recording UI — overlays the whole input bar when active */}
      <AnimatePresence>
        {recording && (
          <motion.div
            key="recording-bar"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'fixed',
              bottom: 'calc(0px + env(safe-area-inset-bottom))',
              left: 0,
              right: 0,
              height: 64,
              display: 'flex',
              alignItems: 'center',
              paddingLeft: 16,
              paddingRight: 60,
              background: 'var(--glass)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              borderTop: '1px solid var(--separator)',
              gap: 10,
              zIndex: 200,
              userSelect: 'none',
            }}
          >
            {/* Pulsing red dot */}
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#FF3B30',
                flexShrink: 0,
              }}
            />

            {/* Duration */}
            <span
              style={{
                fontSize: 16,
                fontVariantNumeric: 'tabular-nums',
                color: 'var(--text-primary)',
                fontWeight: 500,
                minWidth: 40,
              }}
            >
              {formatDuration(elapsed)}
            </span>

            {/* Slide-to-cancel hint */}
            <motion.div
              animate={{ x: [0, -6, 0] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                opacity: Math.max(0, 1 + dragX / 60),
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M19 12H5M5 12l7-7M5 12l7 7" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
                {t('messages.voiceSlideToCancel')}
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cancelled flash */}
      <AnimatePresence>
        {cancelled && (
          <motion.div
            key="cancelled"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              bottom: 44,
              right: 0,
              background: 'rgba(255,59,48,0.9)',
              color: 'white',
              borderRadius: 10,
              padding: '4px 10px',
              fontSize: 12,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
            }}
          >
            {t('common.cancel')}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mic button */}
      <motion.button
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={doCancel}
        disabled={disabled}
        animate={recording ? { scale: 1.15 } : { scale: 1 }}
        whileTap={{ scale: 1.1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          background: recording ? '#FF3B30' : 'var(--bg-tertiary)',
          border: 'none',
          cursor: disabled ? 'default' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginBottom: 1,
          touchAction: 'none',
          transition: 'background 0.2s',
          zIndex: recording ? 201 : 'auto',
        }}
        aria-label={recording ? t('messages.voiceRecording') : t('messages.sendVoice')}
      >
        <svg width="16" height="18" viewBox="0 0 24 24" fill="none">
          <rect x="9" y="2" width="6" height="12" rx="3" stroke={recording ? 'white' : 'var(--text-secondary)'} strokeWidth="1.8" />
          <path
            d="M5 10a7 7 0 0014 0M12 19v3M9 22h6"
            stroke={recording ? 'white' : 'var(--text-secondary)'}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </motion.button>
    </div>
  )
}

/** Pick best supported MIME type for recording */
function getSupportedMimeType(): string {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    'audio/mp4',
  ]
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime
  }
  return ''
}
