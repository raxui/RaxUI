"use client"

// Built-in SVG paths from Lucide (ISC). Ported from boot-ui.
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"

import { Button } from "@/components/ui/button"
import { useSheenTheme, sheenThemeAttributes, type SheenAppearance } from "@/lib/theme"
import { cn } from "@/lib/utils"
import { inert, prefersReducedMotion } from "@/lib/app-shell-utils"

// -----------------------------------------------------------------------------
// Footer — a site's closing section.
//
//   <Footer>
//     <FooterMain>
//       <FooterBrand logo={…} name="SheenUI" tagline="…"><FooterSocial>…</FooterSocial></FooterBrand>
//       <FooterColumns>
//         <FooterColumn title="Product">
//           <FooterLink href="/docs">Docs</FooterLink>
//         </FooterColumn>
//       </FooterColumns>
//       <FooterNewsletter onSubscribe={(email) => api.subscribe(email)} />
//     </FooterMain>
//     <FooterBottom>
//       <FooterCopyright owner="Acme Inc." />
//       <FooterLegal>…links…</FooterLegal>
//       <FooterBackToTop />
//     </FooterBottom>
//   </Footer>
//
// variant: "plain" (on the page) · "subtle" (a tinted band) · "glass" (a card).
// On phones each FooterColumn folds into a disclosure (height animates); from
// 768px up they are plain lists side by side.
// -----------------------------------------------------------------------------

const PHONE_QUERY = "(max-width: 767.98px)"

function useIsPhone() {
  const [phone, setPhone] = React.useState(false)
  React.useEffect(() => {
    const query = window.matchMedia(PHONE_QUERY)
    const onChange = () => setPhone(query.matches)
    onChange()
    query.addEventListener("change", onChange)
    return () => query.removeEventListener("change", onChange)
  }, [])
  return phone
}

export interface FooterProps extends React.HTMLAttributes<HTMLElement> {
  appearance?: SheenAppearance
  variant?: "plain" | "subtle" | "glass"
  /** Max width of the content. */
  maxWidth?: string
}

const Footer = React.forwardRef<HTMLElement, FooterProps>(({ appearance, variant = "subtle", maxWidth, className, style, children, ...props }, ref) => (
  <footer
    {...sheenThemeAttributes(useSheenTheme({ appearance }))}
    dir={props.dir}
    ref={ref}
    className={cn("sheen-footer", className)}
    data-variant={variant}
    style={maxWidth ? ({ "--sheen-footer-max": maxWidth, ...style } as React.CSSProperties) : style}
    {...props}
  >
    <div className="sheen-footer-inner">{children}</div>
  </footer>
))
Footer.displayName = "Footer"

const FooterMain = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("sheen-footer-main", className)} {...props} />
))
FooterMain.displayName = "FooterMain"

export interface FooterBrandProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  logo?: React.ReactNode
  name?: React.ReactNode
  tagline?: React.ReactNode
  href?: string
}

const FooterBrand = React.forwardRef<HTMLDivElement, FooterBrandProps>(
  ({ logo, name, tagline, href = "/", className, children, ...props }, ref) => (
    <div ref={ref} className={cn("sheen-footer-brand", className)} {...props}>
      {(logo || name) && (
        <a href={href} className="sheen-footer-logo">
          {logo}
          {name && <span>{name}</span>}
        </a>
      )}
      {tagline && <p className="sheen-footer-tagline">{tagline}</p>}
      {children}
    </div>
  ),
)
FooterBrand.displayName = "FooterBrand"

const FooterColumns = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("sheen-footer-columns", className)} {...props} />
))
FooterColumns.displayName = "FooterColumns"

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
    <path d="m6 9 6 6 6-6" />
  </svg>
)

export interface FooterColumnProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  title: React.ReactNode
  /** Phones only: start unfolded. */
  defaultOpen?: boolean
}

/** A titled list of links. A disclosure on phones, a plain list elsewhere. */
const FooterColumn = React.forwardRef<HTMLElement, FooterColumnProps>(
  ({ title, defaultOpen = false, className, children, ...props }, ref) => {
    const phone = useIsPhone()
    const [open, setOpen] = React.useState(defaultOpen)
    const id = React.useId()
    const folded = phone && !open
    return (
      <nav
        ref={ref}
        className={cn("sheen-footer-column", className)}
        data-state={phone ? (open ? "open" : "closed") : undefined}
        aria-labelledby={`${id}-title`}
        {...props}
      >
        <h2 className="sheen-footer-heading" id={`${id}-title`}>
          {phone ? (
            <button type="button" aria-expanded={open} aria-controls={`${id}-list`} onClick={() => setOpen((o) => !o)}>
              {title}
              <ChevronIcon />
            </button>
          ) : (
            title
          )}
        </h2>
        <div className="sheen-footer-list-wrap" id={`${id}-list`} {...inert(folded)}>
          <ul className="sheen-footer-list">{children}</ul>
        </div>
      </nav>
    )
  },
)
FooterColumn.displayName = "FooterColumn"

export interface FooterLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  asChild?: boolean
  /** A small tag after the label, e.g. "New". */
  badge?: React.ReactNode
}

const FooterLink = React.forwardRef<HTMLAnchorElement, FooterLinkProps>(({ asChild, badge, className, children, ...props }, ref) => {
  const Comp = asChild ? Slot : "a"
  return (
    <li>
      <Comp ref={ref} className={cn("sheen-footer-link", className)} {...props}>
        {asChild ? children : <span>{children}</span>}
      </Comp>
      {badge && <span className="sheen-footer-badge">{badge}</span>}
    </li>
  )
})
FooterLink.displayName = "FooterLink"

/** Icon links (give each an aria-label). */
const FooterSocial = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("sheen-footer-social", className)} {...props} />
))
FooterSocial.displayName = "FooterSocial"

const FooterSocialLink = React.forwardRef<HTMLAnchorElement, React.AnchorHTMLAttributes<HTMLAnchorElement> & { "aria-label": string }>(
  ({ className, ...props }, ref) => <a ref={ref} className={cn("sheen-footer-social-link", className)} {...props} />,
)
FooterSocialLink.displayName = "FooterSocialLink"

// ---- Newsletter -------------------------------------------------------------------------

export interface FooterNewsletterProps extends Omit<React.FormHTMLAttributes<HTMLFormElement>, "onSubmit" | "title"> {
  title?: React.ReactNode
  description?: React.ReactNode
  placeholder?: string
  submitLabel?: React.ReactNode
  successMessage?: React.ReactNode
  invalidMessage?: string
  errorMessage?: string
  /** Called with the address; throw (or reject) to show `error`. */
  onSubscribe?: (email: string) => void | Promise<void>
}

const FooterNewsletter = React.forwardRef<HTMLFormElement, FooterNewsletterProps>(
  (
    {
      title = "Stay in the loop",
      description = "One email a month. No spam.",
      placeholder = "you@example.com",
      submitLabel = "Subscribe",
      successMessage = "Thanks! Check your inbox to confirm.",
      invalidMessage = "Enter a valid email address.",
      errorMessage = "Something went wrong. Try again.",
      onSubscribe,
      className,
      ...props
    },
    ref,
  ) => {
    const [email, setEmail] = React.useState("")
    const [state, setState] = React.useState<"idle" | "invalid" | "sending" | "done" | "error">("idle")
    const id = React.useId()

    return (
      <form
        ref={ref}
        noValidate
        className={cn("sheen-footer-newsletter", className)}
        data-state={state}
        onSubmit={async (event) => {
          event.preventDefault()
          if (state === "sending") return
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setState("invalid")
          setState("sending")
          try {
            await onSubscribe?.(email.trim())
            setState("done")
          } catch {
            setState("error")
          }
        }}
        {...props}
      >
        <label htmlFor={`${id}-email`} className="sheen-footer-heading">
          {title}
        </label>
        {description && <p className="sheen-footer-tagline">{description}</p>}
        {state === "done" ? (
          <p className="sheen-footer-newsletter-done" role="status">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
            {successMessage}
          </p>
        ) : (
          <>
            <div className="sheen-footer-newsletter-row">
              <input
                id={`${id}-email`}
                type="email"
                autoComplete="email"
                className="form-control"
                placeholder={placeholder}
                value={email}
                disabled={state === "sending"}
                aria-invalid={state === "invalid" || undefined}
                aria-describedby={state === "invalid" || state === "error" ? `${id}-error` : undefined}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (state === "invalid" || state === "error") setState("idle")
                }}
                dir="ltr"
              />
              <Button type="submit" disabled={state === "sending"}>
                {submitLabel}
              </Button>
            </div>
            {(state === "invalid" || state === "error") && (
              <p id={`${id}-error`} className="sheen-footer-newsletter-error" role="alert">
                {state === "invalid" ? invalidMessage : errorMessage}
              </p>
            )}
          </>
        )}
      </form>
    )
  },
)
FooterNewsletter.displayName = "FooterNewsletter"

// ---- Bottom bar ---------------------------------------------------------------------------

const FooterBottom = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("sheen-footer-bottom", className)} {...props} />
))
FooterBottom.displayName = "FooterBottom"

const FooterCopyright = ({
  owner,
  year,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement> & { owner?: React.ReactNode; year?: number }) => {
  const [clientYear, setClientYear] = React.useState<number>()
  React.useEffect(() => setClientYear(new Date().getFullYear()), [])
  return (
  <p className={cn("sheen-footer-copyright", className)} {...props}>
    {children ?? (
      <>
        © {year ?? clientYear} {owner}
      </>
    )}
  </p>
  )
}

const FooterLegal = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement> & { label?: string }>(
  ({ label = "Legal", className, ...props }, ref) => (
    <nav ref={ref} aria-label={label} className={cn("sheen-footer-legal", className)} {...props} />
  ),
)
FooterLegal.displayName = "FooterLegal"

/** Scrolls the page (or `target`) back to the top; smooth unless motion is reduced. */
function FooterBackToTop({
  label = "Back to top",
  target,
  className,
  ...props
}: React.ComponentProps<typeof Button> & { label?: string; target?: React.RefObject<HTMLElement | null> }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("sheen-footer-top", className)}
      onClick={() => {
        const behavior: ScrollBehavior = prefersReducedMotion() ? "auto" : "smooth"
        ;(target?.current ?? window).scrollTo({ top: 0, behavior })
      }}
      {...props}
    >
      {label}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    </Button>
  )
}

export {
  Footer,
  FooterMain,
  FooterBrand,
  FooterColumns,
  FooterColumn,
  FooterLink,
  FooterSocial,
  FooterSocialLink,
  FooterNewsletter,
  FooterBottom,
  FooterCopyright,
  FooterLegal,
  FooterBackToTop,
}
