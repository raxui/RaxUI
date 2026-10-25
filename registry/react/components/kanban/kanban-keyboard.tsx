"use client"

// Ported from boot-ui. Built-in SVG paths from Lucide (ISC).
import { closestCorners, getFirstCollision, KeyboardCode, type DroppableContainer, type KeyboardCoordinateGetter } from "@dnd-kit/core"

export const coordinateGetter: KeyboardCoordinateGetter = (event, { context }) => {
  const { active, droppableRects, droppableContainers, collisionRect } = context
  const codes: string[] = [KeyboardCode.Down, KeyboardCode.Up, KeyboardCode.Left, KeyboardCode.Right]
  if (!codes.includes(event.code) || !active || !collisionRect) return undefined
  event.preventDefault()

  const draggingColumn = active.data.current?.type === "column"
  const candidates: DroppableContainer[] = []
  for (const entry of droppableContainers.getEnabled()) {
    const rect = droppableRects.get(entry.id)
    if (!rect || entry.id === active.id) continue
    const data = entry.data.current
    if (draggingColumn !== (data?.type === "column")) {
      // A card may still target a column, but only an empty one.
      if (draggingColumn || data?.type !== "column" || data.count > 0) continue
    }
    // Up and down stay in the same column; left and right go to the next one.
    const sameColumn = rect.left < collisionRect.left + collisionRect.width && rect.left + rect.width > collisionRect.left
    const fits =
      event.code === KeyboardCode.Down
        ? sameColumn && rect.top > collisionRect.top
        : event.code === KeyboardCode.Up
          ? sameColumn && rect.top < collisionRect.top
          : event.code === KeyboardCode.Left
            ? rect.left + rect.width <= collisionRect.left
            : rect.left >= collisionRect.left + collisionRect.width
    if (fits) candidates.push(entry)
  }

  const closestId = getFirstCollision(
    closestCorners({ active, collisionRect, droppableRects, droppableContainers: candidates, pointerCoordinates: null }),
    "id",
  )
  const target = closestId != null ? droppableContainers.get(closestId) : undefined
  const rect = target?.rect.current
  if (!target || !rect) return undefined
  // Into an empty column: just under its header.
  if (!draggingColumn && target.data.current?.type === "column") return { x: rect.left + 12, y: rect.top + 56 }
  return { x: rect.left, y: rect.top }
}
