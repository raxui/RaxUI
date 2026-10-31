"use client"
import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { RaxThemeProvider } from "@/lib/theme"
import { DataTable, DataTableColumnHeader, getSelectColumn } from "@/components/ui/data-table"
import { DataGrid } from "@/components/ui/data-grid"
import { Sortable, SortableContent, SortableItem, SortableItemHandle, SortableOverlay } from "@/components/ui/sortable"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"

type Entry = { id: string; name: string; amount: number; state: string; date: Date; enabled: boolean }
const initial: Entry[] = Array.from({ length: 10000 }, (_, i) => ({
  id: String(i),
  name: `Row ${String(i + 1).padStart(4, "0")}`,
  amount: i + 1,
  state: "open",
  date: new Date(2026, 9, 25),
  enabled: true,
}))
const tableColumns: ColumnDef<Entry>[] = [
  getSelectColumn<Entry>(),
  { accessorKey: "name", header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />, meta: { label: "Name" } },
  { accessorKey: "amount", header: "Amount", meta: { label: "Amount" } },
]
const gridColumns: ColumnDef<Entry>[] = [
  { accessorKey: "name", header: "Name", meta: { label: "Name", editor: { type: "text" } } },
  { accessorKey: "amount", header: "Amount", meta: { label: "Amount", editor: { type: "number", min: 0, max: 10000 }, aggregate: "sum" } },
  {
    accessorKey: "state",
    header: "State",
    meta: {
      label: "State",
      editor: {
        type: "select",
        options: [
          { value: "open", label: "Open" },
          { value: "closed", label: "Closed" },
        ],
      },
    },
  },
  { accessorKey: "date", header: "Date", meta: { label: "Date", editor: { type: "date" } } },
  { accessorKey: "enabled", header: "Enabled", meta: { label: "Enabled", editor: { type: "checkbox" } } },
]

export default function DataDemo() {
  const [data, setData] = React.useState(initial),
    [tasks, setTasks] = React.useState(["Alpha", "Beta", "Gamma"]),
    [dir, setDir] = React.useState<"ltr" | "rtl">("ltr"),
    [edit, setEdit] = React.useState("")
  return (
    <RaxThemeProvider mode="dark" appearance="glass" direction={dir} style={{ padding: 16 }} data-testid="data-theme">
      <button onClick={() => setDir((d) => (d === "ltr" ? "rtl" : "ltr"))}>Toggle direction</button>
      <section aria-label="Table demo">
        <DataTable
          label="Orders"
          columns={tableColumns}
          data={data.slice(0, 20)}
          getRowId={(row) => row.id}
          initialPageSize={5}
          pageSizeOptions={[5, 10, 20]}
          bulkActions={(rows) => <button onClick={() => setEdit(`${rows.length} selected`)}>Use selection</button>}
        />
      </section>
      <section aria-label="Grid demo">
        <DataGrid
          label="Inventory"
          columns={gridColumns}
          data={data}
          getRowId={(row) => row.id}
          height={260}
          onCellEdit={(change) => {
            setData((rows) => rows.map((row) => (row.id === change.rowId ? { ...row, [change.columnId]: change.value } : row)))
            setEdit(`${change.rowId}:${change.columnId}:${String(change.value)}`)
          }}
        />
      </section>
      <output aria-label="Last edit">{edit}</output>
      <section aria-label="Sortable demo">
        <Sortable value={tasks} onValueChange={setTasks}>
          <SortableContent>
            {tasks.map((task) => (
              <SortableItem key={task} value={task} style={{ padding: 12, border: "1px solid gray", margin: 4 }}>
                <SortableItemHandle aria-label={`Move ${task}`} />
                <span>{task}</span>
              </SortableItem>
            ))}
          </SortableContent>
          <SortableOverlay>{({ value }) => <div>{String(value)}</div>}</SortableOverlay>
        </Sortable>
        <output aria-label="Task order">{tasks.join(",")}</output>
      </section>
      <section aria-label="Panel demo">
        <ResizablePanelGroup id="split" autoSaveId="acceptance-split" style={{ height: 140 }}>
          <ResizablePanel id="first" defaultSize="40%" minSize="20%">
            <div>First panel</div>
          </ResizablePanel>
          <ResizableHandle aria-label="Resize panels" withHandle />
          <ResizablePanel id="second" defaultSize="60%" minSize="20%">
            <div>Second panel</div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </section>
    </RaxThemeProvider>
  )
}
