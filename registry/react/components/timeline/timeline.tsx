"use client"

// SheenUI timeline. Source-owned: edit freely. Ported from boot-ui.
import * as React from "react"

import type { SheenAppearance } from "@/lib/theme"

import { cn } from "@/lib/utils"

// -----------------------------------------------------------------------------
// Timeline — events along a line: order tracking, activity feeds, history,
// roadmaps.
//
//   <Timeline>
//     <TimelineGroup>Today</TimelineGroup>
//     <TimelineItem status="done" time="09:14" title="Order placed" />
//     <TimelineItem status="current" title="Out for delivery" marker={<TruckIcon />} />
//     <TimelineItem status="upcoming" title="Delivered" />
//   </Timeline>
//
// layout   "start" (line on the start side) · "alternate" (centre line, items
//          alternate; falls back to "start" in a narrow container) · "horizontal"
// time     inline above the title, or in its own column with timePosition="side"
// status   done → solid line · current → pulsing marker · upcoming → dashed line
//          · error. Each item's line runs to the next item and takes its status.
// -----------------------------------------------------------------------------

export type TimelineStatus = "done" | "current" | "upcoming" | "error"
export type TimelineTone = "primary" | "success" | "warning" | "danger" | "info" | "neutral"

const DEFAULT_LABELS: Record<TimelineStatus, string> = {
  done: "completed",
  current: "in progress",
  upcoming: "upcoming",
  error: "failed",
}

interface TimelineContextValue {
  layout: "start" | "alternate" | "horizontal"
  timePosition: "inline" | "side"
  labels: Record<TimelineStatus, string>
}
const TimelineContext = React.createContext<TimelineContextValue>({ layout: "start", timePosition: "inline", labels: DEFAULT_LABELS })
const ItemIndexContext = React.createContext(0)

export interface TimelineProps extends React.OlHTMLAttributes<HTMLOListElement> {
  appearance?: SheenAppearance
  layout?: "start" | "alternate" | "horizontal"
  /** Time above the title (default) or in a column of its own (start / alternate). */
  timePosition?: "inline" | "side"
  size?: "sm" | "default"
  /** Items fade in one after another on mount. Default true. */
  animated?: boolean
  /** Screen-reader words for each status. */
  labels?: Partial<Record<TimelineStatus, string>>
}

const Timeline = React.forwardRef<HTMLOListElement, TimelineProps>(
  (
    { appearance, layout = "start", timePosition = "inline", size = "default", animated = true, labels: labelsProp, className, children, ...props },
    ref,
  ) => {
    const labels = React.useMemo(() => ({ ...DEFAULT_LABELS, ...labelsProp }), [labelsProp])
    const context = React.useMemo(() => ({ layout, timePosition, labels }), [layout, timePosition, labels])

    // Number the items (not the group headings): alternation and the entrance stagger use it.
    let index = 0
    const items = React.Children.map(children, (child) => {
      if (!React.isValidElement(child) || child.type !== TimelineItem) return child
      return <ItemIndexContext.Provider value={index++}>{child}</ItemIndexContext.Provider>
    })

    return (
      <TimelineContext.Provider value={context}>
        {/* A horizontal timeline scrolls sideways, so keyboard users must be able to focus it. */}
        <div className="sheen-timeline-wrap" data-layout={layout} tabIndex={layout === "horizontal" ? 0 : undefined}>
          <ol
            ref={ref}
        data-sheen-appearance={appearance}
            className={cn("sheen-timeline", className)}
            data-layout={layout}
            data-time={layout === "alternate" ? "side" : layout === "horizontal" ? "inline" : timePosition}
            data-size={size}
            data-animated={animated || undefined}
            {...props}
          >
            {items}
          </ol>
        </div>
      </TimelineContext.Provider>
    )
  },
)
Timeline.displayName = "Timeline"

export interface TimelineItemProps extends Omit<React.LiHTMLAttributes<HTMLLIElement>, "title"> {
  status?: TimelineStatus
  /** Colour of the marker and line. Defaults from status (error → danger, upcoming → neutral). */
  tone?: TimelineTone
  /** Icon, avatar or number inside a larger marker. Without it: a dot. */
  marker?: React.ReactNode
  /** When it happened, e.g. "09:14" or "Mar 2024". */
  time?: React.ReactNode
  /** Machine-readable time for <time dateTime>. */
  dateTime?: string
  title?: React.ReactNode
  description?: React.ReactNode
}

const TimelineItem = React.forwardRef<HTMLLIElement, TimelineItemProps>(
  ({ status = "done", tone, marker, time, dateTime, title, description, className, style, children, ...props }, ref) => {
    const { layout, timePosition, labels } = React.useContext(TimelineContext)
    // Alternate puts the time across the line from the content.
    const timeOnSide = layout === "alternate" || (timePosition === "side" && layout !== "horizontal")
    const index = React.useContext(ItemIndexContext)
    const resolvedTone = tone ?? (status === "error" ? "danger" : status === "upcoming" ? "neutral" : "primary")

    const timeNode =
      time !== undefined ? (
        <time className="sheen-timeline-time" dateTime={dateTime}>
          {time}
        </time>
      ) : null

    return (
      <li
        ref={ref}
        className={cn("sheen-timeline-item", className)}
        data-status={status}
        data-tone={resolvedTone}
        data-marker={marker !== undefined ? "icon" : "dot"}
        data-side={index % 2 ? "start" : "end"}
        aria-current={status === "current" ? "step" : undefined}
        style={{ "--sheen-timeline-i": index, ...style } as React.CSSProperties}
        {...props}
      >
        {timeOnSide && <div className="sheen-timeline-side">{timeNode}</div>}
        <div className="sheen-timeline-rail" aria-hidden="true">
          <span className="sheen-timeline-marker">{marker}</span>
          <span className="sheen-timeline-line" />
        </div>
        <div className="sheen-timeline-body">
          {!timeOnSide && timeNode}
          {title !== undefined && (
            <div className="sheen-timeline-title">
              {title}
              <span className="visually-hidden"> ({labels[status]})</span>
            </div>
          )}
          {description !== undefined && <div className="sheen-timeline-description">{description}</div>}
          {children !== undefined && <div className="sheen-timeline-content">{children}</div>}
        </div>
      </li>
    )
  },
)
TimelineItem.displayName = "TimelineItem"

/** A heading between items: "Today", "2023", "Q3". */
const TimelineGroup = React.forwardRef<HTMLLIElement, React.LiHTMLAttributes<HTMLLIElement>>(({ className, children, ...props }, ref) => (
  <li ref={ref} className={cn("sheen-timeline-group", className)} {...props}>
    <span className="sheen-timeline-group-label">{children}</span>
  </li>
))
TimelineGroup.displayName = "TimelineGroup"

/**
 * "3 hours ago" / "قبل ٣ ساعات" / "in 2 days", picking the largest sensible unit.
 * For dates further than a month away, the plain date reads better: pass `maxDays`.
 */
export function relativeTime(
  date: Date | number,
  { locale, now = Date.now(), maxDays = 30 }: { locale?: string; now?: number; maxDays?: number } = {},
) {
  const ms = (typeof date === "number" ? date : date.getTime()) - now
  const abs = Math.abs(ms)
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour
  if (abs >= maxDays * day) return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date)
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" })
  if (abs < minute) return rtf.format(0, "second")
  if (abs < hour) return rtf.format(Math.round(ms / minute), "minute")
  if (abs < day) return rtf.format(Math.round(ms / hour), "hour")
  return rtf.format(Math.round(ms / day), "day")
}

export { Timeline, TimelineItem, TimelineGroup }
