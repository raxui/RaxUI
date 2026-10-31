"use client"

// RaxUI stepper. Source-owned: edit freely. Ported from boot-ui.
// Built-in icon paths from Lucide (ISC).


import { cn } from "@/lib/utils"
import * as React from "react"

type PossibleRef<T> = React.Ref<T> | ((node: T | null) => void) | undefined

/** Sets a ref of either kind: calls a callback ref, or fills an object ref. */
function assignRef<T>(ref: PossibleRef<T>, node: T | null) {
  if (typeof ref === "function") ref(node)
  else if (ref) (ref as React.MutableRefObject<T | null>).current = node
}



import { Button, type ButtonProps } from "@/components/ui/button"

// -----------------------------------------------------------------------------
// Stepper — progress through a multi-step flow (checkout, onboarding, setup).
//
//   <Stepper value={step} onValueChange={setStep} linear>
//     <StepperNav aria-label="Checkout">
//       <StepperStep title="Cart" />
//       <StepperStep title="Shipping" description="Address & speed" />
//       <StepperStep title="Payment" />
//     </StepperNav>
//     <StepperPanel index={0}>…</StepperPanel>
//     …
//     <StepperPrevious /> <StepperNext />
//   </Stepper>
//
// Steps before the current one count as done (override per step with
// `completed`); value === number of steps means everything is done.
// `linear` only lets people click back to steps they've reached. In a narrow
// container the horizontal nav keeps just the current step's label.
// Vertical steppers can hold each step's content right under its title.
// -----------------------------------------------------------------------------

const DEFAULT_LABELS = {
  optional: "Optional",
  completed: "completed",
  current: "current step",
  error: "has an error",
  stepOf: (step: number, count: number) => `Step ${step} of ${count}`,
  previous: "Back",
  next: "Next",
}
export type StepperLabels = typeof DEFAULT_LABELS

type Orientation = "horizontal" | "vertical"

interface StepperContextValue {
  value: number
  setValue: (index: number) => void
  count: number
  setCount: (count: number) => void
  orientation: Orientation
  labelPlacement: "end" | "bottom"
  linear: boolean
  reached: number
  direction: 1 | -1
  baseId: string
  labels: StepperLabels
}

const StepperContext = React.createContext<StepperContextValue | null>(null)

function useStepperContext(component: string) {
  const context = React.useContext(StepperContext)
  if (!context) throw new Error(`<${component}> must be used inside <Stepper>`)
  return context
}

/** Navigation helpers for buttons and custom controls inside a <Stepper>. */
export function useStepper() {
  const { value, setValue, count } = useStepperContext("useStepper")
  return {
    value,
    count,
    isFirst: value <= 0,
    isLast: value >= count - 1,
    isComplete: value >= count,
    goTo: (index: number) => setValue(Math.max(0, Math.min(count, index))),
    next: () => setValue(Math.min(count, value + 1)),
    previous: () => setValue(Math.max(0, value - 1)),
  }
}

// ---- Root -------------------------------------------------------------------------------

export interface StepperProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue"> {
  appearance?: import("@/lib/theme").RaxAppearance
  value?: number
  defaultValue?: number
  onValueChange?: (index: number) => void
  orientation?: Orientation
  /** Horizontal only: label beside the circle (default) or centred under it. */
  labelPlacement?: "end" | "bottom"
  /** Only steps already reached can be clicked. */
  linear?: boolean
  size?: "sm" | "default"
  labels?: Partial<StepperLabels>
}

const Stepper = React.forwardRef<HTMLDivElement, StepperProps>(
  (
    {
      appearance,
      value: valueProp,
      defaultValue = 0,
      onValueChange,
      orientation = "horizontal",
      labelPlacement = "end",
      linear = false,
      size = "default",
      labels: labelsProp,
      className,
      ...props
    },
    ref,
  ) => {
    const [uncontrolled, setUncontrolled] = React.useState(defaultValue)
    const value = valueProp ?? uncontrolled
    const [count, setCount] = React.useState(0)
    const baseId = React.useId()
    const labels = React.useMemo(() => ({ ...DEFAULT_LABELS, ...labelsProp }), [labelsProp])

    // Furthest step reached (for `linear`) and which way we last moved (for panel motion).
    const [reached, setReached] = React.useState(value)
    if (value > reached) setReached(value)
    const previous = React.useRef(value)
    const [direction, setDirection] = React.useState<1 | -1>(1)
    if (previous.current !== value) {
      setDirection(value > previous.current ? 1 : -1)
      previous.current = value
    }

    const setValue = React.useCallback(
      (next: number) => {
        if (valueProp === undefined) setUncontrolled(next)
        onValueChange?.(next)
      },
      [valueProp, onValueChange],
    )

    const context = React.useMemo(
      () => ({ value, setValue, count, setCount, orientation, labelPlacement, linear, reached, direction, baseId, labels }),
      [value, setValue, count, orientation, labelPlacement, linear, reached, direction, baseId, labels],
    )

    return (
      <StepperContext.Provider value={context}>
        <div ref={ref} data-rax-appearance={appearance} className={cn("rax-stepper", className)} data-orientation={orientation} data-size={size} {...props} />
      </StepperContext.Provider>
    )
  },
)
Stepper.displayName = "Stepper"

// ---- Nav ------------------------------------------------------------------------------

const StepIndexContext = React.createContext<{ index: number; last: boolean }>({ index: 0, last: true })

const StepperNav = React.forwardRef<HTMLOListElement, React.HTMLAttributes<HTMLOListElement>>(({ className, children, ...props }, ref) => {
  const { orientation, labelPlacement, setCount, value, count, labels } = useStepperContext("StepperNav")
  const steps = React.Children.toArray(children).filter(React.isValidElement) as React.ReactElement<StepperStepProps>[]
  const currentTitle = steps[value]?.props.title

  React.useLayoutEffect(() => setCount(steps.length), [steps.length, setCount])

  return (
    <div className="rax-stepper-nav" data-orientation={orientation} data-labels={orientation === "horizontal" ? labelPlacement : undefined}>
      <ol ref={ref} className={cn("rax-stepper-list", className)} {...props}>
        {steps.map((step, index) => (
          <StepIndexContext.Provider key={step.key ?? index} value={{ index, last: index === steps.length - 1 }}>
            {step}
          </StepIndexContext.Provider>
        ))}
      </ol>
      {/* Narrow containers hide the labels: "Step 2 of 4 · Shipping" under the dots instead. */}
      {orientation === "horizontal" && count > 0 && (
        <p className="rax-stepper-count" aria-hidden="true">
          {labels.stepOf(Math.min(value + 1, count), count)}
          {currentTitle && (
            <>
              {" · "}
              <span className="rax-stepper-count-title">{currentTitle}</span>
            </>
          )}
        </p>
      )}
    </div>
  )
})
StepperNav.displayName = "StepperNav"

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
const AlertIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" aria-hidden="true">
    <path d="M12 7v6M12 17h.01" />
  </svg>
)

export interface StepperStepProps extends Omit<React.HTMLAttributes<HTMLLIElement>, "title"> {
  title: React.ReactNode
  description?: React.ReactNode
  /** Replaces the number in the circle (not the check / error marks). */
  icon?: React.ReactNode
  optional?: boolean
  /** Marks the step red; a string is shown instead of the description. */
  error?: boolean | string
  /** Override "done": by default every step before the current one is. */
  completed?: boolean
  disabled?: boolean
}

const StepperStep = React.forwardRef<HTMLLIElement, StepperStepProps>(
  ({ title, description, icon, optional, error, completed, disabled, className, children, ...props }, ref) => {
    const { value, setValue, orientation, linear, reached, baseId, labels } = useStepperContext("StepperStep")
    const { index, last } = React.useContext(StepIndexContext)
    const active = index === value
    const done = completed ?? index < value
    const state = error ? "error" : active ? "active" : done ? "complete" : "upcoming"
    const reachable = !disabled && (!linear || index <= reached)
    const titleId = `${baseId}-step-${index}-title`
    const status = error ? labels.error : active ? labels.current : done ? labels.completed : null
    const connectorFilled = completed ?? index < value

    return (
      <li
        ref={ref}
        className={cn("rax-step", className)}
        data-state={state}
        data-disabled={!reachable || undefined}
        aria-current={active ? "step" : undefined}
        {...props}
      >
        <button type="button" className="rax-step-trigger" disabled={!reachable} onClick={() => setValue(index)}>
          <span className="rax-step-indicator">
            {state === "complete" ? <CheckIcon /> : state === "error" ? <AlertIcon /> : (icon ?? index + 1)}
          </span>
          <span className="rax-step-text">
            <span className="rax-step-title" id={titleId}>
              {title}
            </span>
            {(typeof error === "string" || description || optional) && (
              <span className="rax-step-description">{typeof error === "string" ? error : (description ?? labels.optional)}</span>
            )}
          </span>
          {status && <span className="visually-hidden">, {status}</span>}
        </button>
        {!last && <span className="rax-step-connector" data-filled={connectorFilled || undefined} aria-hidden="true" />}
        {orientation === "vertical" && children !== undefined && (
          <div className="rax-step-content" data-state={active ? "open" : "closed"} role="group" aria-labelledby={titleId} hidden={!active}>
            <div className="rax-step-content-inner">{children}</div>
          </div>
        )}
      </li>
    )
  },
)
StepperStep.displayName = "StepperStep"

// ---- Panels & buttons -----------------------------------------------------------------

export interface StepperPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  index: number
  /** Unmount when inactive instead of hiding (default keeps fields' state). */
  unmountOnHide?: boolean
}

/** Content for one step; slides in from the side you're moving toward. */
const StepperPanel = React.forwardRef<HTMLDivElement, StepperPanelProps>(({ index, unmountOnHide, className, ...props }, ref) => {
  const { value, direction, baseId } = useStepperContext("StepperPanel")
  const active = index === value
  const panelRef = React.useRef<HTMLDivElement | null>(null)

  // If the control that moved us here vanished (a Next button on the last step…), keep focus nearby.
  React.useEffect(() => {
    if (!active) return
    const el = panelRef.current
    if (el && (document.activeElement === document.body || !document.activeElement?.isConnected)) el.focus({ preventScroll: true })
  }, [active])

  if (!active && unmountOnHide) return null
  return (
    <div
      ref={(node) => {
        panelRef.current = node
        assignRef(ref, node)
      }}
      role="group"
      aria-labelledby={`${baseId}-step-${index}-title`}
      tabIndex={-1}
      hidden={!active}
      data-direction={direction === 1 ? "forward" : "backward"}
      className={cn("rax-stepper-panel", className)}
      {...props}
    />
  )
})
StepperPanel.displayName = "StepperPanel"

const StepperPrevious = React.forwardRef<HTMLButtonElement, ButtonProps>(({ children, onClick, variant = "ghost", ...props }, ref) => {
  const { previous, isFirst } = useStepper()
  const { labels } = useStepperContext("StepperPrevious")
  return (
    <Button
      ref={ref}
      variant={variant}
      disabled={isFirst}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) previous()
      }}
      {...props}
    >
      {children ?? labels.previous}
    </Button>
  )
})
StepperPrevious.displayName = "StepperPrevious"

/** Goes to the next step; call event.preventDefault() in onClick to stop it (e.g. failed validation). */
const StepperNext = React.forwardRef<HTMLButtonElement, ButtonProps>(({ children, onClick, ...props }, ref) => {
  const { next, isComplete } = useStepper()
  const { labels } = useStepperContext("StepperNext")
  return (
    <Button
      ref={ref}
      disabled={isComplete}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) next()
      }}
      {...props}
    >
      {children ?? labels.next}
    </Button>
  )
})
StepperNext.displayName = "StepperNext"

export { Stepper, StepperNav, StepperStep, StepperPanel, StepperPrevious, StepperNext }
