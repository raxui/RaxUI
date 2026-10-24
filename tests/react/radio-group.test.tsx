import * as React from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { RadioGroup, RadioGroupItem } from "../../registry/react/components/radio-group/radio-group"
import { Wired, expectWiring } from "./control-test-utils"

const items = <><RadioGroupItem value="a" aria-label="A" /><RadioGroupItem value="b" aria-label="B" /></>
describe("RadioGroup", () => {
  it("wires the group and moves selection with arrow keys", async () => {
    const user = userEvent.setup({ delay: 10 })
    render(<Wired><RadioGroup defaultValue="a">{items}</RadioGroup></Wired>)
    expectWiring(screen.getByRole("radiogroup"))
    await user.tab()
    await waitFor(() => expect(screen.getByRole("radio", { name: "A" })).toHaveFocus())
    fireEvent.keyDown(screen.getByRole("radio", { name: "A" }), { key: "ArrowDown" })
    await waitFor(() => expect(screen.getByRole("radio", { name: "B" })).toBeChecked())
    fireEvent.keyUp(screen.getByRole("radio", { name: "B" }), { key: "ArrowDown" })
    expect(screen.getByRole("radio", { name: "A" })).not.toBeChecked()
  })
  it("updates controlled selection", async () => {
    function Example() {
      const [value, setValue] = React.useState("a")
      return <RadioGroup value={value} onValueChange={setValue}>{items}</RadioGroup>
    }
    render(<Example />)
    await userEvent.click(screen.getByRole("radio", { name: "B" }))
    expect(screen.getByRole("radio", { name: "B" })).toBeChecked()
  })
})
