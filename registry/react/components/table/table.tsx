"use client"

// RaxUI table. Source-owned: edit freely. Ported from boot-ui.
import * as React from "react"

import type { RaxAppearance } from "@/lib/theme"

import { cn } from "@/lib/utils"

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  appearance?: RaxAppearance
  /** `compact` tightens padding for dense data. */
  density?: "comfortable" | "compact"
  /** Pin the header while the body scrolls — give the container a max-height. */
  stickyHeader?: boolean
  /** Bootstrap's hover highlight. On by default. */
  hover?: boolean
  striped?: boolean
  containerClassName?: string
  containerStyle?: React.CSSProperties
}

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  (
    {
      appearance,
      className,
      density,
      stickyHeader = false,
      hover = true,
      striped = false,
      containerClassName,
      containerStyle,
      ...props
    },
    ref,
  ) => (
    <div className={cn("rax-table-container", containerClassName)} style={containerStyle}>
      <table
        data-density={density}
        ref={ref}
        data-rax-appearance={appearance}
        className={cn(
          "table rax-table",
          hover && "table-hover",
          striped && "table-striped",
          density === "compact" && "rax-table-compact",
          stickyHeader && "rax-table-sticky",
          className,
        )}
        {...props}
      />
    </div>
  ),
)
Table.displayName = "Table"

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <thead ref={ref} className={className} {...props} />,
)
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <tbody ref={ref} className={className} {...props} />,
)
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <tfoot ref={ref} className={className} {...props} />,
)
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(({ className, ...props }, ref) => (
  <tr ref={ref} className={className} {...props} />
))
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, scope = "col", ...props }, ref) => <th ref={ref} scope={scope} className={className} {...props} />,
)
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(({ className, ...props }, ref) => (
  <td ref={ref} className={className} {...props} />
))
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(
  ({ className, ...props }, ref) => <caption ref={ref} className={className} {...props} />,
)
TableCaption.displayName = "TableCaption"

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption }
