import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { Popover, PopoverTrigger, PopoverContent } from "../../registry/react/components/popover/popover"
import { SheenThemeProvider } from "../../registry/react/foundation/theme"

describe("Popover", () => {
  it("portals into the theme root, closes with Escape and returns focus", async () => {
    const user = userEvent.setup()
    render(<SheenThemeProvider mode="dark" appearance="glass" data-sheen-accent="emerald" direction="rtl"><Popover>
      <PopoverTrigger>Details</PopoverTrigger><PopoverContent aria-label="Details panel"><button>Inside</button></PopoverContent>
    </Popover></SheenThemeProvider>)
    const trigger = screen.getByRole("button", { name: "Details" })
    await user.click(trigger)
    const panel = screen.getByRole("dialog", { name: "Details panel" })
    expect(panel.closest('[data-bs-theme="dark"]')).not.toBeNull()
    expect(panel.closest('[data-sheen-accent="emerald"]')).not.toBeNull()
    expect(panel).toHaveAttribute("dir", "rtl")
    expect(trigger).toHaveAttribute("aria-expanded", "true")
    await user.keyboard("{Escape}")
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })
})
