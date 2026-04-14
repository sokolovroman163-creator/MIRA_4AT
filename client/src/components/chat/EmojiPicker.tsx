import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Picker from '@emoji-mart/react'
import data from '@emoji-mart/data'
import { useTranslation } from 'react-i18next'

interface Props {
  isOpen: boolean
  /** The element that triggered the picker — used to position it */
  anchorRef: React.RefObject<HTMLElement | null>
  onEmojiSelect: (emoji: string) => void
  onClose: () => void
}

export default function EmojiPicker({ isOpen, anchorRef, onEmojiSelect, onClose }: Props) {
  const { i18n } = useTranslation()
  const pickerRef = useRef<HTMLDivElement>(null)
  const [pickerStyle, setPickerStyle] = useState<React.CSSProperties>({ bottom: 64, left: 0 })

  // Compute position when picker opens
  useEffect(() => {
    if (!isOpen) return
    const anchor = anchorRef.current
    if (!anchor) {
      setPickerStyle({ bottom: 64, left: 0 })
      return
    }
    const rect = anchor.getBoundingClientRect()
    const pickerWidth = 352
    const pickerHeight = 435
    let left = rect.left
    if (left + pickerWidth > window.innerWidth - 8) left = window.innerWidth - pickerWidth - 8
    if (left < 8) left = 8
    const top = rect.top - pickerHeight - 8
    const finalTop = top < 8 ? rect.bottom + 8 : top
    setPickerStyle({ position: 'fixed', top: finalTop, left, zIndex: 900, width: pickerWidth })
  }, [isOpen, anchorRef])

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (e: PointerEvent) => {
      const anchor = anchorRef.current
      if (
        pickerRef.current &&
        !pickerRef.current.contains(e.target as Node) &&
        anchor &&
        !anchor.contains(e.target as Node)
      ) {
        onClose()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [isOpen, anchorRef, onClose])

  // emoji-mart locale mapping
  const locale = i18n.language === 'ru' ? 'ru' : 'en'

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={pickerRef}
          key="emoji-picker"
          initial={{ opacity: 0, scale: 0.93, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93, y: 8 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          style={{
            ...pickerStyle,
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
          }}
        >
          <Picker
            data={data}
            locale={locale}
            theme="auto"
            set="native"
            skinTonePosition="search"
            previewPosition="none"
            onEmojiSelect={(emoji: { native: string }) => {
              onEmojiSelect(emoji.native)
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
