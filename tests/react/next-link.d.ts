// Lets the repository typecheck registry/react/starter-next without installing Next.js.
// The real next/link types are checked by `next build` in tests/react/acceptance/next.spec.ts.
declare module "next/link" {
  import type { AnchorHTMLAttributes, ComponentType } from "react"
  const Link: ComponentType<AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }>
  export default Link
}
