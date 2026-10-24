import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { expect, it, vi } from "vitest"
import { Drawer, DrawerTrigger, DrawerContent, DrawerTitle, DrawerDescription, DrawerClose } from "../../registry/react/components/drawer/drawer"
import { SheenThemeProvider } from "../../registry/react/foundation/theme"
it("opens in the theme with a handle and closes", async () => {
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
  HTMLElement.prototype.setPointerCapture = vi.fn()
  HTMLElement.prototype.releasePointerCapture = vi.fn()
  const user = userEvent.setup()
  render(<SheenThemeProvider data-testid="theme"><Drawer><DrawerTrigger>Open</DrawerTrigger><DrawerContent><DrawerTitle>Drawer panel</DrawerTitle><DrawerDescription>Details</DrawerDescription><DrawerClose>Done</DrawerClose></DrawerContent></Drawer></SheenThemeProvider>)
  await user.click(screen.getByRole("button", { name: "Open" }))
  expect(screen.getByTestId("theme")).toContainElement(screen.getByRole("dialog", { name: "Drawer panel" }))
  expect(document.querySelector("[data-vaul-handle]")).not.toBeNull()
  await user.click(screen.getByRole("button", { name: "Done" }))
  expect(screen.queryByRole("dialog")).toBeNull()
  vi.unstubAllGlobals()
})
