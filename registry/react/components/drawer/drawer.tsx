"use client"

// Built-in SVG paths from Lucide, licensed under ISC.
import * as React from "react"
import { Drawer as DrawerPrimitive } from "vaul"

import { useSheenPortalContainer } from "@/lib/theme"
import { cn } from "@/lib/utils"


// -----------------------------------------------------------------------------
// Drawer — vaul (Radix Dialog + gesture physics) in the glass style.
// Drag the handle or the panel, flick to dismiss, rest on snap points
// (peek / half / full), scroll content that hands off to dragging at the top,
// nest drawers. Use it for mobile-first actions; Sheet for side panels.
// -----------------------------------------------------------------------------

type RootProps = React.ComponentProps<typeof DrawerPrimitive.Root>

export type DrawerProps = RootProps
function Drawer(props: DrawerProps) { return <DrawerPrimitive.Root {...props} /> }
Drawer.displayName = "Drawer"

/** A drawer opened from inside another drawer: the parent steps back while it's open. */
function DrawerNested(props: React.ComponentProps<typeof DrawerPrimitive.NestedRoot>) {
  return <DrawerPrimitive.NestedRoot {...props} />
}
DrawerNested.displayName = "DrawerNested"

const DrawerTrigger = DrawerPrimitive.Trigger
function DrawerPortal(props: React.ComponentProps<typeof DrawerPrimitive.Portal>) { return <DrawerPrimitive.Portal container={useSheenPortalContainer()} {...props} /> }
const DrawerClose = DrawerPrimitive.Close

const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => <DrawerPrimitive.Overlay ref={ref} className={cn("sheen-drawer-overlay", className)} {...props} />)
DrawerOverlay.displayName = "DrawerOverlay"

export interface DrawerContentProps extends React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content> {
  /** Grab handle at the top (bottom drawers) — also a keyboard / click target that cycles snap points. */
  showHandle?: boolean
  handleLabel?: string
}

const DrawerContent = React.forwardRef<React.ElementRef<typeof DrawerPrimitive.Content>, DrawerContentProps>(
  ({ className, children, showHandle = true, handleLabel = "Resize drawer", ...props }, ref) => (
    <DrawerPortal>
      <DrawerOverlay />
      <DrawerPrimitive.Content ref={ref} className={cn("sheen-drawer-content", className)} {...props}>
        {showHandle && <DrawerPrimitive.Handle aria-label={handleLabel} className="sheen-drawer-handle" />}
        {children}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  ),
)
DrawerContent.displayName = "DrawerContent"

const DrawerHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("sheen-drawer-header", className)} {...props} />
))
DrawerHeader.displayName = "DrawerHeader"

/** Scrollable middle. Dragging starts only once it's scrolled to the top (vaul handles the hand-off). */
const DrawerBody = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("sheen-drawer-body", className)} {...props} />
))
DrawerBody.displayName = "DrawerBody"

const DrawerFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("sheen-drawer-footer", className)} {...props} />
))
DrawerFooter.displayName = "DrawerFooter"

const DrawerTitle = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => <DrawerPrimitive.Title ref={ref} className={cn("sheen-drawer-title", className)} {...props} />)
DrawerTitle.displayName = "DrawerTitle"

const DrawerDescription = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description ref={ref} className={cn("sheen-drawer-description", className)} {...props} />
))
DrawerDescription.displayName = "DrawerDescription"

export {
  Drawer,
  DrawerNested,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
}
