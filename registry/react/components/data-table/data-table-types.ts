import * as React from "react"
import { type ColumnDef, type Row, type RowData, type SortingState, type VisibilityState } from "@tanstack/react-table"
import { type SheenAppearance } from "@/lib/theme"

export interface DataTableLabels {
  view: string
  columns: string
  density: string
  comfortable: string
  compact: string
  reset: string
  clearFilter: string
  selectAll: string
  selectRow: string
  rowsPerPage: string
  firstPage: string
  previousPage: string
  nextPage: string
  lastPage: string
  bulkActions: string
  clearSelection: string
  emptyHint: React.ReactNode
  clearFilters: string
  selected: (count: number) => string
  results: (count: number) => string
  selectionSummary: (count: number, total: number) => string
  page: (current: number, total: number) => string
}

export interface DataTableFilterOption {
  label: string
  value: string
  icon?: React.ReactNode
}

// ---- DataTable -----------------------------------------------------------------

export interface DataTableProps<TData, TValue> {
  labels?: Partial<DataTableLabels>
  appearance?: SheenAppearance
  dir?: "ltr" | "rtl"
  label?: string
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  /** Shows skeleton rows instead of data. */
  loading?: boolean
  /** Placeholder for the global search box. Pass `false` to hide it. */
  searchPlaceholder?: string | false
  /** Faceted filters shown in the toolbar. */
  filters?: { columnId: string; title: string; options: DataTableFilterOption[] }[]
  /** Actions in the floating bar while rows are selected. */
  bulkActions?: (rows: Row<TData>[], clearSelection: () => void) => React.ReactNode
  /** Extra toolbar content, placed before the View menu. */
  toolbar?: React.ReactNode
  pageSizeOptions?: number[]
  initialPageSize?: number
  initialSorting?: SortingState
  initialColumnVisibility?: VisibilityState
  /** Stable row ids keep selection correct across sorting and filtering. */
  getRowId?: (row: TData, index: number) => string
  /** Scroll the body and pin the header when taller than this. */
  maxHeight?: number | string
  emptyMessage?: React.ReactNode
  className?: string
}

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Name shown in the column-visibility menu. */
    label?: string
    /** `end` right-aligns numbers (and their header). */
    align?: "start" | "center" | "end"
    /** Extra class for this column's th/td. */
    className?: string
  }
}
