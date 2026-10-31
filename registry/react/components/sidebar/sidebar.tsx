"use client"

// Built-in SVG paths from Lucide (ISC). Ported from boot-ui.
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip } from "@/components/ui/tooltip"
import { useRaxTheme, raxThemeAttributes, RaxThemeBoundary, type RaxAppearance } from "@/lib/theme"
import { cn } from "@/lib/utils"
import { withoutTransition } from "@/lib/app-shell-utils"
import { inert } from "@/lib/app-shell-utils"
import { getDirection } from "@/lib/direction"
import { assignRef } from "@/lib/refs"

// -----------------------------------------------------------------------------
// Sidebar — an app's side navigation (provider, trigger and composable parts).
//
//   <SidebarProvider storageKey="app-sidebar">
//     <Sidebar collapsible="icon">
//       <SidebarHeader>…</SidebarHeader>
//       <SidebarContent>
//         <SidebarGroup>
//           <SidebarGroupLabel>Workspace</SidebarGroupLabel>
//           <SidebarMenu>
//             <SidebarMenuItem>
//               <SidebarMenuButton isActive tooltip="Inbox"><InboxIcon /><span>Inbox</span></SidebarMenuButton>
//             </SidebarMenuItem>
//           </SidebarMenu>
//         </SidebarGroup>
//       </SidebarContent>
//       <SidebarFooter>…</SidebarFooter>
//       <SidebarRail />
//     </Sidebar>
//     <SidebarInset><SidebarTrigger /> …page…</SidebarInset>
//   </SidebarProvider>
//
// collapsible: "offcanvas" slides away · "icon" folds to an icon strip with
// tooltips · "none". variant: "sidebar" · "floating" (glass card) · "inset"
// (the page becomes a card beside it). side: "start" | "end" — logical, so
// in RTL the start sidebar sits on the right. ⌘/Ctrl+B toggles it; under
// 768px it becomes a Sheet. The active item sits on a highlight that glides
// when the active page changes.
// -----------------------------------------------------------------------------

const MOBILE_QUERY = "(max-width: 767.98px)"

type SidebarState = "expanded" | "collapsed"
type Dir = "ltr" | "rtl"

interface SidebarContextValue {
  state: SidebarState
  open: boolean
  setOpen: (open: boolean) => void
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  isMobile: boolean
  triggerRef: React.MutableRefObject<HTMLElement | null>
  toggleSidebar: () => void
  dir: Dir
  /** Set by Sidebar: what "collapsed" means here (drives tooltips). */
  collapsible: "offcanvas" | "icon" | "none"
  setCollapsible: (value: "offcanvas" | "icon" | "none") => void
  side: "start" | "end"
  setSide: (value: "start" | "end") => void
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null)

function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) throw new Error("useSidebar must be used within a SidebarProvider.")
  return context
}

function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false)
  React.useEffect(() => {
    const query = window.matchMedia(MOBILE_QUERY)
    const onChange = () => setIsMobile(query.matches)
    onChange()
    query.addEventListener("change", onChange)
    return () => query.removeEventListener("change", onChange)
  }, [])
  return isMobile
}

const readStored = (key?: string) => {
  if (!key) return undefined
  try {
    const value = localStorage.getItem(key)
    return value === "true" ? true : value === "false" ? false : undefined
  } catch {
    return undefined
  }
}

const isEditable = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))

// ---- Provider -----------------------------------------------------------------------

export interface SidebarProviderProps extends React.HTMLAttributes<HTMLDivElement> {
  appearance?: RaxAppearance
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Remember open / collapsed in localStorage under this key. */
  storageKey?: string
  /** Letter for the ⌘/Ctrl shortcut; false turns the shortcut off. */
  shortcut?: string | false
}

const SidebarProvider = React.forwardRef<HTMLDivElement, SidebarProviderProps>(
  ({ appearance, defaultOpen = true, open: openProp, onOpenChange, storageKey, shortcut = "b", className, children, ...props }, ref) => {
    const theme = useRaxTheme({ appearance, direction: props.dir === "rtl" || props.dir === "ltr" ? props.dir : undefined })
    const isMobile = useIsMobile()
    const [openMobile, setOpenMobile] = React.useState(false)
    const [uncontrolled, setUncontrolled] = React.useState(defaultOpen)
    React.useEffect(() => { const stored = readStored(storageKey); if (stored !== undefined) setUncontrolled(stored) }, [storageKey])
    const open = openProp ?? uncontrolled
    const [collapsible, setCollapsible] = React.useState<SidebarContextValue["collapsible"]>("offcanvas")
    const [side, setSide] = React.useState<"start" | "end">("start")

    const setOpen = React.useCallback(
      (next: boolean) => {
        if (openProp === undefined) setUncontrolled(next)
        onOpenChange?.(next)
        if (storageKey) {
          try {
            localStorage.setItem(storageKey, String(next))
          } catch {
            // storage unavailable: the state just isn't remembered
          }
        }
      },
      [openProp, onOpenChange, storageKey],
    )

    const triggerRef = React.useRef<HTMLElement | null>(null)
    const toggleSidebar = React.useCallback(() => {
      if (isMobile) { triggerRef.current = document.activeElement as HTMLElement; setOpenMobile(o => !o) }
      else setOpen(!open)
    }, [isMobile, open, setOpen])

    // ⌘/Ctrl+B — but not while typing (Ctrl+B is bold in an editor).
    React.useEffect(() => {
      if (!shortcut) return
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.defaultPrevented || isEditable(event.target)) return
        if (event.key.toLowerCase() === shortcut && (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey) {
          event.preventDefault()
          toggleSidebar()
        }
      }
      window.addEventListener("keydown", onKeyDown)
      return () => window.removeEventListener("keydown", onKeyDown)
    }, [shortcut, toggleSidebar])

    // The page direction decides which physical edge "start" is.
    const wrapperRef = React.useRef<HTMLDivElement | null>(null)
    const [dir, setDir] = React.useState<Dir>("ltr")
    React.useLayoutEffect(() => {
      setDir(getDirection(wrapperRef.current))
    }, [theme.direction, props.dir])

    const state: SidebarState = open ? "expanded" : "collapsed"
    const value = React.useMemo<SidebarContextValue>(
      () => ({ state, open, setOpen, openMobile, setOpenMobile, isMobile, toggleSidebar, triggerRef, dir, collapsible, setCollapsible, side, setSide }),
      [state, open, setOpen, openMobile, isMobile, toggleSidebar, dir, collapsible, side],
    )

    return (
      <RaxThemeBoundary value={{ ...theme, direction: dir }}>
      <SidebarContext.Provider value={value}>
        <div
          ref={(node) => {
            wrapperRef.current = node
            assignRef(ref, node)
          }}
          className={cn("rax-sidebar-wrapper", className)}
          data-state={state}
          {...raxThemeAttributes(theme)}
          dir={props.dir}
          {...props}
        >
          {children}
        </div>
      </SidebarContext.Provider>
      </RaxThemeBoundary>
    )
  },
)
SidebarProvider.displayName = "SidebarProvider"

// ---- Sidebar ---------------------------------------------------------------------------

export interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: "start" | "end"
  variant?: "sidebar" | "floating" | "inset"
  collapsible?: "offcanvas" | "icon" | "none"
  /** Accessible name for the navigation landmark. */
  label?: string
  description?: string
}

const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
  ({ side = "start", variant = "sidebar", collapsible = "offcanvas", label = "Sidebar", description = "Navigation", className, children, ...props }, ref) => {
    const { state, isMobile, openMobile, setOpenMobile, triggerRef, setCollapsible, setSide } = useSidebar()

    React.useLayoutEffect(() => {
      setCollapsible(collapsible)
      setSide(side)
    }, [collapsible, side, setCollapsible, setSide])

    if (collapsible === "none") {
      return (
        <div ref={ref} className={cn("rax-sidebar", className)} data-collapsible="none" data-variant={variant} data-side={side} {...props}>
          <nav className="rax-sidebar-inner" aria-label={label}>
            {children}
          </nav>
        </div>
      )
    }

    if (isMobile) {
      return (
        <Sheet open={openMobile} onOpenChange={setOpenMobile}>
          <SheetContent side={side} showCloseButton={false} className="rax-sidebar-sheet" onCloseAutoFocus={event => { event.preventDefault(); triggerRef.current?.focus() }}>
            <SheetTitle className="visually-hidden">{label}</SheetTitle>
            <SheetDescription className="visually-hidden">{description}</SheetDescription>
            <nav className="rax-sidebar-inner" aria-label={label} data-mobile="">
              {children}
            </nav>
          </SheetContent>
        </Sheet>
      )
    }

    return (
      <div
        ref={ref}
        className={cn("rax-sidebar", className)}
        data-state={state}
        data-collapsible={state === "collapsed" ? collapsible : ""}
        data-variant={variant}
        data-side={side}
        {...props}
      >
        <nav className="rax-sidebar-inner" aria-label={label} {...inert(state === "collapsed" && collapsible === "offcanvas")}>
          {children}
        </nav>
      </div>
    )
  },
)
Sidebar.displayName = "Sidebar"

const PanelIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="4" width="18" height="16" rx="3" />
    <path d="M9 4v16" />
  </svg>
)

const SidebarTrigger = React.forwardRef<HTMLButtonElement, React.ComponentProps<typeof Button>>(({ className, onClick, ...props }, ref) => {
  const { toggleSidebar, open, openMobile, isMobile } = useSidebar()
  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon-sm"
      className={cn("rax-sidebar-trigger", className)}
      aria-label="Toggle sidebar"
      aria-expanded={isMobile ? openMobile : open}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) toggleSidebar()
      }}
      {...props}
    >
      <PanelIcon />
    </Button>
  )
})
SidebarTrigger.displayName = "SidebarTrigger"

/** A thin strip on the sidebar's inner edge: click to collapse or expand. */
const SidebarRail = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(({ className, ...props }, ref) => {
  const { toggleSidebar, open } = useSidebar()
  return (
    <button
      ref={ref}
      type="button"
      tabIndex={-1}
      aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
      title={open ? "Collapse" : "Expand"}
      className={cn("rax-sidebar-rail", className)}
      onClick={toggleSidebar}
      {...props}
    />
  )
})
SidebarRail.displayName = "SidebarRail"

const SidebarInset = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(({ className, ...props }, ref) => (
  <main ref={ref} className={cn("rax-sidebar-inset", className)} {...props} />
))
SidebarInset.displayName = "SidebarInset"

// ---- Layout parts ---------------------------------------------------------------------

const part = (name: string, tag: "div" | "ul" | "li" = "div") => {
  const Part = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(({ className, ...props }, ref) =>
    React.createElement(tag, { ref, className: cn(`rax-sidebar-${name}`, className), "data-sidebar": name, ...props }),
  )
  Part.displayName = `Sidebar${name.replace(/(^|-)(\w)/g, (_, __, c: string) => c.toUpperCase())}`
  return Part
}

const SidebarHeader = part("header")
const SidebarFooter = part("footer")
const SidebarGroup = part("group")
const SidebarGroupContent = part("group-content")
const SidebarMenu = part("menu", "ul")
const SidebarMenuItem = part("menu-item", "li")

const SidebarSeparator = ({ className, ...props }: React.HTMLAttributes<HTMLHRElement>) => (
  <hr className={cn("rax-sidebar-separator", className)} {...props} />
)

const SidebarInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn("form-control form-control-sm rax-sidebar-input", className)} {...props} />
))
SidebarInput.displayName = "SidebarInput"

const hoverItems = "[data-sidebar=menu-button], .rax-sidebar-menu-sub-button"

/** Scrolling middle part. Holds the highlight that glides to the active item and the pill that follows the pointer. */
const SidebarContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, onPointerOver, onPointerOut, onScroll, ...props }, ref) => {
  const contentRef = React.useRef<HTMLDivElement | null>(null)
  const { dir } = useSidebar()
  useActiveHighlight(contentRef, dir)

  // Hover pill: appears in place, then glides from item to item (like the navbar's hover).
  const handlePointerOver = (event: React.PointerEvent<HTMLDivElement>) => {
    onPointerOver?.(event)
    const content = event.currentTarget
    const button = (event.target as Element).closest<HTMLElement>(hoverItems)
    if (!button || button.closest(".rax-sidebar-content") !== content || button.matches("[aria-disabled=true], :disabled")) return
    const box = button.getBoundingClientRect()
    const origin = content.getBoundingClientRect()
    const set = () => {
      content.style.setProperty("--rax-sidebar-hover-x", `${box.left - origin.left + content.scrollLeft}px`)
      content.style.setProperty("--rax-sidebar-hover-y", `${box.top - origin.top + content.scrollTop}px`)
      content.style.setProperty("--rax-sidebar-hover-w", `${box.width}px`)
      content.style.setProperty("--rax-sidebar-hover-h", `${box.height}px`)
    }
    if (content.hasAttribute("data-hover")) set()
    else withoutTransition(content.querySelector<HTMLElement>(":scope > .rax-sidebar-hover"), set)
    content.setAttribute("data-hover", "")
  }
  const handlePointerOut = (event: React.PointerEvent<HTMLDivElement>) => {
    onPointerOut?.(event)
    const next = (event.relatedTarget as Element | null)?.closest?.(hoverItems)
    if (next?.closest(".rax-sidebar-content") !== event.currentTarget) event.currentTarget.removeAttribute("data-hover")
  }
  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    onScroll?.(event)
    event.currentTarget.removeAttribute("data-hover")
  }

  return (
    <div
      ref={(node) => {
        contentRef.current = node
        assignRef(ref, node)
      }}
      className={cn("rax-sidebar-content", className)}
      data-sidebar="content"
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onScroll={handleScroll}
      {...props}
    >
      <span className="rax-sidebar-hover" aria-hidden="true" />
      <span className="rax-sidebar-highlight" aria-hidden="true" />
      {children}
    </div>
  )
  },
)
SidebarContent.displayName = "SidebarContent"

/**
 * Places the highlight behind the active top-level menu button. It follows
 * size changes (collapsing, scrolling) instantly and glides only when a
 * different item becomes active.
 */
function useActiveHighlight(contentRef: React.RefObject<HTMLDivElement | null>, direction: Dir) {
  React.useLayoutEffect(() => {
    const content = contentRef.current
    if (!content) return
    let last: Element | null = null
    let frame = 0
    let instant = false // set by size changes, which must not lag behind

    const place = () => {
      const active = Array.from(content.querySelectorAll<HTMLElement>("[data-sidebar=menu-button][data-active]")).find(
        (el) => el.closest(".rax-sidebar-content") === content && el.offsetParent !== null,
      )
      if (!active) {
        content.removeAttribute("data-highlight")
        last = null
        return
      }
      const box = active.getBoundingClientRect()
      const origin = content.getBoundingClientRect()
      const set = () => {
        content.style.setProperty("--rax-sidebar-hl-x", `${box.left - origin.left + content.scrollLeft}px`)
        content.style.setProperty("--rax-sidebar-hl-y", `${box.top - origin.top + content.scrollTop}px`)
        content.style.setProperty("--rax-sidebar-hl-w", `${box.width}px`)
        content.style.setProperty("--rax-sidebar-hl-h", `${box.height}px`)
      }
      // Glide only when another item became active; otherwise follow at once.
      if (last !== null && last !== active && !instant) set()
      else withoutTransition(content.querySelector<HTMLElement>(":scope > .rax-sidebar-highlight"), set)
      instant = false
      content.setAttribute("data-highlight", "")
      last = active
    }
    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(place)
    }

    place()
    const mutations = new MutationObserver(schedule)
    mutations.observe(content, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-active", "data-state"] })
    const resizes = new ResizeObserver(() => {
      instant = true
      place()
    })
    resizes.observe(content)
    content.querySelectorAll("[data-sidebar=menu]").forEach((menu) => resizes.observe(menu))
    return () => {
      mutations.disconnect()
      resizes.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [contentRef, direction])
}

const SidebarGroupLabel = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { asChild?: boolean }>(
  ({ className, asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : "div"
    return <Comp ref={ref} className={cn("rax-sidebar-group-label", className)} data-sidebar="group-label" {...props} />
  },
)
SidebarGroupLabel.displayName = "SidebarGroupLabel"

const SidebarGroupAction = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }>(
  ({ className, asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : "button"}
        className={cn("rax-sidebar-group-action", className)}
        data-sidebar="group-action"
        {...props}
      />
    )
  },
)
SidebarGroupAction.displayName = "SidebarGroupAction"

// ---- Menu buttons ------------------------------------------------------------------------

export interface SidebarMenuButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  isActive?: boolean
  /** Shown beside the icon when the sidebar is folded to icons. */
  tooltip?: React.ReactNode
  size?: "sm" | "default" | "lg"
}

const SidebarMenuButton = React.forwardRef<HTMLButtonElement, SidebarMenuButtonProps>(
  ({ asChild, isActive, tooltip, size = "default", className, ...props }, ref) => {
    const { state, isMobile, collapsible, side, dir } = useSidebar()
    const Comp = asChild ? Slot : "button"
    const button = (
      <Comp
        ref={ref}
        type={asChild ? undefined : "button"}
        className={cn("rax-sidebar-menu-button", className)}
        data-sidebar="menu-button"
        data-size={size}
        data-active={isActive ? "" : undefined}
        aria-current={isActive ? "page" : undefined}
        {...props}
      />
    )
    if (!tooltip) return button
    // Always wrapped, so the button isn't remounted when the sidebar folds.
    const folded = state === "collapsed" && collapsible === "icon" && !isMobile
    const physicalEnd = (side === "start") === (dir === "ltr") ? "right" : "left"
    return (
      <Tooltip content={tooltip} side={physicalEnd} open={folded ? undefined : false}>
        {button}
      </Tooltip>
    )
  },
)
SidebarMenuButton.displayName = "SidebarMenuButton"

const SidebarMenuAction = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean; showOnHover?: boolean }
>(({ className, asChild, showOnHover, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    <Comp
      ref={ref}
      type={asChild ? undefined : "button"}
      className={cn("rax-sidebar-menu-action", className)}
      data-sidebar="menu-action"
      data-show-on-hover={showOnHover ? "" : undefined}
      {...props}
    />
  )
})
SidebarMenuAction.displayName = "SidebarMenuAction"

const SidebarMenuBadge = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
  <span className={cn("rax-sidebar-menu-badge", className)} data-sidebar="menu-badge" {...props} />
)

const SidebarMenuSkeleton = ({ showIcon = true, className, ...props }: React.HTMLAttributes<HTMLDivElement> & { showIcon?: boolean }) => {
  // A stable, slightly different width per row.
  const width = "70%"
  return (
    <div className={cn("rax-sidebar-menu-skeleton", className)} data-sidebar="menu-skeleton" {...props}>
      {showIcon && <Skeleton className="rax-sidebar-skeleton-icon" />}
      <Skeleton className="rax-sidebar-skeleton-text" style={{ maxWidth: width }} />
    </div>
  )
}

const SidebarMenuSub = part("menu-sub", "ul")
const SidebarMenuSubItem = part("menu-sub-item", "li")

const SidebarMenuSubButton = React.forwardRef<
  HTMLAnchorElement,
  React.AnchorHTMLAttributes<HTMLAnchorElement> & { asChild?: boolean; isActive?: boolean; size?: "sm" | "default" }
>(({ asChild, isActive, size = "default", className, ...props }, ref) => {
  const Comp = asChild ? Slot : "a"
  return (
    <Comp
      ref={ref}
      className={cn("rax-sidebar-menu-sub-button", className)}
      data-sidebar="menu-sub-button"
      data-size={size}
      data-active={isActive ? "" : undefined}
      aria-current={isActive ? "page" : undefined}
      {...props}
    />
  )
})
SidebarMenuSubButton.displayName = "SidebarMenuSubButton"

const ChevronIcon = () => (
  <svg
    className="rax-sidebar-chevron"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="m9 18 6-6-6-6" />
  </svg>
)

export interface SidebarMenuCollapsibleProps extends Omit<React.LiHTMLAttributes<HTMLLIElement>, "title"> {
  icon?: React.ReactNode
  title: React.ReactNode
  defaultOpen?: boolean
  isActive?: boolean
  tooltip?: React.ReactNode
}

/**
 * A menu item that opens a sub-list in place (height animates). When the
 * sidebar is folded to icons, clicking it expands the sidebar and opens it.
 */
function SidebarMenuCollapsible({
  icon,
  title,
  defaultOpen = false,
  isActive,
  tooltip,
  className,
  children,
  ...props
}: SidebarMenuCollapsibleProps) {
  const { state, setOpen: setSidebarOpen, collapsible, isMobile } = useSidebar()
  const [open, setOpen] = React.useState(defaultOpen)
  const id = React.useId()
  const folded = state === "collapsed" && collapsible === "icon" && !isMobile
  return (
    <SidebarMenuItem className={cn("rax-sidebar-collapsible", className)} data-state={open ? "open" : "closed"} {...props}>
      <SidebarMenuButton
        isActive={isActive}
        tooltip={tooltip ?? title}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => {
          if (folded) {
            setSidebarOpen(true)
            setOpen(true)
          } else setOpen((o) => !o)
        }}
      >
        {icon}
        <span>{title}</span>
        <ChevronIcon />
      </SidebarMenuButton>
      <div className="rax-sidebar-collapsible-body" id={id} {...inert(!open || folded)}>
        <div>
          <SidebarMenuSub>{children}</SidebarMenuSub>
        </div>
      </div>
    </SidebarMenuItem>
  )
}

export {
  SidebarProvider,
  Sidebar,
  SidebarTrigger,
  SidebarRail,
  SidebarInset,
  SidebarHeader,
  SidebarFooter,
  SidebarContent,
  SidebarSeparator,
  SidebarInput,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarMenuCollapsible,
  useSidebar,
}
