"use client"

// Ported from boot-ui. Built-in SVG paths from Lucide (ISC).
import * as React from "react"
import { Extension, type Editor, type Extensions } from "@tiptap/core"
import { EditorContent, useEditor, useEditorState } from "@tiptap/react"
import { BubbleMenu } from "@tiptap/react/menus"
import { StarterKit } from "@tiptap/starter-kit"
import { CharacterCount, Placeholder } from "@tiptap/extensions"
import { TextAlign } from "@tiptap/extension-text-align"
import { Highlight } from "@tiptap/extension-highlight"
import { TaskItem, TaskList } from "@tiptap/extension-list"
import { useSheenPortalContainer, useSheenTheme, sheenThemeAttributes } from "@/lib/theme"
import { cn } from "@/lib/utils"
import { assignRef } from "@/lib/refs"
import { CountRing } from "@/components/ui/textarea"
import { type TextEditorTool, type TextEditorLabels, DEFAULT_LABELS, TOOLBARS, setAlign, hideBubble, BUBBLE_KEY, BUBBLE_TOOLS } from "./text-editor-config"
import { type Align, IS_MAC, readState, TOGGLES, type ToggleTool } from "./text-editor-state"
import { Toolbar, ToolButton } from "./text-editor-toolbar"
import { LinkForm } from "./text-editor-link"
import { ICONS } from "./text-editor-icons"

export interface TextEditorProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue" | "onBlur" | "dir"> {
  /** HTML. "" means empty. */
  value?: string
  defaultValue?: string
  onChange?: (html: string, editor: Editor) => void
  onBlur?: () => void
  placeholder?: string
  /** `full` (default), `basic`, `none`, or your own list ("|" = separator). */
  toolbar?: "full" | "basic" | "none" | TextEditorTool[]
  /** `bottom` puts the tools in the footer, for comment / chat composers. */
  toolbarPosition?: "top" | "bottom"
  /** Floating glass menu over selected text. Default true. */
  bubbleMenu?: boolean
  /** Character limit (typing stops there). */
  maxLength?: number
  /** Show the counter ring. Needs `maxLength`. */
  showCount?: boolean
  limitLabel?: string
  /** Content at the end of the footer, e.g. a Send button. */
  footerEnd?: React.ReactNode
  minHeight?: number | string
  /** The text area scrolls beyond this; the toolbar stays put. */
  maxHeight?: number | string
  variant?: "glass" | "filled"
  disabled?: boolean
  readOnly?: boolean
  invalid?: boolean
  autoFocus?: boolean
  dir?: "ltr" | "rtl"
  /** Hidden input with the HTML, for plain <form> posts. */
  name?: string
  labels?: Partial<TextEditorLabels>
  /** Extra Tiptap extensions. */
  extensions?: Extensions
  /** The Tiptap editor instance, for anything the props don't cover. */
  editorRef?: React.MutableRefObject<Editor | null>
  /** Class for the editable area. */
  contentClassName?: string
  "aria-invalid"?: boolean | "true" | "false"
  "aria-required"?: boolean | "true" | "false"
}

export const cssSize = (v: number | string | undefined) => (typeof v === "number" ? `${v}px` : v)

const TextEditorClient = React.forwardRef<HTMLDivElement, TextEditorProps>(
  (
    {
      value,
      defaultValue,
      onChange,
      onBlur,
      placeholder,
      toolbar = "full",
      toolbarPosition = "top",
      bubbleMenu = true,
      maxLength,
      showCount = false,
      limitLabel,
      footerEnd,
      minHeight = 140,
      maxHeight,
      variant = "glass",
      disabled = false,
      readOnly = false,
      invalid,
      autoFocus,
      dir,
      name,
      labels: labelsProp,
      extensions = [],
      editorRef,
      className,
      contentClassName,
      style,
      id,
      "aria-label": ariaLabel,
      "aria-labelledby": ariaLabelledBy,
      "aria-describedby": ariaDescribedBy,
      "aria-invalid": ariaInvalid,
      "aria-required": ariaRequired,
      ...props
    },
    ref,
  ) => {
    const portalContainer = useSheenPortalContainer()
    const theme = useSheenTheme()
    const labels = React.useMemo(() => ({ ...DEFAULT_LABELS, ...labelsProp }), [labelsProp])
    const tools = toolbar === "none" ? [] : Array.isArray(toolbar) ? toolbar : TOOLBARS[toolbar]
    const hasLinkTool = tools.includes("link")

    const [linkOpen, setLinkOpen] = React.useState(false)
    const [bubbleLink, setBubbleLink] = React.useState(false)
    const bubbleLinkRef = React.useRef(false)
    const bubbleRef = React.useRef<HTMLDivElement>(null)
    bubbleLinkRef.current = bubbleLink

    // Latest callbacks for the editor, which is created once.
    const latest = React.useRef({ onChange, onBlur, placeholder, hasLinkTool, bubbleMenu })
    latest.current = { onChange, onBlur, placeholder, hasLinkTool, bubbleMenu }
    const lastEmitted = React.useRef<string | undefined>(value)

    // Accessibility attributes live on the contenteditable element.
    const isInvalid = invalid || ariaInvalid === true || ariaInvalid === "true"
    const attributes = Object.fromEntries(
      Object.entries({
        class: cn("sheen-prose sheen-editor-content", contentClassName),
        role: "textbox",
        "aria-multiline": "true",
        id,
        "aria-label": ariaLabel,
        "aria-labelledby": ariaLabelledBy,
        "aria-describedby": ariaDescribedBy,
        "aria-invalid": isInvalid ? "true" : undefined,
        "aria-required": ariaRequired === true || ariaRequired === "true" ? "true" : undefined,
        "aria-readonly": readOnly ? "true" : undefined,
        "aria-disabled": disabled ? "true" : undefined,
        "aria-placeholder": placeholder,
      }).filter(([, v]) => v !== undefined),
    ) as Record<string, string>

    const editor = useEditor({
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
          link: { openOnClick: false, autolink: true, defaultProtocol: "https", HTMLAttributes: { rel: "noopener noreferrer nofollow" } },
        }),
        Placeholder.configure({ placeholder: () => latest.current.placeholder ?? "" }),
        CharacterCount.configure({ limit: maxLength ?? null }),
        TextAlign.configure({ types: ["heading", "paragraph"], alignments: ["start", "center", "end", "justify"], defaultAlignment: null }),
        Highlight,
        TaskList,
        TaskItem.configure({ nested: true }),
        // dir="auto" on text blocks only. On every node (Tiptap's textDirection) a list
        // would skip its children's text when guessing direction and fall back to LTR.
        Extension.create({
          name: "sheenAutoDirection",
          addGlobalAttributes: () => [
            {
              types: ["paragraph", "heading"],
              attributes: {
                dir: {
                  default: "auto",
                  parseHTML: (element) => element.getAttribute("dir") || "auto",
                  renderHTML: (attributes) => ({ dir: attributes.dir }),
                },
              },
            },
          ],
        }),
        Extension.create({
          name: "sheenShortcuts",
          priority: 1000, // before TextAlign's left / right shortcuts
          addKeyboardShortcuts() {
            const align = (value: Align) => () => setAlign(this.editor, value)
            return {
              "Mod-Shift-l": align("start"),
              "Mod-Shift-e": align("center"),
              "Mod-Shift-r": align("end"),
              "Mod-Shift-j": align("justify"),
            }
          },
        }),
        ...extensions,
      ],
      // The view installs initial content after the first state snapshot; refresh toolbar and counter once ready.
      onCreate: ({ editor }) => editor.view.dispatch(editor.state.tr.setMeta("addToHistory", false)),
      content: value ?? defaultValue ?? "",
      editable: !disabled && !readOnly,
      autofocus: autoFocus ? "end" : false,
      // useEditor re-applies options on every render, so these stay current.
      editorProps: {
        attributes,
        // ⌘K / Ctrl+K: link. Handled here (not as a Tiptap shortcut) so the event can be
        // stopped before page-level shortcuts, like a command palette, see it too.
        handleKeyDown: (view, event) => {
          const mod = IS_MAC ? event.metaKey : event.ctrlKey
          if (!mod || event.altKey || event.shiftKey || event.key.toLowerCase() !== "k") return false
          const { hasLinkTool, bubbleMenu } = latest.current
          if (bubbleMenu && !view.state.selection.empty) setBubbleLink(true)
          else if (hasLinkTool) setLinkOpen(true)
          else return false
          event.preventDefault()
          event.stopPropagation()
          return true
        },
      },
      onUpdate: ({ editor }) => {
        const html = editor.isEmpty ? "" : editor.getHTML()
        lastEmitted.current = html
        latest.current.onChange?.(html, editor)
      },
      onBlur: ({ editor, event }) => {
        // The bubble lives in <body>, so Tiptap can't tell focus left for another field: hide it here.
        if (!bubbleRef.current?.contains(event.relatedTarget as Node | null)) hideBubble(editor)
        latest.current.onBlur?.()
      },
    })

    const snapshot = useEditorState({ editor, selector: ({ editor }) => (editor ? readState(editor) : null) })
    const state = snapshot ? { ...snapshot, editable: !disabled && !readOnly } : null

    // Controlled value: only push content that didn't come from the editor itself.
    React.useEffect(() => {
      if (!editor || value === undefined || value === lastEmitted.current) return
      const current = editor.isEmpty ? "" : editor.getHTML()
      if (value !== current) editor.commands.setContent(value || "", { emitUpdate: false })
      lastEmitted.current = value
    }, [editor, value])

    React.useEffect(() => {
      editor?.setEditable(!disabled && !readOnly, false)
    }, [editor, disabled, readOnly])

    // Expose the editable element (ref) and the editor instance (editorRef).
    React.useEffect(() => {
      if (!editor) return
      const dom = editor.view.dom as HTMLDivElement
      assignRef(ref, dom)
      if (editorRef) editorRef.current = editor
      return () => {
        assignRef(ref, null)
        if (editorRef) editorRef.current = null
      }
    }, [editor, ref, editorRef])

    // <label for={id}> can't focus a contenteditable by itself.
    React.useEffect(() => {
      if (!editor || !id) return
      const onClick = (event: MouseEvent) => {
        if ((event.target as HTMLElement).closest(`label[for="${CSS.escape(id)}"]`)) editor.commands.focus()
      }
      document.addEventListener("click", onClick)
      return () => document.removeEventListener("click", onClick)
    }, [editor, id])

    const characters = state?.characters ?? 0
    const counter = showCount && maxLength !== undefined
    const toolbarNode =
      editor && state && tools.length > 0 ? (
        <Toolbar
          editor={editor}
          state={state}
          tools={tools}
          labels={labels}
          linkOpen={linkOpen}
          onLinkOpenChange={setLinkOpen}
          className={toolbarPosition === "bottom" ? "sheen-editor-toolbar-inline" : undefined}
        />
      ) : null
    const footer = toolbarPosition === "bottom" ? toolbarNode : null

    return (
      <div
        className={cn("sheen-editor", className)}
        data-variant={variant}
        data-disabled={disabled || undefined}
        data-readonly={readOnly || undefined}
        data-invalid={isInvalid || undefined}
        dir={dir}
        style={{ ...style, "--sheen-editor-min-h": cssSize(minHeight), "--sheen-editor-max-h": cssSize(maxHeight) } as React.CSSProperties}
        {...props}
      >
        {toolbarPosition === "top" && toolbarNode}

        <EditorContent
          editor={editor}
          className="sheen-editor-scroll"
          // Clicking the padding below the last line still puts the caret in the text.
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && editor) {
              event.preventDefault()
              editor.commands.focus("end")
            }
          }}
        />

        {(footer || counter || footerEnd) && (
          <div className="sheen-editor-footer">
            <div className="sheen-editor-footer-start">{footer}</div>
            {counter && <CountRing length={characters} max={maxLength!} limitLabel={limitLabel} />}
            {footerEnd}
          </div>
        )}

        {name !== undefined && (
          <input type="hidden" name={name} value={editor ? (editor.isEmpty ? "" : editor.getHTML()) : (value ?? defaultValue ?? "")} />
        )}

        {editor && state && bubbleMenu && (
          <BubbleMenu
            ref={bubbleRef}
            pluginKey={BUBBLE_KEY}
            editor={editor}
            {...sheenThemeAttributes(theme)}
            className="sheen-editor-bubble"
            dir={dir}
            data-mode={bubbleLink ? "link" : undefined}
            appendTo={() => portalContainer ?? document.body}
            options={{ placement: "top", offset: 8, flip: true, shift: { padding: 8 } }}
            shouldShow={({ editor: e, view, state: s, element }) => {
              if (bubbleLinkRef.current) return true
              const focused = view.hasFocus() || element.contains(document.activeElement)
              if (!focused || !e.isEditable || s.selection.empty || e.isActive("codeBlock")) return false
              return s.doc.textBetween(s.selection.from, s.selection.to).trim().length > 0
            }}
          >
            {bubbleLink ? (
              <LinkForm
                editor={editor}
                href={state.href}
                labels={labels}
                onDone={() => {
                  setBubbleLink(false)
                  editor.commands.focus()
                }}
                onDismiss={() => {
                  bubbleLinkRef.current = false // read by shouldShow before React re-renders
                  setBubbleLink(false)
                  hideBubble(editor)
                }}
              />
            ) : (
              <div className="sheen-editor-bubble-tools" role="toolbar" aria-label={labels.toolbar}>
                {BUBBLE_TOOLS.map((tool, i) => {
                  if (tool === "|") return <span key={`sep-${i}`} className="sheen-editor-sep" role="separator" aria-orientation="vertical" />
                  if (tool === "link") {
                    return (
                      <ToolButton
                        key={tool}
                        label={labels.link}
                        shortcut="Mod-K"
                        icon={ICONS.link}
                        active={state.link}
                        onClick={() => setBubbleLink(true)}
                      />
                    )
                  }
                  const def = TOGGLES[tool as ToggleTool]
                  return (
                    <ToolButton
                      key={tool}
                      label={labels[tool as ToggleTool]}
                      shortcut={def.shortcut}
                      icon={ICONS[tool as ToggleTool]}
                      active={def.active?.(state)}
                      onClick={() => def.run(editor)}
                    />
                  )
                })}
              </div>
            )}
          </BubbleMenu>
        )}
      </div>
    )
  },
)

TextEditorClient.displayName = "TextEditorClient"

// Tiptap allocates random instance IDs even with immediatelyRender:false; defer its hooks until hydration.
export const TextEditor = React.forwardRef<HTMLDivElement, TextEditorProps>((props, ref) => {
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  return mounted ? <TextEditorClient {...props} ref={ref} /> : (
    <div className={cn("sheen-editor", props.className)} aria-busy="true" style={{ minHeight: cssSize(props.minHeight ?? 140), ...props.style }}>
      {props.name !== undefined && <input type="hidden" name={props.name} value={props.value ?? props.defaultValue ?? ""} />}
    </div>
  )
})
TextEditor.displayName = "TextEditor"

export function htmlToText(html: string) {
  if (!html) return ""
  if (typeof DOMParser === "undefined") return html.replace(/<[^>]*>/g, "")
  // DOMParser documents are inert: no scripts, no image loads (unlike innerHTML on a live element).
  return new DOMParser().parseFromString(html, "text/html").body.textContent ?? ""
}
export type { TextEditorTool } from "./text-editor-config"
export type { TextEditorLabels } from "./text-editor-config"
