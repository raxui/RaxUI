import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { expect, it } from "vitest"
import { Sheet, SheetTrigger, SheetContent, SheetTitle, SheetDescription } from "../../registry/react/components/sheet/sheet"
import { SheenThemeProvider } from "../../registry/react/foundation/theme"
it.each(["start", "end", "top", "bottom"] as const)("opens %s sheet inside the theme and closes with Escape", async side => {
  const user = userEvent.setup()
  render(<SheenThemeProvider direction="rtl" data-testid="theme"><Sheet><SheetTrigger>Open</SheetTrigger><SheetContent side={side}><SheetTitle>Panel</SheetTitle><SheetDescription>Details</SheetDescription></SheetContent></Sheet></SheenThemeProvider>)
  await user.click(screen.getByRole("button", { name: "Open" }))
  const dialog = screen.getByRole("dialog", { name: "Panel" })
  expect(screen.getByTestId("theme")).toContainElement(dialog)
  expect(dialog).toHaveAttribute("data-side", side === "start" ? "right" : side === "end" ? "left" : side)
  await user.keyboard("{Escape}")
  expect(screen.queryByRole("dialog")).toBeNull()
})
