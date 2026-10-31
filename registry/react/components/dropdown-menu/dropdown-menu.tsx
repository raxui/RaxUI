"use client"

// Built-in SVG paths from Lucide (ISC).

import * as React from "react"
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"

import { useRaxPortalContainer, useRaxTheme, type RaxAppearance } from "@/lib/theme"
import { cn } from "@/lib/utils"

/** Radix reads direction from props, not the DOM; pass the theme's so RTL menus align to the start. */
function DropdownMenu({ dir, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  const { direction } = useRaxTheme()
  return <DropdownMenuPrimitive.Root dir={dir ?? direction} {...props} />
}

const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger
const DropdownMenuGroup = DropdownMenuPrimitive.Group

export interface DropdownMenuContentProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content> {
  appearance?: RaxAppearance
}

/** Slides the highlight to the focused item; it appears in place first, then glides from item to item. */
function glide(menu: HTMLElement, item: HTMLElement | null) {
  const highlight = menu.querySelector<HTMLElement>(":scope > .rax-dropdown-highlight")
  if (!highlight) return
  if (!item) return menu.removeAttribute("data-hover")
  const set = () => {
    menu.style.setProperty("--rax-menu-hover-y", `${item.offsetTop}px`)
    menu.style.setProperty("--rax-menu-hover-h", `${item.offsetHeight}px`)
  }
  if (menu.style.getPropertyValue("--rax-menu-hover-y")) {
    set()
    menu.setAttribute("data-hover", "")
    return
  }
  highlight.style.transition = "none"
  set()
  void highlight.offsetHeight // commit the position before transitions return
  highlight.style.transition = ""
  menu.setAttribute("data-hover", "")
}

/** The menu, portalled into the nearest RaxThemeProvider (ADR 013). */
const DropdownMenuContent = React.forwardRef<React.ElementRef<typeof DropdownMenuPrimitive.Content>, DropdownMenuContentProps>(
  ({ className, appearance, align = "start", sideOffset = 4, onFocus, children, ...props }, ref) => (
    <DropdownMenuPrimitive.Portal container={useRaxPortalContainer()}>
      <DropdownMenuPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        data-rax-appearance={appearance}
        className={cn("rax-dropdown-menu", className)}
        // Radix focuses the highlighted item (pointer and keyboard) and the menu itself when none is.
        onFocus={(event) => {
          onFocus?.(event)
          glide(event.currentTarget, (event.target as HTMLElement).closest<HTMLElement>('[role^="menuitem"]'))
        }}
        {...props}
      >
        <span className="rax-dropdown-highlight" aria-hidden="true" />
        {children}
      </DropdownMenuPrimitive.Content>
    </DropdownMenuPrimitive.Portal>
  ),
)
DropdownMenuContent.displayName = "DropdownMenuContent"

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Item ref={ref} className={cn("rax-dropdown-item", className)} {...props} />
))
DropdownMenuItem.displayName = "DropdownMenuItem"

const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Label ref={ref} className={cn("rax-dropdown-label", className)} {...props} />
))
DropdownMenuLabel.displayName = "DropdownMenuLabel"

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator ref={ref} className={cn("rax-dropdown-separator", className)} {...props} />
))
DropdownMenuSeparator.displayName = "DropdownMenuSeparator"


const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup
const DropdownMenuCheckboxItem = React.forwardRef<React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>, React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>>(({className,children,...props},ref)=>(
  <DropdownMenuPrimitive.CheckboxItem ref={ref} className={cn("rax-dropdown-item rax-dropdown-inset",className)} {...props}>
    <span className="rax-dropdown-indicator"><DropdownMenuPrimitive.ItemIndicator><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={3}><path d="m5 12 4 4L19 6"/></svg></DropdownMenuPrimitive.ItemIndicator></span>{children}
  </DropdownMenuPrimitive.CheckboxItem>
))
DropdownMenuCheckboxItem.displayName="DropdownMenuCheckboxItem"
const DropdownMenuRadioItem = React.forwardRef<React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>, React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>>(({className,children,...props},ref)=>(
  <DropdownMenuPrimitive.RadioItem ref={ref} className={cn("rax-dropdown-item rax-dropdown-inset",className)} {...props}>
    <span className="rax-dropdown-indicator"><DropdownMenuPrimitive.ItemIndicator><svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><circle cx="12" cy="12" r="5"/></svg></DropdownMenuPrimitive.ItemIndicator></span>{children}
  </DropdownMenuPrimitive.RadioItem>
))
DropdownMenuRadioItem.displayName="DropdownMenuRadioItem"

export {
  DropdownMenuCheckboxItem, DropdownMenuRadioGroup, DropdownMenuRadioItem,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
}
