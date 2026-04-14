import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { usePWAInstall } from '../../hooks/usePWAInstall'
import { useState, useRef, useEffect } from 'react'

export default function InstallBanner() {
  const { t } = useTranslation()
  const { canInstall, isInstalled, promptInstall, dismissBanner } = usePWAInstall()
  const [showInstalled, setShowInstalled] = useState(false)
  const prevInstalled = useRef(isInstalled)

  // Show "installed" toast when PWA gets installed
  useEffect(() => {
    if (isInstalled && !prevInstalled.current) {
      setShowInstalled(true)
      const timer = setTimeout(() => setShowInstalled(false), 3000)
      prevInstalled.current = isInstalled
      return () => clearTimeout(timer)
    }
    prevInstalled.current = isInstalled
  }, [isInstalled])

  const handleInstall = async () => {
    await promptInstall()
    setShowInstalled(true)
    setTimeout(() => setShowInstalled(false), 3000)
  }

  return (
    <>
      {/* Install banner */}
      <AnimatePresence>
        {canInstall && (
          <motion.div
            key="install-banner"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-50 flex items-center gap-3 p-4"
            style={{
              background: 'var(--glass)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              borderTop: '1px solid var(--separator)',
              paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))',
            }}
          >
            {/* App icon */}
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0 shadow-md"
              style={{ background: 'var(--accent)' }}
            >
              M
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                MIRA Messenger
              </div>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {t('pwa.installBanner')}
              </div>
            </div>

            {/* Dismiss */}
            <button
              onClick={dismissBanner}
              className="pressable flex items-center justify-center rounded-full"
              style={{ width: 32, height: 32, color: 'var(--text-secondary)' }}
              aria-label="Dismiss"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>

            {/* Install button */}
            <button
              onClick={handleInstall}
              className="pressable px-4 py-2 rounded-xl text-white text-sm font-semibold flex-shrink-0"
              style={{ background: 'var(--accent)' }}
            >
              {t('pwa.installButton')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* "Installed" toast */}
      <AnimatePresence>
        {showInstalled && (
          <motion.div
            key="installed-toast"
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed top-4 left-1/2 z-50 -translate-x-1/2 px-5 py-3 rounded-2xl shadow-lg text-white text-sm font-medium"
            style={{
              background: 'var(--accent-secondary)',
              marginTop: 'env(safe-area-inset-top)',
            }}
          >
            {t('pwa.installed')}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
