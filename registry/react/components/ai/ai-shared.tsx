"use client"

// Ported from boot-ui. Built-in SVG paths from Lucide (ISC).
import * as React from "react"

export const Icon = ({ d, className }: { d: string; className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
)

export const SparkIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2.5c.6 5 4.5 8.9 9.5 9.5-5 .6-8.9 4.5-9.5 9.5-.6-5-4.5-8.9-9.5-9.5 5-.6 8.9-4.5 9.5-9.5z" />
  </svg>
)

export const ChevronIcon = ({ className }: { className?: string }) => <Icon className={className} d="m6 9 6 6 6-6" />

export const CopyIcon = () => <Icon d="M9 9h11v11H9zM5 15H4V4h11v1" />

export const CheckIcon = () => <Icon d="M20 6 9 17l-5-5" />

export const RefreshIcon = () => <Icon d="M21 12a9 9 0 1 1-2.6-6.4L21 8M21 3v5h-5" />

export const ThumbUpIcon = () => <Icon d="M7 10v11H3V10zM7 10l4-8a3 3 0 0 1 3 3v4h5.6a2 2 0 0 1 2 2.3l-1.4 8a2 2 0 0 1-2 1.7H7" />

export const ThumbDownIcon = () => <Icon d="M17 14V3h4v11zM17 14l-4 8a3 3 0 0 1-3-3v-4H4.4a2 2 0 0 1-2-2.3l1.4-8a2 2 0 0 1 2-1.7H17" />

export const ArrowUpIcon = () => <Icon d="M12 19V5M5 12l7-7 7 7" />

export const ToolIcon = () => <Icon d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z" />

export function useCopy() {
  const [copied, setCopied] = React.useState(false)
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  React.useEffect(() => () => clearTimeout(timer.current), [])
  const copy = React.useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      return false
    }
    setCopied(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 1600)
    return true
  }, [])
  return { copied, copy }
}
