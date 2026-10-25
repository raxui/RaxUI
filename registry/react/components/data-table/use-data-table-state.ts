"use client"

import * as React from "react"
import {
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnFiltersState,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table"
import type { DataTableProps } from "./data-table-types"

export function useDataTableState<TData, TValue>(
  { columns, data, getRowId, initialSorting = [], initialColumnVisibility = {}, initialPageSize = 10 }: DataTableProps<TData, TValue>,
  inheritedDensity?: "comfortable" | "compact",
) {
  const [sorting, setSorting] = React.useState<SortingState>(initialSorting)

  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])

  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(initialColumnVisibility)

  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})

  const [globalFilter, setGlobalFilter] = React.useState("")

  const [density, setDensity] = React.useState<"comfortable" | "compact" | undefined>()

  const effectiveDensity = density ?? inheritedDensity ?? "comfortable"

  const table = useReactTable({
    data,
    columns,
    getRowId,
    state: { sorting, columnFilters, columnVisibility, rowSelection, globalFilter },
    initialState: { pagination: { pageSize: initialPageSize } },
    enableRowSelection: true,
    autoResetPageIndex: false,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "includesString",
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  // Reset after commit; TanStack's queued render-time reset can run before a suspended mount.
  React.useEffect(() => table.setPageIndex(0), [data, globalFilter, columnFilters, sorting, table])

  const isFiltered = globalFilter !== "" || columnFilters.length > 0

  const resetFilters = () => {
    setGlobalFilter("")
    table.resetColumnFilters()
  }

  const visibleColumnCount = table.getVisibleLeafColumns().length

  const selectedRows = table.getFilteredSelectedRowModel().rows
  return {
    table,
    globalFilter,
    setGlobalFilter,
    density: effectiveDensity,
    setDensity,
    isFiltered,
    resetFilters,
    visibleColumnCount,
    selectedRows,
  }
}
