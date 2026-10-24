import * as React from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { InputGroup, InputGroupItem } from "../../registry/react/input-group/input-group"
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
  it("uses theme direction for boundary arrow movement", () => {
    render(<SheenThemeProvider direction="rtl"><InputGroup autoAdvance><InputGroupItem defaultValue="12" /><InputGroupItem /></InputGroup></SheenThemeProvider>)
    const [first, second] = screen.getAllByRole("textbox") as HTMLInputElement[]
    first.focus(); first.setSelectionRange(2, 2)
    fireEvent.keyDown(first, { key: "ArrowLeft" })
    expect(second).toHaveFocus()
  })
})
