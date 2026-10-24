"use client"

import * as React from "react"
import { Input, type InputProps } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export type DateInputProps = Omit<InputProps, "type">
const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(({ className, ...props }, ref) => (
  <Input {...props} ref={ref} type="date" className={cn("sheen-date-input", className)} />
))
DateInput.displayName = "DateInput"
export { DateInput }
