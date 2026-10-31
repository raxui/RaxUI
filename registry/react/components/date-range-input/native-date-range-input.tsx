"use client"

import * as React from "react"
import { Input, type InputProps } from "@/components/ui/input"
import { useFieldControlProps } from "@/components/ui/field"

export type NativeDateRangeValue = { start: string; end: string }
export interface NativeDateRangeInputProps extends Omit<InputProps, "type" | "value" | "defaultValue" | "onChange"> {
  value?: NativeDateRangeValue
  defaultValue?: NativeDateRangeValue
  onChange?: (value: NativeDateRangeValue) => void
  endName?: string
  startLabel?: string
  endLabel?: string
  separator?: React.ReactNode
  orderMessage?: string
}
const NativeDateRangeInput = React.forwardRef<HTMLInputElement, NativeDateRangeInputProps>(({
  value, defaultValue = { start: "", end: "" }, onChange, endName, startLabel = "Start date", endLabel = "End date",
  separator = "\u2013", orderMessage = "Start date must be on or before end date.", name, ...props
}, ref) => {
  const auto = React.useId()
  const wired = useFieldControlProps(props)
  const id = wired.id ?? auto
  const [internal, setInternal] = React.useState(defaultValue)
  const range = value ?? internal
  const invalid = !!(range.start && range.end && range.start > range.end)
  const change = (next: NativeDateRangeValue) => { if (value === undefined) setInternal(next); onChange?.(next) }
  const descriptions = [wired["aria-describedby"], invalid ? `${id}-range-error` : undefined].filter(Boolean).join(" ") || undefined
  return <>
    <div className="rax-date-range-input" data-rax-appearance={props.appearance}>
      <Input {...wired} ref={ref} type="date" id={id} name={name} value={range.start} max={range.end || props.max}
        aria-label={startLabel} aria-labelledby={undefined} aria-describedby={descriptions} invalid={invalid || props.invalid}
        onChange={e => change({ ...range, start: e.target.value })} />
      <span aria-hidden="true">{separator}</span>
      <Input {...wired} startIcon={undefined} type="date" id={`${id}-end`} name={endName} value={range.end} min={range.start || props.min}
        aria-label={endLabel} aria-labelledby={undefined} aria-describedby={descriptions} invalid={invalid || props.invalid}
        onChange={e => change({ ...range, end: e.target.value })} />
    </div>
    {invalid && <p id={`${id}-range-error`} className="rax-field-error" role="alert">{orderMessage}</p>}
  </>
})
NativeDateRangeInput.displayName = "NativeDateRangeInput"
export { NativeDateRangeInput }
