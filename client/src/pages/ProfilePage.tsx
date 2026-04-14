import { useState, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../store/authStore'
import { usePushNotifications } from '../hooks/usePushNotifications'
import { usePWAInstall } from '../hooks/usePWAInstall'
import { useTheme } from '../hooks/useTheme'
import Avatar from '../components/ui/Avatar'
import { api } from '../services/api'
import i18n from '../i18n'

// ─── Edit Profile Modal ────────────────────────────────────
function EditProfileModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const { t } = useTranslation()
  const { user, updateProfile } = useAuthStore()
  const [name, setName] = useState(user?.displayName ?? '')
  const [bio, setBio] = useState(user?.bio ?? '')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAvatarSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return

    setAvatarFile(file)
    const url = URL.createObjectURL(file)
    setAvatarPreview(url)
  }, [])

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      // Upload avatar if changed
      if (avatarFile) {
        const formData = new FormData()
        formData.append('avatarUrl', avatarFile)
        await api.uploadFile('/api/users/me/avatar', formData)
      }

      // Update name/bio
      await updateProfile({
        displayName: name.trim().slice(0, 50),
        bio: bio.trim().slice(0, 70),
      })

      if (avatarPreview) URL.revokeObjectURL(avatarPreview)
      onClose()
    } catch (err) {
      console.error('[Profile] Save error:', err)
    } finally {
      setIsSaving(false)
    }
  }, [name, bio, avatarFile, avatarPreview, updateProfile, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'var(--overlay)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.94, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-elevated)',
              borderRadius: 20,
              width: '100%',
              maxWidth: 380,
              padding: '24px 20px',
              boxShadow: '0 8px 32px var(--shadow-md)',
            }}
          >
            <h2
              className="font-bold"
              style={{ color: 'var(--text-primary)', fontSize: 18, margin: '0 0 20px', textAlign: 'center' }}
            >
              {t('profile.editProfile')}
            </h2>

            {/* Avatar upload */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  position: 'relative',
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                }}
              >
                <Avatar
                  src={avatarPreview ?? user?.avatarUrl}
                  name={name || user?.displayName || ''}
                  size={80}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    background: 'var(--accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid var(--bg-elevated)',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="13" r="4" stroke="#fff" strokeWidth="2"/>
                  </svg>
                </div>
              </motion.button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAvatarSelect}
              />
            </div>

            {/* Name */}
            <label
              style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}
            >
              {t('profile.name')}
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={50}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid var(--separator)',
                background: 'var(--bg-secondary)',
                fontSize: 15,
                outline: 'none',
                marginBottom: 14,
              }}
              placeholder={t('profile.name')}
            />

            {/* Bio */}
            <label
              style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}
            >
              {t('profile.bio')}
            </label>
            <input
              value={bio}
              onChange={e => setBio(e.target.value)}
              maxLength={70}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid var(--separator)',
                background: 'var(--bg-secondary)',
                fontSize: 15,
                outline: 'none',
                marginBottom: 4,
              }}
              placeholder={t('profile.bio')}
            />
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'right', marginBottom: 20 }}>
              {bio.length}/70
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8 }}>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onClose}
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 12,
                  border: '1px solid var(--separator)',
                  background: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: 15,
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {t('profile.cancel')}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleSave}
                disabled={isSaving || name.trim().length < 2}
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 12,
                  border: 'none',
                  background: name.trim().length >= 2 ? 'var(--accent)' : 'var(--bg-tertiary)',
                  color: name.trim().length >= 2 ? '#fff' : 'var(--text-tertiary)',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: name.trim().length >= 2 ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit',
                  opacity: isSaving ? 0.6 : 1,
                }}
              >
                {isSaving ? t('common.loading') : t('profile.save')}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Language Picker Sheet ──────────────────────────────────
function LanguageSheet({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const { t } = useTranslation()
  const { updateProfile } = useAuthStore()
  const currentLang = i18n.language?.startsWith('ru') ? 'ru' : 'en'

  const handleChange = useCallback(async (lang: 'ru' | 'en') => {
    await i18n.changeLanguage(lang)
    await updateProfile({ language: lang })
    onClose()
  }, [updateProfile, onClose])

  const langs: Array<{ code: 'ru' | 'en'; label: string; flag: string }> = [
    { code: 'ru', label: 'Русский', flag: '🇷🇺' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'var(--overlay)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-elevated)',
              borderRadius: '20px 20px 0 0',
              width: '100%',
              maxWidth: 420,
              padding: '20px 16px',
              paddingBottom: `calc(20px + env(safe-area-inset-bottom))`,
            }}
          >
            <div
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                background: 'var(--bg-tertiary)',
                margin: '0 auto 16px',
              }}
            />
            <h3
              className="font-semibold"
              style={{ color: 'var(--text-primary)', fontSize: 17, margin: '0 0 12px', textAlign: 'center' }}
            >
              {t('settings.language')}
            </h3>
            {langs.map(lang => (
              <motion.button
                key={lang.code}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleChange(lang.code)}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: currentLang === lang.code ? 'rgba(0,122,255,0.08)' : 'none',
                  border: 'none',
                  borderRadius: 12,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  fontFamily: 'inherit',
                  marginBottom: 4,
                }}
              >
                <span style={{ fontSize: 22 }}>{lang.flag}</span>
                <span style={{ flex: 1, fontSize: 16, color: 'var(--text-primary)', textAlign: 'left' }}>
                  {lang.label}
                </span>
                {currentLang === lang.code && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M20 6L9 17l-5-5" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </motion.button>
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Privacy Sheet ──────────────────────────────────────────
function PrivacySheet({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const { t } = useTranslation()
  // For now, last seen privacy is a local setting
  const [lastSeen, setLastSeen] = useState<'everyone' | 'nobody'>(
    () => (localStorage.getItem('mira_last_seen') as 'everyone' | 'nobody') || 'everyone'
  )

  const handleChange = useCallback((val: 'everyone' | 'nobody') => {
    localStorage.setItem('mira_last_seen', val)
    setLastSeen(val)
    onClose()
  }, [onClose])

  const options = [
    { value: 'everyone' as const, label: t('settings.lastSeenEveryone') },
    { value: 'nobody' as const, label: t('settings.lastSeenNobody') },
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'var(--overlay)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-elevated)',
              borderRadius: '20px 20px 0 0',
              width: '100%',
              maxWidth: 420,
              padding: '20px 16px',
              paddingBottom: `calc(20px + env(safe-area-inset-bottom))`,
            }}
          >
            <div
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                background: 'var(--bg-tertiary)',
                margin: '0 auto 16px',
              }}
            />
            <h3
              className="font-semibold"
              style={{ color: 'var(--text-primary)', fontSize: 17, margin: '0 0 4px', textAlign: 'center' }}
            >
              {t('settings.lastSeen')}
            </h3>
            <p
              style={{ color: 'var(--text-secondary)', fontSize: 13, textAlign: 'center', margin: '0 0 12px' }}
            >
              {t('settings.privacy')}
            </p>
            {options.map(opt => (
              <motion.button
                key={opt.value}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleChange(opt.value)}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: lastSeen === opt.value ? 'rgba(0,122,255,0.08)' : 'none',
                  border: 'none',
                  borderRadius: 12,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  fontFamily: 'inherit',
                  marginBottom: 4,
                }}
              >
                <span style={{ flex: 1, fontSize: 16, color: 'var(--text-primary)', textAlign: 'left' }}>
                  {opt.label}
                </span>
                {lastSeen === opt.value && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M20 6L9 17l-5-5" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </motion.button>
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Main Page ──────────────────────────────────────────────
export default function ProfilePage() {
  const { t } = useTranslation()
  const { user, logout } = useAuthStore()
  const { theme, changeTheme: setTheme } = useTheme()
  const { permission, isSubscribed, subscribe, unsubscribe, isLoading: pushLoading } = usePushNotifications()
  const { canInstall, isInstalled, promptInstall } = usePWAInstall()

  const [editOpen, setEditOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const [privacyOpen, setPrivacyOpen] = useState(false)

  const currentLang = i18n.language?.startsWith('ru') ? 'Русский' : 'English'

  const themeOptions: Array<{ value: 'light' | 'dark' | 'system'; label: string }> = [
    { value: 'light', label: t('settings.themeLight') },
    { value: 'dark', label: t('settings.themeDark') },
    { value: 'system', label: t('settings.themeSystem') },
  ]

  // Notification status text
  const notifStatus = (() => {
    if (permission === 'unsupported') return t('settings.notificationsUnsupported')
    if (permission === 'denied') return t('settings.notificationsDenied')
    if (isSubscribed) return t('settings.notificationsEnabled')
    return t('settings.notificationsDisabled')
  })()

  const handleNotifToggle = async () => {
    if (pushLoading) return
    if (isSubscribed) {
      await unsubscribe()
    } else {
      await subscribe()
    }
  }

  const handleClearCache = async () => {
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map(k => caches.delete(k)))
    }
    localStorage.removeItem('mira_install_dismissed')
    window.location.reload()
  }

  return (
    <div
      className="flex flex-col h-full scroll-container"
      style={{ background: 'var(--bg-secondary)' }}
    >
      {/* Header */}
      <div
        style={{
          paddingTop: `calc(12px + env(safe-area-inset-top))`,
          paddingLeft: 16,
          paddingRight: 16,
          paddingBottom: 16,
          flexShrink: 0,
        }}
      >
        <h1
          className="font-bold"
          style={{ color: 'var(--text-primary)', fontSize: 22, letterSpacing: '-0.3px' }}
        >
          {t('profile.title')}
        </h1>
      </div>

      {/* User card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{
          margin: '0 12px 12px',
          borderRadius: 16,
          background: 'var(--bg-elevated)',
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          boxShadow: '0 1px 4px var(--shadow)',
        }}
      >
        <Avatar
          src={user?.avatarUrl}
          name={user?.displayName ?? ''}
          size={56}
          online={true}
        />
        <div className="flex-1 min-w-0">
          <div
            className="font-semibold truncate"
            style={{ color: 'var(--text-primary)', fontSize: 17, marginBottom: 2 }}
          >
            {user?.displayName || t('common.loading')}
          </div>
          <div
            className="truncate text-sm"
            style={{ color: 'var(--text-secondary)' }}
          >
            {user?.email}
          </div>
          {user?.bio && (
            <div
              className="truncate text-xs"
              style={{ color: 'var(--text-tertiary)', marginTop: 2 }}
            >
              {user.bio}
            </div>
          )}
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setEditOpen(true)}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'var(--bg-secondary)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
          aria-label={t('profile.editProfile')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.button>
      </motion.div>

      {/* Settings sections */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px' }}>

        {/* Appearance */}
        <SectionLabel label={t('settings.theme')} />
        <div
          style={{
            borderRadius: 14,
            background: 'var(--bg-elevated)',
            overflow: 'hidden',
            boxShadow: '0 1px 4px var(--shadow)',
            marginBottom: 12,
          }}
        >
          <div style={{ display: 'flex', padding: '6px' }}>
            {themeOptions.map(opt => (
              <motion.button
                key={opt.value}
                whileTap={{ scale: 0.96 }}
                onClick={() => setTheme(opt.value)}
                style={{
                  flex: 1,
                  height: 36,
                  borderRadius: 10,
                  border: 'none',
                  background: theme === opt.value ? 'var(--accent)' : 'transparent',
                  color: theme === opt.value ? '#fff' : 'var(--text-secondary)',
                  fontSize: 13,
                  fontWeight: theme === opt.value ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'background 0.2s, color 0.2s',
                  fontFamily: 'inherit',
                }}
              >
                {opt.label}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Settings rows */}
        <SectionLabel label={t('settings.title')} />
        <div
          style={{
            borderRadius: 14,
            background: 'var(--bg-elevated)',
            overflow: 'hidden',
            boxShadow: '0 1px 4px var(--shadow)',
            marginBottom: 12,
          }}
        >
          {/* Notifications */}
          <SettingsRow
            icon={<NotifIcon />}
            label={t('settings.notifications')}
            value={notifStatus}
            onClick={handleNotifToggle}
            toggle={permission !== 'unsupported' && permission !== 'denied'}
            toggleOn={isSubscribed}
            loading={pushLoading}
          />
          <div style={{ height: 1, background: 'var(--separator)', marginLeft: 52 }} />

          {/* Privacy */}
          <SettingsRow
            icon={<PrivacyIcon />}
            label={t('settings.privacy')}
            onClick={() => setPrivacyOpen(true)}
          />
          <div style={{ height: 1, background: 'var(--separator)', marginLeft: 52 }} />

          {/* Language */}
          <SettingsRow
            icon={<LangIcon />}
            label={t('settings.language')}
            value={currentLang}
            onClick={() => setLangOpen(true)}
          />
        </div>

        {/* PWA Install + Cache */}
        {(canInstall || !isInstalled) && (
          <>
            <SectionLabel label={t('pwa.installBanner')} />
            <div
              style={{
                borderRadius: 14,
                background: 'var(--bg-elevated)',
                overflow: 'hidden',
                boxShadow: '0 1px 4px var(--shadow)',
                marginBottom: 12,
              }}
            >
              {canInstall && (
                <>
                  <SettingsRow
                    icon={<InstallIcon />}
                    label={t('settings.installApp')}
                    onClick={promptInstall}
                  />
                  <div style={{ height: 1, background: 'var(--separator)', marginLeft: 52 }} />
                </>
              )}
              <SettingsRow
                icon={<CacheIcon />}
                label={t('settings.clearCache')}
                onClick={handleClearCache}
              />
            </div>
          </>
        )}

        {/* Version */}
        <div style={{ textAlign: 'center', padding: '8px 0 4px', marginBottom: 4 }}>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            {t('settings.version')} 1.0.0
          </span>
        </div>

        {/* Logout */}
        <div
          style={{
            borderRadius: 14,
            background: 'var(--bg-elevated)',
            overflow: 'hidden',
            boxShadow: '0 1px 4px var(--shadow)',
            marginBottom: 32,
          }}
        >
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => logout()}
            style={{
              width: '100%',
              padding: '14px 16px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              fontFamily: 'inherit',
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'rgba(255,59,48,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="var(--accent-danger)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="16 17 21 12 16 7" stroke="var(--accent-danger)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="21" y1="12" x2="9" y2="12" stroke="var(--accent-danger)" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </div>
            <span style={{ color: 'var(--accent-danger)', fontSize: 16, fontWeight: 500 }}>
              {t('auth.logout')}
            </span>
          </motion.button>
        </div>
      </div>

      {/* Modals */}
      <EditProfileModal isOpen={editOpen} onClose={() => setEditOpen(false)} />
      <LanguageSheet isOpen={langOpen} onClose={() => setLangOpen(false)} />
      <PrivacySheet isOpen={privacyOpen} onClose={() => setPrivacyOpen(false)} />
    </div>
  )
}

// ─── Helper components ──────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <div
      style={{
        paddingLeft: 6,
        paddingBottom: 6,
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--text-secondary)',
        textTransform: 'uppercase',
        letterSpacing: '0.4px',
      }}
    >
      {label}
    </div>
  )
}

function SettingsRow({
  icon,
  label,
  value,
  onClick,
  toggle,
  toggleOn,
  loading,
}: {
  icon: React.ReactNode
  label: string
  value?: string
  onClick?: () => void
  toggle?: boolean
  toggleOn?: boolean
  loading?: boolean
}) {
  return (
    <motion.button
      whileTap={{ opacity: 0.6 }}
      onClick={onClick}
      style={{
        width: '100%',
        padding: '12px 16px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        fontFamily: 'inherit',
        textAlign: 'left',
        opacity: loading ? 0.6 : 1,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: 'rgba(0,122,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <span style={{ flex: 1, color: 'var(--text-primary)', fontSize: 16 }}>{label}</span>
      {value && !toggle && (
        <span style={{ color: 'var(--text-secondary)', fontSize: 14, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
      )}
      {toggle ? (
        <div
          style={{
            width: 50,
            height: 30,
            borderRadius: 15,
            background: toggleOn ? 'var(--accent-secondary)' : 'var(--bg-tertiary)',
            position: 'relative',
            transition: 'background 0.25s',
            flexShrink: 0,
          }}
        >
          <motion.div
            animate={{ x: toggleOn ? 22 : 2 }}
            transition={{ type: 'spring', damping: 20, stiffness: 400 }}
            style={{
              width: 26,
              height: 26,
              borderRadius: 13,
              background: '#fff',
              position: 'absolute',
              top: 2,
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }}
          />
        </div>
      ) : (
        <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
          <path d="M1 1l5 5-5 5" stroke="var(--text-tertiary)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </motion.button>
  )
}

function NotifIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M18 8A6 6 0 106 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M13.73 21a2 2 0 01-3.46 0" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function PrivacyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="11" width="18" height="11" rx="2" stroke="var(--accent)" strokeWidth="1.8"/>
      <path d="M7 11V7a5 5 0 0110 0v4" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function LangIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="var(--accent)" strokeWidth="1.8"/>
      <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}

function InstallIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="7 10 12 15 17 10" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="12" y1="15" x2="12" y2="3" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}

function CacheIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <polyline points="1 4 1 10 7 10" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3.51 15a9 9 0 102.13-9.36L1 10" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
