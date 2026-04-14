import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../store/authStore'

// Pre-generate floating dots at module level (pure, runs once)
const FLOATING_DOTS = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 6 + 3,
  opacity: Math.random() * 0.25 + 0.05,
  duration: Math.random() * 12 + 8,
}))

export default function LoginPage() {
  const { t } = useTranslation()
  const { loginWithGoogle, isLoading } = useAuthStore()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async () => {
    setError(null)
    try {
      await loginWithGoogle()
      navigate('/', { replace: true })
    } catch (err: unknown) {
      // Ignore popup-closed-by-user
      if (err && typeof err === 'object' && 'code' in err) {
        const code = (err as { code: string }).code
        if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
          return
        }
      }
      setError(t('auth.loginError'))
    }
  }

  return (
    <div
      className="relative flex flex-col items-center justify-center overflow-hidden"
      style={{
        height: '100dvh',
        background: 'var(--bg-primary)',
      }}
    >
      {/* Ambient gradient blobs */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
      >
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.7, 0.5] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            top: '-20%',
            left: '-20%',
            width: '70%',
            height: '70%',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(var(--accent-rgb, 0,122,255), 0.18) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.6, 0.4] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
          style={{
            position: 'absolute',
            bottom: '-10%',
            right: '-15%',
            width: '60%',
            height: '60%',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(var(--accent-rgb, 0,122,255), 0.12) 0%, transparent 70%)',
            filter: 'blur(50px)',
          }}
        />

        {/* Floating dots */}
        {FLOATING_DOTS.map(dot => (
          <motion.div
            key={dot.id}
            animate={{
              y: [0, -30, 0],
              x: [0, dot.id % 2 === 0 ? 15 : -15, 0],
              opacity: [dot.opacity, dot.opacity * 1.8, dot.opacity],
            }}
            transition={{
              duration: dot.duration,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: dot.id * 0.4,
            }}
            style={{
              position: 'absolute',
              left: `${dot.x}%`,
              top: `${dot.y}%`,
              width: dot.size,
              height: dot.size,
              borderRadius: '50%',
              background: 'var(--accent)',
              opacity: dot.opacity,
            }}
          />
        ))}
      </div>

      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="glass"
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '48px 40px',
          borderRadius: 28,
          width: 'min(380px, calc(100vw - 32px))',
          boxShadow: '0 24px 60px rgba(0,0,0,0.12)',
        }}
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{
            width: 80,
            height: 80,
            borderRadius: 24,
            background: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
            boxShadow: '0 8px 24px rgba(var(--accent-rgb, 0,122,255), 0.4)',
          }}
        >
          <MiraLogo />
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.4 }}
          style={{
            color: 'var(--text-primary)',
            fontSize: 32,
            fontWeight: 700,
            letterSpacing: '-0.5px',
            marginBottom: 8,
          }}
        >
          {t('auth.loginTitle')}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, duration: 0.4 }}
          style={{
            color: 'var(--text-secondary)',
            fontSize: 15,
            textAlign: 'center',
            marginBottom: 36,
            lineHeight: 1.5,
          }}
        >
          {t('auth.loginSubtitle')}
        </motion.p>

        {/* Google Sign-in button */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleLogin}
          disabled={isLoading}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            width: '100%',
            height: 52,
            borderRadius: 16,
            border: '1.5px solid var(--separator)',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            fontSize: 16,
            fontWeight: 600,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.7 : 1,
            transition: 'background 0.15s, border-color 0.15s',
            fontFamily: 'inherit',
          }}
          onMouseEnter={e => {
            if (!isLoading) {
              (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-tertiary)'
              ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)'
            }
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-secondary)'
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--separator)'
          }}
        >
          {isLoading ? (
            <>
              <div
                className="animate-spin rounded-full border-2 border-t-transparent"
                style={{ width: 20, height: 20, borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
              />
              <span>{t('auth.loginLoading')}</span>
            </>
          ) : (
            <>
              <GoogleIcon />
              <span>{t('auth.loginGoogle')}</span>
            </>
          )}
        </motion.button>

        {/* Error message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              style={{
                marginTop: 16,
                padding: '10px 14px',
                borderRadius: 12,
                background: 'rgba(var(--danger-rgb, 255,59,48), 0.12)',
                color: 'var(--accent-danger)',
                fontSize: 14,
                textAlign: 'center',
                width: '100%',
              }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Privacy note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          style={{
            marginTop: 24,
            color: 'var(--text-tertiary)',
            fontSize: 12,
            textAlign: 'center',
            lineHeight: 1.5,
          }}
        >
          {t('auth.privacyNote', 'Нажимая «Войти», вы соглашаетесь с условиями использования')}
        </motion.p>
      </motion.div>
    </div>
  )
}

function MiraLogo() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
      {/* Stylized "M" with speech bubble hint */}
      <path
        d="M10 32V14L22 26L34 14V32"
        stroke="white"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}
