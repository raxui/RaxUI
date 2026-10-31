"use client"

// Ported from boot-ui. Built-in SVG paths from Lucide (ISC).
import * as React from "react"
import { Button } from "@/components/ui/button"
import { Toggle } from "@/components/ui/toggle"
import { Tooltip } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useCopy, CheckIcon, CopyIcon, RefreshIcon, ThumbUpIcon, ThumbDownIcon } from "./ai-shared"

export interface AIActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Text the copy button copies. */
  copyText?: string
  onRegenerate?: () => void
  /** Thumbs up / down; called with the new value (null when cleared). */
  feedback?: "up" | "down" | null
  onFeedback?: (value: "up" | "down" | null) => void
  labels?: Partial<Record<"copy" | "copied" | "regenerate" | "good" | "bad", string>>
}

export const AIActions = React.forwardRef<HTMLDivElement, AIActionsProps>(
  ({ copyText, onRegenerate, feedback = null, onFeedback, labels, className, children, ...props }, ref) => {
    const { copied, copy } = useCopy()
    const l = { copy: "Copy", copied: "Copied", regenerate: "Regenerate", good: "Good response", bad: "Bad response", ...labels }
    return (
      <div ref={ref} className={cn("rax-ai-actions", className)} {...props}>
        {copyText !== undefined && (
          <Tooltip content={copied ? l.copied : l.copy}>
            <Button variant="ghost" size="icon-sm" aria-label={copied ? l.copied : l.copy} onClick={() => copy(copyText)}>
              {copied ? <CheckIcon /> : <CopyIcon />}
            </Button>
          </Tooltip>
        )}
        {onRegenerate && (
          <Tooltip content={l.regenerate}>
            <Button variant="ghost" size="icon-sm" aria-label={l.regenerate} onClick={onRegenerate}>
              <RefreshIcon />
            </Button>
          </Tooltip>
        )}
        {onFeedback && (
          <>
            <Tooltip content={l.good}>
              <Toggle size="icon-sm" aria-label={l.good} pressed={feedback === "up"} onPressedChange={(on) => onFeedback(on ? "up" : null)}>
                <ThumbUpIcon />
              </Toggle>
            </Tooltip>
            <Tooltip content={l.bad}>
              <Toggle
                size="icon-sm"
                aria-label={l.bad}
                pressed={feedback === "down"}
                onPressedChange={(on) => onFeedback(on ? "down" : null)}
              >
                <ThumbDownIcon />
              </Toggle>
            </Tooltip>
          </>
        )}
        {children}
      </div>
    )
  },
)

AIActions.displayName = "AIActions"
