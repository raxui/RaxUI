import type { Row, Column } from "@tanstack/react-table"
import type { GridEditor, GridAggregate } from "./data-grid-types"

// ---- Helpers -------------------------------------------------------------------

const ROW_HEIGHT = { compact: 34, comfortable: 42 } as const

function aggregate(kind: GridAggregate, values: unknown[]): unknown {
  if (typeof kind === "function") return kind(values)
  const nums = values
    .filter((v) => v !== null && v !== undefined && v !== "")
    .map(Number)
    .filter((n) => Number.isFinite(n))
  switch (kind) {
    case "count":
      return values.filter((v) => v !== null && v !== undefined && v !== "" && v !== false).length
    case "sum":
      return nums.reduce((a, b) => a + b, 0)
    case "avg":
      return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null
    case "min":
      return nums.length ? Math.min(...nums) : null
    case "max":
      return nums.length ? Math.max(...nums) : null
  }
}

function toText(value: unknown): string {
  if (value instanceof Date)
    return `${String(value.getFullYear()).padStart(4, "0")}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`
  if (value === null || value === undefined) return ""
  return String(value)
}

/** Parse pasted / typed text into the editor's value type. */
function parseFor(editor: GridEditor, text: string): unknown {
  switch (editor.type) {
    case "number": {
      const n = Number(text.trim())
      return text.trim() === "" ? null : Number.isFinite(n) ? n : NaN
    }
    case "checkbox":
      return /^(true|yes|1|✓|x)$/i.test(text.trim())
    case "date": {
      if (!text.trim()) return null
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text.trim())
      if (!match) return new Date(NaN)
      const [, y, m, day] = match.map(Number)
      const date = new Date(0)
      date.setFullYear(y, m - 1, day)
      date.setHours(0, 0, 0, 0)
      return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === day ? date : new Date(NaN)
    }
    case "select":
      return text.trim()
    default:
      return text
  }
}

/** Marker default cell: columns without their own `cell` use meta.format / editor rendering. */
const DEFAULT_CELL = () => null

const AGGREGATE_LABEL: Record<string, string> = { sum: "Sum", avg: "Avg", min: "Min", max: "Max", count: "Count" }
const DEFAULT_GRID_LABELS = {
  increaseWidth: "Increase width",
  decreaseWidth: "Decrease width",
  sortAscending: "Sort ascending",
  sortDescending: "Sort descending",
  clearSort: "Clear sort",
  pinStart: "Pin to start",
  pinEnd: "Pin to end",
  unpin: "Unpin",
  hideColumn: "Hide column",
  invalidNumber: "Enter a number.",
  invalidDate: "Enter a valid date.",
  invalidOption: "Choose a valid option.",
}
export { ROW_HEIGHT, aggregate, toText, parseFor, DEFAULT_CELL, AGGREGATE_LABEL, DEFAULT_GRID_LABELS }
export const valueOf = <TData>(row: Row<TData>, column: Column<TData, unknown>) => row.getValue(column.id)
