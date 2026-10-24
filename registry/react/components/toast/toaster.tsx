"use client"

import {
  Toast,
  ToastBody,
  ToastClose,
  ToastDescription,
  ToastIcon,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  type ToastPosition,
} from "@/components/ui/toast"
import { TOAST_DEFAULT_DURATION, useToast } from "@/components/ui/use-toast"

const swipeDirection = (position: ToastPosition) =>
  position.endsWith("right") ? "right" : position.endsWith("left") ? "left" : position.startsWith("top") ? "up" : "down"

/** Mount once near the root of your app; then call `toast()` from anywhere. */
export function Toaster({ position = "top-center", dismissLabel = "Dismiss", label = "Notification", viewportLabel = "Notifications ({hotkey})" }: { position?: ToastPosition; dismissLabel?: string; label?: string; viewportLabel?: string }) {
  const { toasts, dismiss } = useToast()

  return (
    <ToastProvider label={label} swipeDirection={swipeDirection(position)}>
      {toasts.map(({ id, open, title, description, action, icon, variant = "default", tone, duration }) => (
        <Toast
          key={id}
          open={open}
          onOpenChange={(next) => !next && dismiss(id)}
          variant={variant}
          tone={tone}
          duration={duration ?? (variant === "loading" ? Infinity : TOAST_DEFAULT_DURATION)}
        >
          {/* keyed by variant so the badge pops when a loading toast resolves */}
          <ToastIcon key={tone ?? variant} variant={tone === "danger" ? "destructive" : tone ?? variant} icon={icon} />
          <ToastBody>
            {title && <ToastTitle>{title}</ToastTitle>}
            {description && <ToastDescription>{description}</ToastDescription>}
          </ToastBody>
          {action}
          <ToastClose aria-label={dismissLabel} />
        </Toast>
      ))}
      <ToastViewport label={viewportLabel} position={position} />
    </ToastProvider>
  )
}
