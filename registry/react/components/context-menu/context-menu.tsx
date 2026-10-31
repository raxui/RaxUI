"use client"

// Built-in SVG paths from Lucide, licensed under ISC.
import * as React from "react"
import * as ContextMenuPrimitive from "@radix-ui/react-context-menu"

import { useRaxPortalContainer } from "@/lib/theme"
import { cn } from "@/lib/utils"
function useReportDirection<T extends HTMLElement>(report?: ((dir: "ltr" | "rtl") => void) | null) {
  const ref = React.useRef<T | null>(null)
  React.useLayoutEffect(() => { if (ref.current) report?.(getComputedStyle(ref.current).direction === "rtl" ? "rtl" : "ltr") }, [report])
  return ref
}
function useMergedRef<T>(a: React.Ref<T>, b: React.RefObject<T | null>) {
  return React.useCallback((node: T | null) => { (b as React.MutableRefObject<T | null>).current = node; if (typeof a === "function") a(node); else if (a) (a as React.MutableRefObject<T | null>).current = node }, [a, b])
}

// -----------------------------------------------------------------------------
// Context Menu — the right-click menu (long-press on touch), on Radix
// ContextMenu. Same glass and items as Dropdown Menu (`rax-dropdown-*`); it opens
// at the pointer and grows out of it.
//
//   <ContextMenu>
//     <ContextMenuTrigger className="…">Right-click here</ContextMenuTrigger>
//     <ContextMenuContent>
//       <ContextMenuItem>Open<ContextMenuShortcut>⌘O</ContextMenuShortcut></ContextMenuItem>
//       <ContextMenuSeparator />
//       <ContextMenuItem variant="destructive">Delete</ContextMenuItem>
//     </ContextMenuContent>
//   </ContextMenu>
//
// The trigger keeps data-state="open" while its menu is up, so the thing you
// right-clicked can stay highlighted (`rax-context-target` does that). In RTL
// the content, the submenu side and the arrow keys follow the page direction.
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

// Radix reads the direction from a provider only and the root renders no
// element; the trigger finds the page direction and hands it up.
const ReportDirContext = React.createContext<((dir: "ltr" | "rtl") => void) | null>(null)

function ContextMenu({ dir, ...props }: React.ComponentProps<typeof ContextMenuPrimitive.Root>) {
  const [pageDir, setPageDir] = React.useState<"ltr" | "rtl">()
  return (
    <ReportDirContext.Provider value={dir ? null : setPageDir}>
      <ContextMenuPrimitive.Root dir={dir ?? pageDir} {...props} />
    </ReportDirContext.Provider>
  )
}
ContextMenu.displayName = "ContextMenu"

const ContextMenuTrigger = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Trigger>
>((props, ref) => {
  const triggerRef = useReportDirection<HTMLSpanElement>(React.useContext(ReportDirContext))
  const composedRef = useMergedRef(ref, triggerRef)
  return <ContextMenuPrimitive.Trigger ref={composedRef} tabIndex={0} {...props} onKeyDown={event => {
    props.onKeyDown?.(event)
    if (event.defaultPrevented || !(event.key === "ContextMenu" || (event.shiftKey && event.key === "F10"))) return
    event.preventDefault()
    const rect = event.currentTarget.getBoundingClientRect()
    event.currentTarget.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, clientX: rect.left, clientY: rect.bottom }))
  }} />
})
ContextMenuTrigger.displayName = ContextMenuPrimitive.Trigger.displayName

const ContextMenuGroup = ContextMenuPrimitive.Group

function ContextMenuPortal(props: React.ComponentProps<typeof ContextMenuPrimitive.Portal>) { return <ContextMenuPrimitive.Portal container={useRaxPortalContainer()} {...props} /> }

const ContextMenuSub = ContextMenuPrimitive.Sub

const ContextMenuRadioGroup = ContextMenuPrimitive.RadioGroup

const ContextMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubTrigger> & { inset?: boolean }
>(({ className, inset, children, ...props }, ref) => (
  <ContextMenuPrimitive.SubTrigger ref={ref} className={cn("rax-dropdown-item", inset && "rax-dropdown-inset", className)} {...props}>
    {children}
    <ChevronRightIcon className="rax-dropdown-chevron" />
  </ContextMenuPrimitive.SubTrigger>
))
ContextMenuSubTrigger.displayName = ContextMenuPrimitive.SubTrigger.displayName

const ContextMenuSubContent = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubContent>
>(({ className, sideOffset = 6, collisionPadding = 8, ...props }, ref) => (
  <ContextMenuPrimitive.Portal container={useRaxPortalContainer()}>
    <ContextMenuPrimitive.SubContent
      ref={ref}
      sideOffset={sideOffset}
      collisionPadding={collisionPadding}
      className={cn("rax-dropdown-menu rax-context-menu", className)}
      {...props}
    />
  </ContextMenuPrimitive.Portal>
))
ContextMenuSubContent.displayName = ContextMenuPrimitive.SubContent.displayName

const ContextMenuContent = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Content>
>(({ className, collisionPadding = 8, ...props }, ref) => (
  <ContextMenuPrimitive.Portal container={useRaxPortalContainer()}>
    <ContextMenuPrimitive.Content
      ref={ref}
      collisionPadding={collisionPadding}
      className={cn("rax-dropdown-menu rax-context-menu", className)}
      {...props}
    />
  </ContextMenuPrimitive.Portal>
))
ContextMenuContent.displayName = ContextMenuPrimitive.Content.displayName

const ContextMenuItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Item> & {
    inset?: boolean
    variant?: "default" | "destructive"
  }
>(({ className, inset, variant = "default", ...props }, ref) => (
  <ContextMenuPrimitive.Item
    ref={ref}
    className={cn("rax-dropdown-item", variant === "destructive" && "rax-dropdown-item-destructive", inset && "rax-dropdown-inset", className)}
    {...props}
  />
))
ContextMenuItem.displayName = ContextMenuPrimitive.Item.displayName

const ContextMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.CheckboxItem>
>(({ className, children, ...props }, ref) => (
  <ContextMenuPrimitive.CheckboxItem ref={ref} className={cn("rax-dropdown-item rax-dropdown-inset", className)} {...props}>
    <span className="rax-dropdown-indicator">
      <ContextMenuPrimitive.ItemIndicator>
        <CheckIcon />
      </ContextMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </ContextMenuPrimitive.CheckboxItem>
))
ContextMenuCheckboxItem.displayName = ContextMenuPrimitive.CheckboxItem.displayName

const ContextMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <ContextMenuPrimitive.RadioItem ref={ref} className={cn("rax-dropdown-item rax-dropdown-inset", className)} {...props}>
    <span className="rax-dropdown-indicator">
      <ContextMenuPrimitive.ItemIndicator>
        <DotIcon />
      </ContextMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </ContextMenuPrimitive.RadioItem>
))
ContextMenuRadioItem.displayName = ContextMenuPrimitive.RadioItem.displayName

const ContextMenuLabel = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Label> & { inset?: boolean }
>(({ className, inset, ...props }, ref) => (
  <ContextMenuPrimitive.Label ref={ref} className={cn("rax-dropdown-label", inset && "rax-dropdown-inset", className)} {...props} />
))
ContextMenuLabel.displayName = ContextMenuPrimitive.Label.displayName

const ContextMenuSeparator = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Separator>
>(({ className, ...props }, ref) => <ContextMenuPrimitive.Separator ref={ref} className={cn("rax-dropdown-separator", className)} {...props} />)
ContextMenuSeparator.displayName = ContextMenuPrimitive.Separator.displayName

const ContextMenuShortcut = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(({ className, ...props }, ref) => (
  <span ref={ref} className={cn("rax-dropdown-shortcut", className)} {...props} />
))
ContextMenuShortcut.displayName = "ContextMenuShortcut"

export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuGroup,
  ContextMenuPortal,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuRadioGroup,
}
