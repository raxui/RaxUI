"use client"

// Ported from boot-ui. Built-in SVG paths from Lucide (ISC).
import * as React from "react"
import { cn } from "@/lib/utils"
import { AIShimmer } from "./ai-response"
import { ChevronIcon } from "./ai-shared"

export interface AIReasoningProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Still thinking: shows the shimmer, opens, counts seconds. */
  streaming?: boolean
  /** Seconds spent, shown once done (otherwise measured while streaming). */
  duration?: number
  /** Labels; {s} is replaced with the seconds. */
  thinkingLabel?: string
  doneLabel?: string
}

export const AIReasoning = React.forwardRef<HTMLDivElement, AIReasoningProps>(
  ({ streaming = false, duration, thinkingLabel = "Thinking…", doneLabel = "Thought for {s}s", className, children, ...props }, ref) => {
    const [open, setOpen] = React.useState(streaming)
    const [userOpened, setUserOpened] = React.useState(false)
    const [elapsed, setElapsed] = React.useState(0)
    const id = React.useId()

    React.useEffect(() => {
      if (!streaming) return
      setOpen(true)
      const start = Date.now()
      const timer = window.setInterval(() => setElapsed(Math.round((Date.now() - start) / 1000)), 500)
      return () => window.clearInterval(timer)
    }, [streaming])

    // Fold away when the thinking ends (a beat later, so the last line is seen).
    React.useEffect(() => {
      if (streaming || userOpened) return
      const timer = window.setTimeout(() => setOpen(false), 700)
      return () => window.clearTimeout(timer)
    }, [streaming, userOpened])

    const seconds = duration ?? Math.max(1, elapsed)
    return (
      <div ref={ref} className={cn("sheen-ai-reasoning", className)} data-state={open ? "open" : "closed"} {...props}>
        <button
          type="button"
          className="sheen-ai-reasoning-trigger"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => {
            setOpen((o) => !o)
            setUserOpened(true)
          }}
        >
          {streaming ? <AIShimmer>{thinkingLabel}</AIShimmer> : <span>{doneLabel.replace("{s}", String(seconds))}</span>}
          <ChevronIcon className="sheen-ai-chevron" />
        </button>
        <div className="sheen-ai-collapse" id={id}>
          <div>
            <div className="sheen-ai-reasoning-body" dir="auto">
              {children}
            </div>
          </div>
        </div>
      </div>
    )
  },
)

AIReasoning.displayName = "AIReasoning"
