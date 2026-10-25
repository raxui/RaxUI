"use client"

// Built-in SVG paths from Lucide, licensed under ISC.
import * as React from "react"

import { useSheenTheme, sheenThemeAttributes, type SheenAppearance } from "@/lib/theme"
import { useFieldControlProps } from "@/components/ui/field"
import { cn } from "@/lib/utils"
import { getDirection } from "@/lib/direction"
import { assignRef } from "@/lib/refs"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandLoading } from "@/components/ui/command"
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

// -----------------------------------------------------------------------------
// Combobox — a field-styled button that opens a searchable list (Popover +
// Command). Single or multiple selection (chips), groups,
// descriptions and icons, create-from-search, and async results.
// -----------------------------------------------------------------------------

export interface ComboboxOption {
  value: string
  label: string
  description?: string
  icon?: React.ReactNode
  /** Options with the same group are listed under one heading. */
  group?: string
  /** Extra words to match (aliases, codes). */
  keywords?: string[]
  disabled?: boolean
}

interface ComboboxBaseProps {
  appearance?: SheenAppearance
  /** Compatibility alias for emptyText. */
  emptyMessage?: string
  /** Compatibility callback; new code should use onValueChange. */
  onChange?: (value: string) => void
  clearLabel?: string
  removeLabel?: (label: string) => string
  createLabel?: (label: string) => React.ReactNode
  selectedText?: string
  onKeyDown?: React.KeyboardEventHandler<HTMLButtonElement>
  options: ComboboxOption[]
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: React.ReactNode
  /** Show "Create “…”" when the search has no exact match. */
  onCreate?: (label: string) => ComboboxOption | void
  /** Async: called as the user types. Turns off built-in filtering. */
  onSearchChange?: (search: string) => void
  loading?: boolean
  disabled?: boolean
  invalid?: boolean
  size?: "sm" | "default" | "lg"
  variant?: "glass" | "filled"
  /** Clear button when something is selected. */
  clearable?: boolean
  id?: string
  className?: string
  /** Submitted as one hidden input per selected value. */
  name?: string
  "aria-label"?: string
  "aria-labelledby"?: string
  "aria-describedby"?: string
  "aria-invalid"?: boolean | "true" | "false"
  "aria-required"?: boolean | "true" | "false"
  dir?: "ltr" | "rtl"
  /** Fires once the field is really left (not when focus moves into the list). Form libraries use it for "touched". */
  onBlur?: () => void
}

export interface ComboboxSingleProps extends ComboboxBaseProps {
  multiple?: false
  value?: string | null
  defaultValue?: string | null
  onValueChange?: (value: string | null) => void
}

export interface ComboboxMultipleProps extends ComboboxBaseProps {
  multiple: true
  value?: string[]
  defaultValue?: string[]
  onValueChange?: (value: string[]) => void
  /** Show at most this many chips, then "+N". */
  maxChips?: number
}

export type ComboboxProps = ComboboxSingleProps | ComboboxMultipleProps

const ChevronsIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="m7 15 5 5 5-5M7 9l5-5 5 5" />
  </svg>
)
const CheckIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M5 12.5 10 17 19 7" />
  </svg>
)
const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" aria-hidden="true">
    <path d="M12 5v14M5 12h14" />
  </svg>
)
const XIcon = ({ strokeWidth = 3 }: { strokeWidth?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" aria-hidden="true">
    <path d="M7 7l10 10M17 7 7 17" />
  </svg>
)

const Combobox = React.forwardRef<HTMLButtonElement, ComboboxProps>(function Combobox(props, forwardedRef) {
  props = useFieldControlProps(props as unknown as Record<string, unknown>) as unknown as ComboboxProps
  const {
    appearance,
    emptyMessage,
    clearLabel = "Clear selection",
    removeLabel = (label: string) => `Remove ${label}`,
    createLabel = (label: string) => <>Create “<strong>{label}</strong>”</>,
    selectedText = "selected",
    onKeyDown,
    options,
    placeholder = props.multiple ? "Select…" : "Select an option",
    searchPlaceholder = "Search options",
    emptyText = emptyMessage ?? "No results.",
    onCreate,
    onSearchChange,
    loading,
    disabled,
    invalid,
    size = "default",
    variant = "glass",
    clearable = false,
    id,
    className,
    name,
    dir,
    onBlur,
    ...aria
  } = props
  const theme = useSheenTheme({ appearance, direction: dir })
  const ariaProps = {
    "aria-label": aria["aria-label"],
    "aria-labelledby": aria["aria-labelledby"],
    "aria-describedby": aria["aria-describedby"],
    "aria-required": aria["aria-required"],
  }
  // `invalid` or aria-invalid (e.g. injected by FieldControl).
  const isInvalid = !!invalid || aria["aria-invalid"] === true || aria["aria-invalid"] === "true"

  // ---- Value (single or multiple, controlled or not), always handled as an array.
  const [uncontrolled, setUncontrolled] = React.useState<string[]>(() =>
    props.multiple ? (props.defaultValue ?? []) : props.defaultValue ? [props.defaultValue] : [],
  )
  const selected: string[] = props.value === undefined ? uncontrolled : props.multiple ? props.value : props.value ? [props.value] : []

  const setSelected = (next: string[]) => {
    if (props.value === undefined) setUncontrolled(next)
    if (props.multiple) props.onValueChange?.(next)
    else { props.onValueChange?.(next[0] ?? null); props.onChange?.(next[0] ?? "") }
  }

  // Remember options we've seen, so chips keep their labels when async results change.
  const known = React.useRef(new Map<string, ComboboxOption>())
  for (const option of options) known.current.set(option.value, option)
  const optionFor = (value: string) => known.current.get(value) ?? { value, label: value }

  const baseId = React.useId()
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const triggerRef = React.useRef<HTMLButtonElement | null>(null)
  const [popoverDir, setPopoverDir] = React.useState<"ltr" | "rtl" | undefined>(dir)

  const changeSearch = (next: string) => {
    setSearch(next)
    onSearchChange?.(next)
  }

  const toggle = (value: string) => {
    if (props.multiple) {
      setSelected(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value])
      changeSearch("")
    } else {
      setSelected(selected[0] === value ? [] : [value])
      setOpen(false)
    }
  }

  const create = () => {
    const label = search.trim()
    const created = onCreate?.(label) ?? { value: label, label }
    known.current.set(created.value, created)
    if (props.multiple) {
      setSelected([...selected, created.value])
      changeSearch("")
    } else {
      setSelected([created.value])
      setOpen(false)
    }
  }

  const exactMatch = options.some((o) => o.label.toLocaleLowerCase() === search.trim().toLocaleLowerCase())
  const canCreate = !!onCreate && search.trim() !== "" && !exactMatch && !loading

  // Group options, keeping first-seen group order.
  const groups = React.useMemo(() => {
    const map = new Map<string, ComboboxOption[]>()
    for (const option of options) {
      const key = option.group ?? ""
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(option)
    }
    return [...map]
  }, [options])

  // ---- Trigger contents ---------------------------------------------------------
  const maxChips = props.multiple ? (props.maxChips ?? Infinity) : 0
  const single = !props.multiple && selected[0] ? optionFor(selected[0]) : null

  const chips = props.multiple && selected.length > 0 && (
    <>
      {selected.slice(0, maxChips).map((value) => {
        const option = optionFor(value)
        return (
          <span key={value} className="sheen-rich-combobox-chip">
            {option.icon}
            <span className="sheen-rich-combobox-chip-label">{option.label}</span>
            {!disabled && (
              <button
                type="button"
                className="sheen-rich-combobox-chip-remove"
                aria-label={removeLabel(option.label)}
                onClick={(event) => {
                  event.stopPropagation()
                  setSelected(selected.filter((v) => v !== value))
                  triggerRef.current?.focus()
                }}
              >
                <XIcon />
              </button>
            )}
          </span>
        )
      })}
      {selected.length > maxChips && <span className="sheen-rich-combobox-more">+{selected.length - maxChips}</span>}
    </>
  )

  return (
    <Popover
      appearance={appearance}
      dir={dir}
      open={open}
      onOpenChange={(next) => {
        if (next && triggerRef.current) setPopoverDir(dir ?? getDirection(triggerRef.current))
        if (!next) {
          changeSearch("")
          onBlur?.()
        }
        setOpen(next)
      }}
    >
      <PopoverAnchor asChild>
        <div
          {...sheenThemeAttributes(theme)}
          className={cn("sheen-input-group sheen-rich-combobox", className)}
          data-size={size}
          data-multiple={props.multiple || undefined}
          data-disabled={disabled || undefined}
          data-state={open ? "open" : "closed"}
          dir={dir}
          // Clicking the field around the chips opens the list too.
          onPointerDown={(event) => {
            if (disabled || (event.target as HTMLElement).closest("button")) return
            event.preventDefault()
            triggerRef.current?.focus()
            setOpen(true)
          }}
        >
          <div className="sheen-input sheen-rich-combobox-value" data-variant={variant} aria-invalid={isInvalid || undefined}>
            {chips}
            <PopoverTrigger asChild>
              <button
                ref={(node) => {
                  triggerRef.current = node
                  assignRef(forwardedRef, node)
                }}
                onBlur={() => {
                  if (!open) onBlur?.()
                }}
                id={id}
                type="button"
                role="combobox"
                aria-controls={open ? `${id ?? baseId}-list` : undefined}
                aria-expanded={open}
                aria-haspopup="listbox"
                aria-invalid={isInvalid || undefined}
                disabled={disabled}
                className="sheen-rich-combobox-trigger"
                data-placeholder={(props.multiple ? selected.length === 0 : !single) || undefined}
                onKeyDown={(event) => {
                  onKeyDown?.(event)
                  if (event.defaultPrevented || event.nativeEvent.isComposing) return
                  if (!open && ["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) { event.preventDefault(); setOpen(true); return }
                  // Backspace on an empty multi trigger removes the last chip.
                  if (props.multiple && event.key === "Backspace" && selected.length) setSelected(selected.slice(0, -1))
                  // Typing opens the list with that text as the search.
                  if (!open && event.key.length === 1 && !event.metaKey && !event.ctrlKey && event.key !== " ") {
                    event.preventDefault()
                    changeSearch(event.key)
                    setOpen(true)
                  }
                }}
                {...ariaProps}
              >
                {single ? (
                  <span className="sheen-rich-combobox-single">
                    {single.icon}
                    <span className="sheen-rich-combobox-single-label">{single.label}</span>
                  </span>
                ) : props.multiple && selected.length ? (
                  <span className="visually-hidden">{selected.map((v) => optionFor(v).label).join(", ")}</span>
                ) : (
                  <span className="sheen-rich-combobox-placeholder">{placeholder}</span>
                )}
              </button>
            </PopoverTrigger>
          </div>
          <span className="sheen-input-slot" data-side="end">
            {clearable && selected.length > 0 && !disabled && (
              <button
                type="button"
                className="sheen-input-clear"
                aria-label={clearLabel}
                onClick={() => {
                  setSelected([])
                  triggerRef.current?.focus()
                }}
              >
                <XIcon strokeWidth={4} />
              </button>
            )}
            <span className="sheen-rich-combobox-chevron" aria-hidden="true">
              <ChevronsIcon />
            </span>
          </span>
          {name && selected.map((value) => <input key={value} type="hidden" name={name} value={value} disabled={disabled} />)}
        </div>
      </PopoverAnchor>

      <PopoverContent
        align="start"
        className="sheen-rich-combobox-content"
        dir={popoverDir}
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          ;(event.currentTarget as HTMLElement).querySelector<HTMLInputElement>("input")?.focus()
        }}
      >
        <Command
          listId={`${id ?? baseId}-list`}
          label={ariaProps["aria-label"] ?? placeholder}
          search={search}
          onSearchChange={changeSearch}
          filter={!onSearchChange}
          loop={false}
        >
          <CommandInput placeholder={searchPlaceholder} loading={loading}  />
          <CommandList aria-multiselectable={props.multiple || undefined}>
            {loading && options.length === 0 && <CommandLoading />}
            {groups.map(([group, items]) => {
              const rendered = items.map((option) => {
                const checked = selected.includes(option.value)
                return (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    keywords={[option.value, ...(option.keywords ?? []), option.description ?? ""]}
                    disabled={option.disabled}
                    aria-selected={checked}
                    data-checked={checked || undefined}
                    onSelect={() => toggle(option.value)}
                    // Keep focus in the search field so typing continues after a click (multi-select).
                    onMouseDown={(event) => event.preventDefault()}
                    className="sheen-rich-combobox-item"
                  >
                    {option.icon && <span className="sheen-rich-combobox-item-icon">{option.icon}</span>}
                    <span className="sheen-rich-combobox-item-text">
                      <span>{option.label}</span>
                      {option.description && <span className="sheen-rich-combobox-item-description">{option.description}</span>}
                    </span>
                    <span className="sheen-rich-combobox-check">{checked && <CheckIcon />}</span>
                    {checked && <span className="visually-hidden">, {selectedText}</span>}
                  </CommandItem>
                )
              })
              return group ? (
                <CommandGroup key={group} heading={group}>
                  {rendered}
                </CommandGroup>
              ) : (
                <React.Fragment key="_">{rendered}</React.Fragment>
              )
            })}
            {canCreate && (
              <CommandItem
                value={search}
                forceMount
                onSelect={create}
                onMouseDown={(event) => event.preventDefault()}
                className="sheen-rich-combobox-item sheen-rich-combobox-create"
              >
                <span className="sheen-rich-combobox-item-icon">
                  <PlusIcon />
                </span>
                <span className="sheen-rich-combobox-item-text">
                  <span>
                    {createLabel(search.trim())}
                  </span>
                </span>
              </CommandItem>
            )}
            {!loading && !canCreate && <CommandEmpty role="status">{emptyText}</CommandEmpty>}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
})
Combobox.displayName = "Combobox"

export { Combobox }
