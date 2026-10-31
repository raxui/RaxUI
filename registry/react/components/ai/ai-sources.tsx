"use client"

// Ported from boot-ui. Built-in SVG paths from Lucide (ISC).
import * as React from "react"
import { cn } from "@/lib/utils"

export interface AISource {
  title: string
  url: string
}

export interface AISourcesProps extends React.HTMLAttributes<HTMLDivElement> {
  sources: AISource[]
  /** Label; {n} is replaced with the count. */
  label?: string
}

export const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

export const AISources = React.forwardRef<HTMLDivElement, AISourcesProps>(({ sources, label = "{n} sources", className, ...props }, ref) => (
  <div ref={ref} className={cn("rax-ai-sources", className)} {...props}>
    <span className="rax-ai-sources-label">{label.replace("{n}", String(sources.length))}</span>
    <ol>
      {sources.map((source, i) => (
        <li key={source.url}>
          <a href={source.url} target="_blank" rel="noreferrer" className="rax-ai-source" title={source.title}>
            <span className="rax-ai-source-index">{i + 1}</span>
            <span className="rax-ai-source-title">{source.title}</span>
            <span className="rax-ai-source-host">{hostOf(source.url)}</span>
          </a>
        </li>
      ))}
    </ol>
  </div>
))

AISources.displayName = "AISources"
