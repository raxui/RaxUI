"use client"

// Built-in SVG paths from Lucide (ISC). Ported from boot-ui.
import * as React from "react"
import * as MenubarPrimitive from "@radix-ui/react-menubar"

import { useSheenTheme, sheenThemeAttributes, SheenThemeBoundary, useSheenPortalContainer, type SheenAppearance } from "@/lib/theme"
import { cn } from "@/lib/utils"
import { withoutTransition } from "@/lib/app-shell-utils"
import { getDirection } from "@/lib/direction"
import { useMergedRef } from "@/lib/refs"

// -----------------------------------------------------------------------------
// Menubar — an app's File / Edit / View bar (on Radix Menubar).
// Menus use the Dropdown Menu glass and items (`sheen-dropdown-*`).
//
//   <Menubar>
//     <MenubarMenu>
//       <MenubarTrigger>File</MenubarTrigger>
//       <MenubarContent>
//         <MenubarItem>New tab<MenubarShortcut>⌘T</MenubarShortcut></MenubarItem>
//       </MenubarContent>
//     </MenubarMenu>
//   </Menubar>
//
// Once one menu is open, hovering or arrowing to its neighbours opens theirs,
// and a highlight glides from trigger to trigger. Arrow keys follow the page
// direction in RTL.
// -----------------------------------------------------------------------------

const CheckIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={3}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
)

const DotIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="12" cy="12" r="5" />
  </svg>
)

const ChevronRightIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.25}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="m9 18 6-6-6-6" />
  </svg>
)

const Menubar = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Root> & { appearance?: SheenAppearance }
>(({ appearance, className, dir, children, ...props }, ref) => {
  const theme = useSheenTheme({ appearance, direction: dir })
  const rootRef = React.useRef<HTMLDivElement>(null)
  const composedRef = useMergedRef(ref, rootRef)

  // Radix reads the direction from a provider only; pick it up from the page.
  const [pageDir, setPageDir] = React.useState<"ltr" | "rtl">()
  React.useLayoutEffect(() => {
    if (dir) return
    // From the parent: the root carries the dir we give it.
    setPageDir(getDirection(rootRef.current?.parentElement))
  }, [dir, theme.direction])

  useOpenHighlight(rootRef, dir ?? pageDir ?? theme.direction)

  return (
    <SheenThemeBoundary value={{ ...theme, direction: dir ?? pageDir ?? theme.direction }}>
    <MenubarPrimitive.Root {...sheenThemeAttributes(theme)} ref={composedRef} dir={dir ?? pageDir ?? theme.direction} className={cn("sheen-menubar", className)} {...props}>
      <span className="sheen-menubar-highlight" aria-hidden="true" />
      {children}
    </MenubarPrimitive.Root>
    </SheenThemeBoundary>
  )
})
Menubar.displayName = MenubarPrimitive.Root.displayName

/**
 * Puts the highlight behind the open trigger. It appears in place when a menu
 * opens and glides when you move to a neighbouring menu.
 */
function useOpenHighlight(rootRef: React.RefObject<HTMLDivElement | null>, direction?: string) {
  React.useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    let wasOpen = false

    const place = () => {
      const open = root.querySelector<HTMLElement>(":scope > .sheen-menubar-trigger[data-state=open]")
      if (!open) {
        root.removeAttribute("data-open")
        wasOpen = false
        return
      }
      const set = () => {
        root.style.setProperty("--sheen-menubar-x", `${open.offsetLeft}px`)
        root.style.setProperty("--sheen-menubar-w", `${open.offsetWidth}px`)
      }
      if (wasOpen) set()
      else withoutTransition(root.querySelector<HTMLElement>(":scope > .sheen-menubar-highlight"), set)
      root.setAttribute("data-open", "")
      wasOpen = true
    }

    place()
    const mutations = new MutationObserver(place)
    mutations.observe(root, { subtree: true, attributes: true, attributeFilter: ["data-state"] })
    return () => mutations.disconnect()
  }, [rootRef, direction])
}

const MenubarMenu = MenubarPrimitive.Menu

const MenubarGroup = MenubarPrimitive.Group

const MenubarPortal = (props: React.ComponentProps<typeof MenubarPrimitive.Portal>) => <MenubarPrimitive.Portal container={useSheenPortalContainer()} {...props} />

const MenubarSub = MenubarPrimitive.Sub

const MenubarRadioGroup = MenubarPrimitive.RadioGroup

const MenubarTrigger = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Trigger>
>(({ className, ...props }, ref) => <MenubarPrimitive.Trigger ref={ref} className={cn("sheen-menubar-trigger", className)} {...props} />)
MenubarTrigger.displayName = MenubarPrimitive.Trigger.displayName

const MenubarSubTrigger = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.SubTrigger> & { inset?: boolean }
>(({ className, inset, children, ...props }, ref) => (
  <MenubarPrimitive.SubTrigger ref={ref} className={cn("sheen-dropdown-item", inset && "sheen-dropdown-inset", className)} {...props}>
    {children}
    <ChevronRightIcon className="sheen-dropdown-chevron" />
  </MenubarPrimitive.SubTrigger>
))
MenubarSubTrigger.displayName = MenubarPrimitive.SubTrigger.displayName

const MenubarSubContent = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.SubContent>
>(({ className, sideOffset = 6, collisionPadding = 8, ...props }, ref) => (
  <MenubarPortal>
    <MenubarPrimitive.SubContent
      {...sheenThemeAttributes(useSheenTheme())}
      ref={ref}
      sideOffset={sideOffset}
      collisionPadding={collisionPadding}
      className={cn("sheen-dropdown-menu sheen-menubar-content", className)}
      {...props}
    />
  </MenubarPortal>
))
MenubarSubContent.displayName = MenubarPrimitive.SubContent.displayName

const MenubarContent = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Content>
>(({ className, align = "start", alignOffset = -4, sideOffset = 8, collisionPadding = 8, ...props }, ref) => (
  <MenubarPortal>
    <MenubarPrimitive.Content
      {...sheenThemeAttributes(useSheenTheme())}
      ref={ref}
      align={align}
      alignOffset={alignOffset}
      sideOffset={sideOffset}
      collisionPadding={collisionPadding}
      className={cn("sheen-dropdown-menu sheen-menubar-content", className)}
      {...props}
    />
  </MenubarPortal>
))
MenubarContent.displayName = MenubarPrimitive.Content.displayName

const MenubarItem = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Item> & {
    inset?: boolean
    variant?: "default" | "destructive"
  }
>(({ className, inset, variant = "default", ...props }, ref) => (
  <MenubarPrimitive.Item
    ref={ref}
    className={cn("sheen-dropdown-item", variant === "destructive" && "sheen-dropdown-item-destructive", inset && "sheen-dropdown-inset", className)}
    {...props}
  />
))
MenubarItem.displayName = MenubarPrimitive.Item.displayName

const MenubarCheckboxItem = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.CheckboxItem>
>(({ className, children, ...props }, ref) => (
  <MenubarPrimitive.CheckboxItem ref={ref} className={cn("sheen-dropdown-item sheen-dropdown-inset", className)} {...props}>
    <span className="sheen-dropdown-indicator">
      <MenubarPrimitive.ItemIndicator>
        <CheckIcon />
      </MenubarPrimitive.ItemIndicator>
    </span>
    {children}
  </MenubarPrimitive.CheckboxItem>
))
MenubarCheckboxItem.displayName = MenubarPrimitive.CheckboxItem.displayName

const MenubarRadioItem = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <MenubarPrimitive.RadioItem ref={ref} className={cn("sheen-dropdown-item sheen-dropdown-inset", className)} {...props}>
    <span className="sheen-dropdown-indicator">
      <MenubarPrimitive.ItemIndicator>
        <DotIcon />
      </MenubarPrimitive.ItemIndicator>
    </span>
    {children}
  </MenubarPrimitive.RadioItem>
))
MenubarRadioItem.displayName = MenubarPrimitive.RadioItem.displayName

const MenubarLabel = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Label> & { inset?: boolean }
>(({ className, inset, ...props }, ref) => (
  <MenubarPrimitive.Label ref={ref} className={cn("sheen-dropdown-label", inset && "sheen-dropdown-inset", className)} {...props} />
))
MenubarLabel.displayName = MenubarPrimitive.Label.displayName

const MenubarSeparator = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Separator>
>(({ className, ...props }, ref) => <MenubarPrimitive.Separator ref={ref} className={cn("sheen-dropdown-separator", className)} {...props} />)
MenubarSeparator.displayName = MenubarPrimitive.Separator.displayName

const MenubarShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
  <span className={cn("sheen-dropdown-shortcut", className)} {...props} />
)
MenubarShortcut.displayName = "MenubarShortcut"

export {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
  MenubarCheckboxItem,
  MenubarRadioItem,
  MenubarLabel,
  MenubarSeparator,
  MenubarShortcut,
  MenubarGroup,
  MenubarPortal,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarRadioGroup,
}
