import { Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import ChatsPage from '../../pages/ChatsPage'
import ChatPage from '../../pages/ChatPage'
import SearchPage from '../../pages/SearchPage'
import ProfilePage from '../../pages/ProfilePage'
import Avatar from '../ui/Avatar'
import { useAuthStore } from '../../store/authStore'

const sidebarTabs = [
  {
    path: '/',
    labelKey: 'chats.title',
    end: true,
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
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
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
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
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
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

export default function DesktopLayout() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const location = useLocation()
  const isInChat = location.pathname.startsWith('/chat/')

  return (
    <div
      className="flex overflow-hidden"
      style={{ height: '100dvh', width: '100vw', background: 'var(--bg-primary)' }}
    >
      {/* Sidebar */}
      <div
        className="flex flex-col h-full"
        style={{
          width: 'var(--sidebar-width)',
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--separator)',
          flexShrink: 0,
        }}
      >
        {/* Sidebar top: user avatar + app name */}
        <div
          className="flex items-center gap-3 no-select"
          style={{
            paddingTop: `calc(12px + env(safe-area-inset-top))`,
            paddingLeft: 16,
            paddingRight: 16,
            paddingBottom: 12,
            borderBottom: '1px solid var(--separator)',
            flexShrink: 0,
          }}
        >
          <Avatar
            src={user?.avatarUrl}
            name={user?.displayName ?? ''}
            size={36}
            online={user?.isOnline}
          />
          <div className="flex-1 min-w-0">
            <div
              className="font-semibold truncate text-sm"
              style={{ color: 'var(--text-primary)' }}
            >
              {user?.displayName ?? 'MIRA'}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {user?.email ?? ''}
            </div>
          </div>
        </div>

        {/* Sidebar content */}
        <div className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/" element={<ChatsPage />} />
            <Route path="/chat/:id" element={<ChatsPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>

        {/* Sidebar bottom nav */}
        <nav
          className="flex items-center justify-around border-t no-select"
          style={{
            borderColor: 'var(--separator)',
            paddingBottom: `calc(8px + env(safe-area-inset-bottom))`,
            paddingTop: 8,
            flexShrink: 0,
            background: 'var(--bg-secondary)',
          }}
        >
          {sidebarTabs.map(tab => (
            <NavLink
              key={tab.path}
              to={tab.path}
              end={tab.end}
              style={{ textDecoration: 'none', flex: 1 }}
            >
              {({ isActive }) => (
                <div
                  className="flex flex-col items-center gap-1"
                  style={{ position: 'relative', padding: '6px 0' }}
                >
                  {/* Active indicator dot */}
                  {isActive && (
                    <motion.div
                      layoutId="desktop-tab-indicator"
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 4,
                        height: 4,
                        borderRadius: '50%',
                        background: 'var(--accent)',
                      }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  {tab.icon(isActive)}
                  <span
                    className="text-xs font-medium"
                    style={{ color: isActive ? 'var(--accent)' : 'var(--text-secondary)' }}
                  >
                    {t(tab.labelKey)}
                  </span>
                </div>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Main chat area */}
      <div
        className="flex-1 flex flex-col overflow-hidden"
        style={{ background: 'var(--bg-primary)' }}
      >
        <Routes>
          <Route path="/chat/:id" element={<ChatPage />} />
          <Route
            path="*"
            element={
              isInChat ? null : <DesktopEmptyState />
            }
          />
        </Routes>
      </div>
    </div>
  )
}

function DesktopEmptyState() {
  const { t } = useTranslation()
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex flex-col items-center justify-center h-full gap-5"
      style={{ color: 'var(--text-secondary)', userSelect: 'none' }}
    >
      {/* Logo */}
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 20,
          background: 'var(--accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(0,122,255,0.25)',
          opacity: 0.9,
        }}
      >
        <svg width="40" height="40" viewBox="0 0 44 44" fill="none">
          <path
            d="M10 32V14L22 26L34 14V32"
            stroke="white"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div style={{ textAlign: 'center' }}>
        <div
          className="text-xl font-semibold"
          style={{ color: 'var(--text-primary)', marginBottom: 6 }}
        >
          MIRA
        </div>
        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {t('desktop.selectChat', { defaultValue: 'Выберите чат чтобы начать общение' })}
        </div>
      </div>
    </motion.div>
  )
}
