"use client"

import * as React from "react"
import { defaultRangeExtractor, useVirtualizer } from "@tanstack/react-virtual"

export function useDataGridVirtualizer(
  rows: { id: string }[],
  activeRow: number,
  rowHeight: number,
  scrollerRef: React.RefObject<HTMLDivElement | null>,
) {
  const getItemKey = React.useCallback((index: number) => rows[index]?.id ?? index, [rows])
  const rangeExtractor = React.useCallback(
    (range: Parameters<typeof defaultRangeExtractor>[0]) =>
      [...new Set([...defaultRangeExtractor(range), activeRow])].filter((index) => index >= 0 && index < rows.length).sort((a, b) => a - b),
    [activeRow, rows.length],
  )
  const virtualizer = useVirtualizer({
    count: rows.length,
    getItemKey,
    // Keep the active/editor row mounted even when the viewport scrolls away.
    rangeExtractor,
    getScrollElement: () => scrollerRef.current,
    estimateSize: () => rowHeight,
    overscan: 12,
  })
  React.useEffect(() => virtualizer.measure(), [rowHeight, virtualizer])
  return virtualizer
}
export type DataGridVirtualizer = ReturnType<typeof useDataGridVirtualizer>
