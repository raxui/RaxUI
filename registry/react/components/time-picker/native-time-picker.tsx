"use client"

import * as React from "react"
import { Input, type InputProps } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export type NativeTimePickerProps = Omit<InputProps, "type">
const NativeTimePicker = React.forwardRef<HTMLInputElement, NativeTimePickerProps>(({ className, ...props }, ref) => (
  <Input {...props} ref={ref} type="time" className={cn("rax-time-picker", className)} />
))
NativeTimePicker.displayName = "NativeTimePicker"
export { NativeTimePicker }
