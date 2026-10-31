"use client"

// Ported from boot-ui. Built-in SVG paths from Lucide (ISC).
import * as React from "react"
import { useSheenTheme, SheenThemeBoundary, type SheenAppearance } from "@/lib/theme"
import { closestCenter, DndContext, getFirstCollision, MeasuringStrategy, pointerWithin, rectIntersection, type Announcements, type CollisionDetection, type DndContextProps, type DragEndEvent, type DragOverEvent, type DragStartEvent, type UniqueIdentifier } from "@dnd-kit/core"
import { arrayMove } from "@dnd-kit/sortable"
import { useDragSensors } from "@/components/ui/sortable"
import { getDirection } from "@/lib/direction"
import { type KanbanColumns, type KanbanContextValue, KanbanContext } from "./kanban-context"
import { coordinateGetter } from "./kanban-keyboard"
import { KanbanOverlayPortal } from "./kanban-overlay"

export type KanbanLabels = {
  instructions?: string
  grabbed?: (name: string, column: string, position: number, total: number) => string
  moved?: (name: string, column: string, position: number, total: number) => string
  dropped?: (name: string, column: string, position: number, total: number) => string
  cancelled?: (name: string) => string
}

export type ItemValueProp<T> = T extends object
  ? { /** Returns a card's unique id. Required for objects. */ getItemValue: (item: T) => UniqueIdentifier }
  : { getItemValue?: (item: T) => UniqueIdentifier }

export type KanbanProps<T> = Omit<DndContextProps, "children" | "collisionDetection"> &
  ItemValueProp<T> & {
    /** Cards by column id. Key order is column order. */
    appearance?: SheenAppearance
    value: KanbanColumns<T>
    onValueChange?: (columns: KanbanColumns<T>) => void
    /** Called once a drag ends with a real change, e.g. to save it. */
    onCommit?: (change: { id: UniqueIdentifier; type: "card" | "column"; from: string; to: string; index: number }) => void
    /** Columns side by side (default) or stacked. */
    orientation?: "horizontal" | "vertical"
    flatCursor?: boolean
    /** Names for announcements; default to the ids. */
    getItemLabel?: (id: UniqueIdentifier) => string
    getColumnLabel?: (id: string) => string
    labels?: KanbanLabels
    children?: React.ReactNode
  }

export function Kanban<T>(props: KanbanProps<T>) {
  const {
    appearance,
    value,
    onValueChange,
    onCommit,
    orientation = "horizontal",
    flatCursor = false,
    getItemValue: getItemValueProp,
    getItemLabel,
    getColumnLabel,
    labels,
    accessibility,
    sensors: sensorsProp,
    onDragStart,
    onDragOver,
    onDragEnd,
    onDragCancel,
    children,
    ...dndProps
  } = props as KanbanProps<T> & { getItemValue?: (item: T) => UniqueIdentifier }

  const theme = useSheenTheme({ appearance })
  const [reducedMotion, setReducedMotion] = React.useState(false)
  React.useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReducedMotion(media.matches)
    update(); media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])
  const contextId = React.useId()
  const [activeId, setActiveId] = React.useState<UniqueIdentifier | null>(null)
  const [overColumn, setOverColumn] = React.useState<string | null>(null)
  const [hasOverlay, setHasOverlay] = React.useState(false)
  const [dir, setDir] = React.useState<"ltr" | "rtl">("ltr")
  const snapshot = React.useRef<{ value: KanbanColumns<T>; column: string; index: number } | null>(null)
  const lastOverId = React.useRef<UniqueIdentifier | null>(null)
  const movedAcross = React.useRef(false)

  const sensors = useDragSensors(coordinateGetter)

  const getItemValue = React.useCallback(
    (item: T): UniqueIdentifier => {
      if (getItemValueProp) return getItemValueProp(item)
      if (typeof item === "object") throw new Error("`getItemValue` is required when cards are objects")
      return item as UniqueIdentifier
    },
    [getItemValueProp],
  )

  React.useMemo(() => {
    const ids = new Set<UniqueIdentifier>(Object.keys(value))
    for (const items of Object.values(value)) for (const item of items) {
      const id = getItemValue(item)
      if (ids.has(id)) throw new Error("Kanban column and card IDs must be unique")
      ids.add(id)
    }
  }, [value, getItemValue])

  const isColumn = React.useCallback((id: UniqueIdentifier) => Object.prototype.hasOwnProperty.call(value, id), [value])
  const columnOf = React.useCallback(
    (id: UniqueIdentifier): string | null => {
      if (isColumn(id)) return String(id)
      for (const [column, items] of Object.entries(value)) if (items.some((item) => getItemValue(item) === id)) return column
      return null
    },
    [value, isColumn, getItemValue],
  )
  const indexIn = (column: string, id: UniqueIdentifier) => value[column]?.findIndex((item) => getItemValue(item) === id) ?? -1

  // Columns only collide with columns; cards prefer what's under the pointer,
  // and inside a column the nearest card.
  const collisionDetection: CollisionDetection = React.useCallback(
    (args) => {
      if (activeId !== null && isColumn(activeId)) {
        return closestCenter({ ...args, droppableContainers: args.droppableContainers.filter((c) => isColumn(c.id)) })
      }
      const pointer = pointerWithin(args)
      let overId = getFirstCollision(pointer.length > 0 ? pointer : rectIntersection(args), "id")
      if (overId != null) {
        if (isColumn(overId) && value[overId as string]?.length) {
          const ids = new Set(value[overId as string].map(getItemValue))
          const nearest = closestCenter({ ...args, droppableContainers: args.droppableContainers.filter((c) => ids.has(c.id)) })
          overId = nearest[0]?.id ?? overId
        }
        lastOverId.current = overId
        return [{ id: overId }]
      }
      // Right after a card changes column the layout shifts; stay on the card meanwhile.
      if (movedAcross.current) lastOverId.current = activeId
      return lastOverId.current != null ? [{ id: lastOverId.current }] : []
    },
    [activeId, value, isColumn, getItemValue],
  )

  const name = (id: UniqueIdentifier) => (isColumn(id) ? (getColumnLabel?.(String(id)) ?? String(id)) : (getItemLabel?.(id) ?? String(id)))
  const where = (id: UniqueIdentifier) => {
    if (isColumn(id)) return { column: "", position: Object.keys(value).indexOf(String(id)) + 1, total: Object.keys(value).length }
    const column = columnOf(id) ?? ""
    return { column: getColumnLabel?.(column) ?? column, position: indexIn(column, id) + 1, total: value[column]?.length ?? 0 }
  }
  const announcements: Announcements = {
    onDragStart: ({ active }) => {
      const w = where(active.id)
      return (
        labels?.grabbed?.(name(active.id), w.column, w.position, w.total) ??
        `Picked up ${name(active.id)}${w.column ? ` in ${w.column}` : ""}. Position ${w.position} of ${w.total}.`
      )
    },
    onDragOver: ({ active, over }) => {
      if (!over) return undefined
      const w = where(active.id)
      return (
        labels?.moved?.(name(active.id), w.column, w.position, w.total) ??
        `${name(active.id)} moved${w.column ? ` to ${w.column}` : ""}, position ${w.position} of ${w.total}.`
      )
    },
    onDragEnd: ({ active }) => {
      const w = where(active.id)
      return (
        labels?.dropped?.(name(active.id), w.column, w.position, w.total) ??
        `${name(active.id)} dropped${w.column ? ` in ${w.column}` : ""} at position ${w.position} of ${w.total}.`
      )
    },
    onDragCancel: ({ active }) => labels?.cancelled?.(name(active.id)) ?? `Cancelled. ${name(active.id)} is back where it was.`,
  }

  const contextValue = React.useMemo<KanbanContextValue>(
    () => ({
      reducedMotion,
      columns: value as KanbanColumns<unknown>,
      getItemValue: getItemValue as (item: unknown) => UniqueIdentifier,
      activeId,
      overColumn,
      orientation,
      flatCursor,
      hasOverlay,
      setHasOverlay,
      dir,
    }),
    [reducedMotion, value, getItemValue, activeId, overColumn, orientation, flatCursor, hasOverlay, dir],
  )

  const reset = () => {
    setActiveId(null)
    setOverColumn(null)
    snapshot.current = null
    movedAcross.current = false
  }

  return (
    <SheenThemeBoundary value={theme}>
    <KanbanContext.Provider value={contextValue}>
      <DndContext id={contextId}
        collisionDetection={collisionDetection}
        sensors={sensorsProp ?? sensors}
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
        {...dndProps}
        onDragStart={(event: DragStartEvent) => {
          onDragStart?.(event)
          const column = columnOf(event.active.id) ?? ""
          snapshot.current = {
            value,
            column,
            index: isColumn(event.active.id) ? Object.keys(value).indexOf(column) : indexIn(column, event.active.id),
          }
          setDir(getDirection(event.activatorEvent.target))
          setActiveId(event.active.id)
          if (!isColumn(event.active.id)) setOverColumn(column)
        }}
        onDragOver={(event: DragOverEvent) => {
          onDragOver?.(event)
          const { active, over } = event
          if (!over || isColumn(active.id)) return
          const from = columnOf(active.id)
          const to = columnOf(over.id)
          if (!from || !to) return
          setOverColumn(to)
          if (from === to) return
          // Crossing columns: insert where the pointer is, not at the end.
          const card = value[from][indexIn(from, active.id)]
          const target = value[to]
          let index = target.length
          if (!isColumn(over.id)) {
            const overIndex = indexIn(to, over.id)
            const activeRect = active.rect.current.translated
            // Past the middle of the card it's over: go after it.
            const after = activeRect ? activeRect.top + activeRect.height / 2 > over.rect.top + over.rect.height / 2 : false
            index = overIndex + (after ? 1 : 0)
          }
          movedAcross.current = true
          onValueChange?.({
            ...value,
            [from]: value[from].filter((item) => getItemValue(item) !== active.id),
            [to]: [...target.slice(0, index), card, ...target.slice(index)],
          })
        }}
        onDragEnd={(event: DragEndEvent) => {
          onDragEnd?.(event)
          const { active, over } = event
          const start = snapshot.current
          if (!over || !start) {
            if (start && movedAcross.current) onValueChange?.(start.value)
            return reset()
          }

          if (isColumn(active.id)) {
            const keys = Object.keys(value)
            const fromIndex = keys.indexOf(String(active.id))
            const toIndex = isColumn(over.id) ? keys.indexOf(String(over.id)) : keys.indexOf(columnOf(over.id) ?? "")
            if (fromIndex >= 0 && toIndex >= 0 && fromIndex !== toIndex) {
              onValueChange?.(Object.fromEntries(arrayMove(keys, fromIndex, toIndex).map((k) => [k, value[k]])) as KanbanColumns<T>)
              onCommit?.({ id: active.id, type: "column", from: String(active.id), to: String(active.id), index: toIndex })
            }
            return reset()
          }

          const column = columnOf(active.id)
          const overColumnId = columnOf(over.id)
          if (column && column === overColumnId) {
            const fromIndex = indexIn(column, active.id)
            const toIndex = isColumn(over.id) ? value[column].length - 1 : indexIn(column, over.id)
            if (fromIndex < 0 || toIndex < 0) return reset()
            const next = fromIndex !== toIndex ? { ...value, [column]: arrayMove(value[column], fromIndex, toIndex) } : value
            if (next !== value) onValueChange?.(next)
            const finalIndex = fromIndex !== toIndex ? toIndex : fromIndex
            if (column !== start.column || finalIndex !== start.index) {
              onCommit?.({ id: active.id, type: "card", from: start.column, to: column, index: finalIndex })
            }
          }
          reset()
        }}
        onDragCancel={(event) => {
          onDragCancel?.(event)
          // Undo moves made across columns while dragging.
          if (snapshot.current && movedAcross.current) onValueChange?.(snapshot.current.value)
          reset()
        }}
        accessibility={{
          announcements,
          screenReaderInstructions: {
            draggable:
              labels?.instructions ??
              "To pick up a card or column, press Space or Enter. Use the arrow keys to move it, Space or Enter to drop it, and Escape to cancel.",
          },
          ...accessibility,
        }}
      >
        {children}
        {/* Without a `KanbanOverlay`, still lift a copy so the card isn't clipped by its column. */}
        {!hasOverlay && <KanbanOverlayPortal />}
      </DndContext>
    </KanbanContext.Provider>
    </SheenThemeBoundary>
  )
}
export type { KanbanColumns } from "./kanban-context"
export type { KanbanBoardProps } from "./kanban-board"
export type { KanbanColumnProps } from "./kanban-column"
export type { KanbanColumnContentProps } from "./kanban-column"
export type { KanbanItemProps } from "./kanban-item"
export type { KanbanHandleProps } from "./kanban-handles"
export type { KanbanOverlayProps } from "./kanban-overlay"
export { KanbanBoard } from "./kanban-board"
export { KanbanColumn } from "./kanban-column"
export { KanbanColumnHeader } from "./kanban-column"
export { KanbanColumnTitle } from "./kanban-column"
export { KanbanColumnCount } from "./kanban-column"
export { KanbanColumnHandle } from "./kanban-handles"
export { KanbanColumnContent } from "./kanban-column"
export { KanbanItem } from "./kanban-item"
export { KanbanItemHandle } from "./kanban-handles"
export { KanbanOverlay } from "./kanban-overlay"
