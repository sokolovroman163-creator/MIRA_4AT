import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { usePWAInstall } from '../../hooks/usePWAInstall'

const DISMISS_KEY = 'mira_ios_guide_dismissed'

export default function IOSInstallGuide() {
  const { t } = useTranslation()
  const { showIOSGuide } = usePWAInstall()
  const [dismissed, setDismissed] = useState(
    () => !!localStorage.getItem(DISMISS_KEY)
  )

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString())
    setDismissed(true)
  }

  const visible = showIOSGuide && !dismissed

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="ios-guide"
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 28 }}
          className="fixed bottom-0 left-0 right-0 z-50"
          style={{
            background: 'var(--glass)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            borderTop: '1px solid var(--separator)',
            paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))',
          }}
        >
          <div className="px-5 pt-4 pb-2">
            {/* Header row */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                  style={{ background: 'var(--accent)' }}
                >
                  M
                </div>
                <div>
                  <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                    {t('pwa.iosGuideTitle')}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    MIRA Messenger
                  </div>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="pressable flex items-center justify-center rounded-full"
                style={{ width: 32, height: 32, color: 'var(--text-secondary)' }}
                aria-label="Close"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Steps */}
            <div
              className="flex items-center gap-2 px-4 py-3 rounded-2xl"
              style={{ background: 'var(--bg-secondary)' }}
            >
              {/* Step 1: Tap Share */}
              <div className="flex flex-col items-center gap-1 flex-1">
                <ShareIcon />
                <span className="text-xs text-center" style={{ color: 'var(--text-secondary)' }}>
                  {t('pwa.iosGuideStep1')}<br />
                  <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                    {t('pwa.iosGuideStep2')}
                  </span>
                </span>
              </div>

              {/* Arrow */}
              <motion.div
                animate={{ x: [0, 4, 0] }}
                transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                style={{ color: 'var(--accent)' }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </motion.div>

              {/* Step 2: Add to Home */}
              <div className="flex flex-col items-center gap-1 flex-1">
                <AddToHomeIcon />
                <span className="text-xs text-center" style={{ color: 'var(--text-secondary)' }}>
                  {t('pwa.iosGuideStep3')}<br />
                  <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                    {t('pwa.iosGuideStep4')}
                  </span>
                </span>
              </div>
            </div>

            {/* Animated arrow pointing to Safari share button */}
            <div className="flex justify-center mt-3">
              <motion.div
                animate={{ y: [0, 5, 0] }}
                transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                style={{ color: 'var(--accent)' }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 4v14M6 14l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function ShareIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect x="4" y="8" width="20" height="16" rx="3" stroke="var(--accent)" strokeWidth="1.6" />
      <path d="M14 4v12M10 8l4-4 4 4" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function AddToHomeIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect x="4" y="4" width="20" height="20" rx="5" stroke="var(--accent)" strokeWidth="1.6" />
      <path d="M14 9v10M9 14h10" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
