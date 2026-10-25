"use client"

// Ported from boot-ui. Built-in SVG paths from Lucide (ISC).
import { type Editor } from "@tiptap/core"
import { type TextEditorTool } from "./text-editor-config"

export const IS_MAC = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)

export function formatShortcut(keys: string) {
  const parts = keys.split("-")
  const key = parts.pop()!.toUpperCase()
  if (IS_MAC) {
    const symbols: Record<string, string> = { Alt: "⌥", Shift: "⇧", Mod: "⌘" }
    const order = ["Alt", "Shift", "Mod"]
    return (
      parts
        .sort((a, b) => order.indexOf(a) - order.indexOf(b))
        .map((p) => symbols[p])
        .join("") + key
    )
  }
  return [...parts.map((p) => (p === "Mod" ? "Ctrl" : p)), key].join("+")
}

export type Align = "start" | "center" | "end" | "justify"

export function readState(editor: Editor) {
  return {
    bold: editor.isActive("bold"),
    italic: editor.isActive("italic"),
    underline: editor.isActive("underline"),
    strike: editor.isActive("strike"),
    code: editor.isActive("code"),
    highlight: editor.isActive("highlight"),
    link: editor.isActive("link"),
    href: (editor.getAttributes("link").href as string | undefined) ?? "",
    bulletList: editor.isActive("bulletList"),
    orderedList: editor.isActive("orderedList"),
    taskList: editor.isActive("taskList"),
    blockquote: editor.isActive("blockquote"),
    codeBlock: editor.isActive("codeBlock"),
    heading: ([1, 2, 3] as const).find((level) => editor.isActive("heading", { level })) ?? 0,
    align: ((["center", "end", "justify"] as const).find((a) => editor.isActive({ textAlign: a })) ?? "start") as Align,
    canUndo: editor.can().undo(),
    canRedo: editor.can().redo(),
    characters: (editor.storage as { characterCount?: { characters: () => number } }).characterCount?.characters() ?? 0,
    editable: editor.isEditable,
  }
}

export type EditorUiState = ReturnType<typeof readState>

export type ToggleTool = Exclude<TextEditorTool, "heading" | "align" | "link" | "|">

export const TOGGLES: Record<
  ToggleTool,
  { shortcut?: string; active?: (s: EditorUiState) => boolean; run: (e: Editor) => void; enabled?: (s: EditorUiState) => boolean }
> = {
  undo: { shortcut: "Mod-Z", run: (e) => e.chain().focus().undo().run(), enabled: (s) => s.canUndo },
  redo: { shortcut: "Mod-Shift-Z", run: (e) => e.chain().focus().redo().run(), enabled: (s) => s.canRedo },
  bold: { shortcut: "Mod-B", active: (s) => s.bold, run: (e) => e.chain().focus().toggleBold().run() },
  italic: { shortcut: "Mod-I", active: (s) => s.italic, run: (e) => e.chain().focus().toggleItalic().run() },
  underline: { shortcut: "Mod-U", active: (s) => s.underline, run: (e) => e.chain().focus().toggleUnderline().run() },
  strike: { shortcut: "Mod-Shift-S", active: (s) => s.strike, run: (e) => e.chain().focus().toggleStrike().run() },
  code: { shortcut: "Mod-E", active: (s) => s.code, run: (e) => e.chain().focus().toggleCode().run() },
  highlight: { shortcut: "Mod-Shift-H", active: (s) => s.highlight, run: (e) => e.chain().focus().toggleHighlight().run() },
  bulletList: { shortcut: "Mod-Shift-8", active: (s) => s.bulletList, run: (e) => e.chain().focus().toggleBulletList().run() },
  orderedList: { shortcut: "Mod-Shift-7", active: (s) => s.orderedList, run: (e) => e.chain().focus().toggleOrderedList().run() },
  taskList: { shortcut: "Mod-Shift-9", active: (s) => s.taskList, run: (e) => e.chain().focus().toggleTaskList().run() },
  blockquote: { shortcut: "Mod-Shift-B", active: (s) => s.blockquote, run: (e) => e.chain().focus().toggleBlockquote().run() },
  codeBlock: { shortcut: "Mod-Alt-C", active: (s) => s.codeBlock, run: (e) => e.chain().focus().toggleCodeBlock().run() },
  horizontalRule: { run: (e) => e.chain().focus().setHorizontalRule().run() },
  clear: { run: (e) => e.chain().focus().unsetAllMarks().clearNodes().run() },
}
