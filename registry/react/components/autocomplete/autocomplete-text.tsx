"use client"

import * as React from "react"
import { Input, type InputProps } from "@/components/ui/input"
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover"
import { useFieldControlProps } from "@/components/ui/field"
import { ChoiceHighlight } from "@/lib/choice-highlight"

export interface AutocompleteTextProps extends Omit<InputProps, "value" | "defaultValue" | "onChange"> {
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  suggestions?: string[]
  loadSuggestions?: (query: string, signal: AbortSignal) => Promise<string[]>
  loading?: boolean
  loadingMessage?: string
  emptyMessage?: string
  errorMessage?: string
}
const EMPTY: string[] = []
const AutocompleteText = React.forwardRef<HTMLInputElement, AutocompleteTextProps>(({
  value, defaultValue = "", onChange, suggestions = EMPTY, loadSuggestions, loading = false,
  loadingMessage = "Loading suggestions", emptyMessage = "No suggestions found.", errorMessage = "Unable to load suggestions.",
  onFocus, onKeyDown, onBlur, appearance, ...props
}, ref) => {
  const wired = useFieldControlProps(props)
  const id = React.useId(), listId = `${id}-list`
  const [internal, setInternal] = React.useState(defaultValue)
  const text = value ?? internal
  const [open, setOpen] = React.useState(false)
  const [active, setActive] = React.useState<string>()
  const [asyncState, setAsyncState] = React.useState<{ query: string; options: string[]; pending: boolean; failed: boolean }>({ query: "", options: [], pending: false, failed: false })
  React.useEffect(() => {
    if (!loadSuggestions || !open || wired.disabled) return
    const controller = new AbortController()
    setAsyncState({ query: text, options: [], pending: true, failed: false })
    Promise.resolve().then(() => loadSuggestions(text, controller.signal)).then(options => {
      if (!controller.signal.aborted) setAsyncState({ query: text, options, pending: false, failed: false })
    }, () => { if (!controller.signal.aborted) setAsyncState({ query: text, options: [], pending: false, failed: true }) })
    return () => controller.abort()
  }, [text, loadSuggestions, open, wired.disabled])
  const busy = loading || !!(loadSuggestions && (asyncState.pending || asyncState.query !== text))
  const failed = !!loadSuggestions && asyncState.query === text && asyncState.failed
  const choices = [...new Set(loadSuggestions ? (asyncState.query === text ? asyncState.options : EMPTY) : suggestions.filter(s => s.toLocaleLowerCase().includes(text.toLocaleLowerCase())))]
  const index = choices.indexOf(active ?? "")
  const change = (next: string) => { if (value === undefined) setInternal(next); onChange?.(next); setActive(undefined) }
  const select = (next: string) => { change(next); setOpen(false) }
  return <Popover open={open && !wired.disabled} onOpenChange={setOpen} appearance={appearance}>
    <PopoverAnchor asChild><Input {...wired} ref={ref} appearance={appearance} role="combobox" aria-autocomplete="list"
      aria-expanded={open && !wired.disabled} aria-controls={listId} aria-activedescendant={open && index >= 0 && !busy ? `${id}-option-${index}` : undefined}
      value={text} autoComplete="off" onChange={e => { change(e.target.value); setOpen(true) }}
      onFocus={e => { onFocus?.(e); if (!e.defaultPrevented && !props.readOnly) setOpen(true) }}
      onBlur={e => { onBlur?.(e); setOpen(false) }}
      onKeyDown={e => {
        onKeyDown?.(e); if (e.defaultPrevented || e.nativeEvent.isComposing || wired.disabled || props.readOnly) return
        let next: number | undefined
        if (e.key === "ArrowDown") next = (index + 1) % choices.length
        else if (e.key === "ArrowUp") next = index <= 0 ? choices.length - 1 : index - 1
        else if (e.key === "Home" && open) next = 0
        else if (e.key === "End" && open) next = choices.length - 1
        else if (e.key === "Enter" && open && index >= 0 && !busy) { e.preventDefault(); select(choices[index]) }
        else if (e.key === "Escape") { e.preventDefault(); setOpen(false) }
        if (next !== undefined && choices[next] && !busy) { e.preventDefault(); setOpen(true); setActive(choices[next]); document.getElementById(`${id}-option-${next}`)?.scrollIntoView?.({ block: "nearest" }) }
      }} /></PopoverAnchor>
    <PopoverContent className="rax-autocomplete-panel" role="presentation" onOpenAutoFocus={e => e.preventDefault()} onCloseAutoFocus={e => e.preventDefault()}
      onInteractOutside={e => { if ((e.target as HTMLElement).closest('input[role="combobox"]')) e.preventDefault() }}>
      <div role="listbox" id={listId} className="rax-choice-list" aria-label={props["aria-label"] ?? props.placeholder ?? ""} aria-busy={busy}>
        <ChoiceHighlight />
        {!busy && !failed && choices.map((choice, i) => <div key={choice} id={`${id}-option-${i}`} role="option" aria-selected={choice === text}
          className="rax-choice-option" data-active={choice === active || undefined} onPointerDown={e => e.preventDefault()}
          onPointerMove={() => setActive(choice)} onClick={() => select(choice)}>{choice}</div>)}
      </div>
      {busy ? <p role="status" className="rax-choice-empty"><span className="spinner-border spinner-border-sm" aria-hidden="true" /> {loadingMessage}</p>
        : failed || choices.length === 0 ? <p role="status" className="rax-choice-empty">{failed ? errorMessage : emptyMessage}</p> : null}
    </PopoverContent>
  </Popover>
})
AutocompleteText.displayName = "AutocompleteText"
export { AutocompleteText }
