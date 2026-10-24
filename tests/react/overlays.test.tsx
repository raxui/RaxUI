import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, describe, expect, it, vi } from "vitest"

import { SheenThemeProvider } from "@/lib/theme"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../registry/react/components/dialog/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../registry/react/components/dropdown-menu/dropdown-menu"

// Radix's popper measures with ResizeObserver, which jsdom lacks.
beforeAll(() => {
  globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver
})

describe("Dialog", () => {
  function Example() {
    return (
      <SheenThemeProvider data-testid="root" mode="dark" data-sheen-accent="emerald">
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete file?</DialogTitle>
              <DialogDescription>This cannot be undone.</DialogDescription>
            </DialogHeader>
            <DialogFooter>Actions</DialogFooter>
          </DialogContent>
        </Dialog>
      </SheenThemeProvider>
    )
  }

  it("opens a named, described dialog inside the theme root and closes on Escape", async () => {
    const user = userEvent.setup()
    render(<Example />)
    const trigger = screen.getByRole("button", { name: "Open" })
    await user.click(trigger)

    const dialog = screen.getByRole("dialog", { name: "Delete file?" })
    expect(dialog).toHaveAccessibleDescription("This cannot be undone.")
    expect(dialog).toHaveClass("sheen-dialog")
    // Portalled into the provider, so mode and accent apply to the overlay too (ADR 013).
    expect(screen.getByTestId("root")).toContainElement(dialog)
    expect(screen.getByRole("button", { name: "Close" })).toHaveClass("btn-close", "sheen-dialog-close")

    await user.keyboard("{Escape}")
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })
})

describe("DropdownMenu", () => {
  function Example({ onSelect }: { onSelect: () => void }) {
    return (
      <SheenThemeProvider data-testid="root" direction="rtl">
        <DropdownMenu>
          <DropdownMenuTrigger>Options</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onSelect={onSelect}>Edit</DropdownMenuItem>
            <DropdownMenuItem disabled>Archive</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SheenThemeProvider>
    )
  }

  it("opens from the keyboard, skips disabled items, selects, and returns focus", async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<Example onSelect={onSelect} />)
    const trigger = screen.getByRole("button", { name: "Options" })
    trigger.focus()
    await user.keyboard("{Enter}")

    const menu = screen.getByRole("menu")
    expect(menu).toHaveClass("sheen-dropdown-menu")
    expect(menu).toHaveAttribute("dir", "rtl") // the theme direction reaches Radix
    expect(screen.getByTestId("root")).toContainElement(menu)
    expect(screen.getByText("Actions")).toHaveClass("sheen-dropdown-label")
    expect(screen.getByRole("separator")).toHaveClass("sheen-dropdown-separator")

    const edit = screen.getByRole("menuitem", { name: "Edit" })
    expect(edit).toHaveClass("sheen-dropdown-item")
    expect(edit).toHaveFocus()
    await user.keyboard("{ArrowDown}")
    expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveFocus()
    await user.keyboard("{ArrowUp}{Enter}")
    expect(onSelect).toHaveBeenCalledOnce()
    expect(screen.queryByRole("menu")).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })
})
