"use client"

// Ported from boot-ui. Built-in SVG paths from Lucide (ISC).
import * as React from "react"
import { cn } from "@/lib/utils"

export interface AISuggestionsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> {
  suggestions: string[]
  onSelect: (suggestion: string) => void
}

export const AISuggestions = React.forwardRef<HTMLDivElement, AISuggestionsProps>(({ suggestions, onSelect, className, ...props }, ref) => (
  <div ref={ref} className={cn("rax-ai-suggestions", className)} {...props}>
    {suggestions.map((suggestion, i) => (
      <button
        key={suggestion}
        type="button"
        className="rax-ai-suggestion"
        style={{ "--rax-i": i } as React.CSSProperties}
        dir="auto"
        onClick={() => onSelect(suggestion)}
      >
        {suggestion}
      </button>
    ))}
  </div>
))

AISuggestions.displayName = "AISuggestions"
