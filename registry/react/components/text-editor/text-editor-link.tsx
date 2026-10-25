"use client"

// Ported from boot-ui. Built-in SVG paths from Lucide (ISC).
import * as React from "react"
import { type Editor } from "@tiptap/core"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tooltip } from "@/components/ui/tooltip"
import { type TextEditorLabels } from "./text-editor-config"
import { ICONS } from "./text-editor-icons"

export function normalizeHref(raw: string) {
  const url = raw.trim()
  if (!url) return ""
  if (/^(https?:|mailto:|tel:|\/|#)/i.test(url)) return url
  if (/^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(url)) return `mailto:${url}`
  return `https://${url}`
}

export function applyLink(editor: Editor, raw: string) {
  const href = normalizeHref(raw)
  const chain = editor.chain().focus()
  if (!href) return chain.extendMarkRange("link").unsetLink().run()
  // Nothing selected and not inside a link: insert the URL itself as the link text.
  if (editor.state.selection.empty && !editor.isActive("link")) {
    return chain.insertContent({ type: "text", text: raw.trim(), marks: [{ type: "link", attrs: { href } }] }).run()
  }
  return chain.extendMarkRange("link").setLink({ href }).run()
}

export function LinkForm({
  editor,
  href,
  labels,
  onDone,
  onDismiss,
  autoFocus = true,
}: {
  editor: Editor
  href: string
  labels: TextEditorLabels
  onDone: () => void
  /** Focus left the form without applying. */
  onDismiss?: () => void
  autoFocus?: boolean
}) {
  const [value, setValue] = React.useState(href)
  return (
    <form
      className="sheen-editor-link-form"
      onSubmit={(event) => {
        event.preventDefault()
        event.stopPropagation() // don't submit a surrounding <form>
        applyLink(editor, value)
        onDone()
      }}
      onBlur={(event) => {
        if (onDismiss && !event.currentTarget.contains(event.relatedTarget as Node | null)) onDismiss()
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault()
          event.stopPropagation()
          editor.commands.focus()
          onDone()
        }
      }}
    >
      <Input
        size="sm"
        type="text"
        inputMode="url"
        autoComplete="url"
        dir="ltr"
        autoFocus={autoFocus}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={labels.linkPlaceholder}
        aria-label={labels.link}
        wrapperClassName="flex-fill"
      />
      <Tooltip content={labels.linkApply}>
        <Button type="submit" size="icon-sm" variant="tinted" aria-label={labels.linkApply}>
          {ICONS.check}
        </Button>
      </Tooltip>
      {href && (
        <>
          <Tooltip content={labels.linkOpen}>
            <Button asChild size="icon-sm" variant="ghost">
              <a href={href} target="_blank" rel="noopener noreferrer" aria-label={labels.linkOpen}>
                {ICONS.open}
              </a>
            </Button>
          </Tooltip>
          <Tooltip content={labels.linkRemove}>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label={labels.linkRemove}
              onClick={() => {
                editor.chain().focus().extendMarkRange("link").unsetLink().run()
                onDone()
              }}
            >
              {ICONS.unlink}
            </Button>
          </Tooltip>
        </>
      )}
    </form>
  )
}
