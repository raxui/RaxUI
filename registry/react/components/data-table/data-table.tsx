"use client"

import * as React from "react"
import { useSheenTheme, sheenThemeAttributes, SheenThemeBoundary } from "@/lib/theme"
import { getDirection } from "@/lib/direction"
import { useMergedRef } from "@/lib/refs"
import { cn } from "@/lib/utils"
import type { DataTableProps } from "./data-table-types"
import { TableLabelsContext, DEFAULT_LABELS } from "./data-table-labels"
import { useDataTableState } from "./use-data-table-state"
import { DataTableToolbar } from "./data-table-toolbar"
import { DataTableContent } from "./data-table-content"
import { DataTablePagination } from "./data-table-pagination"
import { DataTableBulkBar } from "./data-table-bulk-bar"

function DataTableInner<TData, TValue>(props: DataTableProps<TData, TValue>, ref: React.ForwardedRef<HTMLDivElement>) {
  const {
    appearance,
    dir,
    label,
    labels: labelsProp,
    filters,
    toolbar,
    bulkActions,
    pageSizeOptions = [10, 20, 50],
    searchPlaceholder,
    maxHeight,
    loading = false,
    emptyMessage,
    className,
  } = props
  const theme = useSheenTheme({ appearance, direction: dir })
  const rootRef = React.useRef<HTMLDivElement>(null),
    mergedRef = useMergedRef<HTMLDivElement | null>(ref, rootRef)
  const [direction, setDirection] = React.useState(theme.direction)
  React.useLayoutEffect(() => setDirection(getDirection(rootRef.current)), [dir, theme.direction])
  const labels = React.useMemo(() => ({ ...DEFAULT_LABELS, ...labelsProp }), [labelsProp])
  const state = useDataTableState(props, theme.density)
  return (
    <TableLabelsContext.Provider value={labels}>
      <SheenThemeBoundary value={{ ...theme, direction }}>
        <div {...sheenThemeAttributes(theme)} dir={dir} ref={mergedRef} className={cn("sheen-data-table", className)}>
          <DataTableToolbar {...state} filters={filters} toolbar={toolbar} searchPlaceholder={searchPlaceholder} />
          <DataTableContent {...state} label={label} maxHeight={maxHeight} loading={loading} emptyMessage={emptyMessage} />
          <DataTablePagination table={state.table} pageSizeOptions={pageSizeOptions} />
          {bulkActions && (
            <DataTableBulkBar count={state.selectedRows.length} onClear={() => state.table.resetRowSelection()}>
              {bulkActions(state.selectedRows, () => state.table.resetRowSelection())}
            </DataTableBulkBar>
          )}
        </div>
      </SheenThemeBoundary>
    </TableLabelsContext.Provider>
  )
}
const DataTable = React.forwardRef(DataTableInner) as <TData, TValue = unknown>(
  props: DataTableProps<TData, TValue> & { ref?: React.ForwardedRef<HTMLDivElement> },
) => React.ReactElement
export { DataTable }
export type { DataTableProps, DataTableLabels, DataTableFilterOption } from "./data-table-types"
export { DataTableColumnHeader, getSelectColumn } from "./data-table-columns"
export { DataTableFacetedFilter } from "./data-table-filter"
export { DataTablePagination } from "./data-table-pagination"
export { DataTableViewOptions } from "./data-table-view-options"
