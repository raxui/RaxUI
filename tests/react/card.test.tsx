import * as React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../../registry/react/components/card/card"
describe("Card", () => {
  it.each(["default", "flat", "glass"] as const)("composes content with %s appearance and forwarded ref", (appearance) => {
    const ref = React.createRef<HTMLDivElement>()
    render(<Card ref={ref} appearance={appearance} variant="outline"><CardHeader><CardTitle>Account</CardTitle><CardDescription>Settings</CardDescription></CardHeader><CardContent>Profile</CardContent><CardFooter>Updated</CardFooter></Card>)
    expect(ref.current).toHaveAttribute("data-sheen-appearance", appearance)
    expect(ref.current).toHaveClass("card-glass-outline")
    expect(ref.current).toHaveTextContent("AccountSettingsProfileUpdated")
  })
  it("styles a native interactive link", () => {
    render(<Card asChild interactive><a href="/account">Account</a></Card>)
    expect(screen.getByRole("link", { name: "Account" })).toHaveClass("card-glass-interactive")
  })
})
