"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { inert, prefersReducedMotion } from "@/lib/app-shell-utils"
import { Button } from "@/components/ui/button"
import { ProgressCircle } from "@/components/ui/progress"
import { TruncatedText } from "@/components/ui/tooltip"

// -----------------------------------------------------------------------------
// FileUpload — a drop zone and the list of chosen files.
//
// Drop, click / Enter to browse, or paste (screenshots) while it's focused.
// Files are checked against `accept`, `maxSize`, `minSize`, `maxFiles` and an
// optional `validate`; rejected ones are listed with the reason.
// The value is File[] (react-hook-form friendly: {...field} just works); with
// `name`, a hidden <input type="file"> carries the files in plain form posts.
// Pass `upload(file, { signal, onProgress })` and each new file is uploaded
// (a few at a time) with progress, cancel and retry.
// -----------------------------------------------------------------------------

export type FileUploadStatus = "queued" | "uploading" | "success" | "error"

export interface FileUploadRejection {
  file: File
  reason: "type" | "too-large" | "too-small" | "too-many" | "custom"
  message: string
}

export interface FileUploadContext {
  /** Aborted when the user removes the file or the component unmounts. */
  signal: AbortSignal
  /** Report progress, 0–100. */
  onProgress: (percent: number) => void
}

const DEFAULT_LABELS = {
  title: "Drop files here or",
  titleSingle: "Drop a file here or",
  browse: "browse",
  compact: "Attach files",
  compactSingle: "Attach a file",
  dropNow: "Drop to add",
  dropReject: "This file type isn’t allowed",
  anyFile: "Any file",
  images: "Images",
  videos: "Videos",
  audio: "Audio",
  upTo: (size: string) => `up to ${size}`,
  maxFiles: (n: number) => `${n} files max`,
  remove: "Remove",
  removeAll: "Remove all",
  cancel: "Cancel upload",
  retry: "Retry",
  dismiss: "Dismiss",
  queued: "Waiting…",
  uploading: (percent: number) => `Uploading… ${percent}%`,
  success: "Uploaded",
  error: "Upload failed",
  rejectType: "File type not allowed",
  rejectLarge: (max: string) => `Larger than ${max}`,
  rejectSmall: (min: string) => `Smaller than ${min}`,
  rejectMany: (n: number) => (n === 1 ? "Only one file allowed" : `Only ${n} files allowed`),
  summary: (count: number, size: string) => `${count} ${count === 1 ? "file" : "files"} · ${size}`,
  added: (count: number) => `${count} ${count === 1 ? "file" : "files"} added`,
  removed: (name: string) => `${name} removed`,
  uploaded: (name: string) => `${name} uploaded`,
  failed: (name: string) => `${name} failed to upload`,
}
export type FileUploadLabels = typeof DEFAULT_LABELS

// ---- Helpers --------------------------------------------------------------------------

/** 1536 → "1.5 kB", localized (Arabic digits and units under "ar"). Binary multiples, like most uploaders. */
export function formatBytes(bytes: number, locale?: string) {
  const units = ["byte", "kilobyte", "megabyte", "gigabyte"] as const
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return new Intl.NumberFormat(locale, {
    style: "unit",
    unit: units[unit],
    unitDisplay: "short",
    maximumFractionDigits: unit === 0 || value >= 100 ? 0 : 1,
  }).format(value)
}

const parseAccept = (accept?: string) =>
  (accept ?? "")
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)

function matchesAccept(file: { name?: string; type: string }, tokens: string[]) {
  if (!tokens.length) return true
  const name = (file.name ?? "").toLowerCase()
  const type = file.type.toLowerCase()
  return tokens.some((t) => (t.startsWith(".") ? name.endsWith(t) : t.endsWith("/*") ? type.startsWith(t.slice(0, -1)) : type === t))
}

/** While dragging only MIME types are known (no names): reject only what certainly won't fit. */
function dragVerdict(items: DataTransferItemList, tokens: string[]): "accept" | "reject" {
  if (!tokens.length) return "accept"
  const hasExtensionRule = tokens.some((t) => t.startsWith("."))
  for (const item of Array.from(items)) {
    if (item.kind !== "file") continue
    if (!item.type) continue // unknown: decide on drop
    if (!matchesAccept({ type: item.type }, tokens) && !hasExtensionRule) return "reject"
  }
  return "accept"
}

// Intl.ListFormat (ES2021) isn't in this project's TS lib yet.
const ListFormat = (Intl as unknown as { ListFormat?: new (locale?: string, options?: object) => { format: (items: string[]) => string } })
  .ListFormat

function describeAccept(tokens: string[], labels: FileUploadLabels, locale?: string) {
  if (!tokens.length) return labels.anyFile
  const names = tokens.map((t) => {
    if (t === "image/*") return labels.images
    if (t === "video/*") return labels.videos
    if (t === "audio/*") return labels.audio
    if (t.startsWith(".")) return t.slice(1).toUpperCase()
    const sub = t.split("/")[1] ?? t
    return sub
      .replace(/^(x-|vnd\.)/, "")
      .split(/[.+-]/)[0]
      .toUpperCase()
  })
  const unique = Array.from(new Set(names))
  // "PDF, DOC" in English, "صور، وPDF" in Arabic.
  return ListFormat ? new ListFormat(locale, { type: "unit", style: "short" }).format(unique) : unique.join(", ")
}

const ids = new WeakMap<File, string>()
let nextId = 0
const fileId = (file: File) => {
  let id = ids.get(file)
  if (!id) ids.set(file, (id = `f${++nextId}`))
  return id
}
const sameFile = (a: File, b: File) => a.name === b.name && a.size === b.size && a.lastModified === b.lastModified

// ---- Icons ---------------------------------------------------------------------------

const Icon = ({ d, className }: { d: string; className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={className}
  >
    <path d={d} />
  </svg>
)
const FILE = "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5"
const ICONS = {
  upload: <Icon d="M12 13v8M8 17l4-4 4 4M20 16.6A5 5 0 0 0 18 7h-1.3A8 8 0 1 0 4 15.3" />,
  attach: <Icon d="m21.4 11.1-9.2 9.2a6 6 0 0 1-8.5-8.5l8.6-8.6a4 4 0 0 1 5.7 5.7l-8.6 8.6a2 2 0 0 1-2.8-2.8l8.5-8.5" />,
  close: <Icon d="M18 6 6 18M6 6l12 12" />,
  retry: <Icon d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" />,
  check: <Icon d="M20 6 9 17l-5-5" />,
  alert: <Icon d="M12 8v4M12 16h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z" />,
}
const KIND_ICONS = {
  image: (
    <Icon d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM9 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM21 15l-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
  ),
  video: (
    <Icon d="m16 13 5.2 3.5a.5.5 0 0 0 .8-.4V7.9a.5.5 0 0 0-.8-.4L16 11M4 6h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" />
  ),
  audio: <Icon d="M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />,
  pdf: <Icon d={`${FILE}M9 13h6M9 17h4`} />,
  doc: <Icon d={`${FILE}M9 9h1M9 13h6M9 17h6`} />,
  sheet: <Icon d={`${FILE}M8 13h8M8 17h8M12 11v8`} />,
  slides: <Icon d={`${FILE}M8 12h8v5H8z`} />,
  archive: <Icon d="M21 8v13H3V8M1 3h22v5H1zM10 12h4" />,
  code: <Icon d="m16 18 6-6-6-6M8 6l-6 6 6 6" />,
  file: <Icon d={FILE} />,
}
type FileKind = keyof typeof KIND_ICONS

function kindOf(file: File): FileKind {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
  const type = file.type
  if (type.startsWith("image/")) return "image"
  if (type.startsWith("video/")) return "video"
  if (type.startsWith("audio/")) return "audio"
  if (type === "application/pdf" || ext === "pdf") return "pdf"
  if (["xls", "xlsx", "csv", "numbers", "ods"].includes(ext)) return "sheet"
  if (["ppt", "pptx", "key", "odp"].includes(ext)) return "slides"
  if (["doc", "docx", "txt", "rtf", "pages", "md", "odt"].includes(ext)) return "doc"
  if (["zip", "rar", "7z", "tar", "gz", "tgz"].includes(ext)) return "archive"
  if (["js", "ts", "tsx", "jsx", "json", "html", "css", "scss", "py", "rb", "go", "java", "sh", "yml", "yaml", "xml", "sql"].includes(ext))
    return "code"
  return "file"
}

/** Object URL for an image preview, revoked when the item goes away. */
function usePreview(file: File) {
  const [url, setUrl] = React.useState<string>()
  React.useEffect(() => {
    if (!file.type.startsWith("image/")) return
    const next = URL.createObjectURL(file)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [file])
  return url
}

// ---- Item ---------------------------------------------------------------------------

interface Entry {
  status: FileUploadStatus
  progress: number
  error?: string
}

interface ItemProps {
  file: File
  entry?: Entry
  layout: "list" | "grid"
  leaving: boolean
  labels: FileUploadLabels
  locale?: string
  disabled?: boolean
  onRemove: () => void
  onRetry: () => void
  onExited: () => void
}

function FileItem({ file, entry, layout, leaving, labels, locale, disabled, onRemove, onRetry, onExited }: ItemProps) {
  const preview = usePreview(file)
  const [broken, setBroken] = React.useState(false) // e.g. HEIC: no preview in most browsers
  const kind = kindOf(file)
  const status = entry?.status
  const busy = status === "queued" || status === "uploading"
  const size = formatBytes(file.size, locale)
  const meta =
    status === "queued"
      ? labels.queued
      : status === "uploading"
        ? labels.uploading(Math.round(entry!.progress))
        : status === "success"
          ? labels.success
          : status === "error"
            ? entry?.error || labels.error
            : null

  const thumb =
    preview && !broken ? (
      <img src={preview} alt="" className="rax-queue-upload-thumb-img" onError={() => setBroken(true)} />
    ) : (
      <span className="rax-queue-upload-kind-icon">{KIND_ICONS[kind]}</span>
    )

  const actions = (
    <>
      {status === "error" && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="rax-queue-upload-action"
          aria-label={`${labels.retry}: ${file.name}`}
          onClick={onRetry}
          disabled={disabled}
        >
          {ICONS.retry}
        </Button>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="rax-queue-upload-action"
        aria-label={`${busy ? labels.cancel : labels.remove}: ${file.name}`}
        onClick={onRemove}
        disabled={disabled}
      >
        {ICONS.close}
      </Button>
    </>
  )

  return (
    <li
      className="rax-queue-upload-item"
      data-status={status}
      data-kind={kind}
      data-state={leaving ? "closed" : "open"}
      // Leaving items can't be focused or clicked (React 18 types don't know `inert` yet).
      {...inert(leaving)}
      onAnimationEnd={(event) => {
        if (leaving && event.target === event.currentTarget) onExited()
      }}
    >
      {/* inner clips while the item collapses away; the card carries the spacing */}
      <div className="rax-queue-upload-item-inner">
        <div className="rax-queue-upload-card">
          {layout === "grid" ? (
            <>
              <div className="rax-queue-upload-tile">
                {thumb}
                {status === "uploading" && (
                  <span className="rax-queue-upload-tile-overlay">
                    <ProgressCircle value={entry!.progress} size={44} thickness={4} aria-label={`${file.name}: ${meta}`} />
                  </span>
                )}
                {status === "queued" && <span className="rax-queue-upload-tile-overlay" aria-hidden="true" />}
                {status === "error" && (
                  <span className="rax-queue-upload-tile-overlay rax-queue-upload-tile-error">
                    <Button type="button" size="sm" variant="secondary" onClick={onRetry} disabled={disabled}>
                      {ICONS.retry}
                      {labels.retry}
                    </Button>
                  </span>
                )}
                {status === "success" && <span className="rax-queue-upload-tile-badge">{ICONS.check}</span>}
                <span className="rax-queue-upload-tile-remove">
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="secondary"
                    aria-label={`${busy ? labels.cancel : labels.remove}: ${file.name}`}
                    onClick={onRemove}
                    disabled={disabled}
                  >
                    {ICONS.close}
                  </Button>
                </span>
              </div>
              <TruncatedText className="rax-queue-upload-name">{file.name}</TruncatedText>
              <span className="rax-queue-upload-meta" data-error={status === "error" || undefined}>
                {status === "error" ? meta : size}
              </span>
            </>
          ) : (
            <>
              <span className="rax-queue-upload-thumb">{thumb}</span>
              <div className="rax-queue-upload-body">
                <TruncatedText className="rax-queue-upload-name">{file.name}</TruncatedText>
                <span className="rax-queue-upload-meta" data-error={status === "error" || undefined}>
                  {status === "error" && ICONS.alert}
                  {status === "success" && <span className="rax-queue-upload-done">{ICONS.check}</span>}
                  <span dir="auto">{status === "error" ? meta : meta ? `${size} · ${meta}` : size}</span>
                </span>
                {busy && (
                  <span
                    className="rax-queue-upload-bar"
                    role="progressbar"
                    aria-label={file.name}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={status === "uploading" ? Math.round(entry!.progress) : undefined}
                    data-indeterminate={status === "queued" || undefined}
                  >
                    <span style={{ width: `${status === "uploading" ? entry!.progress : 0}%` }} />
                  </span>
                )}
              </div>
              <div className="rax-queue-upload-actions">{actions}</div>
            </>
          )}
        </div>
      </div>
    </li>
  )
}

// ---- FileUpload ------------------------------------------------------------------------

export interface QueuedFileUploadProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue" | "onBlur" | "title"> {
  value?: File[]
  defaultValue?: File[]
  onValueChange?: (files: File[]) => void
  /** Same as onValueChange — lets react-hook-form's {...field} plug straight in. */
  onChange?: (files: File[]) => void
  onBlur?: () => void
  /** Like <input accept>: "image/*,.pdf,application/zip". */
  accept?: string
  /** Default true. With false, a new file replaces the current one. */
  multiple?: boolean
  maxFiles?: number
  /** Bytes. */
  maxSize?: number
  minSize?: number
  /** Extra check: return an error message to reject the file. */
  validate?: (file: File, files: File[]) => string | null | undefined
  onReject?: (rejections: FileUploadRejection[]) => void
  /** Upload each added file; resolve when done, throw to fail (message shown). */
  upload?: (file: File, context: FileUploadContext) => Promise<unknown>
  /** Uploads running at once. Default 3. */
  concurrency?: number
  onUploaded?: (file: File, result: unknown) => void
  onUploadError?: (file: File, error: unknown) => void
  /** `dropzone` (default) big target · `compact` one row, for forms and composers. */
  variant?: "dropzone" | "compact"
  /** `list` (default) rows · `grid` thumbnails, for photos. */
  layout?: "list" | "grid"
  /** Replace the zone's main line. */
  title?: React.ReactNode
  /** Replace the generated "PNG, PDF · up to 10 MB" line. */
  hint?: React.ReactNode
  icon?: React.ReactNode
  disabled?: boolean
  invalid?: boolean
  /** Adds a hidden file input with this name, for plain form posts. */
  name?: string
  /** For sizes and numbers, e.g. "ar". */
  locale?: string
  labels?: Partial<FileUploadLabels>
  "aria-invalid"?: boolean | "true" | "false"
  "aria-required"?: boolean | "true" | "false"
}

/** `ref` is the drop zone (focusable), so form libraries can focus it on errors. */
const QueuedFileUpload = React.forwardRef<HTMLDivElement, QueuedFileUploadProps>(
  (
    {
      value,
      defaultValue,
      onValueChange,
      onChange,
      onBlur,
      accept,
      multiple = true,
      maxFiles,
      maxSize,
      minSize,
      validate,
      onReject,
      upload,
      concurrency = 3,
      onUploaded,
      onUploadError,
      variant = "dropzone",
      layout = "list",
      title,
      hint,
      icon,
      disabled = false,
      invalid,
      name,
      locale,
      labels: labelsProp,
      id,
      className,
      "aria-label": ariaLabel,
      "aria-labelledby": ariaLabelledBy,
      "aria-describedby": ariaDescribedBy,
      "aria-invalid": ariaInvalid,
      // Not allowed on the zone's role="button"; mark the field required in its label instead.
      "aria-required": _ariaRequired,
      ...props
    },
    ref,
  ) => {
    const mounted = React.useRef(true)
    const labels = React.useMemo(() => ({ ...DEFAULT_LABELS, ...labelsProp }), [labelsProp])
    const tokens = React.useMemo(() => parseAccept(accept), [accept])
    const autoId = React.useId()
    const hintId = `${autoId}-hint`
    const pickerRef = React.useRef<HTMLInputElement>(null)
    const formInputRef = React.useRef<HTMLInputElement>(null)

    // ---- Files (controlled or not) ----
    const [uncontrolled, setUncontrolled] = React.useState<File[]>(defaultValue ?? [])
    const files = value ?? uncontrolled
    const filesRef = React.useRef(files)
    filesRef.current = files
    const setFiles = (next: File[]) => {
      filesRef.current = next // uploads read it before React re-renders
      if (value === undefined) setUncontrolled(next)
      onValueChange?.(next)
      onChange?.(next)
    }

    // ---- Upload state, outside React state so async callbacks always see the latest ----
    const entries = React.useRef<Record<string, Entry>>({})
    const controllers = React.useRef(new Map<string, AbortController>())
    const [, rerender] = React.useReducer((n: number) => n + 1, 0)
    const setEntry = (file: File, patch: Partial<Entry> | null) => {
      const id = fileId(file)
      if (patch === null) delete entries.current[id]
      else {
        const base: Entry = entries.current[id] ?? { status: "queued", progress: 0 }
        entries.current = { ...entries.current, [id]: { ...base, ...patch } }
      }
      rerender()
    }
    const latest = React.useRef({ upload, onUploaded, onUploadError, concurrency, labels })
    latest.current = { upload, onUploaded, onUploadError, concurrency, labels }

    const [announcement, setAnnouncement] = React.useState("")
    const [rejections, setRejections] = React.useState<FileUploadRejection[]>([])
    const [exiting, setExiting] = React.useState<{ file: File; index: number }[]>([])
    const [drag, setDrag] = React.useState<"accept" | "reject" | null>(null)
    const [pageDrag, setPageDrag] = React.useState(false)

    const pump = () => {
      const { upload, concurrency } = latest.current
      if (!upload || !mounted.current) return
      let slots = Math.max(1, Math.floor(Number.isFinite(concurrency) ? concurrency : 3)) - Object.values(entries.current).filter((e) => e.status === "uploading").length
      for (const file of filesRef.current) {
        if (slots <= 0) break
        if (entries.current[fileId(file)]?.status !== "queued") continue
        slots--
        start(file)
      }
    }

    const start = (file: File) => {
      const { upload, labels } = latest.current
      const controller = new AbortController()
      const id = fileId(file)
      controllers.current.set(id, controller)
      setEntry(file, { status: "uploading", progress: 0, error: undefined })
      let shown = 0
      Promise.resolve().then(() => {
        if (controller.signal.aborted) throw new DOMException("Upload cancelled", "AbortError")
        return upload!(file, {
          signal: controller.signal,
          onProgress: (percent) => {
            if (!Number.isFinite(percent)) return
            const p = Math.max(0, Math.min(100, percent))
            if (controller.signal.aborted || (p - shown < 1 && p !== 100)) return // ≥1% steps: fewer renders
            shown = p
            setEntry(file, { progress: p })
          },
        })
      })
        .then((result) => {
          if (controller.signal.aborted) return
          setEntry(file, { status: "success", progress: 100 })
          setAnnouncement(labels.uploaded(file.name))
          latest.current.onUploaded?.(file, result)
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return
          const message = error instanceof Error && error.message ? error.message : labels.error
          setEntry(file, { status: "error", error: message })
          setAnnouncement(labels.failed(file.name))
          latest.current.onUploadError?.(file, error)
        })
        .finally(() => {
          if (controllers.current.get(id) === controller) controllers.current.delete(id)
          pump()
        })
    }

    const stop = (file: File) => {
      const id = fileId(file)
      controllers.current.get(id)?.abort()
      controllers.current.delete(id)
      setEntry(file, null)
    }

    // Files dropped from the value by the parent: stop their uploads.
    React.useEffect(() => {
      const present = new Set(files.map(fileId))
      for (const id of Object.keys(entries.current)) {
        if (present.has(id)) continue
        controllers.current.get(id)?.abort()
        controllers.current.delete(id)
        delete entries.current[id]
      }
      pump()
    }, [files])

    React.useEffect(
      () => {
        mounted.current = true
        return () => {
          mounted.current = false
          controllers.current.forEach((c) => c.abort())
          controllers.current.clear()
        }
      },
      [],
    )

    // Keep the hidden form input's FileList in step with the value.
    React.useEffect(() => {
      const input = formInputRef.current
      if (!input || typeof DataTransfer === "undefined") return
      try {
        const transfer = new DataTransfer()
        files.forEach((f) => transfer.items.add(f))
        input.files = transfer.files
      } catch {
        // Very old browsers can't build a FileList: the form post just won't include files.
      }
    }, [files])

    // ---- Adding ----
    const addFiles = (incoming: File[]) => {
      if (disabled || !incoming.length) return
      const current = filesRef.current
      const accepted: File[] = []
      const rejected: FileUploadRejection[] = []
      const size = (n: number) => formatBytes(n, locale)

      for (const file of incoming) {
        if (!matchesAccept(file, tokens)) rejected.push({ file, reason: "type", message: labels.rejectType })
        else if (maxSize !== undefined && file.size > maxSize)
          rejected.push({ file, reason: "too-large", message: labels.rejectLarge(size(maxSize)) })
        else if (minSize !== undefined && file.size < minSize)
          rejected.push({ file, reason: "too-small", message: labels.rejectSmall(size(minSize)) })
        else {
          const custom = validate?.(file, current)
          if (custom) rejected.push({ file, reason: "custom", message: custom })
          else if (!current.some((f) => sameFile(f, file)) && !accepted.some((f) => sameFile(f, file))) accepted.push(file)
        }
      }

      let next = current
      if (!multiple) {
        // Single: the first good file replaces the current one.
        accepted.slice(1).forEach((file) => rejected.push({ file, reason: "too-many", message: labels.rejectMany(1) }))
        accepted.splice(1)
        if (accepted.length) {
          current.forEach(stop)
          next = accepted
        }
      } else {
        const room = maxFiles === undefined ? Infinity : Math.max(0, maxFiles - current.length)
        accepted.splice(room).forEach((file) => rejected.push({ file, reason: "too-many", message: labels.rejectMany(maxFiles!) }))
        next = [...current, ...accepted]
      }

      setRejections(rejected)
      if (rejected.length) onReject?.(rejected)
      if (!accepted.length) return
      setFiles(next)
      setAnnouncement(labels.added(accepted.length))
      if (latest.current.upload) {
        accepted.forEach((file) => setEntry(file, { status: "queued", progress: 0 }))
        pump()
      }
    }

    const remove = (file: File) => {
      const index = filesRef.current.indexOf(file)
      stop(file)
      setFiles(filesRef.current.filter((f) => f !== file))
      pump()
      setAnnouncement(labels.removed(file.name))
      if (index >= 0 && !prefersReducedMotion()) setExiting((all) => [...all, { file, index }])
    }

    const removeAll = () => {
      const all = filesRef.current
      all.forEach(stop)
      setFiles([])
      if (!prefersReducedMotion()) setExiting((prev) => [...prev, ...all.map((file, index) => ({ file, index }))])
    }

    const retry = (file: File) => {
      setEntry(file, { status: "queued", progress: 0, error: undefined })
      pump()
    }

    const openPicker = () => {
      if (disabled) return
      const input = pickerRef.current
      if (!input) return
      input.value = "" // picking the same file again still fires change
      input.click()
    }

    // ---- Page-wide drag: hint where files can go ----
    React.useEffect(() => {
      if (disabled) return
      let depth = 0
      const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files")
      const enter = (e: DragEvent) => {
        if (!hasFiles(e)) return
        depth++
        setPageDrag(true)
      }
      const leave = (e: DragEvent) => {
        if (!hasFiles(e)) return
        depth = Math.max(0, depth - 1)
        if (!depth) setPageDrag(false)
      }
      const end = () => {
        depth = 0
        setPageDrag(false)
      }
      window.addEventListener("dragenter", enter)
      window.addEventListener("dragleave", leave)
      window.addEventListener("drop", end)
      window.addEventListener("dragend", end)
      return () => {
        window.removeEventListener("dragenter", enter)
        window.removeEventListener("dragleave", leave)
        window.removeEventListener("drop", end)
        window.removeEventListener("dragend", end)
      }
    }, [disabled])

    // ---- Rendering ----
    const isInvalid = invalid || ariaInvalid === true || ariaInvalid === "true"
    const autoHint = [
      describeAccept(tokens, labels, locale),
      maxSize !== undefined && labels.upTo(formatBytes(maxSize, locale)),
      maxFiles !== undefined && multiple && labels.maxFiles(maxFiles),
    ]
      .filter(Boolean)
      .join(" · ")

    const display = files.map((file) => ({ file, leaving: false }))
    for (const ghost of [...exiting].sort((a, b) => a.index - b.index)) {
      display.splice(Math.min(ghost.index, display.length), 0, { file: ghost.file, leaving: true })
    }
    const totalSize = files.reduce((sum, f) => sum + f.size, 0)

    const zoneTitle =
      drag === "reject" ? (
        labels.dropReject
      ) : drag === "accept" ? (
        labels.dropNow
      ) : title ? (
        title
      ) : variant === "compact" ? (
        multiple ? (
          labels.compact
        ) : (
          labels.compactSingle
        )
      ) : (
        <>
          {multiple ? labels.title : labels.titleSingle} <span className="rax-queue-upload-browse">{labels.browse}</span>
        </>
      )

    return (
      <div
        className={cn("rax-queue-upload", className)}
        data-variant={variant}
        data-layout={layout}
        data-disabled={disabled || undefined}
        {...props}
      >
        <div
          ref={ref}
          role="button"
          tabIndex={disabled ? -1 : 0}
          className="rax-queue-upload-zone"
          data-drag={drag ?? undefined}
          data-page-drag={(pageDrag && !drag) || undefined}
          data-invalid={isInvalid || undefined}
          aria-disabled={disabled || undefined}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          aria-describedby={[hintId, ariaDescribedBy].filter(Boolean).join(" ")}
          aria-invalid={isInvalid || undefined}
          onClick={openPicker}
          onKeyDown={(event) => {
            if (event.target !== event.currentTarget) return
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault()
              openPicker()
            }
          }}
          onBlur={onBlur}
          onPaste={(event) => {
            const pasted = Array.from(event.clipboardData.files)
            if (!pasted.length) return
            event.preventDefault()
            addFiles(pasted)
          }}
          onDragEnter={(event) => {
            if (disabled || !Array.from(event.dataTransfer.types).includes("Files")) return
            event.preventDefault()
            setDrag(dragVerdict(event.dataTransfer.items, tokens))
          }}
          onDragOver={(event) => {
            if (disabled || !Array.from(event.dataTransfer.types).includes("Files")) return
            event.preventDefault()
            event.dataTransfer.dropEffect = drag === "reject" ? "none" : "copy"
          }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDrag(null)
          }}
          onDrop={(event) => {
            if (disabled) return
            event.preventDefault()
            setDrag(null)
            setPageDrag(false)
            addFiles(Array.from(event.dataTransfer.files))
          }}
        >
          <span className="rax-queue-upload-zone-icon">{icon ?? (variant === "compact" ? ICONS.attach : ICONS.upload)}</span>
          <span className="rax-queue-upload-zone-text">
            <span className="rax-queue-upload-zone-title">{zoneTitle}</span>
            <span className="rax-queue-upload-zone-hint" id={hintId}>
              {hint ?? autoHint}
            </span>
          </span>
        </div>
        {/* Outside the zone: a focusable control inside role="button" is nested interaction. */}
        <input
          ref={pickerRef}
          id={id}
          type="file"
          className="rax-queue-upload-input"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => addFiles(Array.from(event.currentTarget.files ?? []))}
        />

        {name !== undefined && (
          <input ref={formInputRef} type="file" name={name} multiple={multiple} hidden aria-hidden="true" tabIndex={-1} />
        )}

        {rejections.length > 0 && (
          <div className="rax-queue-upload-rejections" role="alert">
            <ul>
              {rejections.map(({ file, message }, i) => (
                <li key={`${fileId(file)}-${i}`}>
                  {ICONS.alert}
                  <span className="rax-queue-upload-rejection-name" dir="auto">
                    {file.name}
                  </span>
                  <span className="rax-queue-upload-rejection-reason">{message}</span>
                </li>
              ))}
            </ul>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="rax-queue-upload-action"
              aria-label={labels.dismiss}
              onClick={() => setRejections([])}
            >
              {ICONS.close}
            </Button>
          </div>
        )}

        {display.length > 0 && (
          <div className="rax-queue-upload-files">
            {files.length > 1 && (
              <div className="rax-queue-upload-summary">
                <span>{labels.summary(files.length, formatBytes(totalSize, locale))}</span>
                <Button type="button" variant="link" size="sm" onClick={removeAll} disabled={disabled}>
                  {labels.removeAll}
                </Button>
              </div>
            )}
            <ul className="rax-queue-upload-list">
              {display.map(({ file, leaving }) => (
                <FileItem
                  key={fileId(file)}
                  file={file}
                  entry={entries.current[fileId(file)]}
                  layout={layout}
                  leaving={leaving}
                  labels={labels}
                  locale={locale}
                  disabled={disabled}
                  onRemove={() => remove(file)}
                  onRetry={() => retry(file)}
                  onExited={() => setExiting((all) => all.filter((g) => g.file !== file))}
                />
              ))}
            </ul>
          </div>
        )}

        <span className="visually-hidden" aria-live="polite">
          {announcement}
        </span>
      </div>
    )
  },
)
QueuedFileUpload.displayName = "QueuedFileUpload"

export { QueuedFileUpload }
