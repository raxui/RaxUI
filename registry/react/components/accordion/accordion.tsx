"use client"

// SheenUI accordion. Source-owned: edit freely. Ported from boot-ui.
// Built-in icon paths from Lucide (ISC).

import * as AccordionPrimitive from "@radix-ui/react-accordion"

import { cn } from "@/lib/utils"
import * as React from "react"

type PossibleRef<T> = React.Ref<T> | ((node: T | null) => void) | undefined

/** Sets a ref of either kind: calls a callback ref, or fills an object ref. */
function assignRef<T>(ref: PossibleRef<T>, node: T | null) {
  if (typeof ref === "function") ref(node)
  else if (ref) (ref as React.MutableRefObject<T | null>).current = node
}




type AccordionIcon = "chevron" | "plus"

const AccordionIconContext = React.createContext<AccordionIcon>("chevron")

export type AccordionProps = React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Root> & {
  /** `inset` = grouped glass list (iOS Settings), `cards` = separate glass cards. */
  appearance?: import("@/lib/theme").SheenAppearance
  variant?: "default" | "inset" | "cards"
  /** Open/close indicator. */
  icon?: AccordionIcon
}

const Accordion = React.forwardRef<React.ElementRef<typeof AccordionPrimitive.Root>, AccordionProps>(
  ({ className, appearance, variant = "default", icon = "chevron", dir, ...props }, forwardedRef) => (
    <AccordionIconContext.Provider value={icon}>
      <AccordionPrimitive.Root
        ref={(node) => {
          // Radix uses `dir` for keyboard navigation but doesn't render it, so RTL layout
          // would otherwise depend on an ancestor; put it on the element ourselves.
          if (node) {
            if (dir) node.setAttribute("dir", dir)
            else node.removeAttribute("dir")
          }
          assignRef(forwardedRef, node)
        }}
        dir={dir}
        data-sheen-appearance={appearance}
        data-variant={variant}
        className={cn("sheen-accordion", className)}
        {...(props as React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Root>)}
      />
    </AccordionIconContext.Provider>
  ),
)
Accordion.displayName = "Accordion"

const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => <AccordionPrimitive.Item ref={ref} className={cn("sheen-accordion-item", className)} {...props} />)
AccordionItem.displayName = "AccordionItem"

const Indicator = ({ type }: { type: AccordionIcon }) => (
  <span className="sheen-accordion-icon" data-icon={type} aria-hidden="true">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      {type === "chevron" ? (
        <path d="m6 9 6 6 6-6" />
      ) : (
        <>
          <path d="M5 12h14" />
          <path className="sheen-accordion-plus-v" d="M12 5v14" />
        </>
      )}
    </svg>
  </span>
)

export interface AccordionTriggerProps extends React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger> {
  /** Leading icon, shown in a tinted tile. */
  icon?: React.ReactNode
  /** Secondary line under the title. */
  description?: React.ReactNode
}

const AccordionTrigger = React.forwardRef<React.ElementRef<typeof AccordionPrimitive.Trigger>, AccordionTriggerProps>(
  ({ className, icon, description, children, ...props }, ref) => {
    const indicator = React.useContext(AccordionIconContext)
    return (
      <AccordionPrimitive.Header className="sheen-accordion-header">
        <AccordionPrimitive.Trigger ref={ref} className={cn("sheen-accordion-trigger", className)} {...props}>
          {icon && <span className="sheen-accordion-leading">{icon}</span>}
          <span className="sheen-accordion-text">
            <span>{children}</span>
            {description && <span className="sheen-accordion-description">{description}</span>}
          </span>
          <Indicator type={indicator} />
        </AccordionPrimitive.Trigger>
      </AccordionPrimitive.Header>
    )
  },
)
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content ref={ref} className="sheen-accordion-content" {...props}>
    <div className={cn("sheen-accordion-content-inner", className)}>{children}</div>
  </AccordionPrimitive.Content>
))
AccordionContent.displayName = AccordionPrimitive.Content.displayName

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
