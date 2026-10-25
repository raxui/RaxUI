"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { useFieldControlProps } from "@/components/ui/field"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { useSheenTheme, sheenThemeAttributes, type SheenAppearance } from "@/lib/theme"
import { cn } from "@/lib/utils"
import { ChoiceHighlight } from "@/lib/choice-highlight"

export interface ComboboxOption { value: string; label: string; disabled?: boolean }
export interface ComboboxProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "value" | "defaultValue" | "onChange"> {
  options: ComboboxOption[]
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  onValueChange?: (value: string) => void
  appearance?: SheenAppearance
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
}
const Combobox = React.forwardRef<HTMLButtonElement, ComboboxProps>(({
  options, value, defaultValue = "", onChange, onValueChange, appearance, placeholder = "Choose an option",
  searchPlaceholder = "Search options", emptyMessage = "No options found.", className, name, onKeyDown, ...props
}, ref) => {
  const wired = useFieldControlProps(props)
  const theme = useSheenTheme({ appearance })
  const [internal, setInternal] = React.useState(defaultValue)
  const selected = value ?? internal
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [active, setActive] = React.useState<string>()
  const id = React.useId(), listId = `${id}-list`
  const filtered = options.filter(o => o.label.toLocaleLowerCase().includes(query.toLocaleLowerCase()))
  const enabled = filtered.filter(o => !o.disabled)
  const activeOption = enabled.find(o => o.value === active)
  const optionId = (option: ComboboxOption) => `${id}-option-${options.indexOf(option)}`
  const select = (option: ComboboxOption) => {
    if (option.disabled || wired.disabled) return
    if (value === undefined) setInternal(option.value)
    onChange?.(option.value); onValueChange?.(option.value); setOpen(false)
  }
  return <Popover open={open} onOpenChange={next => { setOpen(next); if (next) { setQuery(""); setActive(selected) } }} appearance={appearance}>
    <PopoverTrigger asChild>
      <button {...sheenThemeAttributes(theme)} {...wired} ref={ref} type="button" role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-controls={listId}
        className={cn("form-control sheen-input sheen-combobox-trigger", className)}
        onKeyDown={e => {
          onKeyDown?.(e); if (e.defaultPrevented || wired.disabled) return
          if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
            e.preventDefault(); setQuery(""); setOpen(true)
            const choices = options.filter(o => !o.disabled); setActive((e.key === "End" || e.key === "ArrowUp" ? choices[choices.length - 1] : choices[0])?.value)
          } else if (e.key.length === 1 && e.key.trim() && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault(); setQuery(e.key); setOpen(true); setActive(undefined)
          }
        }}>
        <span>{options.find(o => o.value === selected)?.label ?? placeholder}</span>
        {/* ChevronsUpDown paths from Lucide (ISC). */}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m7 15 5 5 5-5M7 9l5-5 5 5" /></svg>
      </button>
    </PopoverTrigger>
    <PopoverContent className="sheen-combobox-panel" aria-label={searchPlaceholder}>
      <Input role="combobox" aria-label={searchPlaceholder} aria-labelledby={undefined} id={`${id}-search`} aria-describedby={undefined}
        aria-autocomplete="list" aria-expanded={open} aria-controls={listId} aria-activedescendant={activeOption ? optionId(activeOption) : undefined}
        placeholder={searchPlaceholder} value={query} onChange={e => { setQuery(e.target.value); setActive(undefined) }}
        onKeyDown={e => {
          if (e.nativeEvent.isComposing) return
          const index = enabled.findIndex(o => o.value === active)
          let next: ComboboxOption | undefined
          if (e.key === "ArrowDown") next = enabled[(index + 1) % enabled.length]
          else if (e.key === "ArrowUp") next = enabled[index <= 0 ? enabled.length - 1 : index - 1]
          else if (e.key === "Home") next = enabled[0]
          else if (e.key === "End") next = enabled[enabled.length - 1]
          else if (e.key === "Enter" && activeOption) { e.preventDefault(); select(activeOption) }
          else if (e.key === "Tab") setOpen(false)
          if (next) { e.preventDefault(); setActive(next.value); document.getElementById(optionId(next))?.scrollIntoView?.({ block: "nearest" }) }
        }} />
      <div id={listId} role="listbox" className="sheen-choice-list" aria-label={props["aria-label"] ?? placeholder}>
        <ChoiceHighlight />
        {filtered.map(option => <div key={option.value} id={optionId(option)} role="option" aria-selected={option.value === selected}
          aria-disabled={option.disabled || undefined} data-active={option === activeOption || undefined} className="sheen-choice-option"
          onPointerDown={e => e.preventDefault()} onPointerMove={() => { if (!option.disabled) setActive(option.value) }} onClick={() => select(option)}>{option.label}</div>)}
      </div>
      {filtered.length === 0 && <p className="sheen-choice-empty" role="status">{emptyMessage}</p>}
    </PopoverContent>
    {name && <input type="hidden" name={name} value={selected} disabled={wired.disabled} />}
  </Popover>
})
Combobox.displayName = "Combobox"
export { Combobox }
