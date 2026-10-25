"use client"

import * as React from "react"
import type { DataTableLabels } from "./data-table-types"

const DEFAULT_LABELS: DataTableLabels = {
  view: "View",
  columns: "Columns",
  density: "Density",
  comfortable: "Comfortable",
  compact: "Compact",
  reset: "Reset",
  clearFilter: "Clear filter",
  selectAll: "Select all rows on this page",
  selectRow: "Select row",
  rowsPerPage: "Rows per page",
  firstPage: "First page",
  previousPage: "Previous page",
  nextPage: "Next page",
  lastPage: "Last page",
  bulkActions: "Actions for selected rows",
  clearSelection: "Clear selection",
  emptyHint: "Try a different search or",
  clearFilters: "clear the filters",
  selected: (count) => `${count} selected`,
  results: (count) => `${count} result${count === 1 ? "" : "s"}`,
  selectionSummary: (count, total) => `${count} of ${total} row${total === 1 ? "" : "s"} selected`,
  page: (current, total) => `Page ${current} of ${total}`,
}
const TableLabelsContext = React.createContext(DEFAULT_LABELS)
const useTableLabels = () => React.useContext(TableLabelsContext)
export { DEFAULT_LABELS, TableLabelsContext, useTableLabels }
