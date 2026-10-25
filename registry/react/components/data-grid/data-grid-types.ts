import * as React from "react"
import {
  type ColumnDef,
  type ColumnPinningState,
  type RowData,
  type RowSelectionState,
  type Table as TanstackTable,
  type VisibilityState,
} from "@tanstack/react-table"
import { type SheenAppearance } from "@/lib/theme"

// -----------------------------------------------------------------------------
// DataGrid — a spreadsheet-like grid on TanStack Table + Virtual.
//
// • Virtualised rows (tens of thousands stay smooth)
// • Sticky header and footer, columns pinned to the start / end
// • Resizable columns, per-column menu (sort, pin, hide)
// • Keyboard: arrows, Home/End, Ctrl+Home/End, PageUp/Down, Enter/F2 to edit,
//   Tab / Shift+Tab, Esc, typing starts editing, Delete clears, Ctrl+C / Ctrl+V
// • Inline editors per column (text, number, select, date, checkbox) with
//   validation; edited cells flash
// • Footer aggregates (sum, avg, min, max, count or your own)
// ARIA grid pattern with aria-activedescendant, so focus survives virtualisation.
// -----------------------------------------------------------------------------

export type GridEditor =
  | { type: "text" }
  | { type: "number"; min?: number; max?: number; step?: number }
  | { type: "select"; options: { value: string; label: string }[] }
  | { type: "date"; locale?: string }
  | { type: "checkbox" }

export type GridAggregate = "sum" | "avg" | "min" | "max" | "count" | ((values: unknown[]) => React.ReactNode)

export interface DataGridCellEdit<TData> {
  row: TData
  rowId: string
  columnId: string
  value: unknown
  previous: unknown
}

export interface DataGridProps<TData> {
  appearance?: SheenAppearance
  data: TData[]
  columns: ColumnDef<TData, any>[] // eslint-disable-line @typescript-eslint/no-explicit-any
  getRowId?: (row: TData, index: number) => string
  /** Called with a validated new value; update your data to apply it. */
  onCellEdit?: (edit: DataGridCellEdit<TData>) => void
  /** Accessible name for the grid. */
  label: string
  /** Maximum height of the scroll viewport (shorter data shrinks the grid). */
  height?: number | string
  /** Status bar text, e.g. for other languages. */
  labels?: {
    increaseWidth?: string
    decreaseWidth?: string
    sortAscending?: string
    sortDescending?: string
    clearSort?: string
    pinStart?: string
    pinEnd?: string
    unpin?: string
    hideColumn?: string
    invalidNumber?: string
    invalidDate?: string
    invalidOption?: string
    minValue?: (min: number) => string
    maxValue?: (max: number) => string
    cell?: (column: string, row: number) => string
    columnMenu?: (column: string) => string
    rows?: (shown: number, total: number) => React.ReactNode
    selected?: (count: number) => React.ReactNode
    /** Footer aggregate captions, e.g. { sum: "المجموع", avg: "المتوسط" }. */
    aggregates?: Partial<Record<"sum" | "avg" | "min" | "max" | "count", string>>
  }
  density?: "compact" | "comfortable"
  /** Initial pinned columns. */
  pinned?: ColumnPinningState
  globalFilter?: string
  rowSelection?: RowSelectionState
  onRowSelectionChange?: (selection: RowSelectionState) => void
  columnVisibility?: VisibilityState
  onColumnVisibilityChange?: (visibility: VisibilityState) => void
  /** Rendered above the grid with the table instance (search, view menu…). */
  toolbar?: (table: TanstackTable<TData>) => React.ReactNode
  emptyState?: React.ReactNode
  className?: string
  dir?: "ltr" | "rtl"
}

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    // Shared with DataTable (same types, so the declarations merge): each works on its own.
    /** Name shown in menus and read out with each cell. */
    label?: string
    /** `end` right-aligns numbers (and their header). */
    align?: "start" | "center" | "end"
    /** Extra class for this column's cells. */
    className?: string
    /** Makes the cell editable with this editor. */
    editor?: GridEditor
    /** Return an error message to reject an edit. */
    validate?: (value: unknown, row: TData) => string | undefined
    /** Display formatting for the default cell, the footer aggregate and copy. */
    format?: (value: unknown) => React.ReactNode
    /** Footer aggregate for this column. */
    aggregate?: GridAggregate
  }
}
