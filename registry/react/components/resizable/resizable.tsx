"use client"

// Ported from boot-ui. Built-in SVG paths from Lucide (ISC).
import * as React from "react"
import {
  Group,
  Panel,
  Separator,
  useDefaultLayout,
  useGroupRef,
  usePanelRef,
  type GroupProps,
  type LayoutStorage,
  type PanelProps,
  type SeparatorProps,
} from "react-resizable-panels"

import { useRaxTheme, raxThemeAttributes, type RaxAppearance } from "@/lib/theme"
import { cn } from "@/lib/utils"
import { useMergedRef } from "@/lib/refs"
import { getDirection } from "@/lib/direction"

// -----------------------------------------------------------------------------
// Resizable — panels split by draggable dividers (on
// react-resizable-panels v4).
//
//   <ResizablePanelGroup orientation="horizontal" autoSaveId="mail">
//     <ResizablePanel defaultSize="25%" minSize="15%" collapsible>…</ResizablePanel>
//     <ResizableHandle withHandle />
//     <ResizablePanel>…</ResizablePanel>
//   </ResizablePanelGroup>
//
// Sizes: "30%" / "30" (percent), 240 or "240px", "16rem". Drag, or focus a
// divider and use the arrow keys / Home / End; double-click resets it.
// autoSaveId remembers the layout in localStorage. In RTL the first panel
// starts on the right and dragging follows the pointer.
// -----------------------------------------------------------------------------

// localStorage can throw (private mode, blocked storage): fall back to memory.
const memory = new Map<string, string>()
const safeStorage: LayoutStorage = {
  getItem: (key) => {
    try {
      const raw = localStorage.getItem(key) ?? memory.get(key) ?? null
      if (!raw) return null
      const value: unknown = JSON.parse(raw)
      return value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length > 0 && Object.values(value).every(n => typeof n === "number" && Number.isFinite(n) && n >= 0) ? raw : null
    } catch {
      return memory.get(key) ?? null
    }
  },
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value)
    } catch {
      memory.set(key, value)
    }
  },
}
const noStorage: LayoutStorage = { getItem: () => null, setItem: () => {} }

/** Set when an RTL group was laid out LTR in reverse: panels restore the direction for their content. */
const MirroredContext = React.createContext(false)

export interface ResizablePanelGroupProps extends GroupProps {
  appearance?: RaxAppearance
  /** Same as `orientation` (an older name, still accepted). */
  direction?: "horizontal" | "vertical"
  /** Remember the layout across visits under this key. */
  autoSaveId?: string
  /** `glass`: the group is a rounded glass surface with hairline dividers. */
  variant?: "plain" | "glass"
}

const ResizablePanelGroup = React.forwardRef<HTMLDivElement, ResizablePanelGroupProps>(function ResizablePanelGroup({
  appearance,
  elementRef: externalElementRef,
  direction,
  orientation,
  autoSaveId,
  variant = "plain",
  defaultLayout,
  onLayoutChanged,
  className,
  dir,
  children,
  ...props
}: ResizablePanelGroupProps, forwardedRef) {
  const theme = useRaxTheme({ appearance })
  const axis = orientation ?? direction ?? "horizontal"
  const [hydrated, setHydrated] = React.useState(false)
  React.useEffect(() => setHydrated(true), [])
  const saved = useDefaultLayout({
    id: autoSaveId ?? "rax-resizable-unsaved",
    storage: autoSaveId && hydrated ? safeStorage : noStorage,
    onlySaveAfterUserInteractions: false,
  })

  // The library measures pointer movement left-to-right. In RTL the group stays
  // LTR with the panels in reverse order, so the first panel still starts on the
  // right and dragging follows the pointer; panels restore RTL for their content.
  const elementRef = React.useRef<HTMLDivElement | null>(null)
  const composedRef = useMergedRef<HTMLDivElement | null>(forwardedRef, externalElementRef, elementRef)
  const [rtl, setRtl] = React.useState(dir === "rtl")
  React.useLayoutEffect(() => {
    if (dir) return setRtl(dir === "rtl")
    setRtl(getDirection(elementRef.current?.parentElement) === "rtl")
  }, [dir, theme.direction])

  const mirrored = rtl && axis === "horizontal"

  return (
    <MirroredContext.Provider value={mirrored}>
      <Group
        key={autoSaveId ? `${autoSaveId}:${hydrated ? "saved" : "initial"}` : undefined}
        {...raxThemeAttributes(theme)}
        elementRef={composedRef}
        orientation={axis}
        defaultLayout={defaultLayout ?? saved.defaultLayout}
        onLayoutChanged={(layout, meta) => {
          if (autoSaveId) saved.onLayoutChanged(layout, meta)
          onLayoutChanged?.(layout, meta)
        }}
        className={cn("rax-resizable", className)}
        data-orientation={axis}
        data-variant={variant}
        data-mirrored={mirrored ? "" : undefined}
        dir={mirrored ? "ltr" : dir}
        {...props}
      >
        {mirrored ? React.Children.toArray(children).reverse() : children}
      </Group>
    </MirroredContext.Provider>
  )
})
ResizablePanelGroup.displayName = "ResizablePanelGroup"

function ResizablePanel({ className, ...props }: PanelProps) {
  const mirrored = React.useContext(MirroredContext)
  return <Panel className={cn("rax-resizable-panel", className)} dir={mirrored ? "rtl" : undefined} {...props} />
}
ResizablePanel.displayName = "ResizablePanel"

export interface ResizableHandleProps extends SeparatorProps {
  /** Show a grip in the middle of the divider. */
  withHandle?: boolean
}

const GripIcon = () => (
  <svg viewBox="0 0 6 14" aria-hidden="true">
    <g fill="currentColor">
      <circle cx="1.5" cy="2" r="1.1" />
      <circle cx="4.5" cy="2" r="1.1" />
      <circle cx="1.5" cy="7" r="1.1" />
      <circle cx="4.5" cy="7" r="1.1" />
      <circle cx="1.5" cy="12" r="1.1" />
      <circle cx="4.5" cy="12" r="1.1" />
    </g>
  </svg>
)

function ResizableHandle({ withHandle, className, children, ...props }: ResizableHandleProps) {
  return (
    <Separator className={cn("rax-resizable-handle", className)} {...props}>
      {withHandle && (
        <span className="rax-resizable-grip" aria-hidden="true">
          <GripIcon />
        </span>
      )}
      {children}
    </Separator>
  )
}
ResizableHandle.displayName = "ResizableHandle"

export { ResizablePanelGroup, ResizablePanel, ResizableHandle, usePanelRef, useGroupRef }
export type { PanelImperativeHandle, GroupImperativeHandle, Layout } from "react-resizable-panels"
