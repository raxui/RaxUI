import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { RaxThemeProvider } from "../../registry/react/foundation/theme"
import { HoverCard, HoverCardTrigger, HoverCardContent } from "../../registry/react/components/hover-card/hover-card"
afterEach(() => vi.useRealTimers())
it("opens on focus and hover with delays and keeps the card reachable", async () => {
  vi.useFakeTimers()
  render(<RaxThemeProvider data-testid="theme"><HoverCard><HoverCardTrigger href="#profile">Profile</HoverCardTrigger><HoverCardContent><button>Follow</button></HoverCardContent></HoverCard></RaxThemeProvider>)
  const trigger = screen.getByRole("link")
  fireEvent.focus(trigger)
  await act(() => vi.advanceTimersByTimeAsync(450))
  expect(screen.getByTestId("theme")).toContainElement(screen.getByRole("button", { name: "Follow" }))
  const action = screen.getByRole("button", { name: "Follow" })
  act(() => action.focus())
  await act(() => vi.advanceTimersByTimeAsync(300))
  expect(action).toHaveFocus()
  expect(action).toBeVisible()
  fireEvent.keyDown(action, { key: "Escape" })
  expect(screen.queryByRole("button")).toBeNull()
  fireEvent.blur(trigger)
  fireEvent.pointerEnter(trigger, { pointerType: "mouse" })
  await act(() => vi.advanceTimersByTimeAsync(450))
  expect(screen.getByRole("button")).toBeVisible()
  fireEvent.pointerLeave(trigger, { pointerType: "mouse" })
  await act(() => vi.advanceTimersByTimeAsync(250))
  expect(screen.queryByRole("button")).toBeNull()
})
