"use client"

import * as React from "react"
import * as HoverCardPrimitive from "@radix-ui/react-hover-card"
import { useRaxPortalContainer, useRaxTheme } from "@/lib/theme"
import { cn } from "@/lib/utils"

interface PreviewState {
  setOpen: (open: boolean) => void
  content: React.RefObject<HTMLDivElement | null>
  trigger: React.RefObject<HTMLAnchorElement | null>
}
const PreviewContext = React.createContext<PreviewState | null>(null)
const controls = (node: HTMLElement | null) => Array.from(node?.querySelectorAll<HTMLElement>("a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex='0']") ?? [])
function assignRef<T>(ref: React.Ref<T> | undefined, node: T | null) {
  if (typeof ref === "function") ref(node)
  else if (ref) (ref as React.MutableRefObject<T | null>).current = node
}

function HoverCard({ openDelay = 400, closeDelay = 200, open, defaultOpen = false, onOpenChange, ...props }: React.ComponentProps<typeof HoverCardPrimitive.Root>) {
  const [local, setLocal] = React.useState(defaultOpen)
  const content = React.useRef<HTMLDivElement | null>(null)
  const trigger = React.useRef<HTMLAnchorElement | null>(null)
  const setOpen = React.useCallback((next: boolean) => {
    if (open === undefined) setLocal(next)
    onOpenChange?.(next)
  }, [open, onOpenChange])
  return <PreviewContext.Provider value={{ setOpen, content, trigger }}>
    <HoverCardPrimitive.Root {...props} open={open ?? local} openDelay={openDelay} closeDelay={closeDelay} onOpenChange={next => {
      // A delayed pointer/blur close must not remove keyboard-focused content.
      if (!next && content.current?.contains(document.activeElement)) return
      setOpen(next)
    }} />
  </PreviewContext.Provider>
}

const HoverCardTrigger = React.forwardRef<React.ElementRef<typeof HoverCardPrimitive.Trigger>, React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Trigger>>(
  ({ onKeyDown, onBlur, ...props }, ref) => {
    const state = React.useContext(PreviewContext)
    return <HoverCardPrimitive.Trigger {...props} ref={node => { assignRef(ref, node); assignRef(state?.trigger, node) }}
      onBlur={event => { onBlur?.(event); if (state?.content.current?.contains(event.relatedTarget)) event.preventDefault() }}
      onKeyDown={event => {
        onKeyDown?.(event)
        if (!event.defaultPrevented && event.key === "Tab" && !event.shiftKey) {
          const first = controls(state?.content.current ?? null)[0]
          if (first) { event.preventDefault(); first.focus() }
        }
      }} />
  },
)
HoverCardTrigger.displayName = "HoverCardTrigger"

const HoverCardContent = React.forwardRef<React.ElementRef<typeof HoverCardPrimitive.Content>, React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Content>>(
  ({ className, align = "center", sideOffset = 8, collisionPadding = 8, dir, onFocusCapture, onBlurCapture, onEscapeKeyDown, onKeyDown, ...props }, ref) => {
    const state = React.useContext(PreviewContext)
    const theme = useRaxTheme()
    return <HoverCardPrimitive.Portal container={useRaxPortalContainer()}>
      <HoverCardPrimitive.Content {...props} ref={node => { assignRef(ref, node); assignRef(state?.content, node) }}
        align={align} sideOffset={sideOffset} collisionPadding={collisionPadding} dir={dir ?? theme.direction}
        className={cn("rax-hover-card", className)}
        onFocusCapture={event => { onFocusCapture?.(event); state?.setOpen(true) }}
        onBlurCapture={event => { onBlurCapture?.(event); if (!event.currentTarget.contains(event.relatedTarget) && event.relatedTarget !== state?.trigger.current) state?.setOpen(false) }}
        onEscapeKeyDown={event => {
          onEscapeKeyDown?.(event)
          if (event.defaultPrevented) return
          if (state?.content.current?.contains(document.activeElement)) state.trigger.current?.focus()
          state?.setOpen(false)
        }}
        onKeyDown={event => {
          onKeyDown?.(event)
          if (event.defaultPrevented || event.key !== "Tab") return
          // Radix makes hover-card descendants untabbable. Provide explicit focus traversal.
          const list = controls(event.currentTarget)
          const index = list.indexOf(document.activeElement as HTMLElement)
          const next = list[index + (event.shiftKey ? -1 : 1)]
          if (next) { event.preventDefault(); next.focus() }
          else { state?.trigger.current?.focus(); if (event.shiftKey) event.preventDefault(); else state?.setOpen(false) }
        }} />
    </HoverCardPrimitive.Portal>
  },
)
HoverCardContent.displayName = "HoverCardContent"
export { HoverCard, HoverCardTrigger, HoverCardContent }
