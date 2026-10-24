"use client"

import * as React from "react"
import { useFieldControlProps } from "@/components/ui/field"
import { useSheenTheme, sheenThemeAttributes, type SheenAppearance } from "@/lib/theme"
import { cn } from "@/lib/utils"

export interface FileUploadProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "defaultValue" | "onChange" | "onError" | "size"> {
  appearance?: SheenAppearance
  value?: File[]
  defaultValue?: File[]
  onChange?: (files: File[]) => void
  maxSize?: number
  maxFiles?: number
  /** Application-owned upload progress, from 0 to 100. */
  progress?: (file: File) => number | undefined
  label?: string
  removeLabel?: string
  typeMessage?: string
  sizeMessage?: string
  countMessage?: string
  onError?: (message: string) => void
}

function accepts(file: File, accept?: string) {
  return !accept || accept.split(",").some(raw => {
    const rule = raw.trim().toLowerCase()
    if (!rule) return false
    if (rule.startsWith(".")) return file.name.toLowerCase().endsWith(rule)
    return rule.endsWith("/*") ? file.type.toLowerCase().startsWith(rule.slice(0, -1)) : file.type.toLowerCase() === rule
  })
}

const FileUpload = React.forwardRef<HTMLInputElement, FileUploadProps>(({
  value, defaultValue = [], onChange, maxSize = 10 * 1024 * 1024, maxFiles = 1, progress,
  label = "Choose files or drop them here", removeLabel = "Remove", typeMessage = "This file type is not allowed.",
  sizeMessage = "This file is too large.", countMessage = "Too many files selected.", onError,
  appearance, className, accept, multiple, ...props
}, ref) => {
  const wired = useFieldControlProps(props)
  const auto = React.useId(), id = wired.id ?? auto
  const theme = useSheenTheme({ appearance })
  const input = React.useRef<HTMLInputElement | null>(null)
  const [internal, setInternal] = React.useState(defaultValue)
  const files = value ?? internal
  const [error, setError] = React.useState("")
  const [dragging, setDragging] = React.useState(false)
  const change = (next: File[]) => { if (value === undefined) setInternal(next); onChange?.(next) }
  const select = (next: File[]) => {
    if (wired.disabled) return
    const message = next.length > (multiple === false ? 1 : maxFiles) ? countMessage
      : next.some(f => !accepts(f, accept)) ? typeMessage : next.some(f => f.size > maxSize) ? sizeMessage : ""
    setError(message)
    if (message) { if (input.current) input.current.value = ""; change([]); onError?.(message); return }
    change(next)
  }
  // Native posts match the current controlled list, including removals and drops.
  React.useEffect(() => {
    const el = input.current
    if (!el) return
    if (files.length === 0) { el.value = ""; return }
    if (typeof DataTransfer !== "undefined") {
      const data = new DataTransfer(); files.forEach(file => data.items.add(file)); el.files = data.files
    }
  }, [files])
  return <div {...sheenThemeAttributes(theme)} className={cn("sheen-file-upload", className)}>
    <label className="sheen-upload-zone" data-dragging={dragging || undefined} data-disabled={wired.disabled || undefined}
      onDragEnter={e => { e.preventDefault(); if (!wired.disabled) setDragging(true) }}
      onDragOver={e => e.preventDefault()} onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false) }}
      onDrop={e => { e.preventDefault(); setDragging(false); select(Array.from(e.dataTransfer.files)) }}>
      <input {...wired} id={id} type="file" accept={accept} multiple={multiple ?? maxFiles > 1} className="sheen-upload-input"
        aria-invalid={error ? true : wired["aria-invalid"]}
        aria-describedby={[wired["aria-describedby"], error ? `${id}-upload-error` : undefined].filter(Boolean).join(" ") || undefined}
        ref={node => { input.current = node; if (typeof ref === "function") ref(node); else if (ref) ref.current = node }}
        onChange={e => select(Array.from(e.currentTarget.files ?? []))} />
      {/* Built-in icon paths from Lucide (ISC). */}
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
      <span>{label}</span>
    </label>
    {error && <p id={`${id}-upload-error`} role="alert" className="sheen-field-error">{error}</p>}
    <ul className="sheen-upload-list">{files.map((file, i) => {
      const raw = progress?.(file), percent = raw === undefined ? undefined : Math.max(0, Math.min(100, Number.isFinite(raw) ? raw : 0))
      return <li key={`${file.name}-${file.lastModified}-${i}`} className="sheen-upload-file">
        <span>{file.name}</span>
        <button type="button" disabled={wired.disabled} title={`${removeLabel} ${file.name}`} aria-label={`${removeLabel} ${file.name}`}
          onClick={() => change(files.filter((_, index) => index !== i))}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg></button>
        {percent !== undefined && <div className="progress" role="progressbar" aria-label={file.name} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
          <div className="progress-bar" style={{ width: `${percent}%` }} />
        </div>}
      </li>
    })}</ul>
  </div>
})
FileUpload.displayName = "FileUpload"
export { FileUpload }
