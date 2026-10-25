import * as React from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { InputGroup, InputGroupItem } from "../../registry/react/components/input-group/input-group"
import { Wired, expectWiring } from "./control-test-utils"
import { SheenThemeProvider } from "../../registry/react/foundation/theme"

describe("InputGroup", () => {
  it("wires the group without duplicate member ids and supports auto-advance/backspace", async () => {
    const user = userEvent.setup()
    render(<Wired><InputGroup autoAdvance><InputGroupItem maxLength={2} aria-label="First" /><InputGroupItem maxLength={2} aria-label="Second" /></InputGroup></Wired>)
    expectWiring(screen.getByRole("group"))
    const [first, second] = screen.getAllByRole("textbox")
    expect(first.id).not.toBe(second.id)
    first.focus()
    fireEvent.input(first, { target: { value: "12" }, inputType: "insertText" })
    expect(second).toHaveFocus()
    await user.keyboard("{Backspace}")
    expect(first).toHaveFocus()
  })
  it("distributes paste into controlled fields", () => {
    function Example() {
      const [a, setA] = React.useState(""), [b, setB] = React.useState("")
      return <InputGroup autoAdvance><InputGroupItem maxLength={2} value={a} onChange={e => setA(e.target.value)} /><InputGroupItem maxLength={2} value={b} onChange={e => setB(e.target.value)} /></InputGroup>
    }
    render(<Example />)
    const [first, second] = screen.getAllByRole("textbox")
    fireEvent.paste(first, { clipboardData: { getData: () => "1234" } })
    expect(first).toHaveValue("12"); expect(second).toHaveValue("34")
  })
  // jsdom does not compute inherited direction from HTML dir attributes.
  it("uses theme direction for boundary arrow movement", () => {
    render(<SheenThemeProvider direction="rtl"><InputGroup autoAdvance style={{ direction: "rtl" }}><InputGroupItem defaultValue="12" /><InputGroupItem /></InputGroup></SheenThemeProvider>)
    const [first, second] = screen.getAllByRole("textbox") as HTMLInputElement[]
    first.focus(); first.setSelectionRange(2, 2)
    fireEvent.keyDown(first, { key: "ArrowLeft" })
    expect(second).toHaveFocus()
  })
  it.each([['ltr', 'rtl', 'ArrowLeft'], ['rtl', 'ltr', 'ArrowRight']] as const)("uses local %s/%s direction instead of the outer theme", (themeDirection, direction, forward) => {
    render(<SheenThemeProvider direction={themeDirection}><InputGroup dir={direction} style={{ direction }} autoAdvance><InputGroupItem defaultValue="12" /><InputGroupItem /></InputGroup></SheenThemeProvider>)
    const [first, second] = screen.getAllByRole("textbox") as HTMLInputElement[]
    expect(first).not.toHaveAttribute("dir")
    expect(second).not.toHaveAttribute("dir")
    first.focus(); first.setSelectionRange(2, 2)
    fireEvent.keyDown(first, { key: forward })
    expect(second).toHaveFocus()
  })
  it("inherits an RTL wrapper and preserves an explicitly directed field", () => {
    render(<SheenThemeProvider direction="ltr"><div dir="rtl"><InputGroup><InputGroupItem /><InputGroupItem dir="ltr" /></InputGroup></div></SheenThemeProvider>)
    const [inherited, explicit] = screen.getAllByRole("textbox")
    expect(inherited).not.toHaveAttribute("dir")
    expect(explicit).toHaveAttribute("dir", "ltr")
    expect(screen.getByRole("group").closest('[dir="rtl"]')).not.toBeNull()
  })
})
