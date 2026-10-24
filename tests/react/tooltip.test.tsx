import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { SheenThemeProvider } from "../../registry/react/foundation/theme"
import { Tooltip, TooltipTrigger, TooltipContent } from "../../registry/react/components/tooltip/tooltip"
afterEach(() => vi.useRealTimers())
it("delays hover, describes focus, portals into the theme, and escapes", async () => {
  vi.useFakeTimers()
  render(<SheenThemeProvider data-testid="theme"><Tooltip delayDuration={400}><TooltipTrigger>Help</TooltipTrigger><TooltipContent>Helpful text</TooltipContent></Tooltip></SheenThemeProvider>)
  const trigger = screen.getByRole("button", { name: "Help" })
  fireEvent.pointerMove(trigger, { pointerType: "mouse" })
  expect(screen.queryByRole("tooltip")).toBeNull()
  await act(() => vi.advanceTimersByTimeAsync(450))
  expect(screen.getByRole("tooltip")).toHaveTextContent("Helpful text")
  expect(screen.getByTestId("theme")).toContainElement(screen.getByRole("tooltip"))
  fireEvent.pointerLeave(trigger)
  await act(() => vi.advanceTimersByTimeAsync(500))
  fireEvent.focus(trigger)
  await act(() => vi.advanceTimersByTimeAsync(500))
  expect(trigger).toHaveAttribute("aria-describedby", screen.getByRole("tooltip").id)
  fireEvent.keyDown(trigger, { key: "Escape" })
  expect(screen.queryByRole("tooltip")).toBeNull()
  fireEvent.focus(trigger)
  await act(() => vi.advanceTimersByTimeAsync(500))
  fireEvent.blur(trigger)
  expect(screen.queryByRole("tooltip")).toBeNull()
})
