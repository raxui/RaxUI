"use client"

// Ported from boot-ui. Built-in SVG paths from Lucide (ISC).
import * as React from "react"
import { type UniqueIdentifier } from "@dnd-kit/core"

export type KanbanColumns<T> = Record<string, T[]>

export type KanbanContextValue = {
  reducedMotion: boolean
  columns: KanbanColumns<unknown>
  getItemValue: (item: unknown) => UniqueIdentifier
  activeId: UniqueIdentifier | null
  /** Column the dragged card is over, highlighted while dragging. */
  overColumn: string | null
  orientation: "horizontal" | "vertical"
  flatCursor: boolean
  hasOverlay: boolean
  setHasOverlay: (has: boolean) => void
  /** Direction where the drag started; the overlay is portaled to <body> and needs it. */
  dir: "ltr" | "rtl"
}

export const KanbanContext = React.createContext<KanbanContextValue | null>(null)

export const KanbanOverlayContext = React.createContext(false)

export function useKanban(name: string) {
  const context = React.useContext(KanbanContext)
  if (!context) throw new Error(`\`${name}\` must be used within \`Kanban\``)
  return context
}
