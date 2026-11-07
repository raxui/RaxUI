// RaxUI TextEditor behavior over the bundled Tiptap engine (TextEditorContent.razor.js, ADR 020). Source-owned: edit freely.
// Toolbar state, menus, the link form and the counter update here, so formatting never waits for a server round trip;
// .NET receives the HTML debounced (300 ms and on blur), as a stream when it is large.
import { BubbleMenu, CharacterCount, Editor, Extension, Highlight, Placeholder, StarterKit, TaskItem, TaskList, TextAlign } from "./TextEditorContent.razor.js"

const instances = new Map()
const IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)
const THEME = ["data-bs-theme", "data-rax-appearance", "data-rax-accent", "data-rax-density", "dir"]
const STREAM_AT = 16000 // characters; SignalR's default message limit is 32 KB

export function formatShortcut(keys) {
  const parts = keys.split("-"), key = parts.pop().toUpperCase()
  if (IS_MAC) return parts.sort((a, b) => ["Alt", "Shift", "Mod"].indexOf(a) - ["Alt", "Shift", "Mod"].indexOf(b)).map((p) => ({ Alt: "⌥", Shift: "⇧", Mod: "⌘" })[p]).join("") + key
  return [...parts.map((p) => (p === "Mod" ? "Ctrl" : p)), key].join("+")
}

export function normalizeHref(raw) {
  const url = raw.trim()
  if (!url) return ""
  if (/^(https?:|mailto:|tel:|\/|#)/i.test(url)) return url
  if (/^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(url)) return `mailto:${url}`
  return `https://${url}`
}

const setAlign = (editor, value) => value === "start" ? editor.chain().focus().unsetTextAlign().run() : editor.chain().focus().setTextAlign(value).run()
const COMMANDS = {
  undo: (e) => e.chain().focus().undo().run(),
  redo: (e) => e.chain().focus().redo().run(),
  bold: (e) => e.chain().focus().toggleBold().run(),
  italic: (e) => e.chain().focus().toggleItalic().run(),
  underline: (e) => e.chain().focus().toggleUnderline().run(),
  strike: (e) => e.chain().focus().toggleStrike().run(),
  code: (e) => e.chain().focus().toggleCode().run(),
  highlight: (e) => e.chain().focus().toggleHighlight().run(),
  bulletList: (e) => e.chain().focus().toggleBulletList().run(),
  orderedList: (e) => e.chain().focus().toggleOrderedList().run(),
  taskList: (e) => e.chain().focus().toggleTaskList().run(),
  blockquote: (e) => e.chain().focus().toggleBlockquote().run(),
  codeBlock: (e) => e.chain().focus().toggleCodeBlock().run(),
  horizontalRule: (e) => e.chain().focus().setHorizontalRule().run(),
  clear: (e) => e.chain().focus().unsetAllMarks().clearNodes().run(),
  heading: (e, el) => { const level = Number(el.dataset.level); return level ? e.chain().focus().setHeading({ level }).run() : e.chain().focus().setParagraph().run() },
  align: (e, el) => setAlign(e, el.dataset.align),
}

function readState(editor) {
  return {
    bold: editor.isActive("bold"), italic: editor.isActive("italic"), underline: editor.isActive("underline"), strike: editor.isActive("strike"),
    code: editor.isActive("code"), highlight: editor.isActive("highlight"), link: editor.isActive("link"), href: editor.getAttributes("link").href ?? "",
    bulletList: editor.isActive("bulletList"), orderedList: editor.isActive("orderedList"), taskList: editor.isActive("taskList"),
    blockquote: editor.isActive("blockquote"), codeBlock: editor.isActive("codeBlock"),
    heading: [1, 2, 3].find((level) => editor.isActive("heading", { level })) ?? 0,
    align: ["center", "end", "justify"].find((a) => editor.isActive({ textAlign: a })) ?? "start",
    undo: editor.can().undo(), redo: editor.can().redo(), characters: editor.storage.characterCount?.characters() ?? 0, editable: editor.isEditable,
  }
}

function applyLink(editor, raw) {
  const href = normalizeHref(raw), chain = editor.chain().focus()
  if (!href) return chain.extendMarkRange("link").unsetLink().run()
  // Nothing selected and not inside a link: insert the URL itself as the link text.
  if (editor.state.selection.empty && !editor.isActive("link")) return chain.insertContent({ type: "text", text: raw.trim(), marks: [{ type: "link", attrs: { href } }] }).run()
  return chain.extendMarkRange("link").setLink({ href }).run()
}

// One tab stop per toolbar; arrows, Home and End move between tools (reversed in RTL).
function roving(toolbar, signal) {
  const items = () => [...toolbar.querySelectorAll("button:not([popover] *), a[href]:not([popover] *)")]
  let current = null
  const reset = () => { const all = items(); const active = current && all.includes(current) ? current : all[0]; all.forEach((el) => (el.tabIndex = el === active ? 0 : -1)) }
  toolbar.addEventListener("focusin", (event) => { if (items().includes(event.target)) { current = event.target; reset() } }, { signal })
  toolbar.addEventListener("keydown", (event) => {
    const all = items(), index = all.indexOf(document.activeElement)
    if (index < 0) return
    const rtl = getComputedStyle(toolbar).direction === "rtl", step = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1 }[event.key]
    const next = step ? (index + step + all.length) % all.length : event.key === "Home" ? 0 : event.key === "End" ? all.length - 1 : -1
    if (next < 0) return
    event.preventDefault(); all[next].focus()
  }, { signal })
  reset()
  return reset
}

export function init(key, root, dotnet, options) {
  if (!root?.isConnected || instances.has(key)) return
  const controller = new AbortController(), signal = controller.signal
  const listen = (target, type, handler, opts) => target.addEventListener(type, handler, { signal, ...opts })
  const mount = root.querySelector("[data-editor-mount]")
  const s = { root, dotnet, options, controller, sent: options.value, timer: 0, bubbleLink: false }
  instances.set(key, s)

  // The bubble menu lives in <body>, so it is never clipped; it takes the editor's theme attributes along.
  const template = root.querySelector("template[data-editor-bubble]")
  const source = template && (template.content.firstElementChild ?? template.firstElementChild)
  const bubble = source?.cloneNode(true)
  if (bubble) {
    for (const name of THEME) { const value = root.closest(`[${name}]`)?.getAttribute(name); if (value && !bubble.hasAttribute(name)) bubble.setAttribute(name, value) }
    // Out of flow and content-sized from the start: measured as a full-width block, the first placement lands at the edge.
    Object.assign(bubble.style, { visibility: "hidden", position: "absolute", top: "0", left: "0", width: "max-content" })
    document.body.append(bubble)
  }
  s.bubble = bubble

  const push = (html, now) => {
    clearTimeout(s.timer)
    const send = () => {
      if (html === s.sent || !instances.has(key)) return
      s.sent = html
      if (html.length > STREAM_AT) s.dotnet.invokeMethodAsync("ChangedStream", DotNet.createJSStreamReference(new TextEncoder().encode(html)))
      else s.dotnet.invokeMethodAsync("Changed", html)
    }
    if (now) send(); else s.timer = setTimeout(send, 300)
  }
  const html = () => (s.editor.isEmpty ? "" : s.editor.getHTML())

  const editor = new Editor({
    element: mount,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false, autolink: true, defaultProtocol: "https", HTMLAttributes: { rel: "noopener noreferrer nofollow" } },
      }),
      Placeholder.configure({ placeholder: () => s.options.placeholder }),
      CharacterCount.configure({ limit: options.maxLength ?? null }),
      TextAlign.configure({ types: ["heading", "paragraph"], alignments: ["start", "center", "end", "justify"], defaultAlignment: null }),
      Highlight,
      TaskList,
      TaskItem.configure({ nested: true }),
      // dir="auto" on text blocks only, so lists still guess direction from their items' text.
      Extension.create({
        name: "raxAutoDirection",
        addGlobalAttributes: () => [{ types: ["paragraph", "heading"], attributes: { dir: { default: "auto", parseHTML: (el) => el.getAttribute("dir") || "auto", renderHTML: (a) => ({ dir: a.dir }) } } }],
      }),
      Extension.create({
        name: "raxShortcuts",
        priority: 1000, // before TextAlign's left / right shortcuts
        addKeyboardShortcuts() {
          const align = (value) => () => setAlign(this.editor, value)
          return { "Mod-Shift-l": align("start"), "Mod-Shift-e": align("center"), "Mod-Shift-r": align("end"), "Mod-Shift-j": align("justify") }
        },
      }),
      ...(bubble ? [BubbleMenu.configure({
        element: bubble,
        appendTo: () => document.body,
        pluginKey: "raxBubbleMenu",
        options: { placement: "top", offset: 8, flip: true, shift: { padding: 8 } },
        shouldShow: ({ editor: e, view, state, element }) => {
          if (s.bubbleLink) return true
          const focused = view.hasFocus() || element.contains(document.activeElement)
          if (!focused || !e.isEditable || state.selection.empty || e.isActive("codeBlock")) return false
          return state.doc.textBetween(state.selection.from, state.selection.to).trim().length > 0
        },
      })] : []),
    ],
    content: options.value,
    editable: options.editable,
    autofocus: options.autofocus ? "end" : false,
    editorProps: {
      attributes: { ...attributes(options), class: `rax-typeset rax-prose rax-editor-content ${options.contentClass ?? ""}`.trim() },
      // Ctrl/⌘+K: link. Stopped here so page-level shortcuts (a command palette) don't also see it.
      handleKeyDown: (view, event) => {
        const mod = IS_MAC ? event.metaKey : event.ctrlKey
        if (!mod || event.altKey || event.shiftKey || event.key.toLowerCase() !== "k") return false
        if (bubble && !view.state.selection.empty) openBubbleLink()
        else if (s.options.hasLink) root.querySelector("[data-editor-link-popover]")?.showPopover()
        else return false
        event.preventDefault(); event.stopPropagation()
        return true
      },
    },
    onUpdate: () => { const value = html(); const input = root.querySelector("[data-editor-value]"); if (input) input.value = value; push(value, false) },
    onBlur: ({ event }) => {
      if (!bubble?.contains(event.relatedTarget)) hideBubble()
      push(html(), true)
      s.dotnet.invokeMethodAsync("Blurred")
    },
    onTransaction: () => render(),
    onCreate: () => s.dotnet.invokeMethodAsync("Mounted"),
  })
  s.editor = editor
  // The bubble shows either its tools or the link form.
  const bubbleMode = (link) => {
    if (!bubble) return
    s.bubbleLink = link
    if (link) bubble.dataset.mode = "link"; else bubble.removeAttribute("data-mode")
    bubble.querySelector(".rax-editor-bubble-tools").hidden = link
    bubble.querySelector("[data-editor-link-form]").hidden = !link
  }
  bubbleMode(false)
  const hideBubble = () => { bubbleMode(false); editor.view.dispatch(editor.state.tr.setMeta("raxBubbleMenu", "hide")) }
  const openBubbleLink = () => { bubbleMode(true); fillLink(bubble.querySelector("[data-editor-link-form]")); editor.view.dispatch(editor.state.tr.setMeta("raxBubbleMenu", "updatePosition")) }

  // Shortcuts in titles and menus, in the platform's notation.
  for (const el of [root, bubble].filter(Boolean).flatMap((r) => [...r.querySelectorAll("[data-shortcut]")])) if (el.dataset.shortcut) el.title = `${el.getAttribute("aria-label")} (${formatShortcut(el.dataset.shortcut)})`
  for (const el of root.querySelectorAll("[data-kbd]")) el.textContent = formatShortcut(el.dataset.kbd)

  function render() {
    const editor = s.editor
    if (!editor) return // transactions can run while the editor is being constructed
    const state = readState(editor), editable = state.editable
    for (const scope of [root, bubble].filter(Boolean)) {
      for (const el of scope.querySelectorAll("[data-editor-command]")) {
        const command = el.dataset.editorCommand
        if (command === "heading") { el.setAttribute("aria-checked", String(Number(el.dataset.level) === state.heading)); continue }
        if (command === "align") { el.setAttribute("aria-checked", String(el.dataset.align === state.align)); continue }
        if (el.hasAttribute("aria-pressed")) { el.setAttribute("aria-pressed", String(!!state[command])); el.toggleAttribute("data-active", !!state[command]) }
        const unavailable = !editable || (command === "undo" && !state.undo) || (command === "redo" && !state.redo) || (command === "link" && state.codeBlock)
        if (unavailable) el.setAttribute("aria-disabled", "true"); else el.removeAttribute("aria-disabled")
      }
    }
    const heading = s.options.headings[state.heading]
    const label = root.querySelector("[data-editor-heading-label]")
    if (label) { label.textContent = heading; label.closest("button")?.setAttribute("aria-label", `${s.options.textStyle}: ${heading}`) }
    for (const icon of root.querySelectorAll("[data-editor-align-icon]")) icon.hidden = icon.dataset.editorAlignIcon !== state.align
    for (const button of root.querySelectorAll(".rax-editor-heading-trigger, .rax-editor-align-trigger")) button.disabled = !editable
    const count = root.querySelector("[data-editor-count]")
    if (count && s.options.maxLength) {
      const max = s.options.maxLength, length = state.characters
      const status = length >= max ? "limit" : max - length <= Math.max(10, Math.round(max * 0.1)) ? "warn" : null
      if (status) count.dataset.state = status; else count.removeAttribute("data-state")
      count.querySelector(".rax-textarea-count-bar").style.strokeDashoffset = String(1 - Math.min(length / max, 1))
      count.querySelector(".rax-textarea-count-text").textContent = status ? String(max - length) : `${length} / ${max}`
      count.querySelector("[data-count-status]").textContent = status === "limit" ? s.options.limitLabel : ""
    }
    s.state = state
  }

  // Commands: tool buttons, menu items and bubble tools share one handler.
  const run = (event) => {
    const el = event.target.closest("[data-editor-command]")
    if (!el || el.getAttribute("aria-disabled") === "true") return
    const command = el.dataset.editorCommand
    if (command === "link") {
      if (el.closest(".rax-editor-bubble")) { event.preventDefault(); openBubbleLink() }
      return // the toolbar link button opens its popover natively
    }
    COMMANDS[command]?.(editor, el)
  }
  // Keep the text selection: tools don't take focus on mouse down.
  const keepSelection = (event) => { if (event.target.closest("[data-editor-command]:not([role^=menuitem])")) event.preventDefault() }
  for (const scope of [root, bubble].filter(Boolean)) { listen(scope, "click", run); listen(scope, "mousedown", keepSelection) }

  // Link forms (toolbar popover and bubble) apply, open and remove links.
  function fillLink(form) {
    if (!form) return
    const href = s.state?.href ?? ""
    form.querySelector("[data-editor-link-input]").value = href
    const open = form.querySelector("[data-editor-link-open]"); open.hidden = !href; if (href) open.href = href; else open.removeAttribute("href")
    form.querySelector("[data-editor-link-remove]").hidden = !href
    requestAnimationFrame(() => form.querySelector("[data-editor-link-input]").focus())
  }
  const closeLink = (form) => {
    const popover = form.closest("[popover]")
    if (popover?.matches(":popover-open")) popover.hidePopover()
    if (form.closest(".rax-editor-bubble")) bubbleMode(false)
    editor.commands.focus()
  }
  for (const form of [root, bubble].filter(Boolean).flatMap((r) => [...r.querySelectorAll("[data-editor-link-form]")])) {
    listen(form, "submit", (event) => { event.preventDefault(); event.stopPropagation(); applyLink(editor, form.querySelector("[data-editor-link-input]").value); closeLink(form) })
    listen(form.querySelector("[data-editor-link-remove]"), "click", () => { editor.chain().focus().extendMarkRange("link").unsetLink().run(); closeLink(form) })
    listen(form, "keydown", (event) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closeLink(form) } })
    if (form.closest(".rax-editor-bubble")) listen(form, "focusout", (event) => { if (!form.contains(event.relatedTarget)) hideBubble() })
  }
  const popover = root.querySelector("[data-editor-link-popover]")
  if (popover) listen(popover, "toggle", (event) => {
    if (event.newState === "open") { if (!editor.isEditable || s.state?.codeBlock) popover.hidePopover(); else fillLink(popover.querySelector("[data-editor-link-form]")) }
  })
  // A menu choice returns the caret to the text.
  for (const menu of root.querySelectorAll("[data-editor-menu]")) listen(menu, "click", (event) => { if (event.target.closest("[role^=menuitem]")) requestAnimationFrame(() => editor.commands.focus()) })

  // <label for=id> can't focus a contenteditable by itself; clicking the padding below the text still places the caret.
  listen(document, "click", (event) => { const id = s.options.attributes?.id; if (id && event.target.closest(`label[for="${CSS.escape(id)}"]`)) editor.commands.focus() })
  listen(root.querySelector("[data-editor-scroll]"), "mousedown", (event) => { if (event.target === event.currentTarget || event.target === mount) { event.preventDefault(); editor.commands.focus("end") } })

  for (const toolbar of root.querySelectorAll("[data-editor-toolbar]")) roving(toolbar, signal)
  render()
}

function attributes(options) {
  return Object.fromEntries(Object.entries({ role: "textbox", "aria-multiline": "true", ...(options.attributes ?? {}), "aria-readonly": options.editable ? undefined : "true" }).filter(([, v]) => v !== undefined && v !== null).map(([k, v]) => [k, String(v)]))
}

export function setValue(key, value) {
  const s = instances.get(key)
  if (!s) return
  const current = s.editor.isEmpty ? "" : s.editor.getHTML()
  if (value !== current) s.editor.commands.setContent(value || "", { emitUpdate: false })
  s.sent = value
}

export function configure(key, options) {
  const s = instances.get(key)
  if (!s) return
  s.options = { ...s.options, ...options }
  s.editor.setEditable(options.editable, false)
  s.editor.setOptions({ editorProps: { ...s.editor.options.editorProps, attributes: { ...attributes(s.options), class: s.editor.options.editorProps.attributes.class } } })
  const count = s.editor.extensionManager.extensions.find((e) => e.name === "characterCount")
  if (count) count.options.limit = options.maxLength ?? null
  s.editor.view.dispatch(s.editor.state.tr.setMeta("addToHistory", false))
}

// Returns the HTML now; the caller applies it, so the pending debounced push is cancelled.
export function flush(key) {
  const s = instances.get(key)
  if (!s) return ""
  clearTimeout(s.timer)
  s.sent = s.editor.isEmpty ? "" : s.editor.getHTML()
  return s.sent
}

export function focus(key) { instances.get(key)?.editor.commands.focus() }
export function clear(key) { instances.get(key)?.editor.commands.clearContent(true) }

export function dispose(key) {
  const s = instances.get(key)
  if (!s) return
  instances.delete(key)
  clearTimeout(s.timer)
  s.controller.abort()
  s.editor.destroy()
  s.bubble?.remove()
}
