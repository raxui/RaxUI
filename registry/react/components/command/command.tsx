"use client"

// Built-in SVG paths from Lucide, licensed under ISC.
import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"

import { useSheenPortalContainer } from "@/lib/theme"
import { cn } from "@/lib/utils"
function assignRef<T>(ref: React.ForwardedRef<T>, node: T | null) { if (typeof ref === "function") ref(node); else if (ref) ref.current = node }
import { Spinner } from "@/components/ui/spinner"

// ---- Matching -------------------------------------------------------------------
// Folds what people type interchangeably: case, accents, and in Arabic the
// harakat and tatweel, the hamza forms of alef (أ إ آ ٱ → ا), ة → ه, ى → ي, and
// Arabic-Indic digits, so "احمد" finds "أحمد" and "مكتبه" finds "مكتبة".
const ARABIC_FOLD: Record<string, string> = { "\u0671": "\u0627", "\u0629": "\u0647", "\u0649": "\u064A" }
const normalize = (s: string) =>
  s
    .toLocaleLowerCase()
    .normalize("NFD") // also splits أ إ آ ؤ ئ into the base letter + a hamza/madda mark
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, "")
    .replace(/[\u0671\u0629\u0649]/g, (ch) => ARABIC_FOLD[ch])
    .replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (d) => String((d.charCodeAt(0) - 0x0660) % 0x90))

const isSubsequence = (query: string, word: string) => {
  let i = 0
  for (const ch of word) if (ch === query[i]) i++
  return i === query.length
}

/**
 * Every word of the query appears in the text, or — for typo tolerance — the
 * query is a subsequence of a single word ("stg" → "settings", but not across words).
 */
export function commandMatches(search: string, text: string) {
  const query = normalize(search.trim())
  if (!query) return true
  const haystack = normalize(text)
  if (query.split(/\s+/).every((token) => haystack.includes(token))) return true
  if (query.length < 2 || /\s/.test(query)) return false
  return haystack.split(/\s+/).some((word) => word[0] === query[0] && isSubsequence(query, word))
}

// ---- Context --------------------------------------------------------------------
interface CommandContextValue {
  search: string
  setSearch: (search: string) => void
  filter: boolean
  activeId?: string
  setActiveId: (id?: string) => void
  listId: string
  listRef: React.RefObject<HTMLDivElement | null>
}

const CommandContext = React.createContext<CommandContextValue | null>(null)

function useCommand() {
  const context = React.useContext(CommandContext)
  if (!context) throw new Error("Command components must be used inside <Command>")
  return context
}

const ITEM_SELECTOR = ".sheen-command-item:not([aria-disabled='true'])"

// ---- Command (root) -------------------------------------------------------------

export interface CommandProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onKeyDown"> {
  /** Stable list ID for associated combobox triggers. */
  listId?: string
  /** Controlled search text. */
  search?: string
  onSearchChange?: (search: string) => void
  /** Filter items by their value/keywords. Turn off when results come from a server. */
  filter?: boolean
  /** Wrap around at the ends of the list. */
  loop?: boolean
  /** Accessible name for the palette. */
  label?: string
  onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>
}

const Command = React.forwardRef<HTMLDivElement, CommandProps>(
  (
    { className, listId: providedListId, search: searchProp, onSearchChange, filter = true, loop = true, label = "Command palette", onKeyDown, children, ...props },
    ref,
  ) => {
    const [uncontrolledSearch, setUncontrolledSearch] = React.useState("")
    const search = searchProp ?? uncontrolledSearch
    const [activeId, setActiveId] = React.useState<string>()
    const listRef = React.useRef<HTMLDivElement>(null)
    const generatedListId = React.useId()
    const listId = providedListId ?? generatedListId

    const setSearch = React.useCallback(
      (next: string) => {
        if (searchProp === undefined) setUncontrolledSearch(next)
        onSearchChange?.(next)
      },
      [searchProp, onSearchChange],
    )

    const items = () => Array.from(listRef.current?.querySelectorAll<HTMLElement>(ITEM_SELECTOR) ?? [])

    // Whenever the results change, highlight the first one (or keep the current if still there).
    // Runs after every render on purpose: the items are read from the DOM, and it only sets state when needed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    React.useLayoutEffect(() => {
      const list = items()
      if (!activeId || !list.some((el) => el.id === activeId)) setActiveId(list[0]?.id)
    })
    React.useLayoutEffect(() => {
      setActiveId(items()[0]?.id)
      listRef.current?.scrollTo({ top: 0 })
    }, [search])

    const move = (delta: number | "first" | "last") => {
      const list = items()
      if (!list.length) return
      const index = list.findIndex((el) => el.id === activeId)
      let next: number
      if (delta === "first") next = 0
      else if (delta === "last") next = list.length - 1
      else {
        next = index + delta
        if (loop) next = (next + list.length) % list.length
        else next = Math.max(0, Math.min(list.length - 1, next))
      }
      setActiveId(list[next].id)
    }

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event)
      if (event.defaultPrevented) return
      switch (event.key) {
        case "Home": event.preventDefault(); move("first"); break
        case "End": event.preventDefault(); move("last"); break
        case "ArrowDown":
          event.preventDefault()
          move(event.metaKey || event.ctrlKey ? "last" : 1)
          break
        case "ArrowUp":
          event.preventDefault()
          move(event.metaKey || event.ctrlKey ? "first" : -1)
          break
        case "Enter": {
          if (event.nativeEvent.isComposing) return // IME confirmation, not a selection
          const active = activeId ? document.getElementById(activeId) : null
          if (active) {
            event.preventDefault()
            active.click()
          }
          break
        }
      }
    }

    return (
      <CommandContext.Provider value={{ search, setSearch, filter, activeId, setActiveId, listId, listRef }}>
        <div
          ref={ref}
          className={cn("sheen-command", className)}
          aria-label={label}
          data-searching={search ? "" : undefined}
          onKeyDown={handleKeyDown}
          {...props}
        >
          {children}
        </div>
      </CommandContext.Provider>
    )
  },
)
Command.displayName = "Command"

// ---- Input -----------------------------------------------------------------------

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
)

export interface CommandInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  /** Shown before the text field — e.g. a breadcrumb chip for nested pages. */
  leading?: React.ReactNode
  /** Shows a spinner in place of the search icon. */
  loading?: boolean
}

const CommandInput = React.forwardRef<HTMLInputElement, CommandInputProps>(({ className, leading, loading, placeholder = "Search commands...", "aria-label": ariaLabel = placeholder, ...props }, ref) => {
  const { search, setSearch, activeId, listId } = useCommand()
  return (
    <div className="sheen-command-input-wrap">
      <span className="sheen-command-input-icon">{loading ? <Spinner aria-hidden="true" /> : <SearchIcon />}</span>
      {leading}
      <input
        ref={ref}
        className={cn("sheen-command-input", className)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        role="combobox"
        aria-expanded="true"
        aria-controls={listId}
        aria-activedescendant={activeId}
        aria-autocomplete="list"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        {...props}
      />
    </div>
  )
})
CommandInput.displayName = "CommandInput"

// ---- List (animated height + sliding highlight) ------------------------------------

const CommandList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, forwardedRef) => {
    const { listId, listRef, activeId } = useCommand()
    const innerRef = React.useRef<HTMLDivElement>(null)
    const [height, setHeight] = React.useState<number>()

    // Animate the list height as results come and go.
    React.useLayoutEffect(() => {
      const inner = innerRef.current
      if (!inner) return
      const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => setHeight(inner.offsetHeight))
      observer?.observe(inner)
      setHeight(inner.offsetHeight)
      return () => observer?.disconnect()
    }, [])

    // One highlight that glides to the active item.
    React.useLayoutEffect(() => {
      const inner = innerRef.current
      const active = activeId ? document.getElementById(activeId) : null
      if (!inner) return
      if (!active || !inner.contains(active)) {
        inner.removeAttribute("data-highlight")
        return
      }
      inner.style.setProperty("--sheen-command-highlight-y", `${active.offsetTop}px`)
      inner.style.setProperty("--sheen-command-highlight-h", `${active.offsetHeight}px`)
      inner.setAttribute("data-highlight", "")
      active.scrollIntoView({ block: "nearest" })
    })

    return (
      <div
        ref={(node) => {
          ;(listRef as React.MutableRefObject<HTMLDivElement | null>).current = node
          assignRef(forwardedRef, node)
        }}
        id={listId}
        role="listbox"
        className={cn("sheen-command-list", className)}
        style={{ height }}
        {...props}
      >
        <div ref={innerRef} className="sheen-command-list-inner">
          <span className="sheen-command-highlight" aria-hidden="true" />
          {children}
        </div>
      </div>
    )
  },
)
CommandList.displayName = "CommandList"

// ---- Items ---------------------------------------------------------------------------

export interface CommandItemProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> {
  /** Text matched against the search (defaults to nothing — set it for filtering). */
  value: string
  /** Extra words that should also match (aliases, synonyms). */
  keywords?: string[]
  disabled?: boolean
  onSelect?: (value: string) => void
  /** Keep visible regardless of the search. */
  forceMount?: boolean
}

const CommandItem = React.forwardRef<HTMLDivElement, CommandItemProps>(
  ({ className, value, id: providedId, keywords = [], disabled = false, onSelect, forceMount, children, ...props }, ref) => {
    const { search, filter, activeId, setActiveId } = useCommand()
    const generatedId = React.useId()
    const id = providedId ?? generatedId
    if (filter && !forceMount && !commandMatches(search, [value, ...keywords].join(" "))) return null
    const active = activeId === id
    return (
      <div
        ref={ref}
        id={id}
        role="option"
        aria-selected={active}
        aria-disabled={disabled}
        data-active={active ? "" : undefined}
        className={cn("sheen-command-item", className)}
        onPointerMove={() => !disabled && !active && setActiveId(id)}
        onClick={() => !disabled && onSelect?.(value)}
        {...props}
      >
        {children}
      </div>
    )
  },
)
CommandItem.displayName = "CommandItem"

const CommandGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { heading?: React.ReactNode }>(
  ({ className, heading, children, ...props }, ref) => {
    const headingId = React.useId()
    return (
      <div
        ref={ref}
        role="group"
        aria-labelledby={heading ? headingId : undefined}
        className={cn("sheen-command-group", className)}
        {...props}
      >
        {heading && (
          <div id={headingId} className="sheen-command-group-heading" aria-hidden="true">
            {heading}
          </div>
        )}
        {children}
      </div>
    )
  },
)
CommandGroup.displayName = "CommandGroup"

const CommandSeparator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} role="separator" className={cn("sheen-command-separator", className)} {...props} />
))
CommandSeparator.displayName = "CommandSeparator"

/** Shown only when no item matches (pure CSS — no item counting needed). */
const CommandEmpty = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, children = "No results found.", ...props }, ref) => (
  <div ref={ref} role="presentation" className={cn("sheen-command-empty", className)} {...props}>{children}</div>
))
CommandEmpty.displayName = "CommandEmpty"

const CommandLoading = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, children = "Loading…", ...props }, ref) => (
  <div ref={ref} role="status" className={cn("sheen-command-loading", className)} {...props}>
    <Spinner aria-hidden="true" />
    {children}
  </div>
))
CommandLoading.displayName = "CommandLoading"

const CommandShortcut = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(({ className, ...props }, ref) => (
  <span ref={ref} className={cn("sheen-command-shortcut", className)} {...props} />
))
CommandShortcut.displayName = "CommandShortcut"

/** Keyboard hints bar (↑↓ ↵ esc). */
const CommandFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("sheen-command-footer", className)} {...props} />
))
CommandFooter.displayName = "CommandFooter"

// ---- Dialog ---------------------------------------------------------------------------

export interface CommandDialogProps extends React.ComponentProps<typeof DialogPrimitive.Root> {
  /** Key that toggles the palette with ⌘ / Ctrl. Pass `false` to disable. */
  shortcut?: string | false
  title?: string
  description?: string
  commandProps?: CommandProps
  className?: string
}

function CommandDialog({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  shortcut = "k",
  title = "Command palette",
  description = "Search for a command to run",
  commandProps,
  className,
  children,
  ...props
}: CommandDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
  const open = openProp ?? uncontrolledOpen
  const setOpen = React.useCallback(
    (next: boolean) => {
      if (openProp === undefined) setUncontrolledOpen(next)
      onOpenChange?.(next)
    },
    [openProp, onOpenChange],
  )

  React.useEffect(() => {
    if (!shortcut) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return // already handled, e.g. ⌘K inside a text editor
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === shortcut.toLowerCase()) {
        event.preventDefault()
        setOpen(!open)
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [shortcut, open, setOpen])

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen} {...props}>
      <DialogPrimitive.Portal container={useSheenPortalContainer()}>
        <DialogPrimitive.Overlay className="sheen-command-overlay" />
        <DialogPrimitive.Content className={cn("sheen-command-dialog", className)}>
          <DialogPrimitive.Title className="visually-hidden">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Description className="visually-hidden">{description}</DialogPrimitive.Description>
          <Command label={title} {...commandProps}>
            {children}
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandLoading,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
  CommandFooter,
}
