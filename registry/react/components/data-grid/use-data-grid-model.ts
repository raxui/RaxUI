"use client"

import * as React from "react"
import {
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type Column,
  type ColumnPinningState,
  type Header,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table"
import type { DataGridProps } from "./data-grid-types"
import { aggregate, DEFAULT_CELL, ROW_HEIGHT } from "./data-grid-utils"

export function useDataGridModel<TData>(
  {
    data,
    columns,
    getRowId,
    pinned,
    rowSelection: rowSelectionProp,
    onRowSelectionChange,
    columnVisibility: visibilityProp,
    onColumnVisibilityChange,
    globalFilter,
  }: DataGridProps<TData>,
  isRtl: boolean,
  density: "comfortable" | "compact",
) {
  const [sorting, setSorting] = React.useState<SortingState>([])

  const [columnPinning, setColumnPinning] = React.useState<ColumnPinningState>(pinned ?? {})

  const [selectionState, setSelectionState] = React.useState<RowSelectionState>({})

  const [visibilityState, setVisibilityState] = React.useState<VisibilityState>({})

  const rowSelection = rowSelectionProp ?? selectionState

  const columnVisibility = visibilityProp ?? visibilityState

  const table = useReactTable({
    data,
    columns,
    getRowId,
    state: { sorting, columnPinning, rowSelection, columnVisibility, globalFilter },
    onSortingChange: setSorting,
    onColumnPinningChange: setColumnPinning,
    onRowSelectionChange: (updater) => {
      const next = typeof updater === "function" ? updater(rowSelection) : updater
      if (rowSelectionProp === undefined) setSelectionState(next)
      onRowSelectionChange?.(next)
    },
    onColumnVisibilityChange: (updater) => {
      const next = typeof updater === "function" ? updater(columnVisibility) : updater
      if (visibilityProp === undefined) setVisibilityState(next)
      onColumnVisibilityChange?.(next)
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    enableRowSelection: true,
    autoResetPageIndex: false,
    columnResizeMode: "onChange",
    columnResizeDirection: isRtl ? "rtl" : "ltr",
    defaultColumn: { size: 160, minSize: 60, maxSize: 640, cell: DEFAULT_CELL },
  })

  const rows = table.getRowModel().rows

  // Visual column order: pinned start, centre, pinned end.
  const leafColumns = [...table.getLeftVisibleLeafColumns(), ...table.getCenterVisibleLeafColumns(), ...table.getRightVisibleLeafColumns()]

  const totalWidth = table.getTotalSize()

  const hasFooter = leafColumns.some((c) => c.columnDef.meta?.aggregate)

  const totals = React.useMemo(
    () =>
      new Map(
        table
          .getAllLeafColumns()
          .filter((column) => column.columnDef.meta?.aggregate)
          .map((column) => [
            column.id,
            aggregate(
              column.columnDef.meta!.aggregate!,
              rows.map((row) => row.getValue(column.id)),
            ),
          ]),
      ),
    [rows, columns],
  )

  const rowHeight = ROW_HEIGHT[density]

  // ---- Rendering ------------------------------------------------------------------
  const pinStyle = (column: Column<TData, unknown>): React.CSSProperties => {
    const side = column.getIsPinned()
    if (side === "left") return { position: "sticky", insetInlineStart: column.getStart("left"), zIndex: 2 }
    if (side === "right") return { position: "sticky", insetInlineEnd: column.getAfter("right"), zIndex: 2 }
    return {}
  }

  const pinAttrs = (column: Column<TData, unknown>) => {
    const side = column.getIsPinned()
    return {
      "data-pinned": side ? (side === "left" ? "start" : "end") : undefined,
      "data-pin-edge":
        (side === "left" && column.getIsLastColumn("left")) || (side === "right" && column.getIsFirstColumn("right")) ? "" : undefined,
    }
  }

  const headerFor = (column: Column<TData, unknown>) =>
    table.getFlatHeaders().find((h) => h.column.id === column.id) as Header<TData, unknown> | undefined
  return { table, rows, leafColumns, totalWidth, hasFooter, totals, rowHeight, pinStyle, pinAttrs, headerFor, rowSelection }
}
export type DataGridModel<TData> = ReturnType<typeof useDataGridModel<TData>>
