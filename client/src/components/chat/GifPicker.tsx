import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'

const TENOR_API_KEY = import.meta.env.VITE_TENOR_API_KEY as string | undefined
const TENOR_BASE = 'https://tenor.googleapis.com/v2'

interface TenorResult {
  id: string
  title: string
  /** Small preview URL */
  previewUrl: string
  /** Full-size GIF URL */
  gifUrl: string
}

async function fetchTenorGifs(query: string, limit = 20): Promise<TenorResult[]> {
  if (!TENOR_API_KEY) return []

  const endpoint = query.trim()
    ? `${TENOR_BASE}/search?q=${encodeURIComponent(query)}&key=${TENOR_API_KEY}&limit=${limit}&media_filter=tinygif,gif`
    : `${TENOR_BASE}/featured?key=${TENOR_API_KEY}&limit=${limit}&media_filter=tinygif,gif`

  const res = await fetch(endpoint)
  if (!res.ok) return []
  const json = await res.json() as {
    results: Array<{
      id: string
      title: string
      media_formats: {
        tinygif?: { url: string }
        gif?: { url: string }
      }
    }>
  }

  return (json.results ?? []).map(item => ({
    id: item.id,
    title: item.title,
    previewUrl: item.media_formats.tinygif?.url ?? item.media_formats.gif?.url ?? '',
    gifUrl: item.media_formats.gif?.url ?? item.media_formats.tinygif?.url ?? '',
  }))
}

interface Props {
  isOpen: boolean
  anchorRef: React.RefObject<HTMLElement | null>
  onGifSelect: (gifUrl: string) => void
  onClose: () => void
}

export default function GifPicker({ isOpen, anchorRef, onGifSelect, onClose }: Props) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TenorResult[]>([])
  const [loading, setLoading] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [pickerStyle, setPickerStyle] = useState<React.CSSProperties>({ bottom: 64, right: 8 })

  // Compute position when picker opens
  useEffect(() => {
    if (!isOpen) return
    const anchor = anchorRef.current
    if (!anchor) {
      setPickerStyle({ bottom: 64, right: 8 })
      return
    }
    const rect = anchor.getBoundingClientRect()
    const pickerWidth = 320
    const pickerHeight = 400
    let left = rect.right - pickerWidth
    if (left < 8) left = 8
    if (left + pickerWidth > window.innerWidth - 8) left = window.innerWidth - pickerWidth - 8
    const top = rect.top - pickerHeight - 8
    const finalTop = top < 8 ? rect.bottom + 8 : top
    setPickerStyle({ position: 'fixed', top: finalTop, left, zIndex: 900, width: pickerWidth })
  }, [isOpen, anchorRef])

  // Load featured on open
  useEffect(() => {
    if (!isOpen) return
    setQuery('')
    setLoading(true)
    fetchTenorGifs('').then(r => {
      setResults(r)
      setLoading(false)
    })
    // Focus search input
    setTimeout(() => searchRef.current?.focus(), 100)
  }, [isOpen])

  // Debounced search
  useEffect(() => {
    if (!isOpen) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setLoading(true)
      fetchTenorGifs(query).then(r => {
        setResults(r)
        setLoading(false)
      })
    }, 400)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, isOpen])

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    const handlePointerDown = (e: PointerEvent) => {
      const anchor = anchorRef.current
      if (
        pickerRef.current &&
        !pickerRef.current.contains(e.target as Node) &&
        anchor &&
        !anchor.contains(e.target as Node)
      ) {
        onClose()
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [isOpen, anchorRef, onClose])

  const handleSelect = useCallback(
    (gif: TenorResult) => {
      onGifSelect(gif.gifUrl)
      onClose()
    },
    [onGifSelect, onClose]
  )

  const noKey = !TENOR_API_KEY

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={pickerRef}
          key="gif-picker"
          initial={{ opacity: 0, scale: 0.93, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93, y: 8 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          style={{
            ...pickerStyle,
            background: 'var(--bg-secondary)',
            borderRadius: 16,
            boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            height: 400,
          }}
        >
          {/* Search bar */}
          <div style={{ padding: '10px 10px 8px', borderBottom: '1px solid var(--separator)', flexShrink: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                background: 'var(--bg-tertiary)',
                borderRadius: 10,
                padding: '7px 10px',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                <circle cx="11" cy="11" r="8" stroke="var(--text-tertiary)" strokeWidth="2" />
                <path d="M21 21l-4.35-4.35" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <input
                ref={searchRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={t('common.gif') + ' ' + t('search.placeholder').toLowerCase()}
                style={{
                  flex: 1,
                  background: 'none',
                  border: 'none',
                  outline: 'none',
                  fontSize: 14,
                  color: 'var(--text-primary)',
                  fontFamily: 'inherit',
                }}
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* GIF grid */}
          <div
            style={{
              flex: 1,
              overflow: 'auto',
              padding: 8,
            }}
          >
            {noKey ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8, padding: 20 }}>
                <span style={{ fontSize: 32 }}>🎬</span>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13, textAlign: 'center', margin: 0 }}>
                  Добавьте VITE_TENOR_API_KEY для поиска GIF
                </p>
              </div>
            ) : loading ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      height: 100,
                      borderRadius: 8,
                      background: 'var(--bg-tertiary)',
                      animation: 'shimmer 1.4s ease-in-out infinite',
                      backgroundSize: '200% 100%',
                    }}
                  />
                ))}
              </div>
            ) : results.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8 }}>
                <span style={{ fontSize: 32 }}>🔍</span>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>{t('search.noResults')}</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {results.map(gif => (
                  <motion.button
                    key={gif.id}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => handleSelect(gif)}
                    style={{
                      padding: 0,
                      border: 'none',
                      borderRadius: 8,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      background: 'var(--bg-tertiary)',
                      aspectRatio: '16/9',
                      display: 'block',
                    }}
                    title={gif.title}
                  >
                    <img
                      src={gif.previewUrl}
                      alt={gif.title}
                      loading="lazy"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                  </motion.button>
                ))}
              </div>
            )}
          </div>

          {/* Tenor attribution */}
          {!noKey && (
            <div
              style={{
                padding: '5px 10px',
                borderTop: '1px solid var(--separator)',
                display: 'flex',
                justifyContent: 'flex-end',
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>Powered by Tenor</span>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
