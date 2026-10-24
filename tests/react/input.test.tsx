import * as React from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { Input, PasswordInput } from "../../registry/react/components/input/input"
import { Wired, expectWiring } from "./control-test-utils"

describe("Input", () => {
  it("wires Field exactly once through FieldControl and forwards its ref", () => {
    const ref = React.createRef<HTMLInputElement>()
    render(<Wired><Input ref={ref} /></Wired>)
    expectWiring(screen.getByRole("textbox"))
    expect(ref.current).toBe(screen.getByRole("textbox"))
  })
  it("types and clears an uncontrolled input, notifying onChange", async () => {
    const user = userEvent.setup(), changed = vi.fn(), cleared = vi.fn()
    render(<Input clearable clearLabel="Erase" onChange={changed} onClear={cleared} aria-label="Name" />)
    await user.type(screen.getByRole("textbox"), "Ada")
    await user.click(screen.getByRole("button", { name: "Erase" }))
    expect(screen.getByRole("textbox")).toHaveValue("")
    expect(screen.getByRole("textbox")).toHaveFocus()
    expect(changed).toHaveBeenCalledTimes(4)
    expect(cleared).toHaveBeenCalledOnce()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })
  it("clears a controlled input and focuses when a decorative slot is clicked", async () => {
    function Example() {
      const [value, setValue] = React.useState("Ada")
      return <Input value={value} onChange={e => setValue(e.target.value)} clearable startIcon={<i data-testid="icon" />} />
    }
    render(<Example />)
    fireEvent.pointerDown(screen.getByTestId("icon"))
    expect(screen.getByRole("textbox")).toHaveFocus()
    await userEvent.click(screen.getByRole("button", { name: "Clear" }))
    expect(screen.getByRole("textbox")).toHaveValue("")
  })
  it("toggles a password from the keyboard with translated labels", async () => {
    const user = userEvent.setup()
    render(<PasswordInput aria-label="Secret" showLabel="Reveal" hideLabel="Conceal" />)
    const input = screen.getByLabelText("Secret")
    expect(input).toHaveAttribute("type", "password")
    await user.tab(); await user.tab(); await user.keyboard(" ")
    expect(input).toHaveAttribute("type", "text")
    expect(screen.getByRole("button", { name: "Conceal" })).toHaveAttribute("aria-pressed", "true")
    await user.keyboard(" ")
    expect(input).toHaveAttribute("type", "password")
  })
  it.each(["email", "number", "search"])("preserves native %s behavior and hides actions on readonly inputs", type => {
    render(<Input type={type} defaultValue="12" clearable readOnly />)
    expect(document.querySelector("input")).toHaveAttribute("type", type)
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })
})
