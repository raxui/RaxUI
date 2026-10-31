"use client"

// Ported from boot-ui. Built-in SVG paths from Lucide (ISC).
import * as React from "react"
import { cn } from "@/lib/utils"
import { ToolIcon, CheckIcon, ChevronIcon } from "./ai-shared"

export type AIToolStatus = "pending" | "running" | "completed" | "error"

export interface AIToolCallProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  name: string
  /** Human label; defaults to the tool name. */
  title?: React.ReactNode
  status: AIToolStatus
  input?: unknown
  output?: unknown
  /** Shown instead of the output when status is "error". */
  error?: React.ReactNode
  defaultOpen?: boolean
  labels?: Partial<Record<AIToolStatus | "input" | "output", string>>
}

export const TOOL_LABELS: Record<AIToolStatus | "input" | "output", string> = {
  pending: "Waiting",
  running: "Running",
  completed: "Done",
  error: "Failed",
  input: "Input",
  output: "Output",
}

export const asText = (value: unknown) => (typeof value === "string" ? value : JSON.stringify(value, null, 2))

export const AIToolCall = React.forwardRef<HTMLDivElement, AIToolCallProps>(
  ({ name, title, status, input, output, error, defaultOpen = false, labels, className, ...props }, ref) => {
    const [open, setOpen] = React.useState(defaultOpen)
    const id = React.useId()
    const l = { ...TOOL_LABELS, ...labels }
    return (
      <div ref={ref} className={cn("rax-ai-tool", className)} data-status={status} data-state={open ? "open" : "closed"} {...props}>
        <button type="button" className="rax-ai-tool-head" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
          <span className="rax-ai-tool-icon">
            <ToolIcon />
          </span>
          <span className="rax-ai-tool-title">{title ?? <code>{name}</code>}</span>
          <span className="rax-ai-tool-status" role="status">
            {status === "running" && <span className="rax-ai-spinner" aria-hidden="true" />}
            {status === "completed" && <CheckIcon />}
            {l[status]}
          </span>
          <ChevronIcon className="rax-ai-chevron" />
        </button>
        <div className="rax-ai-collapse" id={id}>
          <div>
            <div className="rax-ai-tool-body">
              {input !== undefined && (
                <div>
                  <div className="rax-ai-tool-label">{l.input}</div>
                  <pre dir="ltr">{asText(input)}</pre>
                </div>
              )}
              {status === "error" && error ? (
                <div>
                  <div className="rax-ai-tool-label">{l.error}</div>
                  <pre dir="ltr" className="rax-ai-tool-error">
                    {error}
                  </pre>
                </div>
              ) : (
                output !== undefined && (
                  <div>
                    <div className="rax-ai-tool-label">{l.output}</div>
                    <pre dir="ltr">{asText(output)}</pre>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    )
  },
)

AIToolCall.displayName = "AIToolCall"
