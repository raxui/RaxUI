// Entry for the Blazor TextEditor engine bundle (ADR 020). Only re-exports pinned Tiptap 3.31.4 modules;
// SheenUI behavior lives in registry/blazor/components/text-editor/TextEditor.razor.js.
export { Editor, Extension } from "@tiptap/core"
export { StarterKit } from "@tiptap/starter-kit"
export { CharacterCount, Placeholder } from "@tiptap/extensions"
export { TextAlign } from "@tiptap/extension-text-align"
export { Highlight } from "@tiptap/extension-highlight"
export { TaskItem, TaskList } from "@tiptap/extension-list"
export { BubbleMenu } from "@tiptap/extension-bubble-menu"
