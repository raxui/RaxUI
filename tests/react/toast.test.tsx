import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { SheenThemeProvider } from "../../registry/react/foundation/theme"
import { Toaster } from "../../registry/react/components/toast/toaster"
import { toast } from "../../registry/react/components/toast/use-toast"
import { ToastAction } from "../../registry/react/components/toast/toast"
afterEach(() => { toast.dismiss(); vi.useRealTimers() })
it("shows a themed notification, runs its action and auto dismisses", async () => {
  vi.useFakeTimers()
  const action = vi.fn()
  render(<SheenThemeProvider data-testid="theme"><Toaster /></SheenThemeProvider>)
  act(() => { toast({ title: "Saved", tone: "success", duration: 500, action: <ToastAction altText="Undo save" onClick={action}>Undo</ToastAction> }) })
  await act(() => vi.advanceTimersByTimeAsync(100))
  expect(screen.getByTestId("theme")).toContainElement(screen.getByText("Saved"))
  expect(document.querySelector(".sheen-toast[data-variant=success] .sheen-toast-icon svg")).not.toBeNull()
  fireEvent.click(screen.getByRole("button", { name: "Undo" }))
  expect(action).toHaveBeenCalledOnce()
  act(() => { toast({ title: "Temporary", duration: 500 }) })
  await act(() => vi.advanceTimersByTimeAsync(100))
  const viewport = document.querySelector(".sheen-toast-viewport")!
  fireEvent.pointerMove(viewport)
  await act(() => vi.advanceTimersByTimeAsync(800))
  expect(screen.getByText("Temporary")).toBeVisible()
  fireEvent.pointerLeave(viewport.parentElement!)
  await act(() => vi.advanceTimersByTimeAsync(2000))
  expect(screen.queryByText("Temporary")).toBeNull()
})
