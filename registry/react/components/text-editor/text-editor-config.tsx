"use client"

// Ported from boot-ui. Built-in SVG paths from Lucide (ISC).
import { type Editor } from "@tiptap/core"

export type TextEditorTool =
  | "undo"
  | "redo"
  | "heading"
  | "bold"
  | "italic"
  | "underline"
  | "strike"
  | "code"
  | "highlight"
  | "link"
  | "bulletList"
  | "orderedList"
  | "taskList"
  | "align"
  | "blockquote"
  | "codeBlock"
  | "horizontalRule"
  | "clear"
  | "|"

export const TOOLBARS: Record<"full" | "basic", TextEditorTool[]> = {
  full: [
    "undo",
    "redo",
    "|",
    "heading",
    "|",
    "bold",
    "italic",
    "underline",
    "strike",
    "highlight",
    "code",
    "|",
    "link",
    "|",
    "bulletList",
    "orderedList",
    "taskList",
    "|",
    "align",
    "|",
    "blockquote",
    "codeBlock",
    "horizontalRule",
    "|",
    "clear",
  ],
  basic: ["bold", "italic", "underline", "|", "link", "|", "bulletList", "orderedList"],
}

export const BUBBLE_KEY = "sheenBubbleMenu"

export const hideBubble = (editor: Editor) => editor.view.dispatch(editor.state.tr.setMeta(BUBBLE_KEY, "hide"))

export const setAlign = (editor: Editor, value: string) =>
  value === "start" ? editor.chain().focus().unsetTextAlign().run() : editor.chain().focus().setTextAlign(value).run()

export const BUBBLE_TOOLS: TextEditorTool[] = ["bold", "italic", "underline", "strike", "highlight", "code", "|", "link"]

export const DEFAULT_LABELS = {
  toolbar: "Formatting",
  undo: "Undo",
  redo: "Redo",
  textStyle: "Text style",
  paragraph: "Normal text",
  heading1: "Heading 1",
  heading2: "Heading 2",
  heading3: "Heading 3",
  bold: "Bold",
  italic: "Italic",
  underline: "Underline",
  strike: "Strikethrough",
  code: "Inline code",
  highlight: "Highlight",
  link: "Link",
  bulletList: "Bulleted list",
  orderedList: "Numbered list",
  taskList: "Checklist",
  align: "Alignment",
  alignStart: "Align start",
  alignCenter: "Center",
  alignEnd: "Align end",
  alignJustify: "Justify",
  blockquote: "Quote",
  codeBlock: "Code block",
  horizontalRule: "Divider",
  clear: "Clear formatting",
  linkPlaceholder: "Paste or type a link",
  linkApply: "Apply",
  linkRemove: "Remove link",
  linkOpen: "Open link",
}

export type TextEditorLabels = typeof DEFAULT_LABELS
