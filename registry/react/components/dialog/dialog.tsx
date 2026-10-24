"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"

import { useSheenPortalContainer, type SheenAppearance } from "@/lib/theme"
import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogClose = DialogPrimitive.Close

export interface DialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  appearance?: SheenAppearance
  showCloseButton?: boolean
  /** The close button's accessible name; translate it for your app. */
  closeLabel?: string
}

/** The panel, with overlay and close button, portalled into the nearest SheenThemeProvider (ADR 013). */
const DialogContent = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Content>, DialogContentProps>(
  ({ className, children, appearance, showCloseButton = true, closeLabel = "Close", ...props }, ref) => (
    <DialogPrimitive.Portal container={useSheenPortalContainer()}>
      <DialogPrimitive.Overlay className="sheen-dialog-overlay" />
      <DialogPrimitive.Content ref={ref} data-sheen-appearance={appearance} className={cn("sheen-dialog", className)} {...props}>
        {children}
        {showCloseButton && <DialogPrimitive.Close className="btn-close sheen-dialog-close" aria-label={closeLabel} />}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  ),
)
DialogContent.displayName = "DialogContent"

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("sheen-dialog-header", className)} {...props} />
}

function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("sheen-dialog-footer", className)} {...props} />
}

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => <DialogPrimitive.Title ref={ref} className={cn("sheen-dialog-title", className)} {...props} />)
DialogTitle.displayName = "DialogTitle"

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("sheen-dialog-description", className)} {...props} />
))
DialogDescription.displayName = "DialogDescription"

export { Dialog, DialogTrigger, DialogClose, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription }
