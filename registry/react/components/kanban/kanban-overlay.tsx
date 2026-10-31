"use client"

// Ported from boot-ui. Built-in SVG paths from Lucide (ISC).
import * as React from "react"
import * as ReactDOM from "react-dom"
import { DragOverlay, useDndContext, type UniqueIdentifier } from "@dnd-kit/core"
import { DROP_ANIMATION, useOverlayContainer } from "@/components/ui/sortable"
import { cn } from "@/lib/utils"
import { useKanban, KanbanOverlayContext } from "./kanban-context"

export interface KanbanOverlayProps extends Omit<React.ComponentProps<typeof DragOverlay>, "children"> {
  container?: Element | DocumentFragment | null
  /** What follows the pointer: a function of the dragged id and whether it's a column or a card. Defaults to a copy of the dragged element. */
  children?: React.ReactNode | ((params: { value: UniqueIdentifier; variant: "column" | "card" }) => React.ReactNode)
}

export function KanbanOverlay(props: KanbanOverlayProps) {
  const { setHasOverlay } = useKanban("KanbanOverlay")
  React.useEffect(() => {
    setHasOverlay(true)
    return () => setHasOverlay(false)
  }, [setHasOverlay])
  return <KanbanOverlayPortal {...props} />
}

/** The overlay itself; `Kanban` renders one on its own when no `KanbanOverlay` is given. */
export function KanbanOverlayPortal({ container, children, className, ...props }: KanbanOverlayProps) {
  const context = useKanban("KanbanOverlay")
  const target = useOverlayContainer(container)
  if (!target) return null
  const { activeId } = context
  const variant = activeId !== null && Object.prototype.hasOwnProperty.call(context.columns, activeId) ? "column" : "card"
  return ReactDOM.createPortal(
    <DragOverlay
      dropAnimation={context.reducedMotion ? null : DROP_ANIMATION}
      className={cn("rax-kanban-overlay", context.flatCursor && "rax-kanban-overlay-flat", className)}
      {...props}
    >
      <KanbanOverlayContext.Provider value={true}>
        {activeId !== null ? (
          <div aria-hidden="true" dir={context.dir} className="rax-kanban-overlay-content">
            {typeof children === "function" ? children({ value: activeId, variant }) : (children ?? <KanbanOverlayClone />)}
          </div>
        ) : null}
      </KanbanOverlayContext.Provider>
    </DragOverlay>,
    target,
  )
}

/** A static copy of the dragged element, like the Blazor kanban's. */
function KanbanOverlayClone() {
  const { activeNode } = useDndContext()
  const ref = React.useRef<HTMLDivElement>(null)
  React.useLayoutEffect(() => {
    if (!activeNode || !ref.current) return
    const copy = activeNode.cloneNode(true) as HTMLElement
    copy.removeAttribute("id")
    copy.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"))
    copy.removeAttribute("data-placeholder")
    copy.removeAttribute("data-dragging")
    copy.style.removeProperty("transform")
    copy.style.removeProperty("transition")
    copy.dataset.overlay = ""
    copy.inert = true
    ref.current.replaceChildren(copy)
  }, [activeNode])
  return <div ref={ref} style={{ display: "contents" }} />
}
