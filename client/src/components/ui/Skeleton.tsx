interface SkeletonProps {
  width?: string | number
  height?: string | number
  rounded?: string
  className?: string
}

export function Skeleton({ width, height = 16, rounded = '8px', className = '' }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width: width ?? '100%',
        height,
        borderRadius: rounded,
        flexShrink: 0,
      }}
    />
  )
}

export function ChatListSkeleton() {
  return (
    <div className="flex flex-col">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <Skeleton width={52} height={52} rounded="50%" />
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex justify-between">
              <Skeleton width="40%" height={14} />
              <Skeleton width={36} height={12} />
            </div>
            <Skeleton width="65%" height={13} />
          </div>
        </div>
      ))}
    </div>
  )
}

export function MessageSkeleton() {
  return (
    <div className="flex flex-col gap-3 px-4 py-4">
      {Array.from({ length: 6 }).map((_, i) => {
        const isOut = i % 3 === 0
        return (
          <div key={i} className={`flex gap-2 ${isOut ? 'flex-row-reverse' : ''}`}>
            {!isOut && <Skeleton width={32} height={32} rounded="50%" />}
            <div className="flex flex-col gap-1 max-w-[60%]">
              <Skeleton
                width={80 + (i % 4) * 40}
                height={38 + (i % 3) * 10}
                rounded="14px"
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
