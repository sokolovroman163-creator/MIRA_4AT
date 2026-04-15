import { useEffect, useCallback, useRef, memo } from 'react'
import { List, useListRef, useDynamicRowHeight } from 'react-window'
import type { Message } from '../../types'
import MessageBubble from './MessageBubble'
import DateDivider from './DateDivider'

// ─── Types ──────────────────────────────────────────────────
export type ListItem =
  | { kind: 'divider'; date: Date; key: string }
  | {
      kind: 'message'
      message: Message
      isFirstInGroup: boolean
      isLastInGroup: boolean
      key: string
    }

interface RowProps {
  index: number
  style: React.CSSProperties
  data: {
    items: ListItem[]
    currentUserId: string | undefined
    isGroup: boolean
    onContextMenu: (e: React.MouseEvent, message: Message) => void
  }
}

interface VirtualizedMessageListProps {
  items: ListItem[]
  currentUserId: string | undefined
  isGroup: boolean
  onContextMenu: (e: React.MouseEvent, message: Message) => void
  onLoadMore: () => void
  isLoadingMore: boolean
  hasMore: boolean
  height: number
  width: number
  chatId: string
}
const DEFAULT_ROW_HEIGHT = 52

const Row = memo(function Row({
  index,
  style,
  items,
  currentUserId,
  isGroup,
  onContextMenu,
}: any) {
  const item = items[index]
  if (!item) return null

  if (item.kind === 'divider') {
    return (
      <div style={style}>
        <DateDivider date={item.date} />
      </div>
    )
  }

  const { message, isFirstInGroup, isLastInGroup } = item
  const isOwn = message.senderId === currentUserId
  const showSender = isGroup && !isOwn

  return (
    <div style={style}>
      <MessageBubble
        message={message}
        isOwn={isOwn}
        showSender={showSender}
        senderName={message.sender?.displayName}
        senderAvatarUrl={message.sender?.avatarUrl}
        isFirstInGroup={isFirstInGroup}
        isLastInGroup={isLastInGroup}
        onContextMenu={onContextMenu}
      />
    </div>
  )
})

export default function VirtualizedMessageList({
  items,
  currentUserId,
  isGroup,
  onContextMenu,
  onLoadMore,
  isLoadingMore,
  hasMore,
  height,
  width,
  chatId,
}: VirtualizedMessageListProps) {
  const listRef = useListRef(null)
  const prevItemsLengthRef = useRef(0)
  const isNearBottomRef = useRef(true)

  const dynamicRowHeight = useDynamicRowHeight({
    defaultRowHeight: DEFAULT_ROW_HEIGHT,
    key: `${chatId}-${items.length}`,
  })

  const scrollToBottom = useCallback(() => {
    if (items.length === 0) return
    const list = listRef.current
    if (!list) return

    const index = items.length - 1

    const performScroll = () => {
      // В v2 метод называется scrollToRow и принимает объект
      if (typeof list.scrollToRow === 'function') {
        list.scrollToRow({
          index,
          align: 'end',
          behavior: 'instant'
        })
      }
      
      // На всякий случай дублируем через DOM
      const outer = list.element || list._outerRef
      if (outer) {
        outer.scrollTop = outer.scrollHeight + 1000
      }
    }

    performScroll()
    setTimeout(performScroll, 50)
    setTimeout(performScroll, 300)
  }, [items.length, listRef])

  // При смене чата
  useEffect(() => {
    prevItemsLengthRef.current = items.length
    if (items.length > 0) {
      scrollToBottom()
    }
  }, [chatId]) 

  // При новых сообщениях
  useEffect(() => {
    const prevLen = prevItemsLengthRef.current
    prevItemsLengthRef.current = items.length

    if (items.length > prevLen && prevLen > 0) {
      const lastItem = items[items.length - 1]
      const isOwn = lastItem.kind === 'message' && lastItem.message.senderId === currentUserId
      
      if (isOwn || isNearBottomRef.current) {
        scrollToBottom()
      }
    }
  }, [items.length, currentUserId, scrollToBottom])

  const handleScroll = useCallback(({ scrollDirection, scrollOffset, scrollUpdateWasRequested }: any) => {
    if (scrollUpdateWasRequested) return
    
    if (scrollOffset < 300 && hasMore && !isLoadingMore && scrollDirection === 'backward') {
      onLoadMore()
    }

    const list = listRef.current
    const outer = list?.element || list?._outerRef
    if (outer) {
      const distanceFromBottom = outer.scrollHeight - outer.scrollTop - outer.clientHeight
      isNearBottomRef.current = distanceFromBottom < 150
    }
  }, [hasMore, isLoadingMore, onLoadMore])

  const rowProps = {
    items,
    currentUserId,
    isGroup,
    onContextMenu,
  }

  return (
    <List
      listRef={listRef} // В v2 используется именно этот проп
      height={height}
      width={width}
      rowCount={items.length}
      rowHeight={dynamicRowHeight}
      rowComponent={Row}
      rowProps={rowProps}
      onScroll={handleScroll}
      overscanCount={10}
      style={{
        overscrollBehavior: 'contain',
        WebkitOverflowScrolling: 'touch',
      }}
    />
  )
}
