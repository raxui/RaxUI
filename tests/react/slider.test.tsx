import * as React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { Slider } from "../../registry/react/components/slider/slider"
import { SheenThemeProvider } from "../../registry/react/foundation/theme"
import { Wired, expectWiring } from "./control-test-utils"

class TestResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// Radix measures thumbs in browsers; jsdom has no layout observer.
globalThis.ResizeObserver = TestResizeObserver as unknown as typeof ResizeObserver

describe("Slider", () => {
  it("wires Field to the focusable thumb and forwards its root ref", () => {
    const ref = React.createRef<HTMLSpanElement>()
    render(<Wired><Slider ref={ref} defaultValue={[20]} /></Wired>)
    expectWiring(screen.getByRole("slider"))
    expect(ref.current).toHaveClass("sheen-slider")
    expect(document.querySelectorAll("#control")).toHaveLength(1)
  })
  it("supports uncontrolled arrows, Home/End and PageUp/PageDown", async () => {
    render(<Slider defaultValue={[20]} aria-label="Volume" />)
    const thumb = screen.getByRole("slider")
    thumb.focus()
    const user = userEvent.setup()
    await user.keyboard("{ArrowRight}{ArrowUp}")
    expect(thumb).toHaveAttribute("aria-valuenow", "22")
    await user.keyboard("{PageUp}")
    expect(thumb).toHaveAttribute("aria-valuenow", "32")
    await user.keyboard("{PageDown}{ArrowDown}{ArrowLeft}")
    expect(thumb).toHaveAttribute("aria-valuenow", "20")
    await user.keyboard("{End}")
    expect(thumb).toHaveAttribute("aria-valuenow", "100")
    await user.keyboard("{Home}")
    expect(thumb).toHaveAttribute("aria-valuenow", "0")
  })
  it("uses computed direction and mirrors mark placement without a provider", () => {
    render(<Slider style={{ direction: "rtl" }} defaultValue={[25]} marks={[{ value: 25, label: "Quarter" }]} />)
    expect(document.querySelector(".sheen-slider")).toHaveAttribute("dir", "rtl")
    expect(document.querySelector<HTMLElement>(".sheen-slider-mark")!.style.right).not.toBe("")
    expect(document.querySelector<HTMLElement>(".sheen-slider-mark")!.style.left).toBe("")
  })
  it("inherits an ancestor RTL scope without Radix's default dir masking it", () => {
    render(<div dir="rtl"><Slider defaultValue={[20]} /></div>)
    expect(document.querySelector(".sheen-slider")).toHaveAttribute("dir", "rtl")
    const thumb = screen.getByRole("slider")
    thumb.focus()
    fireEvent.keyDown(thumb, { key: "ArrowLeft" })
    expect(thumb).toHaveAttribute("aria-valuenow", "21")
  })
  it("updates controlled ranges without crossing and mirrors theme RTL", () => {
    function Example() {
      const [value, setValue] = React.useState([20, 40])
      return <SheenThemeProvider direction="rtl"><Slider value={value} onValueChange={setValue} thumbLabels={["Low", "High"]} /></SheenThemeProvider>
    }
    render(<Example />)
    const [low, high] = screen.getAllByRole("slider")
    low.focus()
    fireEvent.keyDown(low, { key: "ArrowLeft" })
    expect(low).toHaveAttribute("aria-valuenow", "21")
    for (let i = 0; i < 60; i++) fireEvent.keyDown(low, { key: "ArrowLeft" })
    expect(Number(low.getAttribute("aria-valuenow"))).toBeLessThanOrEqual(Number(high.getAttribute("aria-valuenow")))
    high.focus()
    for (let i = 0; i < 60; i++) fireEvent.keyDown(high, { key: "ArrowRight" })
    expect(Number(low.getAttribute("aria-valuenow"))).toBeLessThanOrEqual(Number(high.getAttribute("aria-valuenow")))
  })
})
