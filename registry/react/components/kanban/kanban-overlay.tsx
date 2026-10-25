"use client"

// Ported from boot-ui. Built-in SVG paths from Lucide (ISC).
import * as React from "react"
import * as ReactDOM from "react-dom"
import { DragOverlay, type UniqueIdentifier } from "@dnd-kit/core"
import { DROP_ANIMATION, useOverlayContainer } from "@/components/ui/sortable"
import { cn } from "@/lib/utils"
import { useKanban, KanbanOverlayContext } from "./kanban-context"

export interface KanbanOverlayProps extends Omit<React.ComponentProps<typeof DragOverlay>, "children"> {
  container?: Element | DocumentFragment | null
  /** What follows the pointer: a function of the dragged id and whether it's a column or a card. */
  children?: React.ReactNode | ((params: { value: UniqueIdentifier; variant: "column" | "card" }) => React.ReactNode)
}

export function KanbanOverlay({ container, children, className, ...props }: KanbanOverlayProps) {
  const context = useKanban("KanbanOverlay")
  const { setHasOverlay } = context
  React.useEffect(() => {
    setHasOverlay(true)
    return () => setHasOverlay(false)
  }, [setHasOverlay])
  const target = useOverlayContainer(container)
  if (!target) return null
  const { activeId } = context
  const variant = activeId !== null && Object.prototype.hasOwnProperty.call(context.columns, activeId) ? "column" : "card"
  return ReactDOM.createPortal(
    <DragOverlay
      dropAnimation={context.reducedMotion ? null : DROP_ANIMATION}
      className={cn("sheen-kanban-overlay", context.flatCursor && "sheen-kanban-overlay-flat", className)}
      {...props}
    >
      <KanbanOverlayContext.Provider value={true}>
        {activeId !== null ? (
          <div aria-hidden="true" dir={context.dir} className="sheen-kanban-overlay-content">
            {typeof children === "function" ? children({ value: activeId, variant }) : children}
          </div>
        ) : null}
      </KanbanOverlayContext.Provider>
    </DragOverlay>,
    target,
  )
}
