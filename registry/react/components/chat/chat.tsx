"use client"

// Ported from boot-ui. Built-in SVG paths from Lucide (ISC).
import * as React from "react"
import { cn } from "@/lib/utils"
import { prefersReducedMotion } from "@/lib/app-shell-utils"
import { assignRef } from "@/lib/refs"

export type ChatStatus = "sending" | "sent" | "delivered" | "read" | "failed"

export type ChatLabels = Record<ChatStatus | "retry", string>

export const DEFAULT_LABELS: ChatLabels = {
  sending: "Sending",
  sent: "Sent",
  delivered: "Delivered",
  read: "Read",
  failed: "Not sent",
  retry: "Retry",
}

export const ChatLabelsContext = React.createContext<ChatLabels>(DEFAULT_LABELS)

export interface ChatProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Words for delivery states and "Retry" (translate them here). */
  labels?: Partial<ChatLabels>
}

export const Chat = React.forwardRef<HTMLDivElement, ChatProps>(({ labels, className, ...props }, ref) => {
  const merged = React.useMemo(() => ({ ...DEFAULT_LABELS, ...labels }), [labels])
  return (
    <ChatLabelsContext.Provider value={merged}>
      <div ref={ref} className={cn("sheen-chat", className)} {...props} />
    </ChatLabelsContext.Provider>
  )
})

Chat.displayName = "Chat"

export interface ChatMessagesProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Label for the "jump to latest" button. */
  jumpLabel?: string
}

export const ChatMessages = React.forwardRef<HTMLDivElement, ChatMessagesProps>(
  ({ jumpLabel = "New messages", className, children, ...props }, ref) => {
    const scrollRef = React.useRef<HTMLDivElement | null>(null)
    const atBottom = React.useRef(true)
    const [unseen, setUnseen] = React.useState(false)

    const toBottom = React.useCallback((smooth: boolean) => {
      const el = scrollRef.current
      if (!el) return
      const reduce = prefersReducedMotion()
      el.scrollTo({ top: el.scrollHeight, behavior: smooth && !reduce ? "smooth" : "auto" })
    }, [])

    // Start at the newest message.
    React.useLayoutEffect(() => toBottom(false), [toBottom])

    // New content: follow it if the reader was at the bottom, otherwise offer a jump.
    React.useEffect(() => {
      const el = scrollRef.current
      if (!el) return
      const observer = new MutationObserver(() => {
        if (atBottom.current) toBottom(true)
        else setUnseen(true)
      })
      observer.observe(el, { childList: true, subtree: true, characterData: true })
      return () => observer.disconnect()
    }, [toBottom])

    return (
      <div className="sheen-chat-messages-wrap">
        <div
          ref={(node) => {
            scrollRef.current = node
            assignRef(ref, node)
          }}
          className={cn("sheen-chat-messages", className)}
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          tabIndex={0}
          onScroll={(event) => {
            const el = event.currentTarget
            atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48
            if (atBottom.current) setUnseen(false)
          }}
          {...props}
        >
          {children}
        </div>
        <button
          type="button"
          className="sheen-chat-jump"
          data-visible={unseen ? "" : undefined}
          tabIndex={unseen ? 0 : -1}
          aria-hidden={!unseen}
          onClick={() => {
            toBottom(true)
            setUnseen(false)
          }}
        >
          {jumpLabel}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        </button>
      </div>
    )
  },
)

ChatMessages.displayName = "ChatMessages"

export const ChatDaySeparator = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("sheen-chat-day", className)} role="separator" {...props} />
)

export interface ChatMessageGroupProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** "self" sits at the end in the accent colour; "other" at the start. */
  from: "self" | "other"
  name?: React.ReactNode
  avatar?: React.ReactNode
  time?: React.ReactNode
}

export const ChatMessageGroup = React.forwardRef<HTMLDivElement, ChatMessageGroupProps>(
  ({ from, name, avatar, time, className, children, ...props }, ref) => (
    <div ref={ref} className={cn("sheen-chat-group", className)} data-from={from} {...props}>
      {from === "other" && <div className="sheen-chat-avatar">{avatar}</div>}
      <div className="sheen-chat-stack">
        {(name || time) && (
          <div className="sheen-chat-meta">
            {name && <span className="sheen-chat-name">{name}</span>}
            {time && <span className="sheen-chat-time">{time}</span>}
          </div>
        )}
        {children}
      </div>
    </div>
  ),
)

ChatMessageGroup.displayName = "ChatMessageGroup"

export const StatusIcon = ({ status }: { status: ChatStatus }) => {
  if (status === "sending")
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v4l2.5 2" />
      </svg>
    )
  if (status === "failed")
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v6M12 16.5v.01" />
      </svg>
    )
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={status === "sent" ? "m5 12 4.5 4.5L19 7" : "m2 12 4.5 4.5L16 7M10.5 15.5l1 1L21 7"} />
    </svg>
  )
}

export interface ChatBubbleProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Delivery state of your own message, shown under the bubble. */
  status?: ChatStatus
  /** Called from the "Retry" link of a failed message. */
  onRetry?: () => void
  /** Small chips under the bubble, e.g. reactions. */
  footer?: React.ReactNode
}

export const ChatBubble = React.forwardRef<HTMLDivElement, ChatBubbleProps>(({ status, onRetry, footer, className, children, ...props }, ref) => {
  const labels = React.useContext(ChatLabelsContext)
  return (
    <div className="sheen-chat-row" data-status={status}>
      <div ref={ref} className={cn("sheen-chat-bubble", className)} dir="auto" {...props}>
        {children}
      </div>
      {footer && <div className="sheen-chat-bubble-footer">{footer}</div>}
      {status && (
        <div className="sheen-chat-status" data-status={status}>
          <StatusIcon status={status} />
          <span>{labels[status]}</span>
          {status === "failed" && onRetry && (
            <button type="button" onClick={onRetry}>
              {labels.retry}
            </button>
          )}
        </div>
      )}
    </div>
  )
})

ChatBubble.displayName = "ChatBubble"

export const ChatTyping = ({
  name,
  avatar,
  label,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { name?: React.ReactNode; avatar?: React.ReactNode; label?: React.ReactNode }) => (
  <div className={cn("sheen-chat-group sheen-chat-typing", className)} data-from="other" {...props}>
    <div className="sheen-chat-avatar">{avatar}</div>
    <div className="sheen-chat-stack">
      <div className="sheen-chat-row">
        <div
          className="sheen-chat-bubble"
          aria-label={typeof label === "string" ? label : `${typeof name === "string" ? name : "Someone"} is typing`}
          role="status"
        >
          <span className="sheen-chat-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </div>
      </div>
    </div>
  </div>
)
export type { ChatComposerProps } from "./chat-composer"
export { ChatComposer } from "./chat-composer"
