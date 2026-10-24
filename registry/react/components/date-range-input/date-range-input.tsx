"use client"

import * as React from "react"
import { Input, type InputProps } from "@/components/ui/input"
import { useFieldControlProps } from "@/components/ui/field"

export type DateRangeValue = { start: string; end: string }
export interface DateRangeInputProps extends Omit<InputProps, "type" | "value" | "defaultValue" | "onChange"> {
  value?: DateRangeValue
  defaultValue?: DateRangeValue
  onChange?: (value: DateRangeValue) => void
  endName?: string
  startLabel?: string
  endLabel?: string
  separator?: React.ReactNode
  orderMessage?: string
}
const DateRangeInput = React.forwardRef<HTMLInputElement, DateRangeInputProps>(({
  value, defaultValue = { start: "", end: "" }, onChange, endName, startLabel = "Start date", endLabel = "End date",
  separator = "\u2013", orderMessage = "Start date must be on or before end date.", name, ...props
}, ref) => {
  const auto = React.useId()
  const wired = useFieldControlProps(props)
  const id = wired.id ?? auto
  const [internal, setInternal] = React.useState(defaultValue)
  const range = value ?? internal
  const invalid = !!(range.start && range.end && range.start > range.end)
  const change = (next: DateRangeValue) => { if (value === undefined) setInternal(next); onChange?.(next) }
  const descriptions = [wired["aria-describedby"], invalid ? `${id}-range-error` : undefined].filter(Boolean).join(" ") || undefined
  return <>
    <div className="sheen-date-range-input" data-sheen-appearance={props.appearance}>
      <Input {...wired} ref={ref} type="date" id={id} name={name} value={range.start} max={range.end || props.max}
        aria-label={startLabel} aria-labelledby={undefined} aria-describedby={descriptions} invalid={invalid || props.invalid}
        onChange={e => change({ ...range, start: e.target.value })} />
      <span aria-hidden="true">{separator}</span>
      <Input {...wired} startIcon={undefined} type="date" id={`${id}-end`} name={endName} value={range.end} min={range.start || props.min}
        aria-label={endLabel} aria-labelledby={undefined} aria-describedby={descriptions} invalid={invalid || props.invalid}
        onChange={e => change({ ...range, end: e.target.value })} />
    </div>
    {invalid && <p id={`${id}-range-error`} className="sheen-field-error" role="alert">{orderMessage}</p>}
  </>
})
DateRangeInput.displayName = "DateRangeInput"
export { DateRangeInput }
