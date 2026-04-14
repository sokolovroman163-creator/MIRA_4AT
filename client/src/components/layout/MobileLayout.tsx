import { useRef, useEffect, useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import ChatsPage from '../../pages/ChatsPage'
import ChatPage from '../../pages/ChatPage'
import SearchPage from '../../pages/SearchPage'
import ProfilePage from '../../pages/ProfilePage'
import BottomTabBar from './BottomTabBar'

// Route depth: deeper = slide in from right
const routeDepth: Record<string, number> = {
  '/': 0,
  '/search': 0,
  '/profile': 0,
}

function getDepth(pathname: string): number {
  if (pathname.startsWith('/chat/')) return 1
  return routeDepth[pathname] ?? 0
}

export default function MobileLayout() {
  const location = useLocation()
  const prevDepthRef = useRef(getDepth(location.pathname))
  const currentDepth = getDepth(location.pathname)
  const [goingDeeper, setGoingDeeper] = useState(false)

  // Determine direction: going deeper = slide right→left; going back = left→right
  useEffect(() => {
    setGoingDeeper(currentDepth > prevDepthRef.current)
    prevDepthRef.current = currentDepth
  }, [currentDepth])

  const isInChat = location.pathname.startsWith('/chat/')

  const variants = {
    initial: (deeper: boolean) => ({
      x: deeper ? '100%' : '-25%',
      opacity: deeper ? 1 : 0.6,
    }),
    animate: {
      x: 0,
      opacity: 1,
    },
    exit: (deeper: boolean) => ({
      x: deeper ? '-25%' : '100%',
      opacity: deeper ? 0.6 : 1,
    }),
  }

  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{ height: '100dvh', width: '100vw', background: 'var(--bg-primary)' }}
    >
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait" initial={false} custom={goingDeeper}>
          <motion.div
            key={location.pathname}
            className="absolute inset-0 flex flex-col"
            custom={goingDeeper}
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ type: 'spring', stiffness: 320, damping: 32, mass: 0.9 }}
            style={{ background: 'var(--bg-primary)' }}
          >
            <Routes location={location}>
              <Route path="/" element={<ChatsPage />} />
              <Route path="/chat/:id" element={<ChatPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom tab bar — hidden when in chat */}
      <AnimatePresence initial={false}>
        {!isInChat && (
          <motion.div
            key="tab-bar"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 360, damping: 34 }}
            style={{ flexShrink: 0 }}
          >
            <BottomTabBar />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
