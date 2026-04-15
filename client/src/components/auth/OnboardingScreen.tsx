import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../store/authStore'
import { api } from '../../services/api'

interface OnboardingScreenProps {
  onComplete: () => void
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const { t } = useTranslation()
  const { user, updateProfile } = useAuthStore()
  const [step, setStep] = useState<'name' | 'avatar'>('name')
  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatarUrl ?? null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const trimmedName = displayName.trim()
  const isNameValid = trimmedName.length >= 2

  const handleNameNext = () => {
    if (!isNameValid) return
    setStep('avatar')
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setError(t('onboarding.avatarTooLarge', 'Файл слишком большой. Максимум 5 МБ.'))
      return
    }
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
    setError(null)
  }

  const handleComplete = async () => {
    if (isLoading) return
    console.log('[Onboarding] Starting complete process. avatarFile:', avatarFile?.name)
    setIsLoading(true)
    setError(null)
    try {
      let newAvatarUrl = undefined
      // Upload avatar if selected
      if (avatarFile) {
        console.log('[Onboarding] Uploading avatar...')
        const formData = new FormData()
        formData.append('avatar', avatarFile)
        const res = await api.uploadFile<{ avatarUrl: string }>('/api/users/me/avatar', formData)
        newAvatarUrl = res.avatarUrl
        console.log('[Onboarding] Avatar uploaded successfully')
      }

      console.log('[Onboarding] Updating profile displayName:', trimmedName)
      await updateProfile({ 
        displayName: trimmedName,
        ...(newAvatarUrl ? { avatarUrl: newAvatarUrl } : {})
      })
      console.log('[Onboarding] Profile updated successfully')
      
      onComplete()
    } catch (err) {
      console.error('[Onboarding] Complete error:', err)
      setError(t('common.error'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleSkipAvatar = async () => {
    if (isLoading) return
    console.log('[Onboarding] Skipping avatar step')
    setIsLoading(true)
    setError(null)
    try {
      console.log('[Onboarding] Updating profile displayName (skip avatar):', trimmedName)
      await updateProfile({ displayName: trimmedName })
      console.log('[Onboarding] Profile updated successfully (skip avatar)')
      onComplete()
    } catch (err) {
      console.error('[Onboarding] Skip error:', err)
      setError(t('common.error'))
    } finally {
      setIsLoading(false)
    }
  }

  // Initials fallback for avatar preview
  const initials = trimmedName
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const avatarColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
    '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43',
  ]
  const colorIndex = trimmedName.charCodeAt(0) % avatarColors.length
  const avatarBg = avatarColors[colorIndex] ?? '#007AFF'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
        padding: '24px 16px',
      }}
    >
      {/* Progress dots */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 40 }}>
        {(['name', 'avatar'] as const).map(s => (
          <motion.div
            key={s}
            animate={{
              width: step === s ? 24 : 8,
              background: step === s ? 'var(--accent)' : 'var(--separator)',
            }}
            transition={{ duration: 0.3 }}
            style={{ height: 8, borderRadius: 4 }}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 'name' && (
          <motion.div
            key="name-step"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="glass"
            style={{
              width: 'min(380px, calc(100vw - 32px))',
              borderRadius: 28,
              padding: '40px 32px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0,
            }}
          >
            {/* Icon */}
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 20,
                background: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 24,
                boxShadow: '0 8px 24px rgba(0,122,255,0.3)',
              }}
            >
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                <path d="M18 8C14.686 8 12 10.686 12 14C12 17.314 14.686 20 18 20C21.314 20 24 17.314 24 14C24 10.686 21.314 8 18 8Z" fill="white"/>
                <path d="M8 30C8 24.477 12.477 20 18 20C23.523 20 28 24.477 28 30" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </div>

            <h2 style={{ color: 'var(--text-primary)', fontSize: 24, fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>
              {t('auth.onboardingTitle')}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 28, textAlign: 'center' }}>
              {t('auth.onboardingSubtitle')}
            </p>

            {/* Name input */}
            <div style={{ width: '100%', marginBottom: 20 }}>
              <input
                type="text"
                autoFocus
                placeholder={t('auth.onboardingName')}
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && isNameValid) handleNameNext() }}
                maxLength={50}
                style={{
                  width: '100%',
                  height: 52,
                  borderRadius: 14,
                  border: '1.5px solid var(--separator)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: 16,
                  padding: '0 16px',
                  outline: 'none',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--separator)' }}
              />
              <div style={{ marginTop: 6, textAlign: 'right', fontSize: 12, color: 'var(--text-tertiary)' }}>
                {displayName.length}/50
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleNameNext}
              disabled={!isNameValid}
              style={{
                width: '100%',
                height: 52,
                borderRadius: 16,
                border: 'none',
                background: isNameValid ? 'var(--accent)' : 'var(--separator)',
                color: isNameValid ? '#fff' : 'var(--text-tertiary)',
                fontSize: 16,
                fontWeight: 600,
                cursor: isNameValid ? 'pointer' : 'not-allowed',
                transition: 'background 0.2s, color 0.2s',
                fontFamily: 'inherit',
              }}
            >
              {t('auth.onboardingContinue')}
            </motion.button>
          </motion.div>
        )}

        {step === 'avatar' && (
          <motion.div
            key="avatar-step"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="glass"
            style={{
              width: 'min(380px, calc(100vw - 32px))',
              borderRadius: 28,
              padding: '40px 32px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0,
            }}
          >
            <h2 style={{ color: 'var(--text-primary)', fontSize: 24, fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>
              {t('onboarding.avatarTitle', 'Добавьте фото')}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 28, textAlign: 'center' }}>
              {t('onboarding.avatarSubtitle', 'Необязательно, можно пропустить')}
            </p>

            {/* Avatar picker */}
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => fileInputRef.current?.click()}
              style={{
                position: 'relative',
                width: 110,
                height: 110,
                borderRadius: '50%',
                overflow: 'hidden',
                border: '3px solid var(--accent)',
                background: avatarBg,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
                flexShrink: 0,
              }}
            >
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="avatar"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span style={{ color: '#fff', fontSize: 36, fontWeight: 700, lineHeight: 1 }}>
                  {initials || '?'}
                </span>
              )}

              {/* Overlay camera icon */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0,0,0,0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0,
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.opacity = '1' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.opacity = '0' }}
              >
                <CameraIcon />
              </div>
            </motion.button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: 'none' }}
              onChange={handleAvatarChange}
            />

            <p style={{ color: 'var(--text-tertiary)', fontSize: 13, marginBottom: 28 }}>
              {t('profile.changeAvatar')} · JPG, PNG, WebP
            </p>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{
                    marginBottom: 16,
                    padding: '10px 14px',
                    borderRadius: 12,
                    background: 'rgba(255,59,48,0.12)',
                    color: 'var(--accent-danger)',
                    fontSize: 14,
                    width: '100%',
                    textAlign: 'center',
                  }}
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleComplete}
                disabled={isLoading}
                style={{
                  width: '100%',
                  height: 52,
                  borderRadius: 16,
                  border: 'none',
                  background: 'var(--accent)',
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  fontFamily: 'inherit',
                }}
              >
                {isLoading ? (
                  <>
                    <div
                      className="animate-spin rounded-full border-2 border-t-transparent"
                      style={{ width: 18, height: 18, borderColor: '#fff', borderTopColor: 'transparent' }}
                    />
                    {t('common.loading')}
                  </>
                ) : (
                  t('onboarding.letsGo', 'Начать!')
                )}
              </motion.button>

              <button
                onClick={handleSkipAvatar}
                disabled={isLoading}
                style={{
                  width: '100%',
                  height: 44,
                  borderRadius: 14,
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  fontSize: 15,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {t('onboarding.skip', 'Пропустить')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function CameraIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path
        d="M4 9.5C4 8.67 4.67 8 5.5 8H7l2-3h6l2 3h1.5C19.33 8 20 8.67 20 9.5v11c0 .83-.67 1.5-1.5 1.5h-13C4.67 22 4 21.33 4 20.5v-11z"
        stroke="white" strokeWidth="1.8" strokeLinejoin="round"
      />
      <circle cx="12" cy="15" r="3" stroke="white" strokeWidth="1.8"/>
    </svg>
  )
}
