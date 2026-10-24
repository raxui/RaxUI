"use client"

import * as React from "react"
import { Input, type InputProps } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export type DateTimeInputProps = Omit<InputProps, "type">
const DateTimeInput = React.forwardRef<HTMLInputElement, DateTimeInputProps>(({ className, ...props }, ref) => (
  <Input {...props} ref={ref} type="datetime-local" className={cn("sheen-date-time-input", className)} />
))
DateTimeInput.displayName = "DateTimeInput"
export { DateTimeInput }
