import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useNetworkStatus } from '../../hooks/useNetworkStatus'
import { useEffect, useState, useRef } from 'react'

export default function NetworkBanner() {
  const { isOnline } = useNetworkStatus()
  const { t } = useTranslation()
  const wasOfflineRef = useRef(false)
  const [showOnline, setShowOnline] = useState(false)

  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true
      setShowOnline(false)
    } else if (wasOfflineRef.current) {
      setShowOnline(true)
      wasOfflineRef.current = false
      const timer = setTimeout(() => {
        setShowOnline(false)
      }, 2500)
      return () => clearTimeout(timer)
    }
  }, [isOnline])

  return (
    <AnimatePresence>
      {(!isOnline || showOnline) && (
        <motion.div
          key={isOnline ? 'online' : 'offline'}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="overflow-hidden flex-shrink-0"
          style={{ zIndex: 200 }}
        >
          <div
            className="flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium text-white"
            style={{
              background: isOnline ? 'var(--accent-secondary)' : '#636366',
              paddingTop: isOnline ? '0.5rem' : 'calc(0.5rem + env(safe-area-inset-top))',
            }}
          >
            {isOnline ? (
              <>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7l3.5 3.5L12 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t('common.online')}
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="6" stroke="white" strokeWidth="1.5" />
                  <path d="M7 4v4M7 10v0" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                {t('common.noConnection')}
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
