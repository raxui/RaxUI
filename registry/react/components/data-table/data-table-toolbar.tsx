"use client"

import * as React from "react"
import { type Table as TanstackTable } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import type { DataTableProps } from "./data-table-types"
import { useTableLabels } from "./data-table-labels"
import { DataTableFacetedFilter } from "./data-table-filter"
import { DataTableViewOptions } from "./data-table-view-options"
import { SearchIcon, XIcon } from "./data-table-icons"

export function DataTableToolbar<TData>({
  table,
  globalFilter,
  setGlobalFilter,
  isFiltered,
  resetFilters,
  density,
  setDensity,
  filters = [],
  toolbar,
  searchPlaceholder = "Search…",
}: {
  table: TanstackTable<TData>
  globalFilter: string
  setGlobalFilter: (value: string) => void
  isFiltered: boolean
  resetFilters: () => void
  density: "comfortable" | "compact"
  setDensity: (value: "comfortable" | "compact") => void
  filters: DataTableProps<TData, unknown>["filters"]
  toolbar: React.ReactNode
  searchPlaceholder?: string | false
} & Pick<DataTableProps<TData, unknown>, "searchPlaceholder">) {
  const labels = useTableLabels()
  return (
    <div className="rax-data-table-toolbar">
      {searchPlaceholder !== false && (
        <div className="rax-table-search">
          <SearchIcon />
          <input
            type="search"
            className="form-control form-control-sm"
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
          />
        </div>
      )}
      {filters.map((filter) => {
        const column = table.getColumn(filter.columnId)
        return column ? (
          <DataTableFacetedFilter key={filter.columnId} column={column} title={filter.title} options={filter.options} />
        ) : null
      })}
      {isFiltered && (
        <Button variant="ghost" size="sm" onClick={resetFilters}>
          {labels.reset}
          <XIcon />
        </Button>
      )}
      {toolbar}
      <DataTableViewOptions table={table} density={density} onDensityChange={setDensity} />
    </div>
  )
}
