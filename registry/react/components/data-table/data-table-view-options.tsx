"use client"

import { type Table as TanstackTable } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ColumnsIcon } from "./data-table-icons"
import { useTableLabels } from "./data-table-labels"
import type { DataTableLabels } from "./data-table-types"

function DataTableViewOptions<TData>({
  table,
  density,
  onDensityChange,
  labels: labelsProp,
}: {
  table: TanstackTable<TData>
  density: "comfortable" | "compact"
  onDensityChange: (density: "comfortable" | "compact") => void
  labels?: Partial<DataTableLabels>
}) {
  const labels = { ...useTableLabels(), ...labelsProp }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="sm" className="ms-auto">
          <ColumnsIcon />
          {labels.view}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" style={{ minWidth: "12rem" }}>
        <DropdownMenuLabel>{labels.columns}</DropdownMenuLabel>
        {table
          .getAllColumns()
          .filter((column) => column.getCanHide())
          .map((column) => (
            <DropdownMenuCheckboxItem
              key={column.id}
              checked={column.getIsVisible()}
              onCheckedChange={(value) => column.toggleVisibility(value === true)}
              onSelect={(event) => event.preventDefault()}
            >
              {column.columnDef.meta?.label ?? column.id}
            </DropdownMenuCheckboxItem>
          ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{labels.density}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={density} onValueChange={(value) => onDensityChange(value as "comfortable" | "compact")}>
          <DropdownMenuRadioItem value="comfortable">{labels.comfortable}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="compact">{labels.compact}</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
export { DataTableViewOptions }
