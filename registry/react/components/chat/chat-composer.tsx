"use client"

// Ported from boot-ui. Built-in SVG paths from Lucide (ISC).
import * as React from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { assignRef } from "@/lib/refs"

export interface ChatComposerProps extends Omit<React.FormHTMLAttributes<HTMLFormElement>, "onSubmit" | "onChange"> {
  onSend: (text: string) => void
  placeholder?: string
  /** Controlled text. */
  value?: string
  onValueChange?: (value: string) => void
  disabled?: boolean
  /** Buttons before the text field (attach, emoji…). */
  actions?: React.ReactNode
  /** Rows the field grows to before it scrolls. */
  maxRows?: number
  sendLabel?: string
}

export const SendIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
)

export const ChatComposer = React.forwardRef<HTMLTextAreaElement, ChatComposerProps>(
  (
    {
      onSend,
      placeholder = "Message",
      value: valueProp,
      onValueChange,
      disabled,
      actions,
      maxRows = 6,
      sendLabel = "Send",
      className,
      ...props
    },
    ref,
  ) => {
    const [uncontrolled, setUncontrolled] = React.useState("")
    const value = valueProp ?? uncontrolled
    const setValue = (next: string) => {
      if (valueProp === undefined) setUncontrolled(next)
      onValueChange?.(next)
    }
    const fieldRef = React.useRef<HTMLTextAreaElement | null>(null)
    const empty = !value.trim()

    // Grow with the text; CSS caps it at maxRows (--sheen-chat-rows), then it scrolls.
    React.useLayoutEffect(() => {
      const field = fieldRef.current
      if (!field) return
      field.style.height = "auto"
      field.style.height = `${field.scrollHeight + 2}px` // + borders
    }, [value])

    const send = () => {
      if (empty || disabled) return
      onSend(value.trim())
      setValue("")
      fieldRef.current?.focus()
    }

    return (
      <form
        className={cn("sheen-chat-composer", className)}
        data-disabled={disabled ? "" : undefined}
        onSubmit={(event) => {
          event.preventDefault()
          send()
        }}
        {...props}
      >
        {actions && <div className="sheen-chat-composer-actions">{actions}</div>}
        <textarea
          ref={(node) => {
            fieldRef.current = node
            assignRef(ref, node)
          }}
          rows={1}
          dir="auto"
          className="sheen-chat-field"
          style={{ "--sheen-chat-rows": maxRows } as React.CSSProperties}
          placeholder={placeholder}
          aria-label={placeholder}
          value={value}
          disabled={disabled}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            // Enter sends; Shift+Enter is a new line; never mid-IME composition.
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault()
              send()
            }
          }}
        />
        <Button type="submit" size="icon-sm" className="sheen-chat-send" disabled={empty || disabled} aria-label={sendLabel}>
          <SendIcon />
        </Button>
      </form>
    )
  },
)

ChatComposer.displayName = "ChatComposer"
