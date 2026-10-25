"use client"

// Ported from boot-ui. Built-in SVG paths from Lucide (ISC).
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { GripIcon } from "@/components/ui/sortable"
import { cn } from "@/lib/utils"
import { useMergedRef } from "@/lib/refs"
import { type DragContextValue, KanbanColumnContext, KanbanItemContext } from "./kanban-column"
import { useKanban, KanbanOverlayContext } from "./kanban-context"

export interface KanbanHandleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
}

export function makeHandle(name: string, useDrag: () => DragContextValue | null, defaultLabel: string) {
  const Handle = React.forwardRef<HTMLButtonElement, KanbanHandleProps>(
    ({ asChild, disabled, className, children, "aria-label": ariaLabel = defaultLabel, ...props }, ref) => {
      const context = useKanban(name)
      const drag = useDrag()
      if (!drag) throw new Error(`\`${name}\` must be used within its column or card`)
      const inOverlay = React.useContext(KanbanOverlayContext)
      const off = (disabled ?? drag.disabled) || inOverlay
      const setRef = useMergedRef(ref, off ? undefined : drag.setActivatorNodeRef)
      const Comp = asChild ? Slot : "button"
      return (
        <Comp
          ref={setRef}
          type="button"
          aria-label={ariaLabel}
          aria-controls={drag.id || undefined}
          data-dragging={drag.isDragging ? "" : undefined}
          data-flat-cursor={context.flatCursor ? "" : undefined}
          disabled={disabled ?? drag.disabled}
          className={cn("sheen-kanban-handle", className)}
          {...props}
          {...(off ? {} : drag.attributes)}
          {...(off ? {} : drag.listeners)}
        >
          {children ?? <GripIcon />}
        </Comp>
      )
    },
  )
  Handle.displayName = name
  return Handle
}

export const KanbanColumnHandle = makeHandle("KanbanColumnHandle", () => React.useContext(KanbanColumnContext), "Drag column")

export const KanbanItemHandle = makeHandle("KanbanItemHandle", () => React.useContext(KanbanItemContext), "Drag card")
