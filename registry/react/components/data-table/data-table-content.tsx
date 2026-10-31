"use client"

import * as React from "react"
import { flexRender, type Table as TanstackTable } from "@tanstack/react-table"
import { cn } from "@/lib/utils"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useTableLabels } from "./data-table-labels"
import { InboxIcon } from "./data-table-icons"

const alignClass = (align?: "start" | "center" | "end") => (align === "end" ? "text-end" : align === "center" ? "text-center" : undefined)

export function DataTableContent<TData>({
  table,
  density,
  maxHeight,
  loading,
  emptyMessage = "No results",
  isFiltered,
  resetFilters,
  label,
}: {
  table: TanstackTable<TData>
  density: "comfortable" | "compact"
  maxHeight?: number | string
  loading: boolean
  emptyMessage?: React.ReactNode
  isFiltered: boolean
  resetFilters: () => void
  label?: string
}) {
  const labels = useTableLabels()
  const visibleColumnCount = table.getVisibleLeafColumns().length
  return (
    <div className="rax-table-frame">
      <Table
        aria-label={label}
        density={density}
        stickyHeader={maxHeight !== undefined}
        containerStyle={maxHeight !== undefined ? { maxHeight } : undefined}
        aria-busy={loading || undefined}
      >
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const meta = header.column.columnDef.meta
                const sorted = header.column.getIsSorted()
                return (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    className={cn(alignClass(meta?.align), meta?.className)}
                    aria-sort={
                      header.column.getCanSort() ? (sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : "none") : undefined
                    }
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: table.getState().pagination.pageSize }, (_, i) => (
              <TableRow key={`skeleton-${i}`} aria-hidden="true">
                {table.getVisibleLeafColumns().map((column, j) => (
                  <TableCell key={column.id} className={column.columnDef.meta?.className}>
                    <span
                      className="rax-table-skeleton"
                      style={{ width: `${40 + ((i * 7 + j * 13) % 45)}%`, animationDelay: `${(i % 4) * 0.1}s` }}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} data-state={row.getIsSelected() ? "selected" : undefined}>
                {row.getVisibleCells().map((cell) => {
                  const meta = cell.column.columnDef.meta
                  return (
                    <TableCell key={cell.id} className={cn(alignClass(meta?.align), meta?.className)}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={visibleColumnCount} className="rax-table-empty">
                <InboxIcon />
                <div className="fw-semibold text-body-emphasis">{emptyMessage}</div>
                {isFiltered && (
                  <div className="small mt-1">
                    {labels.emptyHint}{" "}
                    <button type="button" className="btn btn-link btn-sm p-0 align-baseline" onClick={resetFilters}>
                      {labels.clearFilters}
                    </button>
                    .
                  </div>
                )}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
