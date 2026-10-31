"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"

import { cn } from "@/lib/utils"
import { Field, FieldControl, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"

// -----------------------------------------------------------------------------
// FormSection — iOS Settings-style grouped list.
//
//   <FormSection title="Account" footer="Shown on your receipts.">
//     <FormRow label="Name" icon={<UserIcon />} iconColor="blue"><Input … /></FormRow>
//     <FormRow label="Notifications"><Switch /></FormRow>
//     <FormRowLink label="Language" value="English" onClick={…} />
//   </FormSection>
//
// Rows are Fields, so labels, descriptions and errors are wired to the
// control automatically. Controls inside rows drop their own chrome (border,
// background) and right-align their value, like iOS.
// -----------------------------------------------------------------------------

export type FormRowIconColor = "blue" | "green" | "red" | "orange" | "yellow" | "teal" | "indigo" | "purple" | "pink" | "gray"

export interface FormSectionProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** Small heading above the group. */
  title?: React.ReactNode
  /** Explanatory note under the group. */
  footer?: React.ReactNode
}

const FormSection = React.forwardRef<HTMLElement, FormSectionProps>(({ title, footer, className, children, ...props }, ref) => {
  const titleId = React.useId()
  return (
    <section ref={ref} aria-labelledby={title ? titleId : undefined} className={cn("rax-form-section", className)} {...props}>
      {title && (
        <h3 id={titleId} className="rax-form-section-title">
          {title}
        </h3>
      )}
      <div className="rax-form-section-card">{children}</div>
      {footer && <p className="rax-form-section-footer">{footer}</p>}
    </section>
  )
})
FormSection.displayName = "FormSection"

const RowIcon = ({ icon, color }: { icon?: React.ReactNode; color: FormRowIconColor }) =>
  icon ? (
    <span className="rax-form-row-icon" data-color={color} aria-hidden="true">
      {icon}
    </span>
  ) : null

export interface FormRowProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "id"> {
  label: React.ReactNode
  /** Leading glyph in a coloured rounded square (Settings style). */
  icon?: React.ReactNode
  iconColor?: FormRowIconColor
  /** Small text under the label. */
  description?: React.ReactNode
  /** Error under the row; also marks the control invalid. */
  error?: React.ReactNode
  invalid?: boolean
  required?: boolean
  optional?: boolean
  disabled?: boolean
  /** `inline` = label · control on one line (default) · `stacked` = control below, full width (textareas). */
  layout?: "inline" | "stacked"
  /** Id for the control. */
  id?: string
  /** The control. */
  children: React.ReactElement
}

const FormRow = React.forwardRef<HTMLDivElement, FormRowProps>(
  (
    {
      label,
      icon,
      iconColor = "blue",
      description,
      error,
      invalid,
      required,
      optional,
      disabled,
      layout = "inline",
      id,
      className,
      children,
      ...props
    },
    ref,
  ) => (
    <Field
      ref={ref}
      id={id}
      // Left undefined unless set, so a surrounding FormField can supply it.
      invalid={invalid ?? (error !== undefined ? !!error : undefined)}
      required={required}
      optional={optional}
      disabled={disabled}
      data-layout={layout}
      data-has-icon={icon ? "" : undefined}
      className={cn("rax-form-row", className)}
      {...props}
    >
      <RowIcon icon={icon} color={iconColor} />
      <div className="rax-form-row-text">
        <FieldLabel>{label}</FieldLabel>
        {description && <FieldDescription>{description}</FieldDescription>}
      </div>
      <div className="rax-form-row-control">
        <FieldControl>{children}</FieldControl>
      </div>
      <FieldError>{error}</FieldError>
    </Field>
  ),
)
FormRow.displayName = "FormRow"

export interface FormRowLinkProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "value"> {
  label: React.ReactNode
  /** Current value, shown dimmed before the chevron. */
  value?: React.ReactNode
  icon?: React.ReactNode
  iconColor?: FormRowIconColor
  description?: React.ReactNode
  /** Render your router's Link (or an <a>) instead of a <button>. */
  asChild?: boolean
  /** Red text, no chevron (e.g. "Sign out", "Delete account"). */
  destructive?: boolean
}

// ChevronRight path from Lucide (ISC).
const ChevronIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="m9 18 6-6-6-6" />
  </svg>
)

/** A tappable row that navigates or opens something (a picker, a sub-page, a dialog). */
const FormRowLink = React.forwardRef<HTMLButtonElement, FormRowLinkProps>(
  ({ label, value, icon, iconColor = "blue", description, asChild, destructive, className, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    const content = (
      <>
        <RowIcon icon={icon} color={iconColor} />
        <span className="rax-form-row-text">
          <span className="rax-form-row-link-label">{label}</span>
          {description && <span className="rax-field-description">{description}</span>}
        </span>
        {value != null && <span className="rax-form-row-value">{value}</span>}
        {!destructive && (
          <span className="rax-form-row-chevron">
            <ChevronIcon />
          </span>
        )}
      </>
    )
    return (
      <Comp
        ref={ref}
        {...(!asChild && { type: "button" as const })}
        data-has-icon={icon ? "" : undefined}
        data-destructive={destructive || undefined}
        className={cn("rax-form-row rax-form-row-link", className)}
        {...props}
      >
        {asChild && React.isValidElement(children)
          ? React.cloneElement(children as React.ReactElement<{ children?: React.ReactNode }>, undefined, content)
          : content}
      </Comp>
    )
  },
)
FormRowLink.displayName = "FormRowLink"

export { FormSection, FormRow, FormRowLink }
