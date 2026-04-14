import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children: ReactNode
  fullWidth?: boolean
}

const variantStyles: Record<string, { bg: string; color: string; border?: string }> = {
  primary: { bg: 'var(--accent)', color: '#fff' },
  secondary: { bg: 'var(--bg-secondary)', color: 'var(--text-primary)' },
  ghost: { bg: 'transparent', color: 'var(--accent)' },
  danger: { bg: 'var(--accent-danger)', color: '#fff' },
}

const sizeStyles = {
  sm: { padding: '6px 14px', fontSize: 13, borderRadius: 10, height: 32 },
  md: { padding: '9px 20px', fontSize: 15, borderRadius: 12, height: 44 },
  lg: { padding: '12px 28px', fontSize: 17, borderRadius: 14, height: 52 },
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  fullWidth = false,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const vs = variantStyles[variant]
  const ss = sizeStyles[size]

  return (
    <button
      disabled={disabled || loading}
      style={{
        background: vs.bg,
        color: vs.color,
        border: vs.border ?? 'none',
        padding: ss.padding,
        fontSize: ss.fontSize,
        borderRadius: ss.borderRadius,
        height: ss.height,
        width: fullWidth ? '100%' : undefined,
        fontWeight: 600,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.6 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        transition: 'opacity 0.15s, transform 0.1s',
        flexShrink: 0,
        fontFamily: 'inherit',
        ...style,
      }}
      onMouseDown={e => {
        if (!disabled && !loading) {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)'
        }
      }}
      onMouseUp={e => {
        (e.currentTarget as HTMLButtonElement).style.transform = ''
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.transform = ''
      }}
      {...props}
    >
      {loading ? (
        <>
          <div
            className="animate-spin rounded-full border-2 border-t-transparent"
            style={{
              width: ss.height * 0.4,
              height: ss.height * 0.4,
              borderColor: vs.color,
              borderTopColor: 'transparent',
            }}
          />
          {children}
        </>
      ) : (
        children
      )}
    </button>
  )
}
