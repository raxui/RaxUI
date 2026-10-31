"use client"

// RaxUI pagination. Source-owned: edit freely. Ported from boot-ui.
// Built-in icon paths from Lucide (ISC).

import { Slot } from "@radix-ui/react-slot"

import { cn } from "@/lib/utils"
const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches
import * as React from "react"

type PossibleRef<T> = React.Ref<T> | ((node: T | null) => void) | undefined

/** Sets a ref of either kind: calls a callback ref, or fills an object ref. */
function assignRef<T>(ref: PossibleRef<T>, node: T | null) {
  if (typeof ref === "function") ref(node)
  else if (ref) (ref as React.MutableRefObject<T | null>).current = node
}

/** One callback ref that sets every ref it's given (callback or object). */
function mergeRefs<T>(...refs: PossibleRef<T>[]) {
  return (node: T | null) => {
    for (const ref of refs) assignRef(ref, node)
  }
}

/**
 * `mergeRefs`, kept stable between renders. A new callback ref on every render
 * makes React detach and reattach it, which re-measures drag-and-drop nodes
 * and restarts observers.
 */
function useMergedRef<T>(...refs: PossibleRef<T>[]) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return React.useMemo(() => mergeRefs(...refs), refs)
}

// -----------------------------------------------------------------------------
// Range helper
// -----------------------------------------------------------------------------

export type PaginationRangeItem = number | "start-ellipsis" | "end-ellipsis"

export interface PaginationRangeOptions {
  page: number
  pageCount: number
  /** Pages shown on each side of the current page. */
  siblings?: number
  /** Pages always shown at the start and end. */
  boundaries?: number
}

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i)

/**
 * Page numbers with ellipses, e.g. `[1, "start-ellipsis", 6, 7, 8, "end-ellipsis", 20]`.
 * Always returns the same number of items (once pageCount is large enough),
 * so the control never changes width while paging.
 */
export function paginationRange({ page, pageCount, siblings = 1, boundaries = 1 }: PaginationRangeOptions): PaginationRangeItem[] {
  const slots = siblings * 2 + 3 + boundaries * 2
  if (pageCount <= slots) return range(1, pageCount)

  const current = Math.min(Math.max(page, 1), pageCount)
  const start = Math.max(current - siblings, boundaries + 1)
  const end = Math.min(current + siblings, pageCount - boundaries)
  const showStart = start > boundaries + 2
  const showEnd = end < pageCount - boundaries - 1

  if (!showStart) return [...range(1, slots - boundaries - 1), "end-ellipsis", ...range(pageCount - boundaries + 1, pageCount)]
  if (!showEnd) return [...range(1, boundaries), "start-ellipsis", ...range(pageCount - (slots - boundaries - 2), pageCount)]
  return [...range(1, boundaries), "start-ellipsis", ...range(start, end), "end-ellipsis", ...range(pageCount - boundaries + 1, pageCount)]
}

// -----------------------------------------------------------------------------
// Primitives (compose them freely)
// -----------------------------------------------------------------------------

export interface PaginationProps extends React.HTMLAttributes<HTMLElement> {
  appearance?: import("@/lib/theme").RaxAppearance
  label?: string
  /** `glass` = frosted track with a floating thumb · `plain` = no track, filled thumb. */
  variant?: "glass" | "plain"
  size?: "default" | "sm"
}

const Pagination = React.forwardRef<HTMLElement, PaginationProps>(({ className, appearance, label = "Pagination", variant = "glass", size = "default", ...props }, ref) => (
  <nav ref={ref} aria-label={label} data-rax-appearance={appearance} data-variant={variant} data-size={size} className={cn("rax-pagination", className)} {...props} />
))
Pagination.displayName = "Pagination"

/** The list. Hosts one indicator that glides to whichever link has aria-current="page". */
const PaginationContent = React.forwardRef<HTMLUListElement, React.HTMLAttributes<HTMLUListElement>>(
  ({ className, children, ...props }, ref) => {
    const listRef = React.useRef<HTMLUListElement>(null)
    const composedRef = useMergedRef(ref, listRef)

    React.useLayoutEffect(() => {
      const list = listRef.current
      if (!list) return
      let frame = 0

      // FLIP: when the range shifts (1 … 4 5 6 … 20 → 1 … 5 6 7 … 20) the numbers
      // slide to their new slots instead of jumping; new ones pop in.
      const positions = new WeakMap<HTMLElement, number>()
      const animations = new Set<Animation>()
      const media = window.matchMedia("(prefers-reduced-motion: reduce)")
      const cancelAnimations = () => {
        for (const animation of animations) animation.cancel()
        animations.clear()
      }
      const motionChanged = () => { if (media.matches) cancelAnimations() }
      media.addEventListener("change", motionChanged)
      const flip = () => {
        const animate = list.hasAttribute("data-animate") && !prefersReducedMotion()
        list.querySelectorAll<HTMLElement>(".rax-pagination-link:not(.rax-pagination-step), .rax-pagination-ellipsis").forEach((el) => {
          const previous = positions.get(el)
          const current = el.offsetLeft
          positions.set(el, current)
          if (!animate) return
          const frames = previous === undefined
            ? [{ opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1 }]
            : previous !== current ? [{ translate: `${previous - current}px 0` }, { translate: "0 0" }] : null
          if (!frames) return
          const animation = el.animate(frames, { duration: previous === undefined ? 350 : 500, easing: "cubic-bezier(0.34, 1.2, 0.64, 1)" })
          animations.add(animation)
          animation.onfinish = () => animations.delete(animation)
        })
      }

      const measure = () => {
        flip()
        const active = list.querySelector<HTMLElement>("[aria-current=page]")
        if (!active) {
          list.removeAttribute("data-ready")
          return
        }
        const place = () => {
          list.style.setProperty("--rax-pagination-x", `${active.offsetLeft}px`)
          list.style.setProperty("--rax-pagination-y", `${active.offsetTop}px`)
          list.style.setProperty("--rax-pagination-w", `${active.offsetWidth}px`)
          list.style.setProperty("--rax-pagination-h", `${active.offsetHeight}px`)
        }
        if (!list.hasAttribute("data-ready")) withoutTransition(list.querySelector(".rax-pagination-indicator"), place)
        else place()

        // First placement is instant; glide from the next frame on. Checked separately from
        // data-ready: StrictMode runs this effect twice and the cleanup cancels the first frame.
        if (!list.hasAttribute("data-ready")) list.setAttribute("data-ready", "")
        if (!list.hasAttribute("data-animate") && !frame) frame = requestAnimationFrame(() => list.setAttribute("data-animate", ""))
      }

      measure()
      const mutations = new MutationObserver(measure)
      mutations.observe(list, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["aria-current"] })
      const resizes = new ResizeObserver(measure)
      resizes.observe(list)

      return () => {
        media.removeEventListener("change", motionChanged)
        cancelAnimations()
        mutations.disconnect()
        resizes.disconnect()
        cancelAnimationFrame(frame)
      }
    }, [])

    return (
      <ul ref={composedRef} className={cn("rax-pagination-content", className)} {...props}>
        <li className="rax-pagination-indicator" aria-hidden="true" role="presentation" />
        {children}
      </ul>
    )
  },
)
PaginationContent.displayName = "PaginationContent"

const PaginationItem = React.forwardRef<HTMLLIElement, React.LiHTMLAttributes<HTMLLIElement>>(({ className, ...props }, ref) => (
  <li ref={ref} className={cn("rax-pagination-item", className)} {...props} />
))
PaginationItem.displayName = "PaginationItem"

export interface PaginationLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  isActive?: boolean
  disabled?: boolean
  /** Render your router's Link instead. */
  asChild?: boolean
}

/** An <a> when given an href, otherwise a <button> (in-app paging without URLs). */
const PaginationLink = React.forwardRef<HTMLAnchorElement, PaginationLinkProps>(
  ({ className, isActive, disabled, asChild, href, ...props }, ref) => {
    const isButton = !asChild && href === undefined
    const Comp: React.ElementType = asChild ? Slot : isButton ? "button" : "a"
    return (
      <Comp
        ref={ref}
        aria-current={isActive ? "page" : undefined}
        data-disabled={disabled ? "" : undefined}
        className={cn("rax-pagination-link", className)}
        {...(isButton
          ? { type: "button", disabled }
          : // A disabled link has no destination.
            { href: disabled ? undefined : href, "aria-disabled": disabled || undefined })}
        {...props}
      />
    )
  },
)
PaginationLink.displayName = "PaginationLink"

const ChevronIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.25}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="m15 18-6-6 6-6" />
  </svg>
)

type StepLinkProps = PaginationLinkProps & {
  /** Hide the text label (it stays available to screen readers). */
  iconOnly?: boolean
}

const PaginationPrevious = React.forwardRef<HTMLAnchorElement, StepLinkProps>(({ className, iconOnly, children, ...props }, ref) => (
  <PaginationLink
    ref={ref}
    data-step="previous"
    className={cn("rax-pagination-step", iconOnly && "rax-pagination-icon-only", className)}
    {...props}
  >
    <ChevronIcon />
    <span className="rax-pagination-step-label">{children ?? "Previous"}</span>
  </PaginationLink>
))
PaginationPrevious.displayName = "PaginationPrevious"

const PaginationNext = React.forwardRef<HTMLAnchorElement, StepLinkProps>(({ className, iconOnly, children, ...props }, ref) => (
  <PaginationLink
    ref={ref}
    data-step="next"
    className={cn("rax-pagination-step", iconOnly && "rax-pagination-icon-only", className)}
    {...props}
  >
    <span className="rax-pagination-step-label">{children ?? "Next"}</span>
    <ChevronIcon />
  </PaginationLink>
))
PaginationNext.displayName = "PaginationNext"

const PaginationEllipsis = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(({ className, ...props }, ref) => (
  <span ref={ref} aria-hidden="true" className={cn("rax-pagination-ellipsis", className)} {...props}>
    <svg viewBox="0 0 24 24" fill="currentColor">
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </svg>
  </span>
))
PaginationEllipsis.displayName = "PaginationEllipsis"

// -----------------------------------------------------------------------------
// Ready-made control
// -----------------------------------------------------------------------------

export interface PaginationControlProps extends Omit<PaginationProps, "onChange"> {
  pageCount: number
  page?: number
  defaultPage?: number
  onPageChange?: (page: number) => void
  siblings?: number
  boundaries?: number
  /** `pages` = numbered · `compact` = ‹ 3 / 12 › for tight spaces and phones. */
  layout?: "pages" | "compact"
  /** Give each page a real URL (crawlable, opens in new tab). Without it, pages are buttons. */
  getHref?: (page: number) => string
  /** Hide the Previous / Next text, keep the chevrons. */
  iconOnly?: boolean
  previousLabel?: React.ReactNode
  nextLabel?: React.ReactNode
  /** Number rendering, e.g. `(n) => n.toLocaleString("ar-SA")`. */
  formatPage?: (page: number) => string
  /** Screen-reader label for a page link. */
  getPageLabel?: (page: number) => string
}

const PaginationControl = React.forwardRef<HTMLElement, PaginationControlProps>(
  (
    {
      pageCount,
      page: pageProp,
      defaultPage = 1,
      onPageChange,
      siblings,
      boundaries,
      layout = "pages",
      getHref,
      iconOnly,
      previousLabel,
      nextLabel,
      formatPage = String,
      getPageLabel = (n) => `Page ${n}`,
      ...props
    },
    ref,
  ) => {
    const [uncontrolledPage, setUncontrolledPage] = React.useState(defaultPage)
    const page = Math.min(Math.max(pageProp ?? uncontrolledPage, 1), Math.max(pageCount, 1))

    // Compact layout: animate the number only once the page actually changes.
    const [initialPage] = React.useState(page)
    const [hasMoved, setHasMoved] = React.useState(false)
    if (!hasMoved && page !== initialPage) setHasMoved(true)

    const go = (next: number) => (event: React.MouseEvent) => {
      if (next < 1 || next > pageCount || next === page) return
      // Plain left-clicks stay in the app; modified clicks open the URL normally.
      if (getHref && (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0)) return
      if (getHref) event.preventDefault()
      if (pageProp === undefined) setUncontrolledPage(next)
      onPageChange?.(next)
    }

    const link = (target: number) => ({
      href: getHref?.(target),
      disabled: target < 1 || target > pageCount,
      onClick: go(target),
    })

    return (
      <Pagination ref={ref} data-layout={layout} {...props}>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious {...link(page - 1)} iconOnly={iconOnly}>
              {previousLabel}
            </PaginationPrevious>
          </PaginationItem>

          {layout === "compact" ? (
            <PaginationItem className="rax-pagination-status" aria-live="polite">
              {/* Keyed so the number re-enters (and re-animates) on every change. */}
              <span key={page} className="rax-pagination-status-current" data-tick={hasMoved || undefined}>
                {formatPage(page)}
              </span>
              <span className="rax-pagination-status-sep">/</span>
              <span>{formatPage(pageCount)}</span>
            </PaginationItem>
          ) : (
            paginationRange({ page, pageCount, siblings, boundaries }).map((item) =>
              typeof item === "number" ? (
                <PaginationItem key={item}>
                  <PaginationLink {...link(item)} isActive={item === page} aria-label={getPageLabel(item)}>
                    {formatPage(item)}
                  </PaginationLink>
                </PaginationItem>
              ) : (
                <PaginationItem key={item}>
                  <PaginationEllipsis />
                </PaginationItem>
              ),
            )
          )}

          <PaginationItem>
            <PaginationNext {...link(page + 1)} iconOnly={iconOnly}>
              {nextLabel}
            </PaginationNext>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    )
  },
)
PaginationControl.displayName = "PaginationControl"

export {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
  PaginationControl,
}

// First placement must commit before restoring the gliding transition.
function withoutTransition(el: HTMLElement | null, apply: () => void) {
  if (!el) return apply()
  el.style.transition = "none"
  apply()
  void el.getBoundingClientRect()
  el.style.transition = ""
}
