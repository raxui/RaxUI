"use client"

// Ported from boot-ui. Built-in SVG paths from Lucide (ISC).
import * as React from "react"
import { cn } from "@/lib/utils"
import { useCopy, CheckIcon, CopyIcon } from "./ai-shared"

export interface AICodeBlockProps extends React.HTMLAttributes<HTMLDivElement> {
  code: string
  language?: string
  copyLabel?: string
  copiedLabel?: string
}

export const AICodeBlock = React.forwardRef<HTMLDivElement, AICodeBlockProps>(
  ({ code, language, copyLabel = "Copy", copiedLabel = "Copied", className, ...props }, ref) => {
    const { copied, copy } = useCopy()
    return (
      <div ref={ref} className={cn("rax-ai-code", className)} dir="ltr" {...props}>
        <div className="rax-ai-code-head">
          <span>{language}</span>
          <button type="button" onClick={() => copy(code)} data-copied={copied ? "" : undefined}>
            {copied ? <CheckIcon /> : <CopyIcon />}
            <span aria-live="polite">{copied ? copiedLabel : copyLabel}</span>
          </button>
        </div>
        <pre>
          <code>{code}</code>
        </pre>
      </div>
    )
  },
)

AICodeBlock.displayName = "AICodeBlock"
