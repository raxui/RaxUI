"use client"

import * as React from "react"

// Built-in icon paths from Lucide (ISC).

import { useFieldControlProps } from "@/components/ui/field"
import { cn } from "@/lib/utils"

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** `glass` = frosted field · `filled` = iOS-style grey field without a border. */
  variant?: "glass" | "outline" | "filled"
  /** Grow with the content between `minRows` and `maxRows` (then scroll). */
  autoResize?: boolean
  minRows?: number
  maxRows?: number
  /** Show a "120 / 280" counter with a progress ring. Needs `maxLength`. */
  showCount?: boolean
  limitLabel?: string
  appearance?: import("@/lib/theme").SheenAppearance
  /** Content for the bottom bar (formatting buttons, attach, send…). */
  footer?: React.ReactNode
  /** Content after the counter, at the bar's end (e.g. a Send button). */
  footerEnd?: React.ReactNode
  /** Styles the field red; also sets aria-invalid. */
  invalid?: boolean
  /** Class for the wrapper when there is a footer or counter. `className` always goes on the <textarea>. */
  wrapperClassName?: string
}

/** Progress ring that fills as you approach maxLength, then turns amber / red. */
function CountRing({ length, max, limitLabel = "Character limit reached" }: { length: number; max: number; limitLabel?: string }) {
  const remaining = max - length
  const ratio = Math.min(length / max, 1)
  const state = remaining <= 0 ? "limit" : remaining <= Math.max(10, Math.round(max * 0.1)) ? "warn" : undefined
  return (
    <span className="sheen-textarea-count" data-state={state}>
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <circle className="sheen-textarea-count-track" cx="10" cy="10" r="8" />
        <circle className="sheen-textarea-count-bar" cx="10" cy="10" r="8" pathLength={1} style={{ strokeDashoffset: 1 - ratio }} />
      </svg>
      {/* Exact numbers only once they matter, like iOS / X. */}
      <span className="sheen-textarea-count-text" dir="ltr">
        {state ? remaining : `${length} / ${max}`}
      </span>
      {state === "limit" && (
        <span className="visually-hidden" role="status">
          {limitLabel}
        </span>
      )}
    </span>
  )
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      wrapperClassName,
      variant = "filled",
      autoResize = false,
      minRows = 3,
      maxRows = 10,
      showCount = false,
      limitLabel,
      appearance,
      footer,
      footerEnd,
      invalid,
      rows,
      onChange,
      ...props
    },
    ref,
  ) => {
    props = useFieldControlProps(props)
    const textareaRef = React.useRef<HTMLTextAreaElement>(null)
    const composedRef = useMergedRef(ref, textareaRef)

    // Length for the counter, for controlled and uncontrolled fields alike.
    const [uncontrolledLength, setUncontrolledLength] = React.useState(() => String(props.defaultValue ?? "").length)
    const length = props.value !== undefined ? String(props.value).length : uncontrolledLength

    const resize = React.useCallback(() => {
      const el = textareaRef.current
      if (!el || !autoResize) return
      const style = getComputedStyle(el)
      const line = parseFloat(style.lineHeight) || 22
      const borderY = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth)
      const chrome = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom) + borderY
      el.style.height = "auto"
      const content = el.scrollHeight + borderY // scrollHeight includes padding, not border
      const next = Math.min(Math.max(content, minRows * line + chrome), maxRows * line + chrome)
      el.style.height = `${next}px`
      el.style.overflowY = content > next + 1 ? "auto" : "hidden"
    }, [autoResize, minRows, maxRows])

    // Re-fit on mount, on controlled value changes and when the width changes (wrapping).
    React.useLayoutEffect(resize, [resize, props.value])
    React.useEffect(() => {
      const el = textareaRef.current
      if (!el || !autoResize || typeof ResizeObserver === "undefined") return
      let width = el.clientWidth
      const observer = new ResizeObserver(() => {
        if (el.clientWidth !== width) {
          width = el.clientWidth
          resize()
        }
      })
      observer.observe(el)
      return () => observer.disconnect()
    }, [autoResize, resize])

    const counter = showCount && props.maxLength !== undefined
    const textarea = (
      <textarea
        data-sheen-appearance={appearance}
        ref={composedRef}
        rows={rows ?? minRows}
        data-variant={variant}
        data-auto-resize={autoResize || undefined}
        aria-invalid={invalid || props["aria-invalid"] || undefined}
        className={cn("form-control sheen-textarea", className)}
        onChange={(event) => {
          setUncontrolledLength(event.currentTarget.value.length)
          resize()
          onChange?.(event)
        }}
        {...props}
      />
    )

    if (!footer && !footerEnd && !counter) return textarea

    return (
      <div
        className={cn("sheen-textarea-group", wrapperClassName)}
        data-sheen-appearance={appearance}
        dir={props.dir}
        // Clicking the footer's empty space focuses the field.
        onPointerDown={(event) => {
          const target = event.target as HTMLElement
          if (target === textareaRef.current || target.closest("button, a, input, select, textarea, [tabindex]")) return
          event.preventDefault()
          textareaRef.current?.focus()
        }}
      >
        {textarea}
        <div className="sheen-textarea-footer">
          <div className="sheen-textarea-footer-start">{footer}</div>
          {counter && <CountRing limitLabel={limitLabel} length={length} max={props.maxLength!} />}
          {footerEnd}
        </div>
      </div>
    )
  },
)
Textarea.displayName = "Textarea"

export { Textarea, CountRing }

// Local ref composition keeps copied controls independent of extra helpers.
function assignRef<T>(ref: React.ForwardedRef<T>, value: T | null) {
  if (typeof ref === "function") ref(value)
  else if (ref) ref.current = value
}
function useMergedRef<T>(forwarded: React.ForwardedRef<T>, local: React.MutableRefObject<T | null>) {
  return React.useCallback((node: T | null) => { local.current = node; assignRef(forwarded, node) }, [forwarded, local])
}
