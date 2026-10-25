"use client"

import * as React from "react"
import type { DataGridModel } from "./use-data-grid-model"
import type { DataGridVirtualizer } from "./use-data-grid-virtualizer"
import type { DataGridEditing } from "./use-data-grid-editing"
import { parseFor, toText, valueOf } from "./data-grid-utils"

export function useDataGridNavigation<TData>({
  model,
  active,
  setActive,
  scrollerRef,
  virtualizer,
  isRtl,
  gridId,
  controller,
}: {
  model: DataGridModel<TData>
  active: { row: number; col: number }
  setActive: React.Dispatch<React.SetStateAction<{ row: number; col: number }>>
  scrollerRef: React.RefObject<HTMLDivElement | null>
  virtualizer: DataGridVirtualizer
  isRtl: boolean
  gridId: string
  controller: DataGridEditing<TData>
}) {
  const { rows, leafColumns, table, rowHeight } = model
  const activeColumn = leafColumns[active.col],
    activeRow = active.row >= 0 ? rows[active.row] : undefined
  const { editing, startEditing, commitValue, commit, cancel, setDraft, setEditError, setEditing } = controller
  const clamp = (r: number, c: number) => ({
    row: Math.max(-1, Math.min(rows.length - 1, r)),
    col: Math.max(0, Math.min(leafColumns.length - 1, c)),
  })

  const scrollToActive = (r: number, c: number) => {
    if (r >= 0) virtualizer.scrollToIndex(r, { align: "auto" })
    // Horizontal: bring the cell into view unless it's pinned.
    const column = leafColumns[c]
    const scroller = scrollerRef.current
    if (!column || !scroller || column.getIsPinned()) return
    const pinnedStart = table.getLeftTotalSize()
    const pinnedEnd = table.getRightTotalSize()
    const start = column.getStart("center") + pinnedStart
    const end = start + column.getSize()
    const scrollX = Math.abs(scroller.scrollLeft)
    const sign = isRtl ? -1 : 1
    if (start - pinnedStart < scrollX) scroller.scrollLeft = sign * (start - pinnedStart)
    else if (end > scrollX + scroller.clientWidth - pinnedEnd) scroller.scrollLeft = sign * (end - scroller.clientWidth + pinnedEnd)
  }

  const moveTo = (r: number, c: number) => {
    const next = clamp(r, c)
    setActive(next)
    scrollToActive(next.row, next.col)
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    const mod = event.metaKey || event.ctrlKey
    const pageRows = Math.max(1, Math.floor((scrollerRef.current?.clientHeight ?? 400) / rowHeight) - 2)
    const forward = isRtl ? -1 : 1

    if (editing) {
      if (event.key === "Escape") {
        event.preventDefault()
        cancel()
      } else if (event.key === "Enter" && !event.nativeEvent.isComposing) {
        event.preventDefault()
        if (commit()) moveTo(active.row + (event.shiftKey ? -1 : 1), active.col)
      } else if (event.key === "Tab") {
        event.preventDefault()
        if (commit()) moveTo(active.row, active.col + (event.shiftKey ? -1 : 1))
      }
      return
    }
    // Outside editing, respect controls inside cells that handled the key themselves.
    if (event.defaultPrevented) return

    const go = (r: number, c: number) => {
      event.preventDefault()
      moveTo(r, c)
    }
    switch (event.key) {
      case "ArrowDown":
        return go(mod ? rows.length - 1 : active.row + 1, active.col)
      case "ArrowUp":
        return go(mod ? 0 : active.row - 1, active.col)
      case "ArrowRight":
        return go(active.row, mod ? (forward > 0 ? leafColumns.length - 1 : 0) : active.col + forward)
      case "ArrowLeft":
        return go(active.row, mod ? (forward > 0 ? 0 : leafColumns.length - 1) : active.col - forward)
      case "Home":
        return go(mod ? 0 : active.row, 0)
      case "End":
        return go(mod ? rows.length - 1 : active.row, leafColumns.length - 1)
      case "PageDown":
        return go(active.row + pageRows, active.col)
      case "PageUp":
        return go(active.row - pageRows, active.col)
      case "Tab":
        // Tab leaves the grid (one tab stop), like a spreadsheet embedded in a page.
        return
    }

    // Shift+F10 reaches all column actions without adding another grid tab stop.
    if (active.row === -1 && event.shiftKey && event.key === "F10") {
      event.preventDefault()
      const menu = scrollerRef.current?.querySelector<HTMLElement>(`[id="${gridId}-h-c${active.col}"] .sheen-grid-hmenu`)
      menu?.focus()
      menu?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }))
      return
    }

    // Header row: Enter / Space sorts.
    if (active.row === -1) {
      if ((event.key === "Enter" || event.key === " ") && activeColumn?.getCanSort()) {
        event.preventDefault()
        activeColumn.toggleSorting(undefined, event.shiftKey)
      }
      return
    }

    // Selection column: Space toggles the row.
    if (activeColumn?.id === "select" && activeRow && (event.key === " " || event.key === "Enter")) {
      event.preventDefault()
      activeRow.toggleSelected()
      return
    }
    if (event.key === " " && event.shiftKey && activeRow) {
      event.preventDefault()
      activeRow.toggleSelected()
      return
    }

    const editor = activeColumn?.columnDef.meta?.editor
    if (event.key === "Enter" || event.key === "F2" || (event.key === " " && editor?.type === "checkbox")) {
      if (startEditing()) event.preventDefault()
      return
    }
    if ((event.key === "Delete" || event.key === "Backspace") && editor && activeRow && activeColumn) {
      event.preventDefault()
      const empty = editor.type === "checkbox" ? false : editor.type === "number" || editor.type === "date" ? null : ""
      setEditError(commitValue(activeRow, activeColumn, empty))
      return
    }
    if (mod && event.key.toLowerCase() === "c" && activeRow && activeColumn) {
      event.preventDefault()
      void navigator.clipboard?.writeText(toText(valueOf(activeRow, activeColumn))).catch(() => {})
      return
    }
    // Typing starts editing text / number cells with that character.
    if (!mod && event.key.length === 1 && (editor?.type === "text" || editor?.type === "number")) {
      event.preventDefault()
      startEditing(event.key)
    }
  }

  const onPaste = (event: React.ClipboardEvent) => {
    const editor = activeColumn?.columnDef.meta?.editor
    if (editing || !editor || !activeRow || !activeColumn) return
    event.preventDefault()
    const text = event.clipboardData.getData("text/plain").split(/\r?\n/)[0]
    const error = commitValue(activeRow, activeColumn, parseFor(editor, text))
    if (error) {
      setDraft(editor.type === "date" ? valueOf(activeRow, activeColumn) : text)
      setEditError(error)
      if (editor.type !== "checkbox") setEditing({ rowId: activeRow.id, columnId: activeColumn.id })
    }
  }
  // Keep the active cell valid when rows / columns change.
  React.useEffect(() => {
    setActive((a) => clamp(a.row, a.col))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.length, leafColumns.length])
  return { onKeyDown, onPaste }
}
