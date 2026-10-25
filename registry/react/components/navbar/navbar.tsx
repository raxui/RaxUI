"use client"

// Built-in SVG paths from Lucide (ISC). Ported from boot-ui.
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"

import { MenuToggle, type MenuToggleProps } from "@/components/ui/menu-toggle"
import { useSheenTheme, sheenThemeAttributes, type SheenAppearance } from "@/lib/theme"
import { cn } from "@/lib/utils"
import { withoutTransition } from "@/lib/app-shell-utils"
import { inert } from "@/lib/app-shell-utils"
import { assignRef } from "@/lib/refs"

// -----------------------------------------------------------------------------
// Navbar — a site's top bar.
//
//   <Navbar variant="transparent" hideOnScroll>
//     <NavbarBrand href="/">SheenUI</NavbarBrand>
//     <NavbarLinks label="Main">
//       <NavbarLink href="/docs" active>Docs</NavbarLink>
//       <NavbarLink href="/blog">Blog</NavbarLink>
//     </NavbarLinks>
//     <NavbarActions>…buttons…</NavbarActions>
//     <NavbarToggle />
//     <NavbarMenu>
//       <NavbarMenuLink href="/docs" active>Docs</NavbarMenuLink>
//     </NavbarMenu>
//   </Navbar>
//
// variant: "glass" (always) · "transparent" (clear over the hero, glass once
// you scroll) · "solid". `floating` detaches it into a rounded bar. A soft
// highlight follows the pointer across the links and an indicator glides under
// the current page. Below `expand` the links fold into NavbarMenu, opened by
// NavbarToggle; Esc, a link or growing past the breakpoint closes it.
// NavigationMenu works inside NavbarLinks' place for mega menus.
// -----------------------------------------------------------------------------

type Expand = "sm" | "md" | "lg" | "always" | "never"
const COLLAPSED_QUERY: Record<Expand, string | null> = {
  sm: "(max-width: 575.98px)",
  md: "(max-width: 767.98px)",
  lg: "(max-width: 991.98px)",
  always: null,
  never: "all",
}

interface NavbarContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  menuId: string
  direction?: string
}

const NavbarContext = React.createContext<NavbarContextValue | null>(null)

function useNavbar() {
  const context = React.useContext(NavbarContext)
  if (!context) throw new Error("Navbar parts must be used inside <Navbar>.")
  return context
}

export interface NavbarProps extends React.HTMLAttributes<HTMLElement> {
  appearance?: SheenAppearance
  variant?: "glass" | "transparent" | "solid"
  /** A rounded bar with a gap around it instead of a full-width strip. */
  floating?: boolean
  /** Slide away while scrolling down, come back on the way up. */
  hideOnScroll?: boolean
  /** Width below which the links fold into the menu. */
  expand?: Expand
  /** Scrolling element to watch instead of the window (e.g. a scrolling panel). */
  scrollContainer?: React.RefObject<HTMLElement | null>
  /** Max width of the bar's content. */
  maxWidth?: string
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

const Navbar = React.forwardRef<HTMLElement, NavbarProps>(
  (
    {
      appearance,
      variant = "glass",
      floating = false,
      hideOnScroll = false,
      expand = "md",
      scrollContainer,
      maxWidth,
      open: openProp,
      defaultOpen = false,
      onOpenChange,
      className,
      style,
      children,
      ...props
    },
    ref,
  ) => {
    const theme = useSheenTheme({ appearance })
    const [uncontrolled, setUncontrolled] = React.useState(defaultOpen)
    const open = openProp ?? uncontrolled
    const setOpen = React.useCallback(
      (next: boolean) => {
        if (openProp === undefined) setUncontrolled(next)
        onOpenChange?.(next)
      },
      [openProp, onOpenChange],
    )
    const menuId = React.useId()
    const navRef = React.useRef<HTMLElement | null>(null)
    const [scrolled, setScrolled] = React.useState(false)
    const [hidden, setHidden] = React.useState(false)

    // Scroll: glass once off the top; hide going down, show going up.
    React.useEffect(() => {
      const target: HTMLElement | Window = scrollContainer?.current ?? window
      const read = () => (target instanceof Window ? target.scrollY : target.scrollTop)
      let last = read()
      const onScroll = () => {
        const y = read()
        setScrolled(y > 4)
        if (hideOnScroll) {
          const height = navRef.current?.offsetHeight ?? 64
          if (y > last + 4 && y > height) setHidden(true)
          else if (y < last - 4 || y <= height) setHidden(false)
        }
        last = y
      }
      onScroll()
      target.addEventListener("scroll", onScroll, { passive: true })
      return () => target.removeEventListener("scroll", onScroll)
    }, [scrollContainer, hideOnScroll])

    // Close the menu on Esc and when the bar grows past the breakpoint.
    React.useEffect(() => {
      if (!open) return
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") { setOpen(false); navRef.current?.querySelector<HTMLButtonElement>(".sheen-navbar-toggle")?.focus() }
      }
      const query = COLLAPSED_QUERY[expand]
      const media = query ? window.matchMedia(query) : null
      const onMedia = () => media && !media.matches && setOpen(false)
      document.addEventListener("keydown", onKeyDown)
      media?.addEventListener("change", onMedia)
      return () => {
        document.removeEventListener("keydown", onKeyDown)
        media?.removeEventListener("change", onMedia)
      }
    }, [open, expand, setOpen])

    const value = React.useMemo(() => ({ open, setOpen, menuId, direction: props.dir ?? theme.direction }), [open, setOpen, menuId, props.dir, theme.direction])

    return (
      <NavbarContext.Provider value={value}>
        <header
          ref={(node) => {
            navRef.current = node
            assignRef(ref, node)
          }}
          className={cn("sheen-navbar", className)}
          data-variant={variant}
          data-expand={expand}
          data-floating={floating ? "" : undefined}
          data-scrolled={scrolled ? "" : undefined}
          data-hidden={hidden && !open ? "" : undefined}
          data-open={open ? "" : undefined}
          style={maxWidth ? ({ "--sheen-navbar-max": maxWidth, ...style } as React.CSSProperties) : style}
          {...sheenThemeAttributes(theme)}
          dir={props.dir}
          {...props}
        >
          <div className="sheen-navbar-bar">{children}</div>
        </header>
      </NavbarContext.Provider>
    )
  },
)
Navbar.displayName = "Navbar"

const NavbarBrand = React.forwardRef<HTMLAnchorElement, React.AnchorHTMLAttributes<HTMLAnchorElement> & { asChild?: boolean }>(
  ({ className, asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : "a"
    return <Comp ref={ref} className={cn("sheen-navbar-brand", className)} {...props} />
  },
)
NavbarBrand.displayName = "NavbarBrand"

// ---- Links: hover highlight + current-page indicator -----------------------------------

export interface NavbarLinksProps extends React.HTMLAttributes<HTMLElement> {
  /** Accessible name of the navigation landmark. */
  label?: string
  /** Where the links sit: after the brand, or centred in the bar. */
  align?: "start" | "center"
}

const NavbarLinks = React.forwardRef<HTMLElement, NavbarLinksProps>(
  ({ label = "Main", align = "start", className, children, ...props }, ref) => {
    // The nav is the positioned box the highlight and indicator are measured in.
    const { direction } = useNavbar()
    const listRef = React.useRef<HTMLElement | null>(null)

    // Hover highlight follows the pointer from link to link.
    const onPointerOver = (event: React.PointerEvent) => {
      const list = listRef.current
      const link = (event.target as HTMLElement).closest<HTMLElement>(".sheen-navbar-link")
      if (!list || !link || !list.contains(link)) return
      const set = () => {
        list.style.setProperty("--sheen-navbar-hover-x", `${link.offsetLeft}px`)
        list.style.setProperty("--sheen-navbar-hover-w", `${link.offsetWidth}px`)
      }
      // Appears in place on entering the links, then glides from link to link.
      if (list.hasAttribute("data-hover")) set()
      else withoutTransition(list.querySelector<HTMLElement>(":scope > .sheen-navbar-hover"), set)
      list.setAttribute("data-hover", "")
    }
    const onPointerLeave = () => listRef.current?.removeAttribute("data-hover")

    // The indicator sits under the current page and glides when it changes.
    React.useLayoutEffect(() => {
      const list = listRef.current
      if (!list) return
      let last: Element | null = null
      let instant = false
      const place = () => {
        const current = list.querySelector<HTMLElement>(".sheen-navbar-link[aria-current=page]")
        if (!current) {
          list.removeAttribute("data-current")
          last = null
          return
        }
        const set = () => {
          list.style.setProperty("--sheen-navbar-current-x", `${current.offsetLeft}px`)
          list.style.setProperty("--sheen-navbar-current-w", `${current.offsetWidth}px`)
        }
        if (last !== null && last !== current && !instant) set()
        else withoutTransition(list.querySelector<HTMLElement>(":scope > .sheen-navbar-current"), set)
        instant = false
        list.setAttribute("data-current", "")
        last = current
      }
      place()
      const mutations = new MutationObserver(place)
      mutations.observe(list, { subtree: true, childList: true, attributes: true, attributeFilter: ["aria-current"] })
      const resizes = new ResizeObserver(() => {
        instant = true
        place()
      })
      resizes.observe(list)
      return () => {
        mutations.disconnect()
        resizes.disconnect()
      }
    }, [direction])

    return (
      <nav
        ref={(node) => {
          listRef.current = node
          assignRef(ref, node)
        }}
        aria-label={label}
        className={cn("sheen-navbar-links", className)}
        data-align={align}
        onPointerOver={onPointerOver}
        onPointerLeave={onPointerLeave}
        {...props}
      >
        <span className="sheen-navbar-hover" aria-hidden="true" />
        <span className="sheen-navbar-current" aria-hidden="true" />
        <ul>{children}</ul>
      </nav>
    )
  },
)
NavbarLinks.displayName = "NavbarLinks"

export interface NavbarLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  asChild?: boolean
  /** The current page (aria-current="page"). */
  active?: boolean
}

const NavbarLink = React.forwardRef<HTMLAnchorElement, NavbarLinkProps>(({ className, asChild, active, ...props }, ref) => {
  const Comp = asChild ? Slot : "a"
  return (
    <li>
      <Comp ref={ref} className={cn("sheen-navbar-link", className)} aria-current={active ? "page" : undefined} {...props} />
    </li>
  )
})
NavbarLink.displayName = "NavbarLink"

/** Buttons and the like at the end of the bar. `collapse` moves them out of the bar on small screens. */
const NavbarActions = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { collapse?: boolean }>(
  ({ className, collapse, ...props }, ref) => (
    <div ref={ref} className={cn("sheen-navbar-actions", className)} data-collapse={collapse ? "" : undefined} {...props} />
  ),
)
NavbarActions.displayName = "NavbarActions"

// ---- Small screens -------------------------------------------------------------------------

const NavbarToggle = React.forwardRef<HTMLButtonElement, Omit<MenuToggleProps, "open" | "onOpenChange">>(({ className, ...props }, ref) => {
  const { open, setOpen, menuId } = useNavbar()
  return (
    <MenuToggle
      ref={ref}
      open={open}
      onOpenChange={setOpen}
      aria-controls={menuId}
      aria-label="Menu"
      className={cn("sheen-navbar-toggle", className)}
      {...props}
    />
  )
})
NavbarToggle.displayName = "NavbarToggle"

/** The panel that drops under the bar on small screens. Items rise in one after another. */
const NavbarMenu = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { label?: string }>(
  ({ className, label = "Menu", children, ...props }, ref) => {
    const { open, menuId } = useNavbar()
    const items = React.Children.toArray(children)
    return (
      <div
        ref={ref}
        id={menuId}
        className={cn("sheen-navbar-menu", className)}
        data-state={open ? "open" : "closed"}
        {...inert(!open)}
        {...props}
      >
        <div className="sheen-navbar-menu-clip">
          <nav aria-label={label} className="sheen-navbar-menu-body">
            {items.map((child, i) => (
              <div key={i} className="sheen-navbar-menu-item" style={{ "--sheen-i": i } as React.CSSProperties}>
                {child}
              </div>
            ))}
          </nav>
        </div>
      </div>
    )
  },
)
NavbarMenu.displayName = "NavbarMenu"

const NavbarMenuLink = React.forwardRef<HTMLAnchorElement, NavbarLinkProps>(({ className, asChild, active, onClick, ...props }, ref) => {
  const { setOpen } = useNavbar()
  const Comp = asChild ? Slot : "a"
  return (
    <Comp
      ref={ref}
      className={cn("sheen-navbar-menu-link", className)}
      aria-current={active ? "page" : undefined}
      // Close even when the handler prevents the default: client-side routers do.
      onClick={(event: React.MouseEvent<HTMLAnchorElement>) => {
        onClick?.(event)
        setOpen(false)
      }}
      {...props}
    />
  )
})
NavbarMenuLink.displayName = "NavbarMenuLink"

export { Navbar, NavbarBrand, NavbarLinks, NavbarLink, NavbarActions, NavbarToggle, NavbarMenu, NavbarMenuLink, useNavbar }
