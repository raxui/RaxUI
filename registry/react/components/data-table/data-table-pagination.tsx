"use client"

import * as React from "react"
import { type Table as TanstackTable } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronsLeftIcon, ChevronLeftIcon, ChevronRightIcon, ChevronsRightIcon } from "./data-table-icons"
import { useTableLabels } from "./data-table-labels"
import type { DataTableLabels } from "./data-table-types"

function DataTablePagination<TData>({
  table,
  pageSizeOptions,
  labels: labelsProp,
}: {
  table: TanstackTable<TData>
  pageSizeOptions: number[]
  labels?: Partial<DataTableLabels>
}) {
  const labels = { ...useTableLabels(), ...labelsProp }
  const { pageIndex, pageSize } = table.getState().pagination
  const pageCount = Math.max(1, table.getPageCount())
  const selected = table.getFilteredSelectedRowModel().rows.length
  const total = table.getFilteredRowModel().rows.length
  const labelId = React.useId()

  return (
    <div className="sheen-data-table-footer">
      <div aria-live="polite">{selected > 0 ? labels.selectionSummary(selected, total) : labels.results(total)}</div>
      <div className="sheen-table-pagination">
        <div className="d-flex align-items-center gap-2">
          <span id={labelId}>{labels.rowsPerPage}</span>
          <Select value={String(pageSize)} onValueChange={(value) => table.setPageSize(Number(value))}>
            <SelectTrigger size="sm" style={{ width: "4.75rem" }} aria-labelledby={labelId}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="text-body-emphasis">{labels.page(pageIndex + 1, pageCount)}</span>
        <div className="d-flex gap-1">
          <Button
            variant="secondary"
            size="icon-sm"
            aria-label={labels.firstPage}
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronsLeftIcon />
          </Button>
          <Button
            variant="secondary"
            size="icon-sm"
            aria-label={labels.previousPage}
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            variant="secondary"
            size="icon-sm"
            aria-label={labels.nextPage}
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRightIcon />
          </Button>
          <Button
            variant="secondary"
            size="icon-sm"
            aria-label={labels.lastPage}
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <ChevronsRightIcon />
          </Button>
        </div>
      </div>
    </div>
  )
}
export { DataTablePagination }
