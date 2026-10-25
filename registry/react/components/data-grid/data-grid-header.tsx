"use client"

// Built-in SVG paths from Lucide (ISC).

import * as React from "react"
import { flexRender, type Column } from "@tanstack/react-table"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { DataGridModel } from "./use-data-grid-model"
import type { DataGridProps } from "./data-grid-types"
import { DEFAULT_GRID_LABELS } from "./data-grid-utils"

const Icon = ({ d }: { d: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
)
const ArrowIcon = () => <Icon d="M12 19V5M5 12l7-7 7 7" />
const DotsIcon = () => <Icon d="M12 6h.01M12 12h.01M12 18h.01" />
const PinIcon = () => <Icon d="M12 17v5M9 3h6l-1 6 3 3v2H7v-2l3-3Z" />
export function DataGridHeader<TData>({
  model,
  active,
  setActive,
  gridId,
  labels,
  commit,
}: {
  model: Pick<DataGridModel<TData>, "leafColumns" | "table" | "rowHeight" | "pinStyle" | "pinAttrs" | "headerFor">
  active: { row: number; col: number }
  setActive: React.Dispatch<React.SetStateAction<{ row: number; col: number }>>
  gridId: string
  labels: DataGridProps<TData>["labels"]
  commit: () => boolean
}) {
  const { leafColumns, table, rowHeight, pinStyle, pinAttrs, headerFor } = model
  const text = { ...DEFAULT_GRID_LABELS, ...labels }
  const alignOf = (column: Column<TData, unknown>) => column.columnDef.meta?.align
  return (
    <div role="rowgroup" className="sheen-grid-head">
      <div role="row" aria-rowindex={1} className="sheen-grid-row" style={{ height: rowHeight + 2 }}>
        {leafColumns.map((column, c) => {
          const header = headerFor(column as Column<TData, unknown>)
          const sorted = column.getIsSorted()
          const isActive = active.row === -1 && active.col === c
          return (
            <div
              key={column.id}
              id={`${gridId}-h-c${c}`}
              role="columnheader"
              aria-colindex={c + 1}
              aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : column.getCanSort() ? "none" : undefined}
              data-active={isActive || undefined}
              data-align={alignOf(column as Column<TData, unknown>)}
              className={cn("sheen-grid-hcell", column.columnDef.meta?.className)}
              style={{ width: column.getSize(), ...pinStyle(column as Column<TData, unknown>) }}
              {...pinAttrs(column as Column<TData, unknown>)}
              onPointerDownCapture={(event) => {
                if (!commit()) {
                  event.preventDefault()
                  return
                }
                setActive({ row: -1, col: c })
              }}
            >
              {header && (
                <>
                  <span
                    className="sheen-grid-hlabel"
                    data-sortable={column.getCanSort() || undefined}
                    onClick={(e) => {
                      if (!commit()) return
                      if (column.getCanSort()) column.toggleSorting(undefined, e.shiftKey)
                    }}
                  >
                    {flexRender(column.columnDef.header, header.getContext())}
                    {sorted && (
                      <span className="sheen-grid-sort" data-dir={sorted} aria-hidden="true">
                        <ArrowIcon />
                        {table.getState().sorting.length > 1 && <small>{column.getSortIndex() + 1}</small>}
                      </span>
                    )}
                  </span>
                  {column.id !== "select" && (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="sheen-grid-hmenu"
                        tabIndex={-1}
                        aria-label={
                          labels?.columnMenu?.(column.columnDef.meta?.label ?? column.id) ??
                          `${column.columnDef.meta?.label ?? column.id} column menu`
                        }
                      >
                        <DotsIcon />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" style={{ minWidth: "11rem" }}>
                        {column.getCanSort() && (
                          <>
                            <DropdownMenuItem onSelect={() => column.toggleSorting(false)}>{text.sortAscending}</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => column.toggleSorting(true)}>{text.sortDescending}</DropdownMenuItem>
                            {sorted && <DropdownMenuItem onSelect={() => column.clearSorting()}>{text.clearSort}</DropdownMenuItem>}
                            <DropdownMenuSeparator />
                          </>
                        )}
                        {column.getIsPinned() !== "left" && (
                          <DropdownMenuItem onSelect={() => column.pin("left")}>
                            <PinIcon /> {text.pinStart}
                          </DropdownMenuItem>
                        )}
                        {column.getIsPinned() !== "right" && (
                          <DropdownMenuItem onSelect={() => column.pin("right")}>
                            <PinIcon /> {text.pinEnd}
                          </DropdownMenuItem>
                        )}
                        {column.getIsPinned() && <DropdownMenuItem onSelect={() => column.pin(false)}>{text.unpin}</DropdownMenuItem>}
                        {column.getCanResize() && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onSelect={() =>
                                table.setColumnSizing((old) => ({
                                  ...old,
                                  [column.id]: Math.min(column.columnDef.maxSize ?? 640, column.getSize() + 20),
                                }))
                              }
                            >
                              {text.increaseWidth}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() =>
                                table.setColumnSizing((old) => ({
                                  ...old,
                                  [column.id]: Math.max(column.columnDef.minSize ?? 60, column.getSize() - 20),
                                }))
                              }
                            >
                              {text.decreaseWidth}
                            </DropdownMenuItem>
                          </>
                        )}
                        {column.getCanHide() && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => column.toggleVisibility(false)}>{text.hideColumn}</DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  {column.getCanResize() && (
                    <span
                      className="sheen-grid-resizer"
                      data-resizing={column.getIsResizing() || undefined}
                      onMouseDown={header.getResizeHandler()}
                      onTouchStart={header.getResizeHandler()}
                      onDoubleClick={() => column.resetSize()}
                      aria-hidden="true"
                    />
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
