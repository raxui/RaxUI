import * as React from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { Combobox } from "../../registry/react/components/combobox/combobox"
import { Wired, expectWiring } from "./control-test-utils"

const options = [{ value: "a", label: "Alpha" }, { value: "b", label: "Beta", disabled: true }, { value: "g", label: "Gamma" }]
describe("Combobox", () => {
  it("wires its trigger to Field and forwards its ref", () => {
    const ref = React.createRef<HTMLButtonElement>()
    render(<Wired><Combobox ref={ref} options={options} /></Wired>)
    expectWiring(ref.current!)
  })
  it("navigates, skips disabled options, selects and posts an uncontrolled value", async () => {
    const user = userEvent.setup(), change = vi.fn()
    render(<Combobox options={options} name="choice" onChange={change} aria-label="Choice" />)
    const trigger = screen.getByRole("combobox", { name: "Choice" })
    trigger.focus(); await user.keyboard("{ArrowDown}")
    const input = screen.getByRole("combobox", { name: "Search options" })
    expect(input).toHaveFocus()
    await user.keyboard("{Home}{ArrowDown}")
    expect(document.getElementById(input.getAttribute("aria-activedescendant")!)).toHaveTextContent("Gamma")
    await user.keyboard("{Enter}")
    expect(change).toHaveBeenLastCalledWith("g")
    expect(document.querySelector('input[name="choice"]')).toHaveValue("g")
    expect(trigger).toHaveFocus()
  })
  it("searches by typing, shows a translated empty state, keeps controlled values and escapes", async () => {
    const user = userEvent.setup()
    render(<Combobox options={options} value="a" emptyMessage="Nothing" />)
    await user.click(screen.getByRole("combobox"))
    const input = screen.getByRole("combobox", { name: "Search options" })
    await user.type(input, "zz")
    expect(screen.getByRole("status")).toHaveTextContent("Nothing")
    await user.clear(input); await user.keyboard("{End}{Enter}")
    expect(screen.getByRole("combobox")).toHaveTextContent("Alpha")
    await user.click(screen.getByRole("combobox")); await user.keyboard("{Escape}")
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
  })
})
