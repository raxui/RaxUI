"use client"

// RaxUI toggle. Source-owned: edit freely. Ported from boot-ui.
// Built-in icon paths from Lucide (ISC).

import * as TogglePrimitive from "@radix-ui/react-toggle"
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group"

import { cn } from "@/lib/utils"
const getDirection = (el?: Element | null): "ltr" | "rtl" => el && getComputedStyle(el).direction === "rtl" ? "rtl" : "ltr"
import * as React from "react"

type PossibleRef<T> = React.Ref<T> | ((node: T | null) => void) | undefined

/** Sets a ref of either kind: calls a callback ref, or fills an object ref. */
function assignRef<T>(ref: PossibleRef<T>, node: T | null) {
  if (typeof ref === "function") ref(node)
  else if (ref) (ref as React.MutableRefObject<T | null>).current = node
}

/** One callback ref that sets every ref it's given (callback or object). */
function mergeRefs<T>(...refs: PossibleRef<T>[]) {
  return (node: T | null) => {
    for (const ref of refs) assignRef(ref, node)
  }
}

/**
 * `mergeRefs`, kept stable between renders. A new callback ref on every render
 * makes React detach and reattach it, which re-measures drag-and-drop nodes
 * and restarts observers.
 */
function useMergedRef<T>(...refs: PossibleRef<T>[]) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return React.useMemo(() => mergeRefs(...refs), refs)
}


// -----------------------------------------------------------------------------
// Toggle — a button that stays pressed; ToggleGroup — a row of them, one or
// many on (on Radix Toggle / ToggleGroup).
//
//   <Toggle aria-label="Bold"><BoldIcon /></Toggle>
//
//   <ToggleGroup type="single" variant="segmented" defaultValue="week">
//     <ToggleGroupItem value="day">Day</ToggleGroupItem>
//     <ToggleGroupItem value="week">Week</ToggleGroupItem>
//   </ToggleGroup>
//
// Variants: default (quiet, tinted when on) · outline (joined in a group) ·
// segmented (filled track; a single group's thumb slides between items).
// Arrow keys move between items and follow the page direction in RTL.
// -----------------------------------------------------------------------------

export type ToggleVariant = "default" | "outline" | "segmented"
export type ToggleSize = "default" | "sm" | "lg" | "icon" | "icon-sm" | "icon-lg"

const sizeClasses: Record<ToggleSize, string | null> = {
  default: null,
  sm: "rax-toggle-sm",
  lg: "rax-toggle-lg",
  icon: "rax-toggle-icon",
  "icon-sm": "rax-toggle-icon rax-toggle-sm",
  "icon-lg": "rax-toggle-icon rax-toggle-lg",
}

/** Class names for a toggle look. */
function toggleVariants({
  variant = "default",
  size = "default",
  className,
}: { variant?: ToggleVariant; size?: ToggleSize; className?: string } = {}) {
  return cn("rax-toggle", `rax-toggle-${variant}`, sizeClasses[size], className)
}

export interface ToggleProps extends React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> {
  appearance?: import("@/lib/theme").RaxAppearance
  variant?: Exclude<ToggleVariant, "segmented">
  size?: ToggleSize
}

// A wrapping Tooltip trigger passes its own data-state, which would hide the pressed state.
type WithTriggerState = { "data-state"?: string }

const Toggle = React.forwardRef<React.ElementRef<typeof TogglePrimitive.Root>, ToggleProps>(
  ({ className, appearance, variant, size, "data-state": _triggerState, ...props }: ToggleProps & WithTriggerState, ref) => (
    <TogglePrimitive.Root data-rax-appearance={appearance} ref={ref} className={toggleVariants({ variant, size, className })} {...props} />
  ),
)
Toggle.displayName = TogglePrimitive.Root.displayName

// ---- Group -------------------------------------------------------------------------------

const ToggleGroupContext = React.createContext<{ variant: ToggleVariant; size: ToggleSize }>({ variant: "default", size: "default" })

type ToggleGroupBaseProps = {
  appearance?: import("@/lib/theme").RaxAppearance
  variant?: ToggleVariant
  size?: ToggleSize
  /** Single only: never let the last item be switched off. Default: on for `segmented`. */
  required?: boolean
}

export type ToggleGroupProps = React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root> & ToggleGroupBaseProps

const ToggleGroup = React.forwardRef<React.ElementRef<typeof ToggleGroupPrimitive.Root>, ToggleGroupProps>(
  ({ className, appearance, variant = "default", size = "default", required, dir, children, ...props }, ref) => {
    const rootRef = React.useRef<HTMLDivElement>(null)
    const composedRef = useMergedRef(ref, rootRef)

    // Radix reads the direction from a provider only; pick it up from the page
    // so the arrow keys follow RTL too.
    const [pageDir, setPageDir] = React.useState<"ltr" | "rtl">()
    React.useLayoutEffect(() => {
      if (dir) return
      // From the parent: the root carries the dir we give it.
      setPageDir(getDirection(rootRef.current?.parentElement))
    }, [dir])

    // Single groups run controlled, so `required` can refuse the empty value.
    const single = props.type === "single"
    const singleProps = single ? (props as ToggleGroupPrimitive.ToggleGroupSingleProps) : undefined
    const [uncontrolled, setUncontrolled] = React.useState(singleProps?.defaultValue ?? "")
    const keepOne = required ?? variant === "segmented"
    const controlled = singleProps
      ? {
          value: singleProps.value ?? uncontrolled,
          defaultValue: undefined,
          onValueChange: (next: string) => {
            if (keepOne && !next) return
            if (singleProps.value === undefined) setUncontrolled(next)
            singleProps.onValueChange?.(next)
          },
        }
      : {}

    const sliding = variant === "segmented" && single
    useSlidingThumb(rootRef, sliding)

    return (
      <ToggleGroupContext.Provider value={{ variant, size }}>
        <ToggleGroupPrimitive.Root
          ref={composedRef}
          dir={dir ?? pageDir}
          className={cn("rax-toggle-group", className)}
          data-rax-appearance={appearance}
          data-variant={variant}
          data-size={size}
          data-sliding={sliding ? "" : undefined}
          {...(props as ToggleGroupPrimitive.ToggleGroupSingleProps)}
          {...controlled}
        >
          {sliding && <span className="rax-toggle-group-thumb" aria-hidden="true" />}
          {children}
        </ToggleGroupPrimitive.Root>
      </ToggleGroupContext.Provider>
    )
  },
)
ToggleGroup.displayName = ToggleGroupPrimitive.Root.displayName

/** Moves the segmented thumb onto the item that is on (same approach as Tabs). */
function useSlidingThumb(rootRef: React.RefObject<HTMLDivElement | null>, enabled: boolean) {
  React.useLayoutEffect(() => {
    const root = rootRef.current
    if (!root || !enabled) return
    let frame = 0

    const measure = () => {
      const on = Array.from(root.querySelectorAll<HTMLElement>(".rax-toggle[data-state=on]")).find((item) => item.parentElement === root)
      if (!on) {
        root.removeAttribute("data-ready")
        return
      }
      root.style.setProperty("--rax-thumb-x", `${on.offsetLeft}px`)
      root.style.setProperty("--rax-thumb-y", `${on.offsetTop}px`)
      root.style.setProperty("--rax-thumb-w", `${on.offsetWidth}px`)
      root.style.setProperty("--rax-thumb-h", `${on.offsetHeight}px`)

      // First placement is instant; glide from the next frame on. Checked separately from
      // data-ready: StrictMode runs this effect twice and the cleanup cancels the first frame.
      if (!root.hasAttribute("data-ready")) root.setAttribute("data-ready", "")
      if (!root.hasAttribute("data-animate") && !frame) frame = requestAnimationFrame(() => root.setAttribute("data-animate", ""))
    }

    measure()
    const mutations = new MutationObserver(measure)
    mutations.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-state"] })
    const resizes = new ResizeObserver(measure)
    resizes.observe(root)
    root.querySelectorAll(".rax-toggle").forEach((item) => resizes.observe(item))

    return () => {
      mutations.disconnect()
      resizes.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [rootRef, enabled])
}

export interface ToggleGroupItemProps extends React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item> {
  variant?: ToggleVariant
  size?: ToggleSize
}

const ToggleGroupItem = React.forwardRef<React.ElementRef<typeof ToggleGroupPrimitive.Item>, ToggleGroupItemProps>(
  ({ className, variant, size, "data-state": _triggerState, ...props }: ToggleGroupItemProps & WithTriggerState, ref) => {
    const group = React.useContext(ToggleGroupContext)
    return (
      <ToggleGroupPrimitive.Item
        ref={ref}
        className={toggleVariants({ variant: variant ?? group.variant, size: size ?? group.size, className })}
        {...props}
      />
    )
  },
)
ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName

export { Toggle, ToggleGroup, ToggleGroupItem, toggleVariants }
