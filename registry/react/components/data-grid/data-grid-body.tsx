"use client"

import * as React from "react"
import { flexRender, type Cell, type Column, type Row } from "@tanstack/react-table"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import type { DataGridProps } from "./data-grid-types"
import type { DataGridEditing } from "./use-data-grid-editing"
import type { DataGridModel } from "./use-data-grid-model"
import type { DataGridVirtualizer } from "./use-data-grid-virtualizer"
import { DataGridEditor } from "./data-grid-editor"
import { DEFAULT_CELL, toText } from "./data-grid-utils"

interface GridBodyProps<TData> {
  model: Pick<DataGridModel<TData>, "rows" | "rowHeight" | "pinStyle" | "pinAttrs">
  virtualizer: DataGridVirtualizer
  active: { row: number; col: number }
  controller: DataGridEditing<TData>
  setActive: React.Dispatch<React.SetStateAction<{ row: number; col: number }>>
  cellId: (row: number, col: number) => string
  labels: DataGridProps<TData>["labels"]
  emptyState: React.ReactNode
}
function DataGridCell<TData>({
  row,
  cell,
  rowIndex,
  colIndex,
  active,
  controller,
  setActive,
  pinStyle,
  pinAttrs,
  cellId,
  labels,
}: { row: Row<TData>; cell: Cell<TData, unknown>; rowIndex: number; colIndex: number } & Pick<
  GridBodyProps<TData>,
  "active" | "controller" | "setActive" | "cellId" | "labels"
> &
  Pick<DataGridModel<TData>, "pinStyle" | "pinAttrs">) {
  const { editing, flash, editError, commit, commitValue, startEditing, setEditError } = controller
  const alignOf = (column: Column<TData, unknown>) => column.columnDef.meta?.align
  const column = cell.column
  const meta = column.columnDef.meta
  const isActive = active.row === rowIndex && active.col === colIndex
  const isEditing = isActive && !!editing
  const editor = meta?.editor
  const value = cell.getValue()
  const hasCustomCell = typeof column.columnDef.cell === "function" && column.columnDef.cell !== DEFAULT_CELL
  const content = isEditing ? (
    <DataGridEditor row={row} column={column} controller={controller} labels={labels} />
  ) : editor?.type === "checkbox" && !hasCustomCell ? (
    <Checkbox
      size="sm"
      checked={!!value}
      tabIndex={-1}
      aria-hidden
      onCheckedChange={() => setEditError(commitValue(row, column, !value))}
    />
  ) : hasCustomCell ? (
    flexRender(column.columnDef.cell, cell.getContext())
  ) : meta?.format ? (
    meta.format(value)
  ) : (
    toText(value)
  )

  return (
    <div
      key={cell.id}
      id={cellId(rowIndex, colIndex)}
      role="gridcell"
      aria-colindex={colIndex + 1}
      aria-selected={row.getIsSelected() || undefined}
      aria-readonly={!editor || undefined}
      aria-invalid={isEditing && editError ? true : undefined}
      data-active={isActive || undefined}
      data-editing={isEditing || undefined}
      data-editable={editor ? "" : undefined}
      data-align={alignOf(column)}
      data-flash={flash === `${row.id}:${column.id}` || undefined}
      className={cn("rax-grid-cell", meta?.className)}
      style={{ width: column.getSize(), ...pinStyle(column) }}
      {...pinAttrs(column)}
      onPointerDown={(event) => {
        if (isEditing) return
        if (editing && !commit()) return event.preventDefault()
        setActive({ row: rowIndex, col: colIndex })
      }}
      onDoubleClick={() => {
        if (editor && editor.type !== "checkbox") startEditing()
      }}
    >
      {content}
      {isEditing && editError && (
        <span className="rax-grid-error" role="alert">
          {editError}
        </span>
      )}
    </div>
  )
}
export function DataGridBody<TData>(props: GridBodyProps<TData>) {
  const {
    model: { rows, rowHeight },
    virtualizer,
    active,
    controller: { editing },
    emptyState,
  } = props
  const virtualRows = virtualizer.getVirtualItems()
  return (
    <div role="rowgroup" className="rax-grid-body" style={{ height: virtualizer.getTotalSize() }}>
      {rows.length === 0 && <div className="rax-grid-empty">{emptyState}</div>}
      {virtualRows.map((vr) => {
        const row = rows[vr.index]
        const cells = [...row.getLeftVisibleCells(), ...row.getCenterVisibleCells(), ...row.getRightVisibleCells()]
        return (
          <div
            key={row.id}
            role="row"
            aria-rowindex={vr.index + 2}
            aria-selected={row.getIsSelected() || undefined}
            data-selected={row.getIsSelected() || undefined}
            data-active-row={active.row === vr.index || undefined}
            data-editing-row={(active.row === vr.index && !!editing) || undefined}
            className="rax-grid-row"
            style={{ height: rowHeight, transform: `translateY(${vr.start}px)` }}
          >
            {cells.map((cell, c) => (
              <DataGridCell
                key={cell.id}
                active={props.active}
                controller={props.controller}
                setActive={props.setActive}
                cellId={props.cellId}
                labels={props.labels}
                pinStyle={props.model.pinStyle}
                pinAttrs={props.model.pinAttrs}
                row={row}
                cell={cell as Cell<TData, unknown>}
                rowIndex={vr.index}
                colIndex={c}
              />
            ))}
          </div>
        )
      })}
    </div>
  )
}
