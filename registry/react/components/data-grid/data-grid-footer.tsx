"use client"

import * as React from "react"
import { type Column } from "@tanstack/react-table"
import type { DataGridModel } from "./use-data-grid-model"
import type { DataGridProps } from "./data-grid-types"
import { AGGREGATE_LABEL, toText } from "./data-grid-utils"

export function DataGridFooter<TData>({
  model,
  labels,
}: {
  model: Pick<DataGridModel<TData>, "hasFooter" | "rowHeight" | "leafColumns" | "pinStyle" | "pinAttrs" | "totals"> & {
    rowsCount: number
    selectedCount: number
  }
  labels: DataGridProps<TData>["labels"]
}) {
  const { hasFooter, rowsCount, rowHeight, leafColumns, pinStyle, pinAttrs, totals } = model
  const alignOf = (column: Column<TData, unknown>) => column.columnDef.meta?.align
  return (
    <>
      {hasFooter && (
        <div role="rowgroup" className="sheen-grid-foot">
          <div role="row" aria-rowindex={rowsCount + 2} className="sheen-grid-row" style={{ height: rowHeight }}>
            {leafColumns.map((column, c) => {
              const kind = column.columnDef.meta?.aggregate
              const result = totals.get(column.id)
              const format = column.columnDef.meta?.format
              return (
                <div
                  key={column.id}
                  role="gridcell"
                  aria-colindex={c + 1}
                  data-align={alignOf(column as Column<TData, unknown>)}
                  className="sheen-grid-cell sheen-grid-fcell"
                  style={{ width: column.getSize(), ...pinStyle(column as Column<TData, unknown>) }}
                  {...pinAttrs(column as Column<TData, unknown>)}
                >
                  {kind && (
                    <>
                      {typeof kind === "string" && (
                        <span className="sheen-grid-agg-label">{labels?.aggregates?.[kind] ?? AGGREGATE_LABEL[kind]}</span>
                      )}
                      <span>
                        {typeof kind === "function"
                          ? (result as React.ReactNode)
                          : format && result !== null
                            ? format(result)
                            : toText(result)}
                      </span>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
export function DataGridStatus<TData>({
  model,
  labels,
  total,
  activeRow,
  activeCol,
  error,
}: {
  model: Pick<DataGridModel<TData>, "hasFooter" | "rowHeight" | "leafColumns" | "pinStyle" | "pinAttrs" | "totals"> & {
    rowsCount: number
    selectedCount: number
  }
  labels: DataGridProps<TData>["labels"]
  total: number
  activeRow: number
  activeCol: number
  error?: string
}) {
  const { rowsCount, selectedCount, leafColumns } = model
  const activeColumn = leafColumns[activeCol]
  const data = { length: total },
    active = { row: activeRow }
  return (
    <>
      {error && (
        <div className="sheen-grid-error" role="alert">
          {error}
        </div>
      )}
      <div className="sheen-grid-status" aria-live="polite">
        <span>
          {labels?.rows ? (
            labels.rows(rowsCount, data.length)
          ) : (
            <>
              {rowsCount.toLocaleString("en-US")} {rowsCount === 1 ? "row" : "rows"}
              {rowsCount !== data.length && ` of ${data.length.toLocaleString("en-US")}`}
            </>
          )}
        </span>
        {selectedCount > 0 && (
          <span>{labels?.selected ? labels.selected(selectedCount) : `${selectedCount.toLocaleString("en-US")} selected`}</span>
        )}
        <span className="sheen-grid-status-pos">
          {active.row >= 0 && activeColumn ? `R${active.row + 1} · ${activeColumn.columnDef.meta?.label ?? activeColumn.id}` : ""}
        </span>
      </div>
    </>
  )
}
