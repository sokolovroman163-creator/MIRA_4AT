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

  const dynamicRowHeight = useDynamicRowHeight({
    defaultRowHeight: DEFAULT_ROW_HEIGHT,
    key: items.length, // reset measurements when items change drastically
  })

  // Scroll to bottom on initial load & new messages at the end
  useEffect(() => {
    const prevLen = prevItemsLengthRef.current
    prevItemsLengthRef.current = items.length

    if (items.length === 0) return

    // New messages added at end (not history prepend)
    if (items.length > prevLen && prevLen > 0) {
      const lastItem = items[items.length - 1]
      if (lastItem.kind === 'message') {
        // Only auto-scroll if it's our own message
        if (lastItem.message.senderId === currentUserId) {
          requestAnimationFrame(() => {
            listRef.current?.scrollToRow({ index: items.length - 1, align: 'end' })
          })
        }
      }
    } else if (prevLen === 0 && items.length > 0) {
      // Initial load — scroll to bottom
      requestAnimationFrame(() => {
        listRef.current?.scrollToRow({ index: items.length - 1, align: 'end' })
      })
    }
  }, [items.length, currentUserId, items, listRef])

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
      listRef={listRef}
      rowCount={items.length}
      rowHeight={dynamicRowHeight}
      rowComponent={Row as ListProps<RowProps>["rowComponent"]}
      rowProps={rowProps}
      onRowsRendered={handleRowsRendered}
      overscanCount={8}
      style={{
        height,
        width,
        overscrollBehavior: 'contain',
        WebkitOverflowScrolling: 'touch',
      }}
    />
  )
}
