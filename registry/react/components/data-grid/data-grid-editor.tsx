"use client"

import { type Column, type Row } from "@tanstack/react-table"
import { DateInput } from "@/components/ui/date-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { DataGridProps } from "./data-grid-types"
import type { DataGridEditing } from "./use-data-grid-editing"

export function DataGridEditor<TData>({
  row,
  column,
  controller,
  labels,
}: {
  row: Row<TData>
  column: Column<TData, unknown>
  controller: DataGridEditing<TData>
  labels: DataGridProps<TData>["labels"]
}) {
  const { editing, draft, editError, setDraft, setEditError, setEditing, validationError, commitValue } = controller
  const editor = column.columnDef.meta?.editor
  if (!editor) return null
  const common = {
    "aria-label":
      labels?.cell?.(column.columnDef.meta?.label ?? column.id, row.index + 1) ??
      `${column.columnDef.meta?.label ?? column.id}, row ${row.index + 1}`,
    "aria-invalid": editError ? true : undefined,
  }
  switch (editor.type) {
    case "select":
      return (
        <Select
          defaultOpen
          value={String(draft ?? "")}
          onValueChange={(v) => {
            setDraft(v)
            const error = commitValue(row, column, v)
            if (error) setEditError(error)
            else setEditing(null)
          }}
          onOpenChange={(open) => {
            if (!open)
              setTimeout(() => {
                if (!validationError.current) setEditing(null)
              }, 0)
          }}
        >
          <SelectTrigger size="sm" className="rax-grid-editor" {...common}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {editError && (
              <div role="alert" className="text-danger small p-2">
                {editError}
              </div>
            )}
            {editor.options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    case "date":
      return (
        <div className="rax-grid-editor rax-grid-editor-date">
          <DateInput
            {...common}
            size="sm"
            picker={false}
            locale={editor.locale}
            value={(draft as Date | null) ?? null}
            onChange={setDraft}
            ref={(node) => {
              // Focus the first segment once the editor mounts.
              if (node && !node.contains(document.activeElement)) requestAnimationFrame(() => node.focus())
            }}
          />
        </div>
      )
    default:
      return (
        <input
          {...common}
          autoFocus
          className="rax-grid-editor rax-grid-editor-input"
          inputMode={editor.type === "number" ? "decimal" : undefined}
          value={String(draft ?? "")}
          onChange={(e) => {
            setDraft(e.target.value)
            setEditError(undefined)
          }}
          onFocus={(e) => {
            // Opened with Enter / F2: select all. Opened by typing: caret after the character.
            if (editing?.seed === undefined) e.currentTarget.select()
            else e.currentTarget.setSelectionRange(e.currentTarget.value.length, e.currentTarget.value.length)
          }}
        />
      )
  }
}
