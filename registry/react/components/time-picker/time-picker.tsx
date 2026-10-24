"use client"

import * as React from "react"
import { Input, type InputProps } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export type TimePickerProps = Omit<InputProps, "type">
const TimePicker = React.forwardRef<HTMLInputElement, TimePickerProps>(({ className, ...props }, ref) => (
  <Input {...props} ref={ref} type="time" className={cn("sheen-time-picker", className)} />
))
TimePicker.displayName = "TimePicker"
export { TimePicker }
