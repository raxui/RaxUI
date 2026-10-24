import * as React from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { Textarea } from "../../registry/react/textarea/textarea"
import { Wired, expectWiring } from "./control-test-utils"

describe("Textarea", () => {
  it("wires Field and accepts uncontrolled typing", async () => {
    render(<Wired><Textarea defaultValue="Hello" /></Wired>)
    expectWiring(screen.getByRole("textbox"))
    await userEvent.type(screen.getByRole("textbox"), "!")
    expect(screen.getByRole("textbox")).toHaveValue("Hello!")
  })
  it("updates a controlled value and announces a translated character limit", async () => {
    function Example() {
      const [value, setValue] = React.useState("")
      return <Textarea value={value} onChange={e => setValue(e.target.value)} showCount maxLength={3} limitLabel="Full" />
    }
    render(<Example />)
    await userEvent.type(screen.getByRole("textbox"), "abc")
    expect(screen.getByRole("status")).toHaveTextContent("Full")
  })
  it("grows to its maximum height and then scrolls", () => {
    const { rerender } = render(<Textarea autoResize minRows={2} maxRows={4} style={{ lineHeight: "20px", padding: 0, border: "1px solid" }} />)
    const input = screen.getByRole("textbox")
    Object.defineProperty(input, "scrollHeight", { configurable: true, value: 200 })
    fireEvent.change(input, { target: { value: "long" } })
    expect(input.style.height).toBe("82px")
    expect(input.style.overflowY).toBe("auto")
    rerender(<Textarea autoResize minRows={2} maxRows={4} defaultValue="short" style={{ lineHeight: "20px", padding: 0, border: "1px solid" }} />)
    expect(input.style.height).toBe("82px")
  })
})
