"use client"

import { type Column } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PlusCircleIcon } from "./data-table-icons"
import { useTableLabels } from "./data-table-labels"
import type { DataTableLabels, DataTableFilterOption } from "./data-table-types"

/**
 * Multi-select filter for one column, with live counts. Give that column
 * `filterFn: "arrIncludesSome"` (or your own) in its definition.
 */
function DataTableFacetedFilter<TData, TValue>({
  column,
  title,
  options,
  labels: labelsProp,
}: {
  column: Column<TData, TValue>
  title: string
  options: DataTableFilterOption[]
  labels?: Partial<DataTableLabels>
}) {
  const labels = { ...useTableLabels(), ...labelsProp }
  const counts = column.getFacetedUniqueValues()
  const selected = new Set((column.getFilterValue() as string[] | undefined) ?? [])

  const toggle = (value: string) => {
    const next = new Set(selected)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    column.setFilterValue(next.size ? Array.from(next) : undefined)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="sm" className="sheen-table-filter-btn" data-active={selected.size ? "" : undefined}>
          <PlusCircleIcon />
          {title}
          {selected.size > 0 && (
            <>
              <span className="vr mx-1" />
              {selected.size > 2 ? (
                <span className="badge rounded-pill bg-primary-subtle text-primary-emphasis">{labels.selected(selected.size)}</span>
              ) : (
                options
                  .filter((option) => selected.has(option.value))
                  .map((option) => (
                    <span key={option.value} className="badge rounded-pill bg-primary-subtle text-primary-emphasis">
                      {option.label}
                    </span>
                  ))
              )}
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" style={{ minWidth: "13rem" }}>
        <DropdownMenuLabel>{title}</DropdownMenuLabel>
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={selected.has(option.value)}
            onCheckedChange={() => toggle(option.value)}
            onSelect={(event) => event.preventDefault()} // keep the menu open for multi-select
          >
            {option.icon}
            {option.label}
            <span className="ms-auto small text-body-secondary">{counts.get(option.value) ?? 0}</span>
          </DropdownMenuCheckboxItem>
        ))}
        {selected.size > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => column.setFilterValue(undefined)} className="justify-content-center">
              {labels.clearFilter}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
export { DataTableFacetedFilter }
