"use client"

// Ported from boot-ui. Built-in SVG paths from Lucide (ISC).
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { type DraggableAttributes, type DraggableSyntheticListeners } from "@dnd-kit/core"
import { defaultAnimateLayoutChanges, horizontalListSortingStrategy, SortableContext, useSortable, verticalListSortingStrategy, type AnimateLayoutChanges } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { DRAG_COPY, DRAG_TRANSITION } from "@/components/ui/sortable"
import { cn } from "@/lib/utils"
import { useMergedRef } from "@/lib/refs"
import { KanbanBoardContext } from "./kanban-board"
import { KanbanOverlayContext, useKanban } from "./kanban-context"

export type DragContextValue = {
  id: string
  attributes: DraggableAttributes
  listeners: DraggableSyntheticListeners | undefined
  setActivatorNodeRef: (node: HTMLElement | null) => void
  isDragging: boolean
  disabled?: boolean
}

export const KanbanColumnContext = React.createContext<(DragContextValue & { value: string }) | null>(null)

export const KanbanItemContext = React.createContext<DragContextValue | null>(null)

export const animateLayoutChanges: AnimateLayoutChanges = (args) => defaultAnimateLayoutChanges({ ...args, wasDragging: true })

export interface KanbanColumnProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The column id, a key of `value`. */
  value: string
  /** Drag the whole column instead of a `KanbanColumnHandle`. */
  asHandle?: boolean
  disabled?: boolean
  asChild?: boolean
}

export const KanbanColumn = React.forwardRef<HTMLDivElement, KanbanColumnProps>((props, ref) => {
  const inBoard = React.useContext(KanbanBoardContext)
  const inOverlay = React.useContext(KanbanOverlayContext)
  if (!inBoard && !inOverlay) throw new Error("`KanbanColumn` must be used within `KanbanBoard` or `KanbanOverlay`")
  return inOverlay ? <KanbanColumnCopy ref={ref} {...props} /> : <KanbanColumnLive ref={ref} {...props} />
})

KanbanColumn.displayName = "KanbanColumn"

export const KanbanColumnLive = React.forwardRef<HTMLDivElement, KanbanColumnProps>(
  ({ value, asHandle, disabled, asChild, className, style, id: idProp, ...props }, ref) => {
    const context = useKanban("KanbanColumn")
    const fallbackId = React.useId()
    const id = idProp ?? fallbackId
    const count = context.columns[value]?.length ?? 0
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
      id: value,
      disabled,
      data: { type: "column", count },
      animateLayoutChanges,
      transition: context.reducedMotion ? { ...DRAG_TRANSITION, duration: 0 } : DRAG_TRANSITION,
    })
    const columnContext = React.useMemo(
      () => ({ value, id, attributes, listeners, setActivatorNodeRef, isDragging, disabled }),
      [value, id, attributes, listeners, setActivatorNodeRef, isDragging, disabled],
    )
    const setRef = useMergedRef(ref, setNodeRef)
    const draggingCard = context.activeId !== null && !Object.prototype.hasOwnProperty.call(context.columns, context.activeId)
    const Comp = asChild ? Slot : "div"
    const draggable = asHandle && !disabled
    return (
      <KanbanColumnContext.Provider value={columnContext}>
        <Comp
          ref={setRef}
          id={id}
          data-disabled={disabled ? "" : undefined}
          data-dragging={isDragging ? "" : undefined}
          data-placeholder={isDragging ? "" : undefined}
          data-over={draggingCard && context.overColumn === value ? "" : undefined}
          data-handle={asHandle ? "" : undefined}
          data-flat-cursor={context.flatCursor ? "" : undefined}
          className={cn("sheen-kanban-column", className)}
          style={{ transform: CSS.Translate.toString(transform), transition, ...style }}
          {...props}
          {...(draggable ? attributes : {})}
          {...(draggable ? listeners : {})}
          // A column dragged as a whole is a button; otherwise it groups its cards.
          role={draggable ? attributes.role : "group"}
        />
      </KanbanColumnContext.Provider>
    )
  },
)

export const KanbanColumnCopy = React.forwardRef<HTMLDivElement, KanbanColumnProps>(
  ({ value, asHandle, disabled, asChild, className, id: _id, ...props }, ref) => {
    const context = useKanban("KanbanColumn")
    const columnContext = React.useMemo(() => ({ ...DRAG_COPY, value, disabled }), [value, disabled])
    const Comp = asChild ? Slot : "div"
    return (
      <KanbanColumnContext.Provider value={columnContext}>
        <Comp
          ref={ref}
          role="group"
          data-overlay=""
          data-handle={asHandle ? "" : undefined}
          data-flat-cursor={context.flatCursor ? "" : undefined}
          className={cn("sheen-kanban-column", className)}
          {...props}
        />
      </KanbanColumnContext.Provider>
    )
  },
)

export const KanbanColumnHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("sheen-kanban-column-header", className)} {...props} />
))

KanbanColumnHeader.displayName = "KanbanColumnHeader"

export const KanbanColumnTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(({ className, ...props }, ref) => (
  <h3 ref={ref} className={cn("sheen-kanban-column-title", className)} {...props} />
))

KanbanColumnTitle.displayName = "KanbanColumnTitle"

export const KanbanColumnCount = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement> & { max?: number }>(
  ({ className, max, children, ...props }, ref) => {
    const context = useKanban("KanbanColumnCount")
    const column = React.useContext(KanbanColumnContext)
    const count = column ? (context.columns[column.value]?.length ?? 0) : 0
    return (
      <span
        ref={ref}
        key={count}
        className={cn("sheen-kanban-column-count", className)}
        data-over-limit={max !== undefined && count > max ? "" : undefined}
        {...props}
      >
        {children ?? (max !== undefined ? `${count}/${max}` : count)}
      </span>
    )
  },
)

KanbanColumnCount.displayName = "KanbanColumnCount"

export interface KanbanColumnContentProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Shown when the column has no cards (it still accepts drops). */
  empty?: React.ReactNode
}

export const KanbanColumnContent = React.forwardRef<HTMLDivElement, KanbanColumnContentProps>(({ className, empty, children, ...props }, ref) => {
  const context = useKanban("KanbanColumnContent")
  const column = React.useContext(KanbanColumnContext)
  if (!column) throw new Error("`KanbanColumnContent` must be used within `KanbanColumn`")
  const items = React.useMemo(() => (context.columns[column.value] ?? []).map(context.getItemValue), [context, column.value])
  const isEmpty = items.length === 0
  return (
    <SortableContext
      items={items}
      strategy={context.orientation === "horizontal" ? verticalListSortingStrategy : horizontalListSortingStrategy}
    >
      <div ref={ref} data-empty={isEmpty ? "" : undefined} className={cn("sheen-kanban-column-content", className)} {...props}>
        {children}
        {isEmpty && empty !== undefined && <div className="sheen-kanban-empty">{empty}</div>}
      </div>
    </SortableContext>
  )
})

KanbanColumnContent.displayName = "KanbanColumnContent"
KanbanColumnLive.displayName = "KanbanColumnLive"
KanbanColumnCopy.displayName = "KanbanColumnCopy"
