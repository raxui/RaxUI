"use client"

import * as React from "react"
import { Input, type InputProps } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export type NativeDateInputProps = Omit<InputProps, "type">
const NativeDateInput = React.forwardRef<HTMLInputElement, NativeDateInputProps>(({ className, ...props }, ref) => (
  <Input {...props} ref={ref} type="date" className={cn("rax-date-input", className)} />
))
NativeDateInput.displayName = "NativeDateInput"
export { NativeDateInput }
