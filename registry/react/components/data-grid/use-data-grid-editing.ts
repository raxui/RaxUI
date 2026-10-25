"use client"

import * as React from "react"
import { type Column, type Row } from "@tanstack/react-table"
import type { DataGridProps } from "./data-grid-types"
import { DEFAULT_GRID_LABELS, parseFor, toText, valueOf } from "./data-grid-utils"

export function useDataGridEditing<TData>({
  activeRow,
  activeColumn,
  onCellEdit,
  labels,
  scrollerRef,
}: {
  activeRow?: Row<TData>
  activeColumn?: Column<TData, unknown>
  onCellEdit?: DataGridProps<TData>["onCellEdit"]
  labels: DataGridProps<TData>["labels"]
  scrollerRef: React.RefObject<HTMLDivElement | null>
}) {
  const text = { ...DEFAULT_GRID_LABELS, ...labels }
  // ---- Active cell (row -1 = header) & editing ---------------------------------
  const [editing, setEditing] = React.useState<{ seed?: string; rowId: string; columnId: string } | null>(null)

  const [draft, setDraft] = React.useState<unknown>(null)

  const validationError = React.useRef<string | undefined>(undefined)

  const [editError, setEditError] = React.useState<string>()

  const [flash, setFlash] = React.useState<string>()

  const startEditing = (seed?: string) => {
    const editor = activeColumn?.columnDef.meta?.editor
    if (!activeRow || !activeColumn || !editor) return false
    if (editor.type === "checkbox") {
      setEditError(commitValue(activeRow, activeColumn, !valueOf(activeRow, activeColumn)))
      return true
    }
    setDraft(
      seed !== undefined ? seed : editor.type === "number" ? toText(valueOf(activeRow, activeColumn)) : valueOf(activeRow, activeColumn),
    )
    setEditError(undefined)
    validationError.current = undefined
    setEditing({ seed, rowId: activeRow.id, columnId: activeColumn.id })
    return true
  }

  function commitValue(row: Row<TData>, column: Column<TData, unknown>, raw: unknown) {
    const editor = column.columnDef.meta?.editor
    const value = editor?.type === "number" && typeof raw === "string" ? parseFor(editor, raw) : raw
    const reject = (message: string) => {
      validationError.current = message
      return message
    }
    if (editor?.type === "number" && value !== null) {
      if (typeof value !== "number" || !Number.isFinite(value)) return reject(text.invalidNumber)
      if (editor.min !== undefined && value < editor.min)
        return reject(labels?.minValue?.(editor.min) ?? `Value must be at least ${editor.min}.`)
      if (editor.max !== undefined && value > editor.max)
        return reject(labels?.maxValue?.(editor.max) ?? `Value must be at most ${editor.max}.`)
    }
    if (editor?.type === "date" && value !== null && (!(value instanceof Date) || Number.isNaN(value.getTime())))
      return reject(text.invalidDate)
    if (editor?.type === "select" && !editor.options.some((option) => option.value === value)) return reject(text.invalidOption)
    const error = column.columnDef.meta?.validate?.(value, row.original)
    if (error) return reject(error)
    validationError.current = undefined
    const previous = valueOf(row, column)
    const same = value instanceof Date && previous instanceof Date ? value.getTime() === previous.getTime() : value === previous
    if (!same) {
      onCellEdit?.({ row: row.original, rowId: row.id, columnId: column.id, value, previous })
      setFlash(`${row.id}:${column.id}`)
    }
    return undefined
  }

  /** Commit the open editor. Returns false (and shows the message) if it's invalid. */
  const commit = () => {
    if (!editing || !activeRow || !activeColumn) return true
    if (activeRow.id !== editing.rowId || activeColumn.id !== editing.columnId) {
      cancel()
      return false
    }
    const error = commitValue(activeRow, activeColumn, draft)
    if (error) {
      setEditError(error)
      return false
    }
    setEditing(null)
    setEditError(undefined)
    return true
  }

  const cancel = () => {
    validationError.current = undefined
    setEditing(null)
    setEditError(undefined)
    scrollerRef.current?.focus({ preventScroll: true })
  }

  // Return focus to the grid after an edit ends.
  const wasEditing = React.useRef(false)
  React.useEffect(() => {
    if (editing && (activeRow?.id !== editing.rowId || activeColumn?.id !== editing.columnId)) cancel()
  }, [activeRow?.id, activeColumn?.id, editing])
  React.useEffect(() => {
    if (wasEditing.current && !editing) scrollerRef.current?.focus({ preventScroll: true })
    wasEditing.current = !!editing
  }, [editing])
  React.useEffect(() => {
    if (!flash) return
    const id = setTimeout(() => setFlash(undefined), 900)
    return () => clearTimeout(id)
  }, [flash])
  return {
    editing,
    draft,
    validationError,
    editError,
    flash,
    setDraft,
    setEditError,
    setEditing,
    startEditing,
    commitValue,
    commit,
    cancel,
  }
}
export type DataGridEditing<TData> = ReturnType<typeof useDataGridEditing<TData>>
