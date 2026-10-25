"use client"

// Ported from boot-ui. Built-in SVG paths from Lucide (ISC).
import * as React from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { assignRef } from "@/lib/refs"
import { ArrowUpIcon } from "./ai-shared"

export interface AIPromptInputProps extends Omit<React.FormHTMLAttributes<HTMLFormElement>, "onSubmit"> {
  onSubmit: (text: string) => void
  /** "streaming" turns the send button into Stop. */
  status?: "ready" | "submitted" | "streaming"
  onStop?: () => void
  placeholder?: string
  /** Left side of the toolbar under the field (attach, model picker…). */
  tools?: React.ReactNode
  maxRows?: number
  labels?: Partial<Record<"send" | "stop", string>>
}

export const AIPromptInput = React.forwardRef<HTMLTextAreaElement, AIPromptInputProps>(
  ({ onSubmit, status = "ready", onStop, placeholder = "Ask anything", tools, maxRows = 8, labels, className, ...props }, ref) => {
    const [value, setValue] = React.useState("")
    const fieldRef = React.useRef<HTMLTextAreaElement | null>(null)
    const busy = status !== "ready"
    const l = { send: "Send", stop: "Stop", ...labels }

    React.useLayoutEffect(() => {
      const field = fieldRef.current
      if (!field) return
      field.style.height = "auto"
      field.style.height = `${field.scrollHeight}px`
    }, [value])

    const submit = () => {
      if (!value.trim() || busy) return
      onSubmit(value.trim())
      setValue("")
    }

    return (
      <form
        className={cn("sheen-ai-prompt", className)}
        data-status={status}
        onSubmit={(event) => {
          event.preventDefault()
          if (status === "streaming") onStop?.()
          else submit()
        }}
        onClick={(event) => {
          // Clicking the frame focuses the field.
          if (event.target === event.currentTarget) fieldRef.current?.focus()
        }}
        {...props}
      >
        <textarea
          ref={(node) => {
            fieldRef.current = node
            assignRef(ref, node)
          }}
          rows={1}
          dir="auto"
          className="sheen-ai-prompt-field"
          style={{ "--sheen-ai-rows": maxRows } as React.CSSProperties}
          placeholder={placeholder}
          aria-label={placeholder}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault()
              submit()
            }
          }}
        />
        <div className="sheen-ai-prompt-toolbar">
          <div className="sheen-ai-prompt-tools">{tools}</div>
          {status === "streaming" ? (
            <Button type="submit" size="icon-sm" className="sheen-ai-prompt-send" aria-label={l.stop} data-stop="">
              <span className="sheen-ai-stop" aria-hidden="true" />
            </Button>
          ) : (
            <Button type="submit" size="icon-sm" className="sheen-ai-prompt-send" aria-label={l.send} disabled={!value.trim() || busy}>
              {status === "submitted" ? <span className="sheen-ai-spinner" aria-hidden="true" /> : <ArrowUpIcon />}
            </Button>
          )}
        </div>
      </form>
    )
  },
)

AIPromptInput.displayName = "AIPromptInput"
