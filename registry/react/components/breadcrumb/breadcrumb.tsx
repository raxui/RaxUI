"use client"

// RaxUI breadcrumb. Source-owned: edit freely. Ported from boot-ui.
// Built-in icon paths from Lucide (ISC).
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"

import { cn } from "@/lib/utils"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

type BreadcrumbSeparatorStyle = "chevron" | "slash" | "dot"

const BreadcrumbContext = React.createContext<{ separator: BreadcrumbSeparatorStyle }>({ separator: "chevron" })

// -----------------------------------------------------------------------------
// Primitives (compose them freely)
// -----------------------------------------------------------------------------

export interface BreadcrumbProps extends React.HTMLAttributes<HTMLElement> {
  appearance?: import("@/lib/theme").RaxAppearance
  label?: string
  /** `glass` wraps the trail in a frosted pill (for headers over content). */
  variant?: "default" | "glass"
  /** Default glyph for every BreadcrumbSeparator. */
  separator?: BreadcrumbSeparatorStyle
}

const Breadcrumb = React.forwardRef<HTMLElement, BreadcrumbProps>(
  ({ className, appearance, label = "Breadcrumb", variant = "default", separator = "chevron", ...props }, ref) => (
    <BreadcrumbContext.Provider value={{ separator }}>
      <nav ref={ref} aria-label={label} data-rax-appearance={appearance} data-variant={variant} className={cn("rax-breadcrumb", className)} {...props} />
    </BreadcrumbContext.Provider>
  ),
)
Breadcrumb.displayName = "Breadcrumb"

const BreadcrumbList = React.forwardRef<HTMLOListElement, React.OlHTMLAttributes<HTMLOListElement>>(({ className, ...props }, ref) => (
  <ol ref={ref} className={cn("rax-breadcrumb-list", className)} {...props} />
))
BreadcrumbList.displayName = "BreadcrumbList"

const BreadcrumbItem = React.forwardRef<HTMLLIElement, React.LiHTMLAttributes<HTMLLIElement>>(({ className, ...props }, ref) => (
  <li ref={ref} className={cn("rax-breadcrumb-item", className)} {...props} />
))
BreadcrumbItem.displayName = "BreadcrumbItem"

export interface BreadcrumbLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  /** Render your router's Link instead. */
  asChild?: boolean
}

/** An <a> when given an href, otherwise a <button> (in-app navigation). */
const BreadcrumbLink = React.forwardRef<HTMLAnchorElement, BreadcrumbLinkProps>(({ className, asChild, href, ...props }, ref) => {
  const isButton = !asChild && href === undefined
  const Comp: React.ElementType = asChild ? Slot : isButton ? "button" : "a"
  return <Comp ref={ref} className={cn("rax-breadcrumb-link", className)} {...(isButton ? { type: "button" } : { href })} {...props} />
})
BreadcrumbLink.displayName = "BreadcrumbLink"

/** The current page: not a link. */
const BreadcrumbPage = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(({ className, ...props }, ref) => (
  <span ref={ref} aria-current="page" className={cn("rax-breadcrumb-page", className)} {...props} />
))
BreadcrumbPage.displayName = "BreadcrumbPage"

const ChevronIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 18 6-6-6-6" />
  </svg>
)

const BreadcrumbSeparator = React.forwardRef<HTMLLIElement, React.LiHTMLAttributes<HTMLLIElement>>(({ children, className, ...props }, ref) => {
  const { separator } = React.useContext(BreadcrumbContext)
  return (
    <li ref={ref} role="presentation" aria-hidden="true" data-separator={separator} className={cn("rax-breadcrumb-separator", className)} {...props}>
      {children ?? (separator === "chevron" ? <ChevronIcon /> : separator === "slash" ? "/" : "·")}
    </li>
  )
})
BreadcrumbSeparator.displayName = "BreadcrumbSeparator"

const BreadcrumbEllipsis = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, children, ...props }, ref) => (
    <span ref={ref} className={cn("rax-breadcrumb-ellipsis", className)} {...props}>
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <circle cx="5" cy="12" r="1.6" />
        <circle cx="12" cy="12" r="1.6" />
        <circle cx="19" cy="12" r="1.6" />
      </svg>
      <span className="visually-hidden">{children ?? "More"}</span>
    </span>
  ),
)
BreadcrumbEllipsis.displayName = "BreadcrumbEllipsis"

// -----------------------------------------------------------------------------
// Ready-made trail: collapses the middle into a menu, animates new crumbs in
// -----------------------------------------------------------------------------

export interface BreadcrumbTrailItem {
  label: React.ReactNode
  href?: string
  onClick?: () => void
  icon?: React.ReactNode
  /** Stable identity (defaults to href, then index). Lets new crumbs animate in. */
  key?: React.Key
}

export interface BreadcrumbTrailProps extends Omit<BreadcrumbProps, "children"> {
  /** Root → current page. The last item renders as BreadcrumbPage. */
  items: BreadcrumbTrailItem[]
  /** Collapse when there are more items than this. */
  maxItems?: number
  itemsBeforeCollapse?: number
  itemsAfterCollapse?: number
  /** Accessible name for the collapsed-items button. */
  collapsedLabel?: string
}

const TrailEnterContext = React.createContext<React.MutableRefObject<boolean>>({ current: false })

/** Crumbs that mount after the trail's first paint slide in (with their separator); initial ones don't. */
function TrailItem({ separator, children }: { separator: boolean; children: React.ReactNode }) {
  const ready = React.useContext(TrailEnterContext)
  const [enter] = React.useState(() => ready.current || undefined)
  return (
    <>
      {separator && <BreadcrumbSeparator data-enter={enter} />}
      <BreadcrumbItem data-enter={enter}>{children}</BreadcrumbItem>
    </>
  )
}

const BreadcrumbTrail = React.forwardRef<HTMLElement, BreadcrumbTrailProps>(
  ({ items, maxItems, itemsBeforeCollapse = 1, itemsAfterCollapse = 2, collapsedLabel = "Show hidden pages", ...props }, ref) => {
    const ready = React.useRef(false)
    React.useEffect(() => {
      ready.current = true
    }, [])

    const keyOf = (item: BreadcrumbTrailItem, index: number) => item.key ?? item.href ?? index
    const collapse = maxItems !== undefined && items.length > maxItems && items.length > itemsBeforeCollapse + itemsAfterCollapse
    const before = collapse ? items.slice(0, itemsBeforeCollapse) : items
    const hidden = collapse ? items.slice(itemsBeforeCollapse, items.length - itemsAfterCollapse) : []
    const after = collapse ? items.slice(items.length - itemsAfterCollapse) : []
    const last = items.length - 1

    const crumb = (item: BreadcrumbTrailItem, index: number) => (
      <TrailItem key={keyOf(item, index)} separator={index > 0}>
        {index === last ? (
          <BreadcrumbPage>
            {item.icon}
            <span className="rax-breadcrumb-text">{item.label}</span>
          </BreadcrumbPage>
        ) : (
          <BreadcrumbLink href={item.href} onClick={item.onClick}>
            {item.icon}
            <span className="rax-breadcrumb-text">{item.label}</span>
          </BreadcrumbLink>
        )}
      </TrailItem>
    )

    return (
      <TrailEnterContext.Provider value={ready}>
        <Breadcrumb ref={ref} {...props}>
          <BreadcrumbList>
            {before.map((item, i) => crumb(item, i))}
            {collapse && (
              <React.Fragment key="collapsed">
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <DropdownMenu dir={props.dir === "rtl" ? "rtl" : undefined}>
                    <DropdownMenuTrigger className="rax-breadcrumb-link rax-breadcrumb-more" aria-label={collapsedLabel}>
                      <BreadcrumbEllipsis />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" appearance={props.appearance}>
                      {hidden.map((item, i) => (
                        <DropdownMenuItem
                          key={keyOf(item, itemsBeforeCollapse + i)}
                          asChild={item.href !== undefined}
                          onSelect={item.onClick}
                        >
                          {item.href !== undefined ? (
                            <a href={item.href}>
                              {item.icon}
                              {item.label}
                            </a>
                          ) : (
                            <>
                              {item.icon}
                              {item.label}
                            </>
                          )}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </BreadcrumbItem>
              </React.Fragment>
            )}
            {after.map((item, i) => crumb(item, items.length - after.length + i))}
          </BreadcrumbList>
        </Breadcrumb>
      </TrailEnterContext.Provider>
    )
  },
)
BreadcrumbTrail.displayName = "BreadcrumbTrail"

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
  BreadcrumbTrail,
}
