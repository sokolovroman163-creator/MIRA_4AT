import { memo, useState } from 'react'
import { motion } from 'framer-motion'
import type { LinkPreview } from '../../types'

interface Props {
  preview: LinkPreview
  isOwn: boolean
}

const LinkPreviewCard = memo(function LinkPreviewCard({ preview, isOwn }: Props) {
  const [imgError, setImgError] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)

  const hasImage = !!preview.imageUrl && !imgError

  const handleClick = () => {
    window.open(preview.url, '_blank', 'noopener,noreferrer')
  }

  // Extract domain from URL for display
  const domain = (() => {
    try {
      return preview.siteName || new URL(preview.url).hostname.replace('www.', '')
    } catch {
      return preview.siteName || ''
    }
  })()

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      onClick={handleClick}
      style={{
        marginTop: 6,
        borderRadius: '0 8px 8px 0',
        borderLeft: '3px solid var(--accent)',
        background: isOwn ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'background 0.15s',
        maxWidth: '100%',
      }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      {/* Image preview */}
      {hasImage && (
        <div
          style={{
            position: 'relative',
            width: '100%',
            maxHeight: 160,
            overflow: 'hidden',
            background: 'var(--bg-tertiary)',
          }}
        >
          {!imgLoaded && (
            <div
              style={{
                width: '100%',
                height: 100,
                background: 'var(--bg-tertiary)',
              }}
            />
          )}
          <img
            src={preview.imageUrl}
            alt={preview.title || ''}
            loading="lazy"
            onError={() => setImgError(true)}
            onLoad={() => setImgLoaded(true)}
            style={{
              width: '100%',
              maxHeight: 160,
              objectFit: 'cover',
              display: imgLoaded ? 'block' : 'none',
            }}
          />
        </div>
      )}

      {/* Text content */}
      <div style={{ padding: '8px 10px' }}>
        {/* Site name */}
        {domain && (
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--accent)',
              textTransform: 'uppercase',
              letterSpacing: '0.3px',
              lineHeight: 1.2,
              marginBottom: 2,
            }}
          >
            {domain}
          </div>
        )}

        {/* Title */}
        {preview.title && (
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: isOwn ? 'var(--bubble-out-text)' : 'var(--bubble-in-text)',
              lineHeight: 1.3,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              marginBottom: preview.description ? 2 : 0,
            }}
          >
            {preview.title}
          </div>
        )}

        {/* Description */}
        {preview.description && (
          <div
            style={{
              fontSize: 12,
              color: isOwn ? 'var(--bubble-out-text)' : 'var(--bubble-in-text)',
              opacity: 0.7,
              lineHeight: 1.35,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {preview.description}
          </div>
        )}
      </div>
    </motion.div>
  )
})

export default LinkPreviewCard
