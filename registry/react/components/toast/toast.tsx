"use client"

// Built-in SVG paths from Lucide, licensed under ISC.
import * as React from "react"
import { createPortal } from "react-dom"
import * as ToastPrimitives from "@radix-ui/react-toast"

import { useRaxPortalContainer } from "@/lib/theme"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

const Icon = ({ d }: { d: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.25}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
)

export type ToastTone = "info" | "success" | "warning" | "danger"
export type ToastVariant = "default" | "success" | "destructive" | "warning" | "info" | "loading"

export type ToastPosition = "top-center" | "top-right" | "top-left" | "bottom-center" | "bottom-right" | "bottom-left"

function ToastProvider({ label = "Notification", ...props }: React.ComponentProps<typeof ToastPrimitives.Provider>) { return <ToastPrimitives.Provider label={label} {...props} /> }

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport> & {
    position?: ToastPosition
    /** Where the viewport is portaled. Defaults to `document.body`. */
    container?: HTMLElement | null
  }
>(({ className, position = "top-center", container, label = "Notifications ({hotkey})", ...props }, ref) => {
  const themeContainer = useRaxPortalContainer()
  // Portal out so `position: fixed` is relative to the screen even when the
  // Toaster sits inside a glass surface (backdrop-filter creates a containing block).
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  if (!mounted) return null

  return createPortal(
    <ToastPrimitives.Viewport ref={ref} label={label} data-position={position} className={cn("rax-toast-viewport", className)} {...props} />,
    container ?? themeContainer ?? document.body,
  )
})
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> & { variant?: ToastVariant; tone?: ToastTone }
>(({ className, variant = "default", tone, ...props }, ref) => (
  <ToastPrimitives.Root
    ref={ref}
    data-variant={tone === "danger" ? "destructive" : tone ?? variant}
    // Errors interrupt screen readers; everything else waits politely.
    type={tone === "danger" || variant === "destructive" ? "foreground" : "background"}
    className={cn("rax-toast", className)}
    {...props}
  />
))
Toast.displayName = ToastPrimitives.Root.displayName

const variantIcons: Partial<Record<ToastVariant, React.ReactNode>> = {
  success: <Icon d="M20 6 9 17l-5-5" />,
  destructive: <Icon d="M18 6 6 18M6 6l12 12" />,
  warning: <Icon d="M12 9v4M12 17h.01M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />,
  info: <Icon d="M12 16v-4M12 8h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z" />,
  loading: <Spinner aria-hidden="true" />,
}

/** Leading badge: a custom `icon`, or the variant's own glyph. Renders nothing for plain toasts. */
const ToastIcon = ({ variant = "default", icon }: { variant?: ToastVariant; icon?: React.ReactNode }) => {
  if (icon) return <span className="rax-toast-icon rax-toast-icon-custom">{icon}</span>
  const glyph = variantIcons[variant]
  return glyph ? (
    <span className="rax-toast-icon" aria-hidden="true">
      {glyph}
    </span>
  ) : null
}
ToastIcon.displayName = "ToastIcon"

const ToastBody = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("rax-toast-body", className)} {...props} />
))
ToastBody.displayName = "ToastBody"

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => <ToastPrimitives.Title ref={ref} className={cn("rax-toast-title", className)} {...props} />)
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => <ToastPrimitives.Description ref={ref} className={cn("rax-toast-description", className)} {...props} />)
ToastDescription.displayName = ToastPrimitives.Description.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "rax-toast-action", className)}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close ref={ref} aria-label="Dismiss" className={cn("rax-toast-close", className)} {...props}>
    <Icon d="M18 6 6 18M6 6l12 12" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>
type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastIcon,
  ToastBody,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
}
