import { AnimatePresence, motion } from 'framer-motion'
import { useToasts } from '../../hooks/useToast'

const ICONS = {
  success: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  error: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  info: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 7v5M8 5v0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
}

const COLORS = {
  success: 'var(--accent-secondary)',
  error: 'var(--accent-danger)',
  info: 'var(--accent)',
}

export default function ToastContainer() {
  const { toasts, hide } = useToasts()

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none"
      style={{
        top: 'calc(env(safe-area-inset-top) + 12px)',
        width: 'min(340px, calc(100vw - 32px))',
      }}
    >
      <AnimatePresence initial={false}>
        {toasts.map(t => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            onClick={() => hide(t.id)}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg pointer-events-auto cursor-pointer no-select"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--separator)',
              boxShadow: '0 8px 32px var(--shadow-md)',
            }}
          >
            <span style={{ color: COLORS[t.type], flexShrink: 0 }}>
              {ICONS[t.type]}
            </span>
            <span className="text-sm font-medium flex-1" style={{ color: 'var(--text-primary)' }}>
              {t.message}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
