"use client"

import * as React from "react"
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog"

import { Button } from "@/components/ui/button"
import { useRaxPortalContainer, type RaxAppearance } from "@/lib/theme"
import { cn } from "@/lib/utils"

// -----------------------------------------------------------------------------
// ConfirmDialog — a centred confirmation on Radix AlertDialog, from boot-ui (ADR 013).
// A click outside nudges the panel instead of closing it; Escape or Cancel close it,
// and focus starts on Cancel.
// -----------------------------------------------------------------------------

export type ConfirmTone = "default" | "destructive" | "warning" | "success"

const AlertDialog = AlertDialogPrimitive.Root
const AlertDialogTrigger = AlertDialogPrimitive.Trigger

const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
)
const TONE_ICONS: Record<ConfirmTone, React.ReactNode> = {
  default: <Icon d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 11v5M12 8h.01" />,
  destructive: <Icon d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />,
  warning: <Icon d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />,
  success: <Icon d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM8 12.5l2.5 2.5L16 9.5" />,
}

const ToneContext = React.createContext<ConfirmTone>("default")

export interface AlertDialogContentProps extends React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content> {
  tone?: ConfirmTone
  /** Icon in a tinted circle above the title. `true` = the tone's icon; pass a node for your own. */
  icon?: boolean | React.ReactNode
  appearance?: RaxAppearance
}

/** The panel with its overlay, portalled into the nearest RaxThemeProvider. */
const AlertDialogContent = React.forwardRef<React.ElementRef<typeof AlertDialogPrimitive.Content>, AlertDialogContentProps>(
  ({ className, tone = "default", icon, appearance, children, onAnimationEnd, ...props }, ref) => {
    const contentRef = React.useRef<HTMLDivElement | null>(null)
    // Modal on purpose: a press outside is acknowledged with a nudge instead of closing.
    const nudge = () => {
      const el = contentRef.current
      if (!el) return
      el.removeAttribute("data-nudge")
      void el.offsetWidth // restart the animation
      el.setAttribute("data-nudge", "")
    }
    return (
      <ToneContext.Provider value={tone}>
        <AlertDialogPrimitive.Portal container={useRaxPortalContainer()}>
          <AlertDialogPrimitive.Overlay className="rax-confirm-overlay" onPointerDown={nudge} />
          <AlertDialogPrimitive.Content
            ref={(node) => {
              contentRef.current = node
              if (typeof ref === "function") ref(node)
              else if (ref) ref.current = node
            }}
            data-tone={tone}
            data-rax-appearance={appearance}
            className={cn("rax-confirm", className)}
            onAnimationEnd={(event) => {
              onAnimationEnd?.(event)
              if (event.animationName === "rax-alert-nudge") event.currentTarget.removeAttribute("data-nudge")
            }}
            {...props}
          >
            {icon && (
              <div className="rax-confirm-icon" aria-hidden="true">
                {icon === true ? TONE_ICONS[tone] : icon}
              </div>
            )}
            {children}
          </AlertDialogPrimitive.Content>
        </AlertDialogPrimitive.Portal>
      </ToneContext.Provider>
    )
  },
)
AlertDialogContent.displayName = "AlertDialogContent"

function AlertDialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rax-confirm-header", className)} {...props} />
}

export interface AlertDialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  /** `inline` = side by side (two buttons) · `stacked` = full-width rows (long labels, three or more actions). */
  layout?: "inline" | "stacked"
}

function AlertDialogFooter({ className, layout = "inline", ...props }: AlertDialogFooterProps) {
  return <div data-layout={layout} className={cn("rax-confirm-footer", className)} {...props} />
}

const AlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => <AlertDialogPrimitive.Title ref={ref} className={cn("rax-confirm-title", className)} {...props} />)
AlertDialogTitle.displayName = "AlertDialogTitle"

const AlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description ref={ref} className={cn("rax-confirm-description", className)} {...props} />
))
AlertDialogDescription.displayName = "AlertDialogDescription"

/** The confirm button, red for the destructive tone. */
const AlertDialogAction = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>
>(({ className, children, ...props }, ref) => {
  const tone = React.useContext(ToneContext)
  return (
    <AlertDialogPrimitive.Action ref={ref} asChild {...props}>
      <Button variant={tone === "destructive" ? "destructive" : "default"} className={cn("rax-confirm-action", className)}>
        {children}
      </Button>
    </AlertDialogPrimitive.Action>
  )
})
AlertDialogAction.displayName = "AlertDialogAction"

const AlertDialogCancel = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ className, children, ...props }, ref) => (
  <AlertDialogPrimitive.Cancel ref={ref} asChild {...props}>
    <Button variant="secondary" className={cn("rax-confirm-cancel", className)}>
      {children}
    </Button>
  </AlertDialogPrimitive.Cancel>
))
AlertDialogCancel.displayName = "AlertDialogCancel"

// -----------------------------------------------------------------------------
// ConfirmDialog — the common case in one component
// -----------------------------------------------------------------------------

export interface ConfirmDialogProps {
  title: React.ReactNode
  description?: React.ReactNode
  tone?: ConfirmTone
  /** Show the tone's icon (default true), or pass your own. */
  icon?: boolean | React.ReactNode
  confirmText?: React.ReactNode
  cancelText?: React.ReactNode
  /** Require typing this exact text before confirming (for example a project name). */
  confirmationText?: string
  /** Label for the type-to-confirm field. */
  confirmationLabel?: React.ReactNode
  layout?: "inline" | "stacked"
  appearance?: RaxAppearance
  /** Element that opens the dialog (rendered with asChild). */
  trigger?: React.ReactElement
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /**
   * Runs on confirm. Return a promise to keep the dialog open with a spinner
   * until it settles; throw to show the error and let the user retry.
   */
  onConfirm?: () => void | Promise<unknown>
  /** Runs when the dialog closes without confirming: Cancel or Escape. */
  onCancel?: () => void
}

function ConfirmDialog({
  trigger,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  onConfirm,
  onCancel,
  title,
  description,
  tone = "default",
  icon = true,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmationText,
  confirmationLabel,
  layout = "inline",
  appearance,
}: ConfirmDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
  const open = openProp ?? uncontrolledOpen
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [typed, setTyped] = React.useState("")
  const fieldId = React.useId()

  const setOpen = (next: boolean) => {
    if (openProp === undefined) setUncontrolledOpen(next)
    onOpenChange?.(next)
    if (next) {
      setTyped("")
      setError(null)
    }
  }

  const canConfirm = !pending && (!confirmationText || typed.trim() === confirmationText)

  const confirm = async (event?: { preventDefault(): void }) => {
    event?.preventDefault() // close after the work is done, not on click
    if (!canConfirm) return
    setError(null)
    try {
      const result = onConfirm?.()
      if (result instanceof Promise) {
        setPending(true)
        await result
      }
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return // can't close mid-request
        if (!next) onCancel?.()
        setOpen(next)
      }}
    >
      {trigger && <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>}
      <AlertDialogContent tone={tone} icon={icon} appearance={appearance} aria-busy={pending || undefined}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>

        {confirmationText && (
          <form
            className="rax-confirm-field"
            onSubmit={(event) => {
              event.preventDefault()
              void confirm()
            }}
          >
            <label htmlFor={fieldId} className="form-label small">
              {confirmationLabel ?? (
                <>
                  Type <strong>{confirmationText}</strong> to confirm
                </>
              )}
            </label>
            <input
              id={fieldId}
              className="form-control form-control-sm"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              disabled={pending}
              placeholder={confirmationText}
            />
          </form>
        )}

        {error && (
          <div className="rax-confirm-error" role="alert">
            {error}
          </div>
        )}

        <AlertDialogFooter layout={layout}>
          <AlertDialogCancel disabled={pending}>{cancelText}</AlertDialogCancel>
          <AlertDialogAction disabled={!canConfirm} onClick={confirm} data-pending={pending || undefined}>
            {pending && <span className="spinner-border spinner-border-sm" aria-hidden="true" />}
            <span>{confirmText}</span>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
  ConfirmDialog,
}
