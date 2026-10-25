"use client"

// Ported from boot-ui. Built-in SVG paths from Lucide (ISC).
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { type UniqueIdentifier } from "@dnd-kit/core"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { DRAG_COPY, DRAG_TRANSITION } from "@/components/ui/sortable"
import { cn } from "@/lib/utils"
import { useMergedRef } from "@/lib/refs"
import { KanbanBoardContext } from "./kanban-board"
import { KanbanOverlayContext, useKanban } from "./kanban-context"
import { KanbanItemContext } from "./kanban-column"

export interface KanbanItemProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The card's id, the same one `getItemValue` returns. */
  value: UniqueIdentifier
  /** Drag by the whole card (default) or only by a `KanbanItemHandle`. */
  asHandle?: boolean
  disabled?: boolean
  asChild?: boolean
}

export const KanbanItem = React.forwardRef<HTMLDivElement, KanbanItemProps>((props, ref) => {
  const inBoard = React.useContext(KanbanBoardContext)
  const inOverlay = React.useContext(KanbanOverlayContext)
  if (!inBoard && !inOverlay) throw new Error("`KanbanItem` must be used within `KanbanBoard` or `KanbanOverlay`")
  return inOverlay ? <KanbanItemCopy ref={ref} {...props} /> : <KanbanItemLive ref={ref} {...props} />
})

KanbanItem.displayName = "KanbanItem"

export const KanbanItemLive = React.forwardRef<HTMLDivElement, KanbanItemProps>(
  ({ value, asHandle = true, disabled, asChild, className, style, id: idProp, ...props }, ref) => {
    const context = useKanban("KanbanItem")
    const fallbackId = React.useId()
    const id = idProp ?? fallbackId
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
      id: value,
      disabled,
      data: { type: "card" },
      transition: context.reducedMotion ? { ...DRAG_TRANSITION, duration: 0 } : DRAG_TRANSITION,
    })
    const itemContext = React.useMemo(
      () => ({ id, attributes, listeners, setActivatorNodeRef, isDragging, disabled }),
      [id, attributes, listeners, setActivatorNodeRef, isDragging, disabled],
    )
    // Stable, so dnd-kit doesn't re-measure the card on every render mid-drag.
    const setRef = useMergedRef(ref, setNodeRef, asHandle ? setActivatorNodeRef : undefined)
    const Comp = asChild ? Slot : "div"
    const draggable = asHandle && !disabled
    return (
      <KanbanItemContext.Provider value={itemContext}>
        <Comp
          ref={setRef}
          id={id}
          data-disabled={disabled ? "" : undefined}
          data-dragging={isDragging ? "" : undefined}
          data-placeholder={isDragging && context.hasOverlay ? "" : undefined}
          data-handle={asHandle ? "" : undefined}
          data-flat-cursor={context.flatCursor ? "" : undefined}
          className={cn("sheen-kanban-item", className)}
          style={{ transform: CSS.Translate.toString(transform), transition, ...style }}
          {...props}
          {...(draggable ? attributes : {})}
          {...(draggable ? listeners : {})}
        />
      </KanbanItemContext.Provider>
    )
  },
)

export const KanbanItemCopy = React.forwardRef<HTMLDivElement, KanbanItemProps>(
  ({ value: _value, asHandle = true, disabled, asChild, className, id: _id, ...props }, ref) => {
    const context = useKanban("KanbanItem")
    const itemContext = React.useMemo(() => ({ ...DRAG_COPY, disabled }), [disabled])
    const Comp = asChild ? Slot : "div"
    return (
      <KanbanItemContext.Provider value={itemContext}>
        <Comp
          ref={ref}
          data-overlay=""
          data-handle={asHandle ? "" : undefined}
          data-flat-cursor={context.flatCursor ? "" : undefined}
          className={cn("sheen-kanban-item", className)}
          {...props}
        />
      </KanbanItemContext.Provider>
    )
  },
)
KanbanItemLive.displayName = "KanbanItemLive"
KanbanItemCopy.displayName = "KanbanItemCopy"
