"use client"

import * as React from "react"

import { Input, type InputProps } from "@/components/ui/input"
import { useFieldControlProps } from "@/components/ui/field"
import { cn } from "@/lib/utils"
import { useSheenTheme } from "@/lib/theme"

type InputGroupContextValue = {
  size: NonNullable<InputProps["size"]>
  variant: NonNullable<InputProps["variant"]>
  disabled?: boolean
  invalid?: boolean
  required?: boolean
  autoAdvance?: boolean
}

const InputGroupContext = React.createContext<InputGroupContextValue | null>(null)

export interface InputGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Size of every field. */
  size?: InputProps["size"]
  variant?: InputProps["variant"]
  orientation?: "horizontal" | "vertical"
  /** Disables every field (a field's own `disabled` wins). */
  disabled?: boolean
  /** Marks every field invalid. */
  invalid?: boolean
  /** Makes every field required (a field's own `required` wins). */
  required?: boolean
  /**
   * Move to the next field once one reaches its `maxLength`, and back with
   * Backspace in an empty field. Pasting fills the following fields too.
   */
  autoAdvance?: boolean
}

/**
 * Several fields joined into one control (phone, IP address, RGB…). Only the
 * outer corners are rounded, and they follow the reading direction.
 */
const InputGroup = React.forwardRef<HTMLDivElement, InputGroupProps>(
  (
    { size = "default", variant = "filled", orientation = "horizontal", disabled, invalid, required, autoAdvance, className, ...props },
    ref,
  ) => {
    const wired = useFieldControlProps({ ...props, disabled, required })
    disabled = wired.disabled
    required = required ?? (wired["aria-required"] === true)
    invalid = invalid ?? (wired["aria-invalid"] === true)
    props = wired
    const value = React.useMemo(
      () => ({ size, variant, disabled, invalid, required, autoAdvance }),
      [size, variant, disabled, invalid, required, autoAdvance],
    )
    return (
      <InputGroupContext.Provider value={value}>
        <div
          ref={ref}
          role="group"
          data-orientation={orientation}
          data-size={size}
          data-disabled={disabled ? "" : undefined}
          data-invalid={invalid ? "" : undefined}
          className={cn("sheen-joined-inputs", className)}
          {...props}
        />
      </InputGroupContext.Provider>
    )
  },
)
InputGroup.displayName = "InputGroup"

export type InputGroupItemProps = Omit<InputProps, "size" | "startIcon" | "endIcon" | "clearable" | "onClear" | "wrapperClassName">

/** The fields of the group, in order. */
const groupFields = (input: HTMLInputElement) =>
  Array.from(input.closest(".sheen-joined-inputs")?.querySelectorAll<HTMLInputElement>(":scope > .sheen-joined-input") ?? []).filter(
    (field) => !field.disabled && !field.readOnly,
  )

const InputGroupItem = React.forwardRef<HTMLInputElement, InputGroupItemProps>(
  ({ className, disabled, required, invalid, onChange, onKeyDown, onPaste, ...props }, ref) => {
    const context = React.useContext(InputGroupContext)
    const theme = useSheenTheme()
    const autoId = React.useId()
    if (!context) throw new Error("`InputGroupItem` must be used within `InputGroup`")

    const move = (from: HTMLInputElement, step: 1 | -1, caret: "start" | "end") => {
      const fields = groupFields(from)
      const next = fields[fields.indexOf(from) + step]
      if (!next) return
      next.focus()
      const at = caret === "start" ? 0 : next.value.length
      try {
        next.setSelectionRange(at, at)
      } catch {
        // Number fields don't support selection ranges; focus is enough there.
      }
    }

    return (
      <Input
        id={props.id ?? autoId}
        ref={ref}
        size={context.size}
        variant={context.variant}
        disabled={disabled ?? context.disabled}
        required={required ?? context.required}
        invalid={invalid ?? context.invalid}
        className={cn("sheen-joined-input", className)}
        onChange={(event) => {
          onChange?.(event)
          const input = event.currentTarget
          const max = input.maxLength
          if (context.autoAdvance && max > 0 && input.value.length >= max && !(event.nativeEvent as InputEvent).isComposing && (event.nativeEvent as InputEvent).inputType !== undefined) {
            move(input, 1, "start")
          }
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event)
          if (!context.autoAdvance || event.defaultPrevented) return
          const input = event.currentTarget
          const caretAtStart = input.selectionStart === 0 && input.selectionEnd === 0
          if (event.key === "Backspace" && input.value === "") {
            event.preventDefault()
            move(input, -1, "end")
          }
          // Arrows follow the screen: in RTL the previous field is on the right.
          const rtl = (theme.direction ?? getComputedStyle(input).direction) === "rtl"
          const back = rtl ? "ArrowRight" : "ArrowLeft"
          const forward = rtl ? "ArrowLeft" : "ArrowRight"
          if (event.key === back && caretAtStart) {
            event.preventDefault()
            move(input, -1, "end")
          }
          if (event.key === forward && input.selectionStart === input.value.length && input.selectionEnd === input.value.length) {
            event.preventDefault()
            move(input, 1, "start")
          }
        }}
        onPaste={(event) => {
          onPaste?.(event)
          if (!context.autoAdvance || event.defaultPrevented) return
          const input = event.currentTarget
          const max = input.maxLength
          const text = event.clipboardData.getData("text").trim()
          if (max <= 0 || text.length <= max) return
          // Spread a long paste ("192.168.1.10", "0791234567") over this field and the next ones.
          event.preventDefault()
          const fields = groupFields(input).slice(groupFields(input).indexOf(input))
          const parts = /[\s.\-:/,]/.test(text) ? text.split(/[\s.\-:/,]+/) : (text.match(new RegExp(`.{1,${max}}`, "g")) ?? [])
          let last = input
          fields.forEach((field, i) => {
            if (parts[i] === undefined) return
            setNativeValue(field, parts[i].slice(0, field.maxLength > 0 ? field.maxLength : undefined))
            last = field
          })
          last.focus()
        }}
        {...props}
      />
    )
  },
)
InputGroupItem.displayName = "InputGroupItem"

export { InputGroup, InputGroupItem }

// Use the native setter so React's value tracker observes a real input event.
function setNativeValue(input: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value)
  input.dispatchEvent(new Event("input", { bubbles: true }))
}
