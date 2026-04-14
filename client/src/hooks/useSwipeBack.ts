import { useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

interface UseSwipeBackOptions {
  enabled?: boolean
  threshold?: number
  onSwipeBack?: () => void
}

export function useSwipeBack({ enabled = true, threshold = 80, onSwipeBack }: UseSwipeBackOptions = {}): void {
  const navigate = useNavigate()
  const touchStartX = useRef<number>(0)
  const touchStartY = useRef<number>(0)

  const handleBack = useCallback(() => {
    if (onSwipeBack) {
      onSwipeBack()
    } else {
      navigate(-1)
    }
  }, [navigate, onSwipeBack])

  useEffect(() => {
    if (!enabled) return

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX
      touchStartY.current = e.touches[0].clientY
    }

    const handleTouchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - touchStartX.current
      const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current)

      // Swipe right from left edge (first 30px) or just swipe right with dx > threshold
      const fromLeftEdge = touchStartX.current < 30
      const isHorizontalSwipe = dy < 60

      if (isHorizontalSwipe && dx > threshold && fromLeftEdge) {
        handleBack()
      }
    }

    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [enabled, threshold, handleBack])
}
