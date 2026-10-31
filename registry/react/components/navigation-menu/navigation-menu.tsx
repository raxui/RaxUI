"use client"

// Built-in SVG paths from Lucide (ISC). Ported from boot-ui.
import * as React from "react"
import * as NavigationMenuPrimitive from "@radix-ui/react-navigation-menu"

import { useRaxTheme, raxThemeAttributes, type RaxAppearance } from "@/lib/theme"
import { cn } from "@/lib/utils"
import { withoutTransition } from "@/lib/app-shell-utils"
import { getDirection } from "@/lib/direction"
import { useMergedRef } from "@/lib/refs"

// -----------------------------------------------------------------------------
// NavigationMenu — a site header's links with mega-menu panels (on
// Radix NavigationMenu).
//
//   <NavigationMenu>
//     <NavigationMenuList>
//       <NavigationMenuItem>
//         <NavigationMenuTrigger>Products</NavigationMenuTrigger>
//         <NavigationMenuContent>
//           <ul className="rax-nav-grid">
//             <NavigationMenuListItem href="/ui" title="UI kit" description="…" icon={<Icon />} />
//           </ul>
//         </NavigationMenuContent>
//       </NavigationMenuItem>
//       <NavigationMenuItem>
//         <NavigationMenuLink href="/docs" className={navigationMenuTriggerStyle()}>Docs</NavigationMenuLink>
//       </NavigationMenuItem>
//     </NavigationMenuList>
//   </NavigationMenu>
//
// One glass panel (the viewport) holds every menu: moving between triggers, it
// glides under the new trigger and morphs to the new content's size while the
// content slides in from the side you came from. Hover or click to open; arrow
// keys move along the bar and follow the page direction in RTL.
//
// The panel drops over the page, so the header holding the menu must sit
// above later content: give it position: relative and a z-index if anything
// after it creates a stacking context (glass surfaces with backdrop-filter do).
// -----------------------------------------------------------------------------

const ChevronDownIcon = () => (
  <svg
    className="rax-nav-chevron"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.25}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
)

export interface NavigationMenuProps extends React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Root> {
  /** Render the shared panel. Turn off to position each NavigationMenuContent yourself. */
  appearance?: RaxAppearance
  viewport?: boolean
  /** Align the panel with the open trigger's logical start (clamped to the window), or the start of the bar. */
  viewportAlign?: "trigger" | "start"
}

const NavigationMenu = React.forwardRef<React.ElementRef<typeof NavigationMenuPrimitive.Root>, NavigationMenuProps>(
  ({ appearance, className, children, viewport = true, viewportAlign = "trigger", dir, ...props }, ref) => {
    const theme = useRaxTheme({ appearance, direction: dir })
    const rootRef = React.useRef<HTMLElement>(null)
    const composedRef = useMergedRef(ref, rootRef)

    // Radix reads the direction from a provider only; pick it up from the page.
    const [pageDir, setPageDir] = React.useState<"ltr" | "rtl">()
    React.useLayoutEffect(() => {
      if (dir) return
      // From the parent: the root carries the dir we give it.
      setPageDir(getDirection(rootRef.current?.parentElement))
    }, [dir, theme.direction])

    useViewportPlacement(rootRef, viewport && viewportAlign === "trigger", dir ?? pageDir ?? theme.direction)

    return (
      <NavigationMenuPrimitive.Root
        ref={composedRef}
        className={cn("rax-nav", className)}
        {...raxThemeAttributes(theme)}
        dir={dir ?? pageDir ?? theme.direction}
        data-viewport={viewport ? viewportAlign : undefined}
        {...props}
      >
        {children}
        {viewport && <NavigationMenuViewport />}
      </NavigationMenuPrimitive.Root>
    )
  },
)
NavigationMenu.displayName = NavigationMenuPrimitive.Root.displayName

/**
 * Aligns the panel with the open trigger's logical start, kept 8px inside the window. The
 * first placement after opening is instant; later ones glide.
 */
function useViewportPlacement(rootRef: React.RefObject<HTMLElement | null>, enabled: boolean, direction?: string) {
  React.useLayoutEffect(() => {
    const root = rootRef.current
    if (!root || !enabled) return
    const wrap = root.querySelector<HTMLElement>(":scope > .rax-nav-viewport-wrap")
    if (!wrap) return
    let wasOpen = false

    const place = () => {
      // The panel only exists while a menu is open.
      const viewport = wrap.querySelector<HTMLElement>(".rax-nav-viewport")
      const trigger = root.querySelector<HTMLElement>(".rax-nav-trigger[data-state=open]")
      const width = parseFloat(viewport?.style.getPropertyValue("--radix-navigation-menu-viewport-width") ?? "")
      if (!trigger || !width) {
        if (!trigger) wasOpen = false
        return
      }
      const rootBox = root.getBoundingClientRect()
      const triggerBox = trigger.getBoundingClientRect()
      const start = direction === "rtl" ? triggerBox.right - width : triggerBox.left
      const left = Math.max(8, Math.min(start, window.innerWidth - 8 - width))
      const set = () => wrap.style.setProperty("--rax-nav-viewport-x", `${Math.round(left - rootBox.left)}px`)
      if (wasOpen) set()
      else withoutTransition(wrap, set)
      wasOpen = true
    }

    place()
    const sizes = new ResizeObserver(place)
    sizes.observe(root)
    root.querySelectorAll(".rax-nav-trigger").forEach(trigger => sizes.observe(trigger))
    // A trigger opens or closes, or the panel learns its new content's size.
    const mutations = new MutationObserver((records) => {
      if (records.some((r) => r.attributeName === "data-state" || (r.target as Element).classList.contains("rax-nav-viewport"))) place()
    })
    mutations.observe(root, { subtree: true, attributes: true, attributeFilter: ["data-state", "style"] })
    window.addEventListener("resize", place)
    return () => {
      mutations.disconnect()
      sizes.disconnect()
      window.removeEventListener("resize", place)
    }
  }, [rootRef, enabled, direction])
}

const NavigationMenuList = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.List>
>(({ className, ...props }, ref) => <NavigationMenuPrimitive.List ref={ref} className={cn("rax-nav-list", className)} {...props} />)
NavigationMenuList.displayName = NavigationMenuPrimitive.List.displayName

const NavigationMenuItem = NavigationMenuPrimitive.Item

/** Class names for a top-level link that should look like a trigger. */
function navigationMenuTriggerStyle(className?: string) {
  return cn("rax-nav-trigger", className)
}

const NavigationMenuTrigger = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <NavigationMenuPrimitive.Trigger ref={ref} className={navigationMenuTriggerStyle(className)} {...props}>
    {children}
    <ChevronDownIcon />
  </NavigationMenuPrimitive.Trigger>
))
NavigationMenuTrigger.displayName = NavigationMenuPrimitive.Trigger.displayName

const NavigationMenuContent = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Content>
>(({ className, ...props }, ref) => <NavigationMenuPrimitive.Content ref={ref} className={cn("rax-nav-content", className)} {...props} />)
NavigationMenuContent.displayName = NavigationMenuPrimitive.Content.displayName

const NavigationMenuViewport = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <div className="rax-nav-viewport-wrap">
    <NavigationMenuPrimitive.Viewport ref={ref} className={cn("rax-nav-viewport", className)} {...props} />
  </div>
))
NavigationMenuViewport.displayName = NavigationMenuPrimitive.Viewport.displayName

const NavigationMenuLink = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Link>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Link>
>(({ className, ...props }, ref) => <NavigationMenuPrimitive.Link ref={ref} className={cn("rax-nav-link", className)} {...props} />)
NavigationMenuLink.displayName = NavigationMenuPrimitive.Link.displayName

/** A small caret under the open trigger that slides along with it. */
const NavigationMenuIndicator = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Indicator>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Indicator>
>(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.Indicator ref={ref} className={cn("rax-nav-indicator", className)} {...props}>
    <span />
  </NavigationMenuPrimitive.Indicator>
))
NavigationMenuIndicator.displayName = NavigationMenuPrimitive.Indicator.displayName

export interface NavigationMenuListItemProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "title"> {
  title: React.ReactNode
  description?: React.ReactNode
  icon?: React.ReactNode
  /** Marks the current page (aria-current="page"). */
  active?: boolean
}

/** A row for a menu panel: icon, title and a line of description. Put it in a <ul>. */
const NavigationMenuListItem = React.forwardRef<HTMLAnchorElement, NavigationMenuListItemProps>(
  ({ title, description, icon, active, className, ...props }, ref) => (
    <li>
      <NavigationMenuPrimitive.Link asChild active={active}>
        <a ref={ref} className={cn("rax-nav-item-link", className)} {...props}>
          {icon && <span className="rax-nav-item-icon">{icon}</span>}
          <span className="rax-nav-item-text">
            <span className="rax-nav-item-title">{title}</span>
            {description && <span className="rax-nav-item-description">{description}</span>}
          </span>
        </a>
      </NavigationMenuPrimitive.Link>
    </li>
  ),
)
NavigationMenuListItem.displayName = "NavigationMenuListItem"

export {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenuLink,
  NavigationMenuListItem,
  NavigationMenuIndicator,
  NavigationMenuViewport,
  navigationMenuTriggerStyle,
}
