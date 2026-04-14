import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'

const tabs = [
  {
    path: '/',
    labelKey: 'chats.title',
    end: true,
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M20 2H4C2.9 2 2 2.9 2 4v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"
          fill={active ? 'var(--accent)' : 'none'}
          stroke={active ? 'var(--accent)' : 'var(--text-secondary)'}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    path: '/search',
    labelKey: 'search.title',
    end: false,
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle
          cx="11" cy="11" r="7"
          stroke={active ? 'var(--accent)' : 'var(--text-secondary)'}
          strokeWidth="1.8"
        />
        <path
          d="M16.5 16.5L21 21"
          stroke={active ? 'var(--accent)' : 'var(--text-secondary)'}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    path: '/profile',
    labelKey: 'profile.title',
    end: false,
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle
          cx="12" cy="8" r="4"
          fill={active ? 'var(--accent)' : 'none'}
          stroke={active ? 'var(--accent)' : 'var(--text-secondary)'}
          strokeWidth="1.8"
        />
        <path
          d="M4 20c0-4 3.6-7 8-7s8 3 8 7"
          stroke={active ? 'var(--accent)' : 'var(--text-secondary)'}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
]

export default function BottomTabBar() {
  const { t } = useTranslation()

  return (
    <nav
      className="flex items-stretch justify-around no-select"
      style={{
        background: 'var(--glass)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderTop: '1px solid var(--separator)',
        height: `calc(var(--tab-bar-height) + env(safe-area-inset-bottom))`,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {tabs.map(tab => (
        <NavLink
          key={tab.path}
          to={tab.path}
          end={tab.end}
          className="flex flex-col items-center justify-center gap-1 flex-1"
          style={{ textDecoration: 'none', position: 'relative', minHeight: 44 }}
        >
          {({ isActive }) => (
            <>
              {/* Active background pill */}
              {isActive && (
                <motion.div
                  layoutId="bottom-tab-active"
                  style={{
                    position: 'absolute',
                    inset: '4px 8px',
                    borderRadius: 12,
                    background: 'rgba(var(--accent-rgb, 0,122,255), 0.1)',
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <motion.div
                animate={{ scale: isActive ? 1.05 : 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                style={{ position: 'relative', zIndex: 1 }}
              >
                {tab.icon(isActive)}
              </motion.div>
              <span
                className="text-xs font-medium"
                style={{
                  color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                  position: 'relative',
                  zIndex: 1,
                  lineHeight: 1,
                }}
              >
                {t(tab.labelKey)}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
