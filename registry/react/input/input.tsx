"use client"

import { useSheenTheme, sheenThemeAttributes, type SheenAppearance } from "@/lib/theme"
import * as React from "react"

// Built-in icon paths from Lucide (ISC).

import { useFieldControlProps } from "@/components/ui/field"
import { cn } from "@/lib/utils"

const sizeClasses = { sm: "form-control-sm", default: null, lg: "form-control-lg" } as const

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  appearance?: SheenAppearance
  size?: keyof typeof sizeClasses
  /** `glass` is a deprecated alias for outline; use appearance="glass" for the material. */
  variant?: "glass" | "outline" | "filled"
  /** Icon (or short text like "$") before the value. Tints to the accent colour on focus. */
  startIcon?: React.ReactNode
  /** Icon, text ("kg", ".com") or a small button after the value. */
  endIcon?: React.ReactNode
  /** Show an iOS clear button once there is text. */
  clearable?: boolean
  onClear?: () => void
  clearLabel?: string
  /** Styles the field red; also sets aria-invalid. */
  invalid?: boolean
  /** Class for the wrapper when the field has icons. `className` always goes on the <input>. */
  wrapperClassName?: string
}

const ClearIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={4} strokeLinecap="round" aria-hidden="true">
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      wrapperClassName,
      size = "default",
      variant = "outline",
      appearance,
      startIcon,
      endIcon,
      clearable,
      onClear,
      clearLabel = "Clear",
      invalid,
      type = "text",
      onChange,
      ...props
    },
    ref,
  ) => {
    props = useFieldControlProps(props)
    const theme = useSheenTheme({ appearance })
    const inputRef = React.useRef<HTMLInputElement>(null)
    const composedRef = useMergedRef(ref, inputRef)

    // Track emptiness for uncontrolled fields too (to show/hide the clear button).
    const [uncontrolledFilled, setUncontrolledFilled] = React.useState(() => String(props.defaultValue ?? "") !== "")
    const filled = props.value !== undefined ? String(props.value) !== "" : uncontrolledFilled

    const ariaInvalid = invalid || props["aria-invalid"] || undefined

    const input = (
      <input
        {...sheenThemeAttributes(theme)}
        {...props}
        ref={composedRef}
        type={type}
        data-variant={variant}
        aria-invalid={ariaInvalid}
        className={cn("form-control sheen-input", sizeClasses[size], className)}
        onChange={(event) => {
          setUncontrolledFilled(event.currentTarget.value !== "")
          onChange?.(event)
        }}
      />
    )

    if (!startIcon && !endIcon && !clearable) return input

    const showClear = clearable && filled && !props.disabled && !props.readOnly

    return (
      <div
        className={cn("sheen-input-group", wrapperClassName)}
        {...sheenThemeAttributes(theme)}
        dir={props.dir ?? theme.direction}
        data-size={size}
        data-start={startIcon ? "" : undefined}
        data-end={endIcon || clearable ? "" : undefined}
      >
        {startIcon && (
          <span className="sheen-input-slot" data-side="start" onPointerDown={focusInput(inputRef)}>
            {startIcon}
          </span>
        )}
        {input}
        {(endIcon || clearable) && (
          <span className="sheen-input-slot" data-side="end" onPointerDown={focusInput(inputRef)}>
            {showClear && (
              <button
                type="button"
                className="sheen-input-clear"
                aria-label={clearLabel}
                onClick={() => {
                  const el = inputRef.current
                  if (!el) return
                  setNativeValue(el, "")
                  el.focus()
                  onClear?.()
                }}
              >
                <ClearIcon />
              </button>
            )}
            {endIcon}
          </span>
        )}
      </div>
    )
  },
)
Input.displayName = "Input"

/** Clicking a decorative slot focuses the field instead of stealing focus. */
// `| null` keeps this valid with React 19 types, where useRef<T>(null) is RefObject<T | null>.
function focusInput(inputRef: React.RefObject<HTMLInputElement | null>) {
  return (event: React.PointerEvent) => {
    if ((event.target as HTMLElement).closest("button, a, input, select")) return
    event.preventDefault()
    inputRef.current?.focus()
  }
}

// -----------------------------------------------------------------------------
// Password: eye toggle whose slash draws in / out
// -----------------------------------------------------------------------------

export interface PasswordInputProps extends Omit<InputProps, "type" | "endIcon"> {
  showLabel?: string
  hideLabel?: string
}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ showLabel = "Show password", hideLabel = "Hide password", ...props }, ref) => {
    const [visible, setVisible] = React.useState(false)
    return (
      <Input
        ref={ref}
        type={visible ? "text" : "password"}
        autoComplete="current-password"
        spellCheck={false}
        {...props}
        endIcon={
          <button
            type="button"
            className="sheen-input-action sheen-input-eye"
            aria-label={visible ? hideLabel : showLabel}
            aria-pressed={visible}
            data-visible={visible || undefined}
            disabled={props.disabled}
            onClick={() => setVisible((v) => !v)}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
              <circle className="sheen-input-eye-pupil" cx="12" cy="12" r="3" />
              <path className="sheen-input-eye-slash" d="M4 4l16 16" pathLength={1} />
            </svg>
          </button>
        }
      />
    )
  },
)
PasswordInput.displayName = "PasswordInput"

export { Input, PasswordInput }

// Local ref composition keeps copied controls independent of extra helpers.
function assignRef<T>(ref: React.ForwardedRef<T>, value: T | null) {
  if (typeof ref === "function") ref(value)
  else if (ref) ref.current = value
}
function useMergedRef<T>(forwarded: React.ForwardedRef<T>, local: React.MutableRefObject<T | null>) {
  return React.useCallback((node: T | null) => { local.current = node; assignRef(forwarded, node) }, [forwarded, local])
}

// Use the native setter so React's value tracker observes a real input event.
function setNativeValue(input: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value)
  input.dispatchEvent(new Event("input", { bubbles: true }))
}
