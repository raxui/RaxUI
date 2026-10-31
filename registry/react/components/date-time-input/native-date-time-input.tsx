"use client"

import * as React from "react"
import { Input, type InputProps } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export type NativeDateTimeInputProps = Omit<InputProps, "type">
const NativeDateTimeInput = React.forwardRef<HTMLInputElement, NativeDateTimeInputProps>(({ className, ...props }, ref) => (
  <Input {...props} ref={ref} type="datetime-local" className={cn("rax-date-time-input", className)} />
))
NativeDateTimeInput.displayName = "NativeDateTimeInput"
export { NativeDateTimeInput }
