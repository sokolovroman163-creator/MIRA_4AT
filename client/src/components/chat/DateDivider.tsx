import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { isToday, isYesterday, format } from 'date-fns'
import { ru, enUS } from 'date-fns/locale'

interface Props {
  date: Date
}

const DateDivider = memo(function DateDivider({ date }: Props) {
  const { i18n, t } = useTranslation()
  const locale = i18n.language === 'ru' ? ru : enUS

  let label: string
  if (!date || isNaN(date.getTime())) {
    label = '—'
  } else if (isToday(date)) {
    label = t('common.today')
  } else if (isYesterday(date)) {
    label = t('common.yesterday')
  } else {
    label = format(date, 'd MMMM yyyy', { locale })
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px 16px',
      }}
    >
      <div
        style={{
          background: 'var(--bg-tertiary)',
          color: 'var(--text-secondary)',
          fontSize: 12,
          fontWeight: 500,
          borderRadius: 10,
          padding: '3px 10px',
          letterSpacing: '0.1px',
        }}
      >
        {label}
      </div>
    </div>
  )
})

export default DateDivider
