"use client"

// RaxUI skeleton. Source-owned: edit freely. Ported from boot-ui.
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"

import type { RaxAppearance } from "@/lib/theme"

import { cn } from "@/lib/utils"
// React 19 types inert as a boolean and treats "" as false; React 18 only renders the string form.
const inert = (enabled: boolean) =>
  (!enabled ? {} : Number(React.version.split(".")[0]) >= 19 ? { inert: true } : { inert: "" }) as React.HTMLAttributes<HTMLElement>

type Size = number | string
const toCss = (v: Size | undefined) => (typeof v === "number" ? `${v}px` : v)

export interface SkeletonProps extends React.HTMLAttributes<HTMLSpanElement> {
  appearance?: RaxAppearance
  /** `rect` (default) · `circle` · `pill` · `text` (one line at the current font size). */
  shape?: "rect" | "circle" | "pill" | "text"
  width?: Size
  height?: Size
  /** `shimmer` = a soft light sweep, shared across every skeleton on screen · `pulse` · `none`. */
  animation?: "shimmer" | "pulse" | "none"
  /**
   * Wrap real content instead of guessing sizes: while `loading`, the children keep
   * their exact size but are hidden behind the skeleton; when it turns false they fade in.
   * Without children, `loading` is ignored and a plain placeholder renders.
   */
  loading?: boolean
}

const Skeleton = React.forwardRef<HTMLSpanElement, SkeletonProps>(
  ({ appearance, className, shape = "rect", width, height, animation = "shimmer", loading = true, style, children, ...props }, ref) => {
    // Content mode: fade the real thing in once it's ready (not on first paint if it was never loading).
    const [wasLoading, setWasLoading] = React.useState(loading)
    if (loading && !wasLoading) setWasLoading(true)

    if (children !== undefined && !loading) {
      return React.isValidElement(children)
        ? <Slot ref={ref} data-rax-appearance={appearance} className={cn(wasLoading && "rax-skeleton-reveal", className)} {...props}>{children}</Slot>
        : <span ref={ref} data-rax-appearance={appearance} className={className} {...props}>{children}</span>
    }

    const content = children !== undefined
    const skeletonProps = {
      "data-rax-appearance": appearance,
      "aria-hidden": true,
      "data-shape": content ? undefined : shape,
      "data-animation": animation,
      "data-content": content || undefined,
      // Hidden content stays out of tab order and the accessibility tree.
      ...inert(!!content),
      className: cn("rax-skeleton", className),
      // Circles are as tall as they are wide, even when a flex row would stretch them.
      style: { width: toCss(width), height: toCss(height ?? (shape === "circle" && !content ? width : undefined)), ...style },
      ...props,
    }

    // A single element child becomes the skeleton itself, so layout is exactly the real one.
    if (content && React.isValidElement(children))
      return (
        <Slot ref={ref} {...skeletonProps}>
          {children}
        </Slot>
      )

    return (
      <span ref={ref} {...skeletonProps}>
        {children}
      </span>
    )
  },
)
Skeleton.displayName = "Skeleton"

export interface SkeletonTextProps extends Omit<SkeletonProps, "shape" | "width" | "height"> {
  /** Number of lines; the last one is shorter, like real paragraphs. */
  lines?: number
  /** Width of the last line. */
  lastLineWidth?: Size
}

const SkeletonText = React.forwardRef<HTMLSpanElement, SkeletonTextProps>(
  ({ lines = 3, lastLineWidth = "60%", className, animation, appearance, ...props }, ref) => (
    <span ref={ref} data-rax-appearance={appearance} aria-hidden="true" className={cn("rax-skeleton-text", className)} {...props}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} shape="text" animation={animation} width={i === lines - 1 && lines > 1 ? lastLineWidth : "100%"} />
      ))}
    </span>
  ),
)
SkeletonText.displayName = "SkeletonText"

export { Skeleton, SkeletonText }
