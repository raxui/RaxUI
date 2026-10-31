"use client"

// Built-in SVG paths from Lucide, licensed under ISC.
import * as React from "react"
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover"
import { useRaxTheme, raxThemeAttributes, type RaxAppearance } from "@/lib/theme"
import { useFieldControlProps } from "@/components/ui/field"
import { ChoiceHighlight } from "@/lib/choice-highlight"
import { AutocompleteText, type AutocompleteTextProps } from "./autocomplete-text"

import { cn } from "@/lib/utils"
import { getDirection } from "@/lib/direction"
import { assignRef } from "@/lib/refs"
import { Spinner } from "@/components/ui/spinner"

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
)

const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={4} strokeLinecap="round" aria-hidden="true">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
)

const CheckIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={3}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
)

export interface AutocompleteOption {
  value: string
  label: string
  description?: string
  icon?: React.ReactNode
  disabled?: boolean
}

export type AutocompleteFilter = (option: AutocompleteOption, query: string) => boolean

/** Case-insensitive "contains" match on the label. */
const defaultFilter: AutocompleteFilter = (option, query) => option.label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())

const inputSizeClasses = {
  sm: "form-control-sm",
  default: null,
  lg: "form-control-lg",
} as const

export interface AutocompleteOptionsProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "defaultValue" | "onChange" | "size" | "onSelect" | "type"
> {
  appearance?: RaxAppearance
  invalid?: boolean
  variant?: "glass" | "outline" | "filled"
  clearLabel?: string
  loadingMessage?: string
  options: AutocompleteOption[]
  /** Selected option value (controlled). */
  value?: string | null
  defaultValue?: string | null
  onValueChange?: (value: string | null, option: AutocompleteOption | null) => void
  /** Text in the field (controlled) — use it to fetch remote results. */
  inputValue?: string
  defaultInputValue?: string
  onInputValueChange?: (query: string) => void
  /** Morphs the search icon into a spinner and shows a skeleton until results arrive. */
  loading?: boolean
  /** Client-side filter. Pass `false` when `options` already come filtered from a server. */
  filter?: AutocompleteFilter | false
  /** Characters needed before the list opens. `0` opens the full list on focus. */
  minChars?: number
  size?: keyof typeof inputSizeClasses
  emptyMessage?: React.ReactNode | ((query: string) => React.ReactNode)
  renderOption?: (option: AutocompleteOption, state: { query: string; active: boolean; selected: boolean }) => React.ReactNode
  /** Class for the outer wrapper (the input gets `className`). */
  wrapperClassName?: string
  contentClassName?: string
}

function useControllable<T>(prop: T | undefined, defaultValue: T) {
  const [internal, setInternal] = React.useState(defaultValue)
  const controlled = prop !== undefined
  return [controlled ? (prop as T) : internal, (next: T) => !controlled && setInternal(next)] as const
}

/** Bolds the first match of `query` inside `text`. */
function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim()
  const index = q ? text.toLocaleLowerCase().indexOf(q.toLocaleLowerCase()) : -1
  if (index < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, index)}
      <mark className="rax-autocomplete-match">{text.slice(index, index + q.length)}</mark>
      {text.slice(index + q.length)}
    </>
  )
}

const AutocompleteOptions = React.forwardRef<HTMLInputElement, AutocompleteOptionsProps>(
  (
    {
      appearance,
      variant = "filled",
      invalid,
      clearLabel = "Clear search",
      loadingMessage = "Loading results",
      options,
      value: valueProp,
      defaultValue = null,
      onValueChange,
      inputValue: inputValueProp,
      defaultInputValue = "",
      onInputValueChange,
      loading = false,
      filter = defaultFilter,
      minChars = 1,
      size = "default",
      emptyMessage = (query: string) => <>No results for “{query.trim()}”</>,
      renderOption,
      className,
      wrapperClassName,
      contentClassName,
      id,
      disabled,
      onKeyDown,
      onFocus,
      ...inputProps
    },
    forwardedRef,
  ) => {
    const wired = useFieldControlProps({ ...inputProps, id, disabled })
    disabled = wired.disabled
    id = wired.id
    inputProps = wired
    const direction = inputProps.dir === "rtl" ? "rtl" : inputProps.dir === "ltr" ? "ltr" : undefined
    const theme = useRaxTheme({ appearance, direction })
    const [query, setQueryState] = useControllable(inputValueProp, defaultInputValue)
    const [value, setValueState] = useControllable<string | null>(valueProp, defaultValue)
    const [open, setOpen] = React.useState(false)
    const [activeIndex, setActiveIndex] = React.useState(-1)

    const inputRef = React.useRef<HTMLInputElement | null>(null)
    const anchorRef = React.useRef<HTMLDivElement>(null)
    const listRef = React.useRef<HTMLDivElement>(null)
    const baseId = React.useId()
    const inputId = id ?? `${baseId}-input`
    const listboxId = `${baseId}-listbox`
    const optionId = (index: number) => `${baseId}-option-${index}`

    // While the field still shows the selected option's label, reopening the
    // list shows every option (not just the one that matches its own label).
    const pristine = value !== null && options.some((option) => option.value === value && option.label === query)
    const searchQuery = pristine ? "" : query

    const results = React.useMemo(
      () => (filter === false ? options : options.filter((option) => filter(option, searchQuery))),
      [options, filter, searchQuery],
    )

    // Highlight the selected option, or else the first match so Enter picks it.
    React.useEffect(() => {
      const selectedIndex = pristine ? results.findIndex((option) => option.value === value) : -1
      setActiveIndex(selectedIndex >= 0 ? selectedIndex : results.findIndex((option) => !option.disabled))
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery, options, pristine])

    const showList = open && !disabled && !inputProps.readOnly && query.trim().length >= minChars

    React.useEffect(() => {
      if (!showList || activeIndex < 0) return
      listRef.current?.querySelector(`#${CSS.escape(optionId(activeIndex))}`)?.scrollIntoView({ block: "nearest" })
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeIndex, showList])

    const setQuery = (next: string) => {
      setQueryState(next)
      onInputValueChange?.(next)
    }

    const setValue = (next: string | null, option: AutocompleteOption | null) => {
      setValueState(next)
      onValueChange?.(next, option)
    }

    const select = (option: AutocompleteOption) => {
      if (option.disabled || loading || inputProps.readOnly || disabled) return
      setQuery(option.label)
      setValue(option.value, option)
      setOpen(false)
    }

    const clear = () => {
      setQuery("")
      if (value !== null) setValue(null, null)
      setOpen(minChars === 0)
      inputRef.current?.focus()
    }

    const move = (delta: 1 | -1) => {
      if (!results.length) return
      let index = activeIndex
      for (let step = 0; step < results.length; step++) {
        index = (index + delta + results.length) % results.length
        if (!results[index].disabled) return setActiveIndex(index)
      }
    }

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
      // Radix marks Escape as handled at the document level, so only skip keys
      // the consumer's own onKeyDown prevented.
      const alreadyPrevented = event.defaultPrevented
      onKeyDown?.(event)
      if (!alreadyPrevented && event.defaultPrevented) return

      if (event.nativeEvent.isComposing || inputProps.readOnly || disabled) return
      switch (event.key) {
        case "Home":
        case "End":
          if (showList) { event.preventDefault(); const indices = results.map((option, i) => option.disabled ? -1 : i).filter(i => i >= 0); setActiveIndex(event.key === "Home" ? indices[0] ?? -1 : indices[indices.length - 1] ?? -1) }
          break
        case "ArrowDown":
        case "ArrowUp":
          event.preventDefault()
          if (!showList) setOpen(true)
          else move(event.key === "ArrowDown" ? 1 : -1)
          break
        case "Enter":
          if (showList && activeIndex >= 0 && results[activeIndex]) {
            event.preventDefault()
            select(results[activeIndex])
          }
          break
        case "Escape":
          // First Escape closes the list, second clears the field (like native search inputs).
          if (showList) setOpen(false)
          else if (query) clear()
          break
        case "Tab":
          setOpen(false)
          break
      }
    }

    const status = loading ? loadingMessage : showList ? `${results.length} result${results.length === 1 ? "" : "s"} available` : ""

    return (
      <Popover appearance={appearance} dir={direction} open={showList} onOpenChange={(next) => !next && setOpen(false)}>
        <PopoverAnchor asChild>
          <div {...raxThemeAttributes(theme)} dir={inputProps.dir} ref={anchorRef} className={cn("rax-autocomplete", wrapperClassName)} data-loading={loading ? "" : undefined}>
            <span className="rax-autocomplete-icon" aria-hidden="true">
              <span className="rax-autocomplete-icon-search">
                <SearchIcon />
              </span>
              <span className="rax-autocomplete-icon-spinner">
                <Spinner />
              </span>
            </span>

            <input
              ref={(node) => {
                inputRef.current = node
                assignRef(forwardedRef, node)
              }}
              {...raxThemeAttributes(theme)}
              {...inputProps}
              data-variant={variant}
              aria-invalid={invalid || inputProps["aria-invalid"] || undefined}
              id={inputId}
              type="search"
              role="combobox"
              autoComplete="off"
              aria-autocomplete="list"
              aria-expanded={showList}
              aria-controls={showList ? listboxId : undefined}
              aria-activedescendant={showList && activeIndex >= 0 ? optionId(activeIndex) : undefined}
              disabled={disabled}
              className={cn("form-control rax-input rax-autocomplete-input", inputSizeClasses[size], className)}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                if (value !== null) setValue(null, null)
                setOpen(true)
              }}
              onFocus={(event) => {
                onFocus?.(event)
                if (query.trim().length >= minChars) setOpen(true)
              }}
              onClick={() => setOpen(true)}
              onKeyDown={handleKeyDown}
            />

            {query && !disabled && !inputProps.readOnly && (
              <button type="button" className="rax-autocomplete-clear" aria-label={clearLabel} onClick={clear}>
                <XIcon />
              </button>
            )}

            <span className="visually-hidden" role="status" aria-live="polite">
              {status}
            </span>
          </div>
        </PopoverAnchor>

          <PopoverContent
            dir={direction ?? (anchorRef.current ? getDirection(anchorRef.current) : theme.direction)}
            role="presentation"
            align="start"
            sideOffset={6}
            collisionPadding={8}
            className={cn("rax-autocomplete-content", contentClassName)}
            // Focus stays in the input the whole time (aria-activedescendant pattern).
            onOpenAutoFocus={(event) => event.preventDefault()}
            onCloseAutoFocus={(event) => event.preventDefault()}
            onEscapeKeyDown={(event) => event.preventDefault()} // the input handles Escape
            onInteractOutside={(event) => {
              if (anchorRef.current?.contains(event.target as Node)) event.preventDefault()
            }}
          >
            <div
              ref={listRef}
              id={listboxId}
              role="listbox"
              aria-labelledby={inputProps["aria-labelledby"]}
              aria-label={inputProps["aria-labelledby"] ? undefined : (inputProps["aria-label"] ?? "Suggestions")}
              aria-busy={loading}
              className="rax-autocomplete-listbox rax-choice-list"
            >
              <ChoiceHighlight />
              {results.length === 0 && loading ? (
                [62, 48, 70].map((width, i) => (
                  <div key={i} className="rax-autocomplete-skeleton" aria-hidden="true">
                    <span style={{ width: `${width}%` }} />
                  </div>
                ))
              ) : results.length === 0 ? (
                <div className="rax-autocomplete-empty">{typeof emptyMessage === "function" ? emptyMessage(query) : emptyMessage}</div>
              ) : (
                results.map((option, index) => {
                  const active = index === activeIndex
                  const selected = option.value === value
                  return (
                    <div
                      key={option.value}
                      id={optionId(index)}
                      role="option"
                      aria-selected={selected}
                      aria-disabled={option.disabled || undefined}
                      data-highlighted={active ? "" : undefined}
                      data-disabled={option.disabled ? "" : undefined}
                      className="rax-autocomplete-option"
                      onMouseMove={() => !option.disabled && activeIndex !== index && setActiveIndex(index)}
                      onMouseDown={(event) => event.preventDefault()} // keep focus in the input
                      onClick={() => select(option)}
                    >
                      {renderOption ? (
                        renderOption(option, { query: searchQuery, active, selected })
                      ) : (
                        <>
                          {option.icon && <span className="rax-autocomplete-option-icon">{option.icon}</span>}
                          <span className="rax-autocomplete-option-text">
                            <span>
                              <Highlight text={option.label} query={searchQuery} />
                            </span>
                            {option.description && <span className="rax-autocomplete-option-description">{option.description}</span>}
                          </span>
                        </>
                      )}
                      {selected && (
                        <span className="rax-autocomplete-check">
                          <CheckIcon />
                        </span>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </PopoverContent>
      </Popover>
    )
  },
)
AutocompleteOptions.displayName = "AutocompleteOptions"

export type AutocompleteProps = AutocompleteOptionsProps | AutocompleteTextProps
const Autocomplete = React.forwardRef<HTMLInputElement, AutocompleteProps>((props, ref) =>
  "options" in props ? <AutocompleteOptions {...props} ref={ref} /> : <AutocompleteText {...props} ref={ref} />
)
Autocomplete.displayName = "Autocomplete"

export { Autocomplete, defaultFilter }
