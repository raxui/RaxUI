"use client"

import { type Column, type ColumnDef } from "@tanstack/react-table"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowUpIcon } from "./data-table-icons"
import { useTableLabels } from "./data-table-labels"
import type { DataTableLabels } from "./data-table-types"

// ---- Building blocks -----------------------------------------------------------

/** Sortable header: click to sort, again to reverse, a third time to clear (shift = multi-sort). */
function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: {
  column: Column<TData, TValue>
  title: string
  className?: string
}) {
  if (!column.getCanSort()) return <span className={className}>{title}</span>
  const sorted = column.getIsSorted()
  return (
    <button
      type="button"
      className={cn("sheen-table-sort", className)}
      data-sort={sorted || undefined}
      onClick={column.getToggleSortingHandler()}
    >
      {title}
      <ArrowUpIcon />
    </button>
  )
}

/** Ready-made checkbox column for row selection. */
function getSelectColumn<TData>(selectionLabels?: Partial<Pick<DataTableLabels, "selectAll" | "selectRow">>): ColumnDef<TData> {
  return {
    id: "select",
    header: ({ table }) => {
      const labels = { ...useTableLabels(), ...selectionLabels }
      return (
        <Checkbox
          size="sm"
          aria-label={labels.selectAll}
          checked={table.getIsAllPageRowsSelected() ? true : table.getIsSomePageRowsSelected() ? "indeterminate" : false}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(value === true)}
        />
      )
    },
    cell: ({ row }) => {
      const labels = { ...useTableLabels(), ...selectionLabels }
      return (
        <Checkbox
          size="sm"
          aria-label={labels.selectRow}
          checked={row.getIsSelected()}
          disabled={!row.getCanSelect()}
          onCheckedChange={(value) => row.toggleSelected(value === true)}
        />
      )
    },
    enableSorting: false,
    enableHiding: false,
    meta: { className: "sheen-table-select" },
  }
}
export { DataTableColumnHeader, getSelectColumn }
