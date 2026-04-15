import { useEffect, useCallback, useRef, memo } from 'react'
import { List, useListRef, useDynamicRowHeight, type ListProps } from 'react-window'
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
  items: ListItem[]
  currentUserId: string | undefined
  isGroup: boolean
  onContextMenu: (e: React.MouseEvent, message: Message) => void
}

interface VirtualizedMessageListProps {
  items: ListItem[]
  currentUserId: string | undefined
  isGroup: boolean
  onContextMenu: (e: React.MouseEvent, message: Message) => void
  onLoadMore: () => void
  isLoadingMore: boolean
  hasMore: boolean
  /** Height of the container */
  height: number
  /** Width of the container */
  width: number
}

// ─── Default estimated height ───────────────────────────────
const DEFAULT_ROW_HEIGHT = 52

// ─── Row component ──────────────────────────────────────────
const Row = memo(function Row({
  index,
  style,
  items,
  currentUserId,
  isGroup,
  onContextMenu,
}: {
  index: number
  style: React.CSSProperties
  ariaAttributes: {
    'aria-posinset': number
    'aria-setsize': number
    role: 'listitem'
  }
  items: ListItem[]
  currentUserId: string | undefined
  isGroup: boolean
  onContextMenu: (e: React.MouseEvent, message: Message) => void
}) {
  const item = items[index]

  if (item.kind === 'divider') {
    return (
      <div style={style} data-row-index={index}>
        <DateDivider date={item.date} />
      </div>
    )
  }

  const { message, isFirstInGroup, isLastInGroup } = item
  const isOwn = message.senderId === currentUserId
  const showSender = isGroup && !isOwn

  return (
    <div style={style} data-row-index={index}>
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

// ─── Main component ─────────────────────────────────────────
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
}: VirtualizedMessageListProps) {
  const listRef = useListRef(null)
  const prevItemsLengthRef = useRef(0)
  // Track whether the user is near the bottom so we can auto-scroll
  const isNearBottomRef = useRef(true)

  const dynamicRowHeight = useDynamicRowHeight({
    defaultRowHeight: DEFAULT_ROW_HEIGHT,
    key: items.length,
  })

  const scrollToBottom = useCallback(() => {
    if (items.length === 0) return
    const index = items.length - 1
    // Use a small delay to ensure the DOM has updated and layout is stable
    setTimeout(() => {
      listRef.current?.scrollToItem(index, 'end')
      // Second pass for dynamic heights
      setTimeout(() => {
        listRef.current?.scrollToItem(index, 'end')
      }, 100)
    }, 50)
  }, [items.length, listRef])

  // Scroll to bottom on initial load & new messages
  useEffect(() => {
    const prevLen = prevItemsLengthRef.current
    prevItemsLengthRef.current = items.length

    if (items.length === 0) return

    if (prevLen === 0 && items.length > 0) {
      // Initial load — always scroll to bottom
      scrollToBottom()
      return
    }

    // New message(s) appended at the end (not history prepend)
    if (items.length > prevLen) {
      const newCount = items.length - prevLen
      // Only auto-scroll for 1–3 new messages at a time (not bulk history loads)
      if (newCount > 5) return

      const lastItem = items[items.length - 1]
      if (lastItem.kind !== 'message') return

      const isOwn = lastItem.message.senderId === currentUserId

      // Always scroll if it's our own message OR user was already near bottom
      if (isOwn || isNearBottomRef.current) {
        scrollToBottom()
      }
    }
  }, [items.length, currentUserId, items, scrollToBottom])

  // Intercept native scroll to track if user is near the bottom
  const handleScrollNative = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
      isNearBottomRef.current = distanceFromBottom < 120
    },
    []
  )

  // Handle visible rows change for load more (when near top)
  const handleRowsRendered = useCallback(
    (visibleRows: { startIndex: number; stopIndex: number }) => {
      if (visibleRows.startIndex <= 2 && hasMore && !isLoadingMore) {
        onLoadMore()
      }
    },
    [hasMore, isLoadingMore, onLoadMore]
  )

  const rowProps: RowProps = {
    items,
    currentUserId,
    isGroup,
    onContextMenu,
  }

  return (
    <List<RowProps>
      key={`list_${items.length > 0 ? items[0].key : 'empty'}`} // help stability
      listRef={listRef}
      rowCount={items.length}
      rowHeight={dynamicRowHeight}
      rowComponent={Row as ListProps<RowProps>['rowComponent']}
      rowProps={rowProps}
      onRowsRendered={handleRowsRendered}
      onScroll={handleScrollNative}
      overscanCount={10}
      style={{
        height,
        width,
        overscrollBehavior: 'contain',
        WebkitOverflowScrolling: 'touch',
      }}
    />
  )
}
