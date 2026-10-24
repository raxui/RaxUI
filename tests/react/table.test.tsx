import * as React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption, TableFooter } from "../../registry/react/components/table/table"
describe("Table", () => {
  it("keeps native table semantics, scope, caption and style options", () => {
    const ref = React.createRef<HTMLTableElement>()
    render(<Table ref={ref} density="compact" striped stickyHeader><TableCaption>People</TableCaption><TableHeader><TableRow><TableHead>Name</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell>Saad</TableCell></TableRow></TableBody><TableFooter><TableRow><TableCell>One person</TableCell></TableRow></TableFooter></Table>)
    expect(screen.getByRole("table", { name: "People" })).toBe(ref.current)
    expect(screen.getByRole("columnheader", { name: "Name" })).toHaveAttribute("scope", "col")
    expect(screen.getByRole("cell", { name: "Saad" })).toBeVisible()
    expect(ref.current).toHaveClass("sheen-table-compact", "table-striped", "sheen-table-sticky", "table-hover")
  })
})
