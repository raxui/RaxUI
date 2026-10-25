"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { useSheenTheme, sheenThemeAttributes, useSheenPortalContainer } from "@/lib/theme"
import { Button } from "@/components/ui/button"
import { XIcon } from "./data-table-icons"
import { useTableLabels } from "./data-table-labels"

/** Floating action bar for selected rows. Portaled so `position: fixed` ignores glass ancestors. */
function DataTableBulkBar({ count, onClear, children }: { count: number; onClear: () => void; children: React.ReactNode }) {
  const labels = useTableLabels()
  const container = useSheenPortalContainer()
  const theme = useSheenTheme()
  const [mounted, setMounted] = React.useState(false)
  const [shownCount, setShownCount] = React.useState(count)

  React.useEffect(() => {
    if (count > 0) {
      setMounted(true)
      setShownCount(count)
    } else {
      const timer = setTimeout(() => setMounted(false), 350)
      return () => clearTimeout(timer)
    }
  }, [count])

  if (!mounted) return null
  return createPortal(
    <div
      {...sheenThemeAttributes(theme)}
      className="sheen-table-bulkbar"
      role="toolbar"
      aria-label={labels.bulkActions}
      data-state={count > 0 ? "open" : "closed"}
      onAnimationEnd={() => count === 0 && setMounted(false)}
    >
      <span className="sheen-table-bulkbar-count">{labels.selected(shownCount)}</span>
      {children}
      <span className="sheen-table-bulkbar-divider" />
      <Button variant="ghost" size="icon-sm" aria-label={labels.clearSelection} onClick={onClear}>
        <XIcon />
      </Button>
    </div>,
    container ?? document.body,
  )
}
export { DataTableBulkBar }
