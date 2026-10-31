import * as React from "react"
import { renderToString } from "react-dom/server"
import { beforeAll, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ColumnDef } from "@tanstack/react-table"
import { DataTable, DataTableColumnHeader, getSelectColumn } from "../../registry/react/components/data-table/data-table"
import { DataGrid } from "../../registry/react/components/data-grid/data-grid"
import { Sortable, SortableContent, SortableItem, SortableItemHandle } from "../../registry/react/components/sortable/sortable"
import { RaxThemeProvider } from "../../registry/react/foundation/theme"

beforeAll(() => {
  window.matchMedia ??= ((query: string) => ({
    matches: query.includes("reduced-motion"),
    media: query,
    addEventListener() {},
    removeEventListener() {},
  })) as typeof window.matchMedia
  vi.stubGlobal(
    "ResizeObserver",
    class {
      callback: ResizeObserverCallback
      constructor(callback: ResizeObserverCallback) {
        this.callback = callback
      }
      observe(target: Element) {
        queueMicrotask(() =>
          this.callback(
            [{ target, borderBoxSize: [{ inlineSize: 800, blockSize: 320 }] } as unknown as ResizeObserverEntry],
            this as unknown as ResizeObserver,
          ),
        )
      }
      unobserve() {}
      disconnect() {}
    },
  )
  const original = HTMLElement.prototype.getBoundingClientRect
  HTMLElement.prototype.getBoundingClientRect = function () {
    return this.classList.contains("rax-grid-scroller")
      ? {
          ...new DOMRect(0, 0, 800, 320),
          width: 800,
          height: 320,
          top: 0,
          bottom: 320,
          left: 0,
          right: 800,
          x: 0,
          y: 0,
          toJSON() {
            return {}
          },
        }
      : original.call(this)
  }
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
    configurable: true,
    get() {
      return this.classList.contains("rax-grid-scroller") ? 320 : 34
    },
  })
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
    configurable: true,
    get() {
      return 800
    },
  })
  HTMLElement.prototype.hasPointerCapture ??= () => false
  HTMLElement.prototype.setPointerCapture ??= () => {}
  HTMLElement.prototype.releasePointerCapture ??= () => {}
})
type Item = { id: string; name: string; amount: number | null; status: string; date?: Date }
const items: Item[] = [
  { id: "a", name: "Alpha", amount: 10, status: "open" },
  { id: "b", name: "Beta", amount: 20, status: "closed" },
  { id: "c", name: "Gamma", amount: 30, status: "open" },
]
const columns: ColumnDef<Item>[] = [
  getSelectColumn<Item>(),
  { accessorKey: "name", header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />, meta: { label: "Name" } },
  { accessorKey: "amount", header: "Amount", meta: { label: "Amount" } },
  {
    accessorKey: "status",
    header: "Status",
    filterFn: (row, id, values: string[]) => values.includes(row.getValue(id)),
    meta: { label: "Status" },
  },
]
const gridColumns: ColumnDef<Item>[] = [
  { accessorKey: "name", header: "Name", meta: { label: "Name", editor: { type: "text" } } },
  { accessorKey: "amount", header: "Amount", meta: { label: "Amount", editor: { type: "number", min: 0, max: 100 }, aggregate: "sum" } },
  {
    accessorKey: "status",
    header: "Status",
    meta: {
      label: "Status",
      editor: {
        type: "select",
        options: [
          { value: "open", label: "Open" },
          { value: "closed", label: "Closed" },
        ],
      },
    },
  },
]

describe("DataTable", () => {
  it("sorts, filters, pages and forwards the wrapper ref", async () => {
    const user = userEvent.setup(),
      ref = React.createRef<HTMLDivElement>()
    render(<DataTable ref={ref} columns={columns} data={items} initialPageSize={2} pageSizeOptions={[2, 3]} label="Orders" />)
    expect(ref.current).toHaveClass("rax-data-table")
    expect(screen.getByRole("table", { name: "Orders" })).toBeInTheDocument()
    expect(screen.queryByText("Gamma")).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Next page" }))
    expect(screen.getByText("Gamma")).toBeInTheDocument()
    await user.type(screen.getByRole("searchbox"), "Beta")
    expect(await screen.findByText("Beta")).toBeInTheDocument()
    expect(screen.getByText("Page 1 of 1")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Reset" }))
    await user.click(screen.getByRole("button", { name: "Name" }))
    expect(screen.getByRole("columnheader", { name: "Name" })).toHaveAttribute("aria-sort", "ascending")
    await user.click(screen.getByRole("button", { name: "Name" }))
    expect(screen.getByRole("columnheader", { name: "Name" })).toHaveAttribute("aria-sort", "descending")
  })
  it("keeps faceted filters open, toggles column visibility/density and clears filters", async () => {
    const user = userEvent.setup()
    render(
      <DataTable
        columns={columns}
        data={items}
        filters={[
          {
            columnId: "status",
            title: "States",
            options: [
              { value: "open", label: "Open" },
              { value: "closed", label: "Closed" },
            ],
          },
        ]}
      />,
    )
    await user.click(screen.getByRole("button", { name: "States" }))
    await user.click(screen.getByRole("menuitemcheckbox", { name: /Open/ }))
    expect(screen.getByRole("menu")).toBeInTheDocument()
    expect(screen.queryByText("Beta")).not.toBeInTheDocument()
    await user.keyboard("{Escape}")
    await user.click(screen.getByRole("button", { name: "Reset" }))
    expect(screen.getByText("Beta")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "View" }))
    await user.click(screen.getByRole("menuitemcheckbox", { name: "Amount" }))
    expect(screen.queryByRole("columnheader", { name: "Amount" })).not.toBeInTheDocument()
    await user.click(screen.getByRole("menuitemradio", { name: "Compact" }))
    await user.keyboard("{Escape}")
    expect(screen.getByRole("table")).toHaveClass("rax-table-compact")
  })
  it("preserves selected row IDs while sorting and clears the themed bulk toolbar", async () => {
    const user = userEvent.setup(),
      selected = vi.fn()
    render(
      <RaxThemeProvider mode="dark">
        <DataTable
          columns={columns}
          data={items}
          getRowId={(row) => row.id}
          bulkActions={(rows) => <button onClick={() => selected(rows.map((r) => r.id))}>Process</button>}
        />
      </RaxThemeProvider>,
    )
    await user.click(screen.getAllByRole("checkbox", { name: "Select row" })[0])
    const toolbar = await screen.findByRole("toolbar", { name: "Actions for selected rows" })
    expect(toolbar.closest('[data-bs-theme="dark"]')).not.toBeNull()
    await user.click(screen.getByRole("button", { name: "Name" }))
    await user.click(screen.getByRole("button", { name: "Process" }))
    expect(selected).toHaveBeenCalledWith(["a"])
    await user.click(screen.getByRole("button", { name: "Clear selection" }))
    await waitFor(() => expect(screen.queryByRole("toolbar")).not.toBeInTheDocument())
  })
  it("supports translated controls, empty and loading states", async () => {
    const labels = {
      view: "عرض",
      selectAll: "اختيار الكل",
      selectRow: "اختيار الصف",
      rowsPerPage: "عدد الصفوف",
      results: (n: number) => `${n} نتائج`,
    }
    const view = render(<DataTable columns={columns} data={[]} emptyMessage="لا توجد بيانات" labels={labels} />)
    expect(screen.getByText("لا توجد بيانات")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "عرض" })).toBeInTheDocument()
    view.rerender(<DataTable columns={columns} data={items} labels={labels} loading />)
    expect(screen.getByRole("table")).toHaveAttribute("aria-busy", "true")
    expect(screen.queryByText("Alpha")).not.toBeInTheDocument()
  })
})

describe("DataGrid", () => {
  const setup = async (data = items, extra: Partial<React.ComponentProps<typeof DataGrid<Item>>> = {}) => {
    const edit = vi.fn()
    const view = render(
      <DataGrid label="Inventory" columns={gridColumns} data={data} getRowId={(r) => r.id} onCellEdit={edit} {...extra} />,
    )
    const grid = screen.getByRole("grid", { name: "Inventory" })
    await screen.findByRole("gridcell", { name: "Alpha" })
    return { grid, edit, ...view }
  }
  it("opens header actions with the keyboard and changes column width", async () => {
    const { grid } = await setup()
    fireEvent.keyDown(grid, { key: "ArrowUp" })
    fireEvent.keyDown(grid, { key: "F10", shiftKey: true })
    const action = await screen.findByRole("menuitem", { name: "Increase width" })
    await userEvent.click(action)
    expect(within(grid).getAllByRole("columnheader")[0]).toHaveStyle({ width: "180px" })
  })
  it("edits and cancels text cells, returning grid focus", async () => {
    const { grid, edit } = await setup()
    fireEvent.keyDown(grid, { key: "Enter" })
    const input = screen.getByRole("textbox", { name: "Name, row 1" })
    fireEvent.change(input, { target: { value: "Changed" } })
    fireEvent.keyDown(input, { key: "Enter" })
    expect(edit).toHaveBeenCalledWith(expect.objectContaining({ rowId: "a", columnId: "name", value: "Changed", previous: "Alpha" }))
    await waitFor(() => expect(grid).toHaveFocus())
    fireEvent.keyDown(grid, { key: "Enter" })
    const next = screen.getByRole("textbox", { name: "Name, row 2" })
    fireEvent.change(next, { target: { value: "Discard" } })
    fireEvent.keyDown(next, { key: "Escape" })
    expect(edit).toHaveBeenCalledTimes(1)
  })
  it.each(["abc", "Infinity", "-1", "101"])("rejects invalid or out-of-range numeric edit %s", async (value) => {
    const { grid, edit } = await setup()
    fireEvent.keyDown(grid, { key: "ArrowRight" })
    fireEvent.keyDown(grid, { key: "Enter" })
    const input = screen.getByRole("textbox", { name: "Amount, row 1" })
    fireEvent.change(input, { target: { value } })
    fireEvent.keyDown(input, { key: "Enter" })
    expect(screen.getByRole("alert")).toBeInTheDocument()
    expect(edit).not.toHaveBeenCalled()
  })
  it("validates pasted numbers and select options before emitting edits", async () => {
    const { grid, edit } = await setup()
    fireEvent.keyDown(grid, { key: "ArrowRight" })
    fireEvent.paste(grid, { clipboardData: { getData: () => "invalid" } })
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a number")
    fireEvent.keyDown(grid, { key: "Escape" })
    fireEvent.paste(grid, { clipboardData: { getData: () => "42" } })
    expect(edit).toHaveBeenCalledWith(expect.objectContaining({ value: 42, columnId: "amount" }))
    fireEvent.keyDown(grid, { key: "ArrowRight" })
    fireEvent.paste(grid, { clipboardData: { getData: () => "unknown" } })
    expect(screen.getByRole("alert")).toHaveTextContent("Choose a valid option")
    expect(edit).toHaveBeenCalledTimes(1)
  })
  it("does not apply a draft to another row after data is reordered", async () => {
    const { grid, edit, rerender } = await setup()
    fireEvent.keyDown(grid, { key: "Enter" })
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Draft" } })
    rerender(
      <DataGrid label="Inventory" columns={gridColumns} data={[items[1], items[0], items[2]]} getRowId={(r) => r.id} onCellEdit={edit} />,
    )
    await waitFor(() => expect(screen.queryByRole("textbox")).not.toBeInTheDocument())
    expect(edit).not.toHaveBeenCalled()
  })
  it("omits unchecked entries from the selection count and preserves external ownership", async () => {
    const { grid } = await setup(items, { rowSelection: { a: true, b: false } })
    expect(grid.parentElement).toHaveTextContent("1 selected")
  })
  it("renders numeric aggregates without counting nulls in averages", async () => {
    const { grid } = await setup([{ ...items[0], amount: null }, items[1]], {
      columns: [gridColumns[0], { ...gridColumns[1], meta: { aggregate: "avg" } }],
    })
    expect(within(grid).getByRole("gridcell", { name: /Avg\s*20/ })).toBeInTheDocument()
  })
  it("does not crash or commit an invalid pasted calendar date", async () => {
    const { grid, edit } = await setup(items, {
      columns: [gridColumns[0], { accessorKey: "date", header: "Date", meta: { editor: { type: "date" } } }],
    })
    fireEvent.keyDown(grid, { key: "ArrowRight" })
    fireEvent.paste(grid, { clipboardData: { getData: () => "2026-02-30" } })
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid date")
    expect(edit).not.toHaveBeenCalled()
  })
})
describe("Sortable", () => {
  it("wires accessible drag handles, forwards refs and keeps disabled items disabled", () => {
    const ref = React.createRef<HTMLDivElement>()
    render(
      <Sortable value={["a", "b"]}>
        <SortableContent ref={ref}>
          <SortableItem value="a">
            <SortableItemHandle aria-label="Move Alpha" />
          </SortableItem>
          <SortableItem value="b" disabled>
            <SortableItemHandle aria-label="Move Beta" />
          </SortableItem>
        </SortableContent>
      </Sortable>,
    )
    expect(ref.current).toHaveClass("rax-sortable")
    expect(screen.getByRole("button", { name: "Move Alpha" })).toHaveAttribute("aria-describedby")
    expect(screen.getByRole("button", { name: "Move Beta" })).toBeDisabled()
  })
  it("rejects duplicate identifiers before a reorder can corrupt the list", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {})
    try {
      expect(() => renderToString(<Sortable value={["same", "same"]} />)).toThrow("must be unique")
    } finally {
      error.mockRestore()
    }
  })
})
