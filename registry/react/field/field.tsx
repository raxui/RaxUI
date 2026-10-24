"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"

import { cn } from "@/lib/utils"

// -----------------------------------------------------------------------------
// Field — label, control, description and error wired together for you.
//
//   <Field invalid={!!error}>
//     <FieldLabel>Email</FieldLabel>
//     <FieldControl><Input type="email" /></FieldControl>
//     <FieldDescription>We'll never share it.</FieldDescription>
//     <FieldError>{error}</FieldError>
//   </Field>
//
// FieldControl injects id, aria-labelledby, aria-describedby, aria-invalid,
// aria-required and disabled into its child, so it works the same for native
// inputs and for controls that aren't <input>s (Combobox, Select, DateInput,
// Slider, RadioGroup…). Library-agnostic: plain state, server actions or a
// form library can all drive `invalid` and the error text.
// -----------------------------------------------------------------------------

interface FieldContextValue {
  controlId: string
  labelId: string
  descriptionId: string
  errorId: string
  invalid: boolean
  disabled: boolean
  required: boolean
  optional: boolean
  hasDescription: boolean
  hasError: boolean
  /** Error text from FieldDefaults (shown when FieldError has no children). */
  defaultError?: React.ReactNode
  register: (part: "description" | "error") => () => void
}

const FieldContext = React.createContext<FieldContextValue | null>(null)

export interface FieldDefaults {
  invalid?: boolean
  required?: boolean
  disabled?: boolean
  /** Error text FieldError shows when given no children. */
  error?: React.ReactNode
}

const FieldDefaultsContext = React.createContext<FieldDefaults>({})

/**
 * Supplies state to the next Field / FieldSet below it (its own props still win).
 * Form libraries use it: FormField feeds invalid / required / error from
 * react-hook-form + zod, so FormItem, FormRow or a plain Field all pick it up.
 * Fields nested inside that one (e.g. each radio option) don't inherit it.
 */
export function FieldDefaultsProvider({ value, children }: { value: FieldDefaults; children: React.ReactNode }) {
  return <FieldDefaultsContext.Provider value={value}>{children}</FieldDefaultsContext.Provider>
}

/** Field props win over defaults; nested Fields start fresh. */
function useResolvedState<P extends FieldStateProps>(props: P) {
  const defaults = React.useContext(FieldDefaultsContext)
  return {
    ...props,
    invalid: props.invalid ?? defaults.invalid,
    required: props.required ?? defaults.required,
    disabled: props.disabled ?? defaults.disabled,
    defaultError: defaults.error,
  }
}

/** Read the surrounding Field (null outside one). Useful for custom controls. */
export function useField() {
  return React.useContext(FieldContext)
}

function useFieldState({
  id,
  invalid = false,
  disabled = false,
  required = false,
  optional = false,
  defaultError,
}: FieldStateProps & { defaultError?: React.ReactNode }) {
  const auto = React.useId()
  const base = id ?? `field${auto.replace(/:/g, "")}`
  const [parts, setParts] = React.useState({ description: 0, error: 0 })

  const register = React.useCallback((part: "description" | "error") => {
    setParts((p) => ({ ...p, [part]: p[part] + 1 }))
    return () => setParts((p) => ({ ...p, [part]: p[part] - 1 }))
  }, [])

  return React.useMemo<FieldContextValue>(
    () => ({
      controlId: base,
      labelId: `${base}-label`,
      descriptionId: `${base}-description`,
      errorId: `${base}-error`,
      invalid,
      disabled,
      required,
      optional,
      hasDescription: parts.description > 0,
      hasError: parts.error > 0,
      defaultError,
      register,
    }),
    [base, invalid, disabled, required, optional, parts, defaultError, register],
  )
}

interface FieldStateProps {
  /** Id for the control (the label, description and error ids derive from it). */
  id?: string
  invalid?: boolean
  disabled?: boolean
  required?: boolean
  /** Show "(Optional)" next to the label instead of marking required fields. */
  optional?: boolean
}

export interface FieldProps extends FieldStateProps, Omit<React.HTMLAttributes<HTMLDivElement>, "id"> {
  /**
   * `vertical` label above · `horizontal` label beside the control ·
   * `inline` control first, then label (checkboxes, switches, radios).
   */
  orientation?: "vertical" | "horizontal" | "inline"
}

const NO_DEFAULTS: FieldDefaults = {}

const Field = React.forwardRef<HTMLDivElement, FieldProps>(
  (
    { id, invalid: invalidProp, disabled: disabledProp, required: requiredProp, optional, orientation = "vertical", className, ...props },
    ref,
  ) => {
    const { invalid, disabled, required, defaultError } = useResolvedState({
      invalid: invalidProp,
      disabled: disabledProp,
      required: requiredProp,
    })
    const context = useFieldState({ id, invalid, disabled, required, optional, defaultError })
    return (
      <FieldContext.Provider value={context}>
        <FieldDefaultsContext.Provider value={NO_DEFAULTS}>
          <div
            ref={ref}
            data-orientation={orientation}
            data-invalid={invalid || undefined}
            data-disabled={disabled || undefined}
            className={cn("sheen-field", className)}
            {...props}
          />
        </FieldDefaultsContext.Provider>
      </FieldContext.Provider>
    )
  },
)
Field.displayName = "Field"

export interface FieldLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  /** Override or translate the "(Optional)" hint text. */
  optionalText?: React.ReactNode
  /** Marker after required labels. `false` hides it. */
  requiredIndicator?: React.ReactNode
}

/** Visual only: aria-required on the control already tells assistive tech. */
const Hints = ({
  field,
  optionalText,
  requiredIndicator,
}: {
  field: FieldContextValue | null
  optionalText: React.ReactNode
  requiredIndicator: React.ReactNode
}) => (
  <>
    {field?.required && !field.optional && requiredIndicator !== false && (
      <span className="sheen-field-required" aria-hidden="true">
        {requiredIndicator}
      </span>
    )}
    {field?.optional && <span className="sheen-field-optional">{optionalText}</span>}
  </>
)

const LABELABLE = "input, textarea, select, button, meter, output, progress"

const FieldLabel = React.forwardRef<HTMLLabelElement, FieldLabelProps>(
  ({ className, children, optionalText = "(Optional)", requiredIndicator = "*", onClick, ...props }, ref) => {
    const field = useField()
    return (
      <label
        ref={ref}
        id={field?.labelId}
        htmlFor={field?.controlId}
        className={cn("sheen-field-label", className)}
        onClick={(event) => {
          onClick?.(event)
          if (event.defaultPrevented || !field) return
          // Controls that aren't labelable (a group of date segments, a slider's track…):
          // focus their first focusable element, like a native label would.
          const target = document.getElementById(field.controlId)
          if (target && !target.matches(LABELABLE)) {
            event.preventDefault()
            target.querySelector<HTMLElement>("input, button, [tabindex]:not([tabindex='-1']), [contenteditable='true']")?.focus()
          }
        }}
        {...props}
      >
        {children}
        <Hints field={field} optionalText={optionalText} requiredIndicator={requiredIndicator} />
      </label>
    )
  },
)
FieldLabel.displayName = "FieldLabel"

/**
 * The props a control needs to be wired to the surrounding Field, merged with
 * its own (its own win). Use it in custom controls, or in components whose
 * Root renders no element (e.g. Select reads it in SelectTrigger).
 */
export function useFieldControlProps<P extends Record<string, unknown>>(own: P): P {
  const field = useField()
  if (!field) return own
  const describedBy = [
    own["aria-describedby"] as string | undefined,
    field.hasDescription ? field.descriptionId : undefined,
    field.invalid && field.hasError ? field.errorId : undefined,
  ]
    .filter(Boolean)
    .join(" ")
  return {
    ...own,
    id: (own.id as string | undefined) ?? field.controlId,
    // Explicit labelling works for every control, labelable or not.
    "aria-labelledby": (own["aria-labelledby"] as string | undefined) ?? (own["aria-label"] ? undefined : field.labelId),
    "aria-describedby": describedBy || undefined,
    "aria-invalid": field.invalid || (own["aria-invalid"] as boolean | undefined) || undefined,
    "aria-required": field.required || (own["aria-required"] as boolean | undefined) || undefined,
    ...(field.disabled && { disabled: true }),
  }
}

/** Wraps exactly one control and wires it to the Field. */
const FieldControl = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(({ children, ...props }, ref) => {
  const merged = useFieldControlProps(React.isValidElement(children) ? (children.props as Record<string, unknown>) : {})
  if (!React.isValidElement(children)) return <>{children}</>
  const { children: _ignored, ...wiring } = merged
  return (
    <Slot ref={ref} {...wiring} {...props}>
      {React.cloneElement(children, wiring)}
    </Slot>
  )
})
FieldControl.displayName = "FieldControl"

const FieldDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => {
    const field = useField()
    const register = field?.register
    React.useLayoutEffect(() => register?.("description"), [register])
    return <p ref={ref} id={field?.descriptionId} className={cn("sheen-field-description", className)} {...props} />
  },
)
FieldDescription.displayName = "FieldDescription"

export interface FieldErrorProps extends React.HTMLAttributes<HTMLParagraphElement> {
  /** Show even if the Field isn't `invalid` (rarely needed). */
  forceMount?: boolean
}

/**
 * The error message. Renders only while the Field is invalid and there is
 * something to say. It's tied to the control with aria-describedby, so it is
 * read when the control is focused (focusFirstInvalid moves focus there on submit).
 */
const FieldError = React.forwardRef<HTMLParagraphElement, FieldErrorProps>(
  ({ className, children: childrenProp, forceMount, ...props }, ref) => {
    const field = useField()
    const children = childrenProp ?? field?.defaultError
    const register = field?.register
    const visible = (forceMount || field?.invalid) && children != null && children !== false && children !== ""
    React.useLayoutEffect(() => (visible ? register?.("error") : undefined), [register, visible])
    if (!visible) return null

    return (
      <p ref={ref} id={field?.errorId} className={cn("sheen-field-error", className)} {...props}>
        {/* CircleAlert paths from Lucide (ISC). */}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
        </svg>
        <span>{children}</span>
      </p>
    )
  },
)
FieldError.displayName = "FieldError"

// -----------------------------------------------------------------------------
// FieldSet — a group of controls answering one question (radios, checkboxes)
// -----------------------------------------------------------------------------

export interface FieldSetProps extends FieldStateProps, Omit<React.FieldsetHTMLAttributes<HTMLFieldSetElement>, "id"> {}

const FieldSet = React.forwardRef<HTMLFieldSetElement, FieldSetProps>(
  ({ id, invalid: invalidProp, disabled: disabledProp, required: requiredProp, optional, className, ...props }, ref) => {
    const { invalid, disabled, required, defaultError } = useResolvedState({
      invalid: invalidProp,
      disabled: disabledProp,
      required: requiredProp,
    })
    const context = useFieldState({ id, invalid, disabled, required, optional, defaultError })
    return (
      <FieldContext.Provider value={context}>
        <FieldDefaultsContext.Provider value={NO_DEFAULTS}>
          <fieldset
            ref={ref}
            disabled={disabled}
            aria-describedby={
              [context.hasDescription && context.descriptionId, invalid && context.hasError && context.errorId].filter(Boolean).join(" ") ||
              undefined
            }
            aria-invalid={invalid || undefined}
            data-invalid={invalid || undefined}
            className={cn("sheen-fieldset", className)}
            {...props}
          />
        </FieldDefaultsContext.Provider>
      </FieldContext.Provider>
    )
  },
)
FieldSet.displayName = "FieldSet"

const FieldLegend = React.forwardRef<
  HTMLLegendElement,
  React.HTMLAttributes<HTMLLegendElement> & Pick<FieldLabelProps, "optionalText" | "requiredIndicator">
>(({ className, children, optionalText = "(Optional)", requiredIndicator = "*", ...props }, ref) => {
  const field = useField()
  return (
    <legend ref={ref} id={field?.labelId} className={cn("sheen-field-legend", className)} {...props}>
      {children}
      <Hints field={field} optionalText={optionalText} requiredIndicator={requiredIndicator} />
    </legend>
  )
})
FieldLegend.displayName = "FieldLegend"

// -----------------------------------------------------------------------------
// Submit helper
// -----------------------------------------------------------------------------

/**
 * After a failed submit: focus the first invalid control in `form` and give
 * its Field a short shake. Returns true if something was invalid.
 */
export function focusFirstInvalid(form: HTMLElement | null) {
  const control = form?.querySelector<HTMLElement>("[aria-invalid='true']:not(.sheen-field):not(fieldset), fieldset[aria-invalid='true']")
  if (!control) return false
  const focusable = control.matches("input, textarea, select, button, [tabindex]")
    ? control
    : control.querySelector<HTMLElement>("input, textarea, button, [tabindex]:not([tabindex='-1']), [contenteditable='true']")
  focusable?.focus({ preventScroll: true })
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  control.scrollIntoView({ block: "center", behavior: reduced ? "instant" : "smooth" })
  const field = control.closest<HTMLElement>(".sheen-field, .sheen-fieldset")
  if (field && !reduced) {
    field.removeAttribute("data-shake")
    void field.offsetWidth // restart the animation
    field.setAttribute("data-shake", "")
    field.addEventListener("animationend", () => field.removeAttribute("data-shake"), { once: true })
  }
  return true
}

export { Field, FieldLabel, FieldControl, FieldDescription, FieldError, FieldSet, FieldLegend }
