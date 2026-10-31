import * as React from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { Rating } from "../../registry/react/components/rating/rating"
import { Wired, expectWiring } from "./control-test-utils"
import { RaxThemeProvider } from "../../registry/react/foundation/theme"

describe("Rating", () => {
  it("wires Field and exposes translated value labels", async () => {
    render(<Wired><Rating defaultValue={1} getValueText={(value) => `${value} points`} /></Wired>)
    const control = screen.getByRole("slider")
    expectWiring(control)
    expect(control).toHaveAttribute("aria-valuetext", "1 points")
    control.focus()
    await userEvent.keyboard("{ArrowRight}{ArrowUp}")
    expect(control).toHaveAttribute("aria-valuenow", "3")
  })
  it("supports controlled half steps and theme RTL", async () => {
    function Example() {
      const [value, setValue] = React.useState(2)
      return <RaxThemeProvider direction="rtl"><Rating value={value} onChange={setValue} allowHalf aria-label="Score" /></RaxThemeProvider>
    }
    render(<Example />)
    const control = screen.getByRole("slider")
    control.focus()
    await userEvent.keyboard("{ArrowLeft}")
    expect(control).toHaveAttribute("aria-valuenow", "2.5")
    await userEvent.keyboard("{ArrowRight}{ArrowDown}")
    expect(control).toHaveAttribute("aria-valuenow", "1.5")
  })
  it("uses computed RTL without a provider and blocks disabled changes", () => {
    const { rerender } = render(<div style={{ direction: "rtl" }}><Rating defaultValue={2} aria-label="Score" /></div>)
    const control = screen.getByRole("slider")
    // jsdom does not inherit computed direction; supply the browser-computed value directly.
    control.style.direction = "rtl"
    fireEvent.keyDown(control, { key: "ArrowLeft" })
    expect(control).toHaveAttribute("aria-valuenow", "3")
    rerender(<Rating value={2} disabled aria-label="Score" />)
    fireEvent.keyDown(screen.getByRole("slider"), { key: "ArrowUp" })
    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuenow", "2")
  })
  it("preserves a selected score when clearing is disabled", () => {
    render(<Rating defaultValue={1} clearable={false} aria-label="Score" />)
    const control = screen.getByRole("slider")
    control.setPointerCapture = () => {}
    fireEvent.pointerDown(control, { button: 0, pointerId: 1, clientX: 0 })
    fireEvent.pointerUp(control, { pointerId: 1, clientX: 0 })
    expect(control).toHaveAttribute("aria-valuenow", "1")
    expect(control).toHaveAttribute("aria-valuetext", "1 out of 5 stars")
  })
  it("clears the current pointer value and posts the hidden value", () => {
    render(<Rating defaultValue={1} name="score" aria-label="Score" />)
    const control = screen.getByRole("slider")
    control.setPointerCapture = () => {}
    fireEvent.pointerDown(control, { button: 0, pointerId: 1, clientX: 0 })
    fireEvent.pointerUp(control, { pointerId: 1, clientX: 0, pointerType: "mouse" })
    expect(control).toHaveAttribute("aria-valuenow", "0")
    expect(document.querySelector('input[name="score"]')).toHaveValue("0")
  })
})
