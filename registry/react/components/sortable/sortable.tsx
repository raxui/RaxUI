"use client"

// Ported from boot-ui. Built-in SVG paths from Lucide (ISC).
import * as React from "react"
import * as ReactDOM from "react-dom"
import { Slot } from "@radix-ui/react-slot"
import {
  closestCenter,
  closestCorners,
  defaultDropAnimationSideEffects,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DndContextProps,
  type DragEndEvent,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
  type DragStartEvent,
  type DropAnimation,
  type KeyboardCoordinateGetter,
  type ScreenReaderInstructions,
  type UniqueIdentifier,
} from "@dnd-kit/core"
import { restrictToHorizontalAxis, restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers"
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  type SortableContextProps,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

import { useRaxTheme, raxThemeAttributes, RaxThemeBoundary, useRaxPortalContainer, type RaxAppearance } from "@/lib/theme"
import { cn } from "@/lib/utils"
import { getDirection } from "@/lib/direction"
import { assignRef } from "@/lib/refs"

export type SortableOrientation = "vertical" | "horizontal" | "mixed"

const ORIENTATION = {
  vertical: {
    modifiers: [restrictToVerticalAxis, restrictToParentElement],
    strategy: verticalListSortingStrategy,
    collisionDetection: closestCenter,
  },
  horizontal: {
    modifiers: [restrictToHorizontalAxis, restrictToParentElement],
    strategy: horizontalListSortingStrategy,
    collisionDetection: closestCenter,
  },
  mixed: { modifiers: [restrictToParentElement], strategy: undefined, collisionDetection: closestCorners },
}

// ---- Shared with blocks built on Sortable (Kanban) ------------------------------------------

/** Neighbours slide out of the way with the library's ease-out. */
export const DRAG_TRANSITION = { duration: 320, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }

/** The dropped copy glides into place while the placeholder fades back in. */
export const DROP_ANIMATION: DropAnimation = {
  duration: 260,
  easing: "cubic-bezier(0.22, 1, 0.36, 1)",
  sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: "0.35" } } }),
}

/**
 * Mouse, touch and keyboard. A small distance (mouse) or a short press (touch)
 * before dragging starts, so clicks on buttons inside items and page scrolling
 * still work.
 */
export function useDragSensors(coordinateGetter: KeyboardCoordinateGetter = sortableKeyboardCoordinates) {
  return useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter }),
  )
}

/** Drag state for the copy shown in the overlay: it's a picture, not a second draggable. */
export const DRAG_COPY = {
  id: "",
  attributes: {} as DraggableAttributes,
  listeners: undefined,
  setActivatorNodeRef: () => {},
  isDragging: true,
}

/** Where an overlay portals to: `container`, or <body> once mounted (never during SSR). */
export function useOverlayContainer(container: Element | DocumentFragment | null | undefined) {
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  const themeContainer = useRaxPortalContainer()
  return mounted ? container ?? themeContainer ?? document.body : null
}

export const GripIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="9" cy="6" r="1.5" />
    <circle cx="15" cy="6" r="1.5" />
    <circle cx="9" cy="12" r="1.5" />
    <circle cx="15" cy="12" r="1.5" />
    <circle cx="9" cy="18" r="1.5" />
    <circle cx="15" cy="18" r="1.5" />
  </svg>
)

type SortableRootContextValue = {
  items: UniqueIdentifier[]
  modifiers: DndContextProps["modifiers"]
  strategy: SortableContextProps["strategy"]
  activeId: UniqueIdentifier | null
  reducedMotion: boolean
  flatCursor: boolean
  hasOverlay: boolean
  setHasOverlay: (has: boolean) => void
  /** Direction where the drag started; the overlay is portaled to <body> and needs it. */
  dir: "ltr" | "rtl"
}

const SortableRootContext = React.createContext<SortableRootContextValue | null>(null)

function useSortableRoot(name: string) {
  const context = React.useContext(SortableRootContext)
  if (!context) throw new Error(`\`${name}\` must be used within \`Sortable\``)
  return context
}

// ---- Root ------------------------------------------------------------------------------------

export type SortableLabels = {
  /** Read out when an item is picked up with the keyboard. */
  instructions?: string
  grabbed?: (item: string, position: number, total: number) => string
  moved?: (item: string, position: number, total: number) => string
  dropped?: (item: string, position: number, total: number) => string
  cancelled?: (item: string, position: number, total: number) => string
}

type ItemValueProp<T> = T extends object
  ? { /** Returns an item's unique id. Required for objects. */ getItemValue: (item: T) => UniqueIdentifier }
  : { getItemValue?: (item: T) => UniqueIdentifier }

export type SortableProps<T> = Omit<DndContextProps, "children"> &
  ItemValueProp<T> & {
    appearance?: RaxAppearance
    value: T[]
    onValueChange?: (items: T[]) => void
    /** Replaces the default reorder; gets the drop event with both indexes. */
    onMove?: (event: DragEndEvent & { activeIndex: number; overIndex: number }) => void
    /** Picks the axis lock, sorting strategy and collision detection. */
    orientation?: SortableOrientation
    strategy?: SortableContextProps["strategy"]
    /** A plain cursor instead of grab / grabbing. */
    flatCursor?: boolean
    /** The item's name in screen reader announcements. Defaults to its id. */
    getItemLabel?: (id: UniqueIdentifier) => string
    /** Announcements in your language. */
    labels?: SortableLabels
    children?: React.ReactNode
  }

/**
 * Drag to reorder, with mouse, touch or keyboard (Space to pick up, arrows to
 * move, Space to drop, Escape to cancel). Built on dnd-kit.
 */
function Sortable<T>(props: SortableProps<T>) {
  const {
    appearance,
    value,
    onValueChange,
    onMove,
    orientation = "vertical",
    strategy,
    modifiers,
    collisionDetection,
    flatCursor = false,
    getItemValue: getItemValueProp,
    getItemLabel,
    labels,
    accessibility,
    sensors: sensorsProp,
    onDragStart,
    onDragEnd,
    onDragCancel,
    ...dndProps
  } = props as SortableProps<T> & { getItemValue?: (item: T) => UniqueIdentifier }

  const theme = useRaxTheme({ appearance })
  const contextId = React.useId()
  const [activeId, setActiveId] = React.useState<UniqueIdentifier | null>(null)
  const [hasOverlay, setHasOverlay] = React.useState(false)
  const [dir, setDir] = React.useState<"ltr" | "rtl">("ltr")
  const config = ORIENTATION[orientation]
  const [reducedMotion, setReducedMotion] = React.useState(false)
  React.useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReducedMotion(media.matches)
    update(); media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  const sensors = useDragSensors()

  const getItemValue = React.useCallback(
    (item: T): UniqueIdentifier => {
      if (getItemValueProp) return getItemValueProp(item)
      if (typeof item === "object") throw new Error("`getItemValue` is required when `value` holds objects")
      return item as UniqueIdentifier
    },
    [getItemValueProp],
  )
  const items = React.useMemo(() => value.map(getItemValue), [value, getItemValue])

  if (new Set(items).size !== items.length) throw new Error("Sortable item IDs must be unique")

  const name = (id: UniqueIdentifier) => (getItemLabel ? getItemLabel(id) : String(id))
  const total = value.length
  const position = (data: { current?: { sortable?: { index: number } } } | undefined) => (data?.current?.sortable?.index ?? 0) + 1

  const announcements: Announcements = {
    onDragStart: ({ active }) =>
      labels?.grabbed?.(name(active.id), position(active.data), total) ??
      `Picked up ${name(active.id)}. Position ${position(active.data)} of ${total}.`,
    onDragOver: ({ active, over }) =>
      over
        ? (labels?.moved?.(name(active.id), position(over.data), total) ??
          `${name(active.id)} moved to position ${position(over.data)} of ${total}.`)
        : undefined,
    onDragEnd: ({ active, over }) =>
      labels?.dropped?.(name(active.id), position(over?.data ?? active.data), total) ??
      `${name(active.id)} dropped at position ${position(over?.data ?? active.data)} of ${total}.`,
    onDragCancel: ({ active }) =>
      labels?.cancelled?.(name(active.id), position(active.data), total) ??
      `Cancelled. ${name(active.id)} is back at position ${position(active.data)} of ${total}.`,
  }

  const screenReaderInstructions: ScreenReaderInstructions = {
    draggable:
      labels?.instructions ??
      `To pick up an item, press Space or Enter. Use the ${
        orientation === "vertical" ? "up and down" : orientation === "horizontal" ? "left and right" : "arrow"
      } keys to move it, Space or Enter to drop it, and Escape to cancel.`,
  }

  const contextValue = React.useMemo<SortableRootContextValue>(
    () => ({
      items,
      modifiers: modifiers ?? config.modifiers,
      strategy: strategy ?? config.strategy,
      activeId,
      flatCursor,
      reducedMotion,
      hasOverlay,
      setHasOverlay,
      dir,
    }),
    [items, modifiers, strategy, config, activeId, flatCursor, reducedMotion, hasOverlay, dir],
  )

  return (
    <RaxThemeBoundary value={theme}>
    <SortableRootContext.Provider value={contextValue}>
      <DndContext
        id={contextId}
        collisionDetection={collisionDetection ?? config.collisionDetection}
        modifiers={modifiers ?? config.modifiers}
        sensors={sensorsProp ?? sensors}
        {...dndProps}
        onDragStart={(event: DragStartEvent) => {
          onDragStart?.(event)
          setDir(getDirection(event.activatorEvent.target))
          setActiveId(event.active.id)
        }}
        onDragEnd={(event: DragEndEvent) => {
          onDragEnd?.(event)
          setActiveId(null)
          const { active, over } = event
          if (!over || active.id === over.id) return
          const activeIndex = items.indexOf(active.id)
          const overIndex = items.indexOf(over.id)
          if (activeIndex < 0 || overIndex < 0) return
          if (onMove) onMove({ ...event, activeIndex, overIndex })
          else onValueChange?.(arrayMove(value, activeIndex, overIndex))
        }}
        onDragCancel={(event) => {
          onDragCancel?.(event)
          setActiveId(null)
        }}
        accessibility={{ announcements, screenReaderInstructions, ...accessibility }}
      >
        {props.children}
      </DndContext>
    </SortableRootContext.Provider>
    </RaxThemeBoundary>
  )
}

// ---- Content -------------------------------------------------------------------------------

const SortableContentContext = React.createContext(false)

export interface SortableContentProps extends React.HTMLAttributes<HTMLDivElement> {
  strategy?: SortableContextProps["strategy"]
  asChild?: boolean
  /** Render the children as they are, with no wrapper (e.g. rows straight inside a <tbody>). */
  withoutSlot?: boolean
}

/** The list the items live in. */
const SortableContent = React.forwardRef<HTMLDivElement, SortableContentProps>(
  ({ strategy, asChild, withoutSlot, className, children, ...props }, ref) => {
    const theme = useRaxTheme()
    const context = useSortableRoot("SortableContent")
    const Comp = asChild ? Slot : "div"
    return (
      <SortableContentContext.Provider value={true}>
        <SortableContext items={context.items} strategy={strategy ?? context.strategy}>
          {withoutSlot ? (
            children
          ) : (
            <Comp {...raxThemeAttributes(theme)} dir={props.dir} ref={ref} data-sorting={context.activeId !== null ? "" : undefined} className={cn("rax-sortable", className)} {...props}>
              {children}
            </Comp>
          )}
        </SortableContext>
      </SortableContentContext.Provider>
    )
  },
)
SortableContent.displayName = "SortableContent"

// ---- Item ----------------------------------------------------------------------------------

type SortableItemContextValue = {
  id: string
  attributes: DraggableAttributes
  listeners: DraggableSyntheticListeners | undefined
  setActivatorNodeRef: (node: HTMLElement | null) => void
  isDragging: boolean
  disabled?: boolean
}

const SortableItemContext = React.createContext<SortableItemContextValue | null>(null)
const SortableOverlayContext = React.createContext(false)

export interface SortableItemProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The item's id, the same one `getItemValue` returns. */
  value: UniqueIdentifier
  /** Drag by the whole item instead of a `SortableItemHandle`. */
  asHandle?: boolean
  disabled?: boolean
  asChild?: boolean
}

const SortableItem = React.forwardRef<HTMLDivElement, SortableItemProps>((props, ref) => {
  const inContent = React.useContext(SortableContentContext)
  const inOverlay = React.useContext(SortableOverlayContext)
  if (!inContent && !inOverlay) throw new Error("`SortableItem` must be used within `SortableContent` or `SortableOverlay`")
  if (props.value === "") throw new Error("`SortableItem` value can't be an empty string")
  // The overlay's copy is only a picture of the item: it must not register a second draggable with the same id.
  return inOverlay ? <SortableItemCopy ref={ref} {...props} /> : <SortableItemLive ref={ref} {...props} />
})

const SortableItemLive = React.forwardRef<HTMLDivElement, SortableItemProps>(
  ({ value, asHandle, disabled, asChild, className, style, id: idProp, ...props }, ref) => {
    const context = useSortableRoot("SortableItem")
    const fallbackId = React.useId()
    const id = idProp ?? fallbackId
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
      id: value,
      disabled,
      transition: context.reducedMotion ? { ...DRAG_TRANSITION, duration: 0 } : DRAG_TRANSITION,
    })

    const itemContext = React.useMemo<SortableItemContextValue>(
      () => ({ id, attributes, listeners, setActivatorNodeRef, isDragging, disabled }),
      [id, attributes, listeners, setActivatorNodeRef, isDragging, disabled],
    )

    const Comp = asChild ? Slot : "div"
    const draggable = asHandle && !disabled
    return (
      <SortableItemContext.Provider value={itemContext}>
        <Comp
          ref={(node: HTMLDivElement | null) => {
            setNodeRef(node)
            if (asHandle) setActivatorNodeRef(node)
            assignRef(ref, node)
          }}
          id={id}
          data-disabled={disabled ? "" : undefined}
          data-dragging={isDragging ? "" : undefined}
          // With an overlay the original stays behind as a placeholder; without one it lifts and moves itself.
          data-placeholder={isDragging && context.hasOverlay ? "" : undefined}
          data-handle={asHandle ? "" : undefined}
          data-flat-cursor={context.flatCursor ? "" : undefined}
          className={cn("rax-sortable-item", className)}
          style={{ transform: CSS.Translate.toString(transform), transition, ...style }}
          {...props}
          {...(draggable ? attributes : {})}
          {...(draggable ? listeners : {})}
        />
      </SortableItemContext.Provider>
    )
  },
)

const SortableItemCopy = React.forwardRef<HTMLDivElement, SortableItemProps>(
  ({ value: _value, asHandle, disabled, asChild, className, id: _id, ...props }, ref) => {
    const context = useSortableRoot("SortableItem")
    const itemContext = React.useMemo<SortableItemContextValue>(() => ({ ...DRAG_COPY, disabled }), [disabled])
    const Comp = asChild ? Slot : "div"
    return (
      <SortableItemContext.Provider value={itemContext}>
        <Comp
          ref={ref}
          data-overlay=""
          data-handle={asHandle ? "" : undefined}
          data-flat-cursor={context.flatCursor ? "" : undefined}
          className={cn("rax-sortable-item", className)}
          {...props}
        />
      </SortableItemContext.Provider>
    )
  },
)
SortableItem.displayName = "SortableItem"

export interface SortableItemHandleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
}

/** The grip you drag the item by. Shows a dotted grip icon by default. */
const SortableItemHandle = React.forwardRef<HTMLButtonElement, SortableItemHandleProps>(
  ({ asChild, disabled, className, children, "aria-label": ariaLabel = "Drag to reorder", ...props }, ref) => {
    const context = useSortableRoot("SortableItemHandle")
    const item = React.useContext(SortableItemContext)
    if (!item) throw new Error("`SortableItemHandle` must be used within `SortableItem`")
    const isDisabled = disabled ?? item.disabled
    const inOverlay = React.useContext(SortableOverlayContext)
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        ref={(node: HTMLButtonElement | null) => {
          if (!isDisabled && !inOverlay) item.setActivatorNodeRef(node)
          assignRef(ref, node)
        }}
        type="button"
        aria-label={ariaLabel}
        aria-controls={item.id}
        data-dragging={item.isDragging ? "" : undefined}
        data-flat-cursor={context.flatCursor ? "" : undefined}
        disabled={isDisabled}
        className={cn("rax-sortable-handle", className)}
        {...props}
        {...(isDisabled || inOverlay ? {} : item.attributes)}
        {...(isDisabled || inOverlay ? {} : item.listeners)}
      >
        {children ?? <GripIcon />}
      </Comp>
    )
  },
)
SortableItemHandle.displayName = "SortableItemHandle"

// ---- Overlay -------------------------------------------------------------------------------

export interface SortableOverlayProps extends Omit<React.ComponentProps<typeof DragOverlay>, "children"> {
  /** Where the overlay is portaled. Defaults to document.body. */
  container?: Element | DocumentFragment | null
  /** What follows the pointer: content, or a function of the dragged item's id. */
  children?: React.ReactNode | ((params: { value: UniqueIdentifier }) => React.ReactNode)
}

/** A lifted copy that follows the pointer, while the original stays as a placeholder. */
function SortableOverlay({ container, children, className, ...props }: SortableOverlayProps) {
  const context = useSortableRoot("SortableOverlay")
  const { setHasOverlay } = context
  React.useEffect(() => {
    setHasOverlay(true)
    return () => setHasOverlay(false)
  }, [setHasOverlay])

  const theme = useRaxTheme()
  const target = useOverlayContainer(container)
  if (!target) return null
  return ReactDOM.createPortal(
    <DragOverlay
      {...raxThemeAttributes(theme)}
      aria-hidden="true"
      dropAnimation={context.reducedMotion ? null : DROP_ANIMATION}
      modifiers={context.modifiers}
      className={cn("rax-sortable-overlay", context.flatCursor && "rax-sortable-overlay-flat", className)}
      {...props}
    >
      <SortableOverlayContext.Provider value={true}>
        {context.activeId !== null ? (
          <div dir={context.dir} style={{ height: "100%" }}>
            {typeof children === "function" ? children({ value: context.activeId }) : children}
          </div>
        ) : null}
      </SortableOverlayContext.Provider>
    </DragOverlay>,
    target,
  )
}

export { Sortable, SortableContent, SortableItem, SortableItemHandle, SortableOverlay }
SortableItemLive.displayName = "SortableItemLive"
SortableItemCopy.displayName = "SortableItemCopy"
