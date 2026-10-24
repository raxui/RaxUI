import * as React from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../../registry/react/components/select/select"
import { Wired, expectWiring } from "./control-test-utils"

const options = <SelectContent><SelectItem value="a">Alpha</SelectItem><SelectItem value="b">Beta</SelectItem></SelectContent>
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn()
  Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false)
  Element.prototype.setPointerCapture = vi.fn()
  Element.prototype.releasePointerCapture = vi.fn()
})
describe("Select", () => {
  it("wires its trigger inside Field and selects using the keyboard", async () => {
    const user = userEvent.setup()
    render(<Select defaultValue="a"><Wired><SelectTrigger><SelectValue /></SelectTrigger></Wired>{options}</Select>)
    expectWiring(screen.getByRole("combobox"))
    await user.tab(); await user.keyboard("{ArrowDown}")
    expect(await screen.findByRole("listbox")).toBeInTheDocument()
    await user.keyboard("{End}{Enter}")
    expect(screen.getByRole("combobox")).toHaveTextContent("Beta")
    expect(screen.getByRole("combobox")).toHaveFocus()
  })
  it("updates controlled values", async () => {
    const user = userEvent.setup()
    function Example() {
      const [value, setValue] = React.useState("a")
      return <Select value={value} onValueChange={setValue}><SelectTrigger><SelectValue /></SelectTrigger>{options}</Select>
    }
    render(<Example />)
    await user.tab(); await user.keyboard("{Enter}")
    await screen.findByRole("listbox")
    await user.keyboard("{End}{Enter}")
    expect(screen.getByRole("combobox")).toHaveTextContent("Beta")
  })
})
