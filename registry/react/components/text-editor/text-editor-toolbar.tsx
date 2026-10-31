"use client"

// Ported from boot-ui. Built-in SVG paths from Lucide (ISC).
import * as React from "react"
import { type Editor } from "@tiptap/core"
import { cn } from "@/lib/utils"
import { getDirection } from "@/lib/direction"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip } from "@/components/ui/tooltip"
import { formatShortcut, type EditorUiState, TOGGLES } from "./text-editor-state"
import { type TextEditorTool, type TextEditorLabels, setAlign } from "./text-editor-config"
import { ICONS } from "./text-editor-icons"
import { LinkForm } from "./text-editor-link"

export const ToolButton = React.forwardRef<
  HTMLButtonElement,
  {
    label: string
    shortcut?: string
    icon: React.ReactNode
    active?: boolean
    unavailable?: boolean
  } & React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ label, shortcut, icon, active, unavailable, onClick, className, ...props }, ref) => (
  <Tooltip content={label} shortcut={shortcut ? formatShortcut(shortcut) : undefined}>
    <Button
      ref={ref}
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      aria-pressed={active === undefined ? undefined : active}
      aria-disabled={unavailable || undefined}
      data-active={active || undefined}
      className={cn("rax-editor-tool", className)}
      // Keep the text selection: don't move focus on mouse down.
      onMouseDown={(event) => event.preventDefault()}
      onClick={(event) => {
        if (!unavailable) onClick?.(event)
      }}
      {...props}
    >
      {icon}
    </Button>
  </Tooltip>
))

ToolButton.displayName = "ToolButton"

export function useRovingToolbar(ref: React.RefObject<HTMLDivElement | null>) {
  const items = () => Array.from(ref.current?.querySelectorAll<HTMLElement>("button, a[href]") ?? [])

  const current = React.useRef<HTMLElement | null>(null)

  // After every render: the remembered tool (or the first) is the single tab stop.
  React.useLayoutEffect(() => {
    const all = items()
    const active = current.current && all.includes(current.current) ? current.current : all[0]
    all.forEach((el) => (el.tabIndex = el === active ? 0 : -1))
  })

  const onFocus = (event: React.FocusEvent) => {
    const all = items()
    if (!all.includes(event.target as HTMLElement)) return
    current.current = event.target as HTMLElement
    all.forEach((el) => (el.tabIndex = el === event.target ? 0 : -1))
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    const all = items()
    const index = all.indexOf(document.activeElement as HTMLElement)
    if (index < 0) return
    const rtl = getDirection(ref.current!) === "rtl"
    const step = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1 }[event.key]
    let next: number
    if (step) next = (index + step + all.length) % all.length
    else if (event.key === "Home") next = 0
    else if (event.key === "End") next = all.length - 1
    else return
    event.preventDefault()
    all[next].focus()
  }

  return { onFocus, onKeyDown }
}

export interface ToolbarProps {
  editor: Editor
  state: EditorUiState
  tools: TextEditorTool[]
  labels: TextEditorLabels
  linkOpen: boolean
  onLinkOpenChange: (open: boolean) => void
  className?: string
}

export function Toolbar({ editor, state, tools, labels, linkOpen, onLinkOpenChange, className }: ToolbarProps) {
  const ref = React.useRef<HTMLDivElement>(null)
  const roving = useRovingToolbar(ref)
  const picked = React.useRef(false) // a menu item was chosen → give focus back to the text
  const disabled = !state.editable

  const backToText = (event: Event) => {
    if (!picked.current) return
    event.preventDefault()
    picked.current = false
    editor.commands.focus()
  }

  const headingLabel = state.heading ? labels[`heading${state.heading as 1 | 2 | 3}` as const] : labels.paragraph
  const alignIcon = { start: ICONS.alignStart, center: ICONS.alignCenter, end: ICONS.alignEnd, justify: ICONS.alignJustify }[state.align]

  return (
    <div
      ref={ref}
      role="toolbar"
      aria-label={labels.toolbar}
      aria-disabled={disabled || undefined}
      className={cn("rax-editor-toolbar", className)}
      onFocus={roving.onFocus}
      onKeyDown={roving.onKeyDown}
    >
      {tools.map((tool, i) => {
        if (tool === "|") return <span key={`sep-${i}`} className="rax-editor-sep" role="separator" aria-orientation="vertical" />

        if (tool === "heading") {
          return (
            <DropdownMenu key={tool}>
              <Tooltip content={labels.textStyle}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rax-editor-tool rax-editor-heading-trigger"
                    aria-label={`${labels.textStyle}: ${headingLabel}`}
                    aria-disabled={disabled || undefined}
                    disabled={disabled}
                    onMouseDown={(event) => event.preventDefault()}
                  >
                    <span className="text-truncate">{headingLabel}</span>
                    {ICONS.chevron}
                  </Button>
                </DropdownMenuTrigger>
              </Tooltip>
              <DropdownMenuContent align="start" className="rax-editor-menu" onCloseAutoFocus={backToText}>
                <DropdownMenuRadioGroup
                  value={String(state.heading)}
                  onValueChange={(value) => {
                    picked.current = true
                    const level = Number(value) as 0 | 1 | 2 | 3
                    if (level) editor.chain().focus().setHeading({ level }).run()
                    else editor.chain().focus().setParagraph().run()
                  }}
                >
                  <DropdownMenuRadioItem value="0">
                    <span className="rax-editor-menu-p">{labels.paragraph}</span>
                  </DropdownMenuRadioItem>
                  {([1, 2, 3] as const).map((level) => (
                    <DropdownMenuRadioItem key={level} value={String(level)}>
                      <span className={`rax-editor-menu-h${level}`}>{labels[`heading${level}`]}</span>
                      <span className="rax-editor-menu-kbd" dir="ltr">
                        {formatShortcut(`Mod-Alt-${level}`)}
                      </span>
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        }

        if (tool === "align") {
          const options = [
            ["start", labels.alignStart, ICONS.alignStart, "Mod-Shift-L"],
            ["center", labels.alignCenter, ICONS.alignCenter, "Mod-Shift-E"],
            ["end", labels.alignEnd, ICONS.alignEnd, "Mod-Shift-R"],
            ["justify", labels.alignJustify, ICONS.alignJustify, "Mod-Shift-J"],
          ] as const
          return (
            <DropdownMenu key={tool}>
              <Tooltip content={labels.align}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rax-editor-tool rax-editor-align-trigger"
                    aria-label={labels.align}
                    disabled={disabled}
                    onMouseDown={(event) => event.preventDefault()}
                  >
                    {alignIcon}
                    {ICONS.chevron}
                  </Button>
                </DropdownMenuTrigger>
              </Tooltip>
              <DropdownMenuContent align="start" className="rax-editor-menu" onCloseAutoFocus={backToText}>
                <DropdownMenuRadioGroup
                  value={state.align}
                  onValueChange={(value) => {
                    picked.current = true
                    setAlign(editor, value)
                  }}
                >
                  {options.map(([value, label, icon, shortcut]) => (
                    <DropdownMenuRadioItem key={value} value={value}>
                      <span className="rax-editor-menu-icon">{icon}</span>
                      {label}
                      <span className="rax-editor-menu-kbd" dir="ltr">
                        {formatShortcut(shortcut)}
                      </span>
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        }

        if (tool === "link") {
          return (
            <Popover key={tool} open={linkOpen} onOpenChange={(open) => onLinkOpenChange(open && !disabled && !state.codeBlock)}>
              <PopoverTrigger asChild>
                <ToolButton
                  label={labels.link}
                  shortcut="Mod-K"
                  icon={ICONS.link}
                  active={state.link}
                  unavailable={disabled || state.codeBlock}
                />
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="rax-editor-link-popover"
                // Closing without applying: put the caret back in the text, not on the button.
                onCloseAutoFocus={(event) => {
                  event.preventDefault()
                  editor.commands.focus()
                }}
              >
                <LinkForm editor={editor} href={state.href} labels={labels} onDone={() => onLinkOpenChange(false)} />
              </PopoverContent>
            </Popover>
          )
        }

        const def = TOGGLES[tool]
        return (
          <ToolButton
            key={tool}
            label={labels[tool]}
            shortcut={def.shortcut}
            icon={ICONS[tool]}
            active={def.active?.(state)}
            unavailable={disabled || (def.enabled ? !def.enabled(state) : false)}
            onClick={() => def.run(editor)}
          />
        )
      })}
    </div>
  )
}
