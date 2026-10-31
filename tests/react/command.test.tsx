import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { expect, it, vi } from "vitest"
import { CommandDialog, CommandInput, CommandList, CommandItem, CommandGroup, CommandEmpty } from "../../registry/react/components/command/command"
import { RaxThemeProvider } from "../../registry/react/foundation/theme"
it("filters groups and selects using active descendant navigation inside a themed dialog", async () => {
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} })
  HTMLElement.prototype.scrollIntoView = vi.fn()
  HTMLElement.prototype.scrollTo = vi.fn()
  const select = vi.fn(), user = userEvent.setup()
  render(<RaxThemeProvider data-testid="theme"><CommandDialog defaultOpen><CommandInput /><CommandList><CommandGroup heading="Files"><CommandItem value="Open" onSelect={select}>Open</CommandItem><CommandItem id="save-command" value="Save" onSelect={select}>Save</CommandItem><CommandItem value="Disabled" disabled>Disabled</CommandItem></CommandGroup><CommandEmpty /></CommandList></CommandDialog></RaxThemeProvider>)
  expect(screen.getByTestId("theme")).toContainElement(screen.getByRole("dialog"))
  const input = screen.getByRole("combobox")
  await user.type(input, "Save")
  expect(screen.getAllByRole("option")).toHaveLength(1)
  expect(input).toHaveAttribute("aria-activedescendant", screen.getByRole("option").id)
  await user.keyboard("{Enter}")
  expect(select).toHaveBeenCalledWith("Save")
  await user.clear(input)
  await user.keyboard("{End}{ArrowUp}{Enter}")
  expect(select).toHaveBeenLastCalledWith("Open")
  await user.type(input, "missing")
  expect(screen.queryByRole("option")).toBeNull()
  expect(screen.getByText("No results found.")).toBeInTheDocument()
  await user.keyboard("{Escape}")
  expect(screen.queryByRole("dialog")).toBeNull()
  vi.unstubAllGlobals()
})
