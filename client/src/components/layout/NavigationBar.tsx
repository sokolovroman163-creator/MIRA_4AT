import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import Avatar from '../ui/Avatar'

interface NavigationBarProps {
  title: string
  subtitle?: string
  avatarUrl?: string
  avatarName?: string
  isOnline?: boolean
  isTyping?: boolean
  onInfoClick?: () => void
  /** Render custom right-side actions */
  rightActions?: React.ReactNode
}

export default function NavigationBar({
  title,
  subtitle,
  avatarUrl,
  avatarName,
  isOnline,
  isTyping,
  onInfoClick,
  rightActions,
}: NavigationBarProps) {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const subtitleText = isTyping
    ? t('chats.typing')
    : subtitle ?? (isOnline ? t('common.online') : undefined)

  return (
    <header
      className="flex items-center gap-2 no-select"
      style={{
        position: 'relative',
        zIndex: 10,
        height: `calc(var(--nav-height) + env(safe-area-inset-top))`,
        paddingTop: 'env(safe-area-inset-top)',
        paddingLeft: 4,
        paddingRight: 4,
        flexShrink: 0,
        background: 'var(--glass)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderBottom: '1px solid var(--separator)',
      }}
    >
      {/* Back button */}
      <motion.button
        whileTap={{ scale: 0.88 }}
        onClick={() => navigate(-1)}
        className="flex items-center justify-center pressable"
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          flexShrink: 0,
        }}
        aria-label={t('common.back')}
      >
        <svg width="10" height="17" viewBox="0 0 10 17" fill="none">
          <path
            d="M8.5 1.5L1.5 8.5L8.5 15.5"
            stroke="var(--accent)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </motion.button>

      {/* Avatar + title — clickable for info */}
      <button
        onClick={onInfoClick}
        disabled={!onInfoClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flex: 1,
          minWidth: 0,
          background: 'none',
          border: 'none',
          cursor: onInfoClick ? 'pointer' : 'default',
          padding: '4px 0',
          textAlign: 'left',
          borderRadius: 8,
        }}
      >
        <Avatar
          src={avatarUrl}
          name={avatarName ?? title}
          size={36}
          online={isOnline}
        />

        <div className="flex-1 min-w-0">
          <div
            className="font-semibold truncate"
            style={{ color: 'var(--text-primary)', fontSize: 16, lineHeight: 1.2 }}
          >
            {title}
          </div>

          {subtitleText && (
            <div
              className="text-xs truncate flex items-center gap-1"
              style={{
                color: isTyping ? 'var(--accent)' : 'var(--text-secondary)',
                lineHeight: 1.3,
              }}
            >
              {isTyping && <TypingDots />}
              {!isTyping && subtitleText}
            </div>
          )}
        </div>
      </button>

      {/* Right side actions */}
      {rightActions ?? (
        onInfoClick ? (
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={onInfoClick}
            className="flex items-center justify-center pressable"
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              flexShrink: 0,
            }}
            aria-label="Info"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="var(--accent)" strokeWidth="1.8" />
              <path
                d="M12 8v0M12 11v5"
                stroke="var(--accent)"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </motion.button>
        ) : (
          <div style={{ width: 44 }} />
        )
      )}
    </header>
  )
}

function TypingDots() {
  return (
    <span className="flex items-center gap-0.5" style={{ marginRight: 4 }}>
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          animate={{ y: [0, -3, 0] }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
          style={{
            display: 'inline-block',
            width: 4,
            height: 4,
            borderRadius: '50%',
            background: 'var(--accent)',
          }}
        />
      ))}
    </span>
  )
}
