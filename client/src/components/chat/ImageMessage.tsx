import { useState } from 'react'
import { motion } from 'framer-motion'

interface Props {
  src: string
  /** Alt text / caption */
  alt?: string
  /** Called when user clicks to open lightbox */
  onExpand: () => void
}

export default function ImageMessage({ src, alt, onExpand }: Props) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  if (!src || error) {
    return (
      <div
        style={{
          width: 220,
          height: 140,
          borderRadius: 12,
          background: 'var(--bg-tertiary)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          cursor: 'default',
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
            stroke="var(--text-tertiary)"
            strokeWidth="1.6"
          />
          <line x1="3" y1="3" x2="21" y2="21" stroke="var(--text-tertiary)" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Не удалось загрузить</span>
      </div>
    )
  }

  return (
    <motion.div
      onClick={onExpand}
      whileTap={{ scale: 0.97 }}
      style={{
        position: 'relative',
        borderRadius: 12,
        overflow: 'hidden',
        cursor: 'pointer',
        maxWidth: 280,
        minWidth: 120,
        minHeight: loaded ? 'auto' : 160,
        background: 'var(--bg-tertiary)',
        display: 'inline-block',
      }}
    >
      {/* Skeleton shimmer while loading */}
      {!loaded && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, var(--bg-tertiary) 25%, var(--separator) 50%, var(--bg-tertiary) 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.4s ease-in-out infinite',
          }}
        />
      )}

      <img
        src={src}
        alt={alt ?? 'Image'}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        draggable={false}
        style={{
          display: 'block',
          maxWidth: '100%',
          maxHeight: 340,
          objectFit: 'cover',
          borderRadius: 12,
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.2s ease',
        }}
      />

      {/* Expand icon overlay on hover */}
      {loaded && (
        <div
          style={{
            position: 'absolute',
            bottom: 6,
            right: 6,
            width: 26,
            height: 26,
            borderRadius: 8,
            background: 'rgba(0,0,0,0.42)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path
              d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}
    </motion.div>
  )
}
