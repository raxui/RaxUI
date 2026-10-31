import { act, render, waitFor } from "@testing-library/react"
import { expect, it, vi } from "vitest"
import { ChoiceHighlight } from "../../registry/react/foundation/choice-highlight"

it("tracks active geometry, hides for disabled/filtered results, and releases observers", async () => {
  let resize = () => {}
  const disconnect = vi.fn(), unobserve = vi.fn()
  vi.stubGlobal("ResizeObserver", class {
    constructor(callback: () => void) { resize = callback }
    observe() {}
    unobserve = unobserve
    disconnect = disconnect
  })
  function List({ active, disabled = false }: { active?: string; disabled?: boolean }) {
    return <div><ChoiceHighlight />{["a", "b"].map(id => <div key={id} data-testid={id} className="rax-choice-option" data-active={active === id || undefined} aria-disabled={id === "b" && disabled || undefined}>{id}</div>)}</div>
  }
  const view = render(<List active="a" />)
  const marker = view.container.querySelector<HTMLElement>(".rax-choice-highlight")!
  Object.defineProperties(view.getByTestId("a"), { offsetTop: { value: 12 }, offsetLeft: { value: 4 }, offsetWidth: { value: 160 }, offsetHeight: { value: 36 } })
  act(() => resize())
  expect(marker).not.toHaveAttribute("hidden")
  expect(marker.style.transform).toBe("translate(4px, 12px)")
  expect(marker.style.height).toBe("36px")
  expect(marker.style.width).toBe("160px")
  view.rerender(<List active="b" />)
  await waitFor(() => expect(unobserve).toHaveBeenCalled())
  await waitFor(() => expect(marker.style.transform).toBe("translate(0px, 0px)"))
  view.rerender(<List active="b" disabled />)
  await waitFor(() => expect(marker).toHaveAttribute("hidden"))
  view.rerender(<List />)
  expect(marker).toHaveAttribute("hidden")
  view.unmount()
  expect(disconnect).toHaveBeenCalledOnce()
  vi.unstubAllGlobals()
})
