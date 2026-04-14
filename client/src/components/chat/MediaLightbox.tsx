import { useEffect, useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  src: string
  alt?: string
  isOpen: boolean
  onClose: () => void
}

export default function MediaLightbox({ src, alt, isOpen, onClose }: Props) {
  const [scale, setScale] = useState(1)

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose]
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    } else {
      // Reset scale when closing
      setScale(1)
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, handleKeyDown])

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose()
    },
    [onClose]
  )

  const zoomIn = () => setScale(s => Math.min(s + 0.5, 4))
  const zoomOut = () => setScale(s => Math.max(s - 0.5, 0.5))
  const resetZoom = () => setScale(1)

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="lightbox-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleOverlayClick}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            // Support safe areas
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 'calc(16px + env(safe-area-inset-top))',
              right: 'calc(16px + env(safe-area-inset-right))',
              width: 40,
              height: 40,
              borderRadius: 20,
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1001,
            }}
            aria-label="Закрыть"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M18 6L6 18M6 6l12 12"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>

          {/* Zoom controls */}
          <div
            style={{
              position: 'absolute',
              bottom: 'calc(24px + env(safe-area-inset-bottom))',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: 10,
              zIndex: 1001,
            }}
          >
            <button
              onClick={zoomOut}
              disabled={scale <= 0.5}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                cursor: scale <= 0.5 ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: scale <= 0.5 ? 0.4 : 1,
              }}
              aria-label="Уменьшить"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="8" stroke="white" strokeWidth="2" />
                <path d="M21 21l-4.35-4.35M8 11h6" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>

            <button
              onClick={resetZoom}
              style={{
                height: 40,
                padding: '0 14px',
                borderRadius: 20,
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                cursor: 'pointer',
                color: 'white',
                fontSize: 13,
                fontWeight: 600,
                minWidth: 52,
              }}
              aria-label="Сбросить масштаб"
            >
              {Math.round(scale * 100)}%
            </button>

            <button
              onClick={zoomIn}
              disabled={scale >= 4}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                cursor: scale >= 4 ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: scale >= 4 ? 0.4 : 1,
              }}
              aria-label="Увеличить"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="8" stroke="white" strokeWidth="2" />
                <path d="M21 21l-4.35-4.35M11 8v6M8 11h6" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Image */}
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'auto',
              maxWidth: '90vw',
              maxHeight: '80vh',
            }}
          >
            {src ? (
              <img
                src={src}
                alt={alt ?? 'Image'}
                draggable={false}
                style={{
                  maxWidth: '90vw',
                  maxHeight: '80vh',
                  objectFit: 'contain',
                  borderRadius: 8,
                  transform: `scale(${scale})`,
                  transformOrigin: 'center',
                  transition: 'transform 0.2s ease',
                  userSelect: 'none',
                }}
              />
            ) : (
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
                Изображение недоступно
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
