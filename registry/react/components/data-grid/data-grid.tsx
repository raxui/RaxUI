"use client"

import * as React from "react"
import { useSheenTheme, sheenThemeAttributes, SheenThemeBoundary } from "@/lib/theme"
import { cn } from "@/lib/utils"
import { getDirection } from "@/lib/direction"
import type { DataGridProps } from "./data-grid-types"
import { useDataGridModel } from "./use-data-grid-model"
import { useDataGridVirtualizer } from "./use-data-grid-virtualizer"
import { useDataGridEditing } from "./use-data-grid-editing"
import { useDataGridNavigation } from "./use-data-grid-navigation"
import { DataGridHeader } from "./data-grid-header"
import { DataGridBody } from "./data-grid-body"
import { DataGridFooter, DataGridStatus } from "./data-grid-footer"

function DataGridInner<TData>(props: DataGridProps<TData>, ref: React.ForwardedRef<HTMLDivElement>) {
  const { appearance, dir, label, height = 480, toolbar, emptyState = "No rows", labels } = props
  const theme = useSheenTheme({ appearance, direction: dir }),
    density = props.density ?? theme.density ?? "comfortable"
  const gridId = React.useId().replace(/:/g, "")
  const scrollerRef = React.useRef<HTMLDivElement>(null)
  const [isRtl, setIsRtl] = React.useState(dir === "rtl")
  React.useLayoutEffect(() => {
    if (scrollerRef.current) setIsRtl(getDirection(scrollerRef.current) === "rtl")
  }, [dir, theme.direction])
  const model = useDataGridModel(props, isRtl, density)
  const [active, setActive] = React.useState({ row: 0, col: 0 })
  const virtualizer = useDataGridVirtualizer(model.rows, active.row, model.rowHeight, scrollerRef)
  const controller = useDataGridEditing({
    activeRow: active.row >= 0 ? model.rows[active.row] : undefined,
    activeColumn: model.leafColumns[active.col],
    labels,
    onCellEdit: props.onCellEdit,
    scrollerRef,
  })
  const navigation = useDataGridNavigation({ model, active, setActive, scrollerRef, virtualizer, isRtl, gridId, controller })
  const headerModel = {
    leafColumns: model.leafColumns,
    table: model.table,
    rowHeight: model.rowHeight,
    pinStyle: model.pinStyle,
    pinAttrs: model.pinAttrs,
    headerFor: model.headerFor,
  }
  const bodyModel = { rows: model.rows, rowHeight: model.rowHeight, pinStyle: model.pinStyle, pinAttrs: model.pinAttrs }
  const footerModel = {
    hasFooter: model.hasFooter,
    rowHeight: model.rowHeight,
    leafColumns: model.leafColumns,
    pinStyle: model.pinStyle,
    pinAttrs: model.pinAttrs,
    totals: model.totals,
    rowsCount: model.rows.length,
    selectedCount: Object.values(model.rowSelection).filter(Boolean).length,
  }
  const cellId = (r: number, c: number) => `${gridId}-r${r}-c${c}`
  const activeDescendant = !model.leafColumns[active.col]
    ? undefined
    : active.row === -1
      ? `${gridId}-h-c${active.col}`
      : virtualizer.getVirtualItems().some((row) => row.index === active.row)
        ? cellId(active.row, active.col)
        : undefined
  return (
    <SheenThemeBoundary value={{ ...theme, direction: isRtl ? "rtl" : "ltr" }}>
      <div {...sheenThemeAttributes(theme)} ref={ref} className={cn("sheen-grid", props.className)} data-density={density} dir={dir}>
        {toolbar && <div className="sheen-grid-toolbar">{toolbar(model.table)}</div>}
        <div
          ref={scrollerRef}
          role="grid"
          aria-label={label}
          aria-rowcount={model.rows.length + 1 + (model.hasFooter ? 1 : 0)}
          aria-colcount={model.leafColumns.length}
          aria-multiselectable="true"
          aria-activedescendant={controller.editing ? undefined : activeDescendant}
          tabIndex={0}
          className="sheen-grid-scroller"
          style={{ maxHeight: height }}
          {...navigation}
          onScroll={(event) => event.currentTarget.toggleAttribute("data-scrolled-x", Math.abs(event.currentTarget.scrollLeft) > 0)}
        >
          <div className="sheen-grid-canvas" style={{ width: model.totalWidth }}>
            <DataGridHeader
              model={headerModel}
              active={active}
              setActive={setActive}
              gridId={gridId}
              labels={labels}
              commit={controller.commit}
            />
            <DataGridBody
              model={bodyModel}
              virtualizer={virtualizer}
              active={active}
              controller={controller}
              setActive={setActive}
              cellId={cellId}
              labels={labels}
              emptyState={emptyState}
            />
            <DataGridFooter model={footerModel} labels={labels} />
          </div>
        </div>
        <DataGridStatus
          model={footerModel}
          labels={labels}
          total={props.data.length}
          activeRow={active.row}
          activeCol={active.col}
          error={!controller.editing ? controller.editError : undefined}
        />
      </div>
    </SheenThemeBoundary>
  )
}
const DataGrid = React.forwardRef(DataGridInner) as <TData>(
  props: DataGridProps<TData> & { ref?: React.ForwardedRef<HTMLDivElement> },
) => React.ReactElement
export { DataGrid }
export type { DataGridProps, DataGridCellEdit, GridEditor, GridAggregate } from "./data-grid-types"
