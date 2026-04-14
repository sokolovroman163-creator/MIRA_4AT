import { useState } from 'react'

interface AvatarProps {
  src?: string
  name?: string
  size?: number
  online?: boolean
  className?: string
}

function stringToColor(str: string): string {
  const colors = [
    '#FF6B6B', '#FF8E53', '#FFA07A', '#FFD700',
    '#98FB98', '#00CED1', '#4169E1', '#9370DB',
    '#FF69B4', '#20B2AA', '#87CEEB', '#DDA0DD',
  ]
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export default function Avatar({ src, name = '', size = 40, online, className = '' }: AvatarProps) {
  const [imgError, setImgError] = useState(false)
  const bgColor = stringToColor(name || 'User')
  const initials = getInitials(name || 'U')

  return (
    <div
      className={`relative flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {src && !imgError ? (
        <img
          src={src}
          alt={name}
          className="avatar w-full h-full"
          style={{ width: size, height: size }}
          onError={() => setImgError(true)}
        />
      ) : (
        <div
          className="avatar flex items-center justify-center text-white font-semibold no-select w-full h-full"
          style={{
            background: bgColor,
            fontSize: size * 0.38,
            width: size,
            height: size,
          }}
        >
          {initials}
        </div>
      )}

      {/* Online indicator */}
      {online && (
        <div
          className="absolute bottom-0 right-0 online-dot"
          style={{
            width: Math.max(8, size * 0.28),
            height: Math.max(8, size * 0.28),
            borderWidth: size > 32 ? 2 : 1.5,
          }}
        />
      )}
    </div>
  )
}
