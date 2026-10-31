import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { expect, it, vi } from "vitest"
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem } from "../../registry/react/components/context-menu/context-menu"
import { RaxThemeProvider } from "../../registry/react/foundation/theme"
it("opens at the pointer, navigates items and supports keyboard invocation", async () => {
  const select = vi.fn(), user = userEvent.setup()
  render(<RaxThemeProvider data-testid="theme"><ContextMenu><ContextMenuTrigger>Target</ContextMenuTrigger><ContextMenuContent><ContextMenuItem disabled>Disabled</ContextMenuItem><ContextMenuItem onSelect={select}>Edit</ContextMenuItem><ContextMenuItem>Delete</ContextMenuItem></ContextMenuContent></ContextMenu></RaxThemeProvider>)
  fireEvent.contextMenu(screen.getByText("Target"), { clientX: 40, clientY: 60 })
  expect(screen.getByTestId("theme")).toContainElement(screen.getByRole("menu"))
  await user.keyboard("{Home}{Enter}")
  expect(select).toHaveBeenCalledOnce()
  expect(screen.queryByRole("menu")).toBeNull()
  fireEvent.keyDown(screen.getByText("Target"), { key: "F10", shiftKey: true })
  expect(screen.getByRole("menu")).toBeVisible()
  await user.keyboard("{ArrowDown}{End}{Escape}")
  expect(screen.queryByRole("menu")).toBeNull()
})
