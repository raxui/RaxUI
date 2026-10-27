import * as React from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { Switch } from "../../registry/react/components/switch/switch"
import { Wired, expectWiring } from "./control-test-utils"

describe("Switch", () => {
  it("wires Field and toggles with the keyboard", async () => {
    const user = userEvent.setup()
    render(<Wired><Switch defaultChecked /></Wired>)
    expectWiring(screen.getByRole("switch"))
    await user.tab(); await user.keyboard(" ")
    expect(screen.getByRole("switch")).not.toBeChecked()
  })
  it("updates a controlled switch and blocks changes while loading", async () => {
    function Example({ loading = false }) {
      const [checked, setChecked] = React.useState(false)
      return <Switch checked={checked} onCheckedChange={setChecked} loading={loading} aria-label="Updates" />
    }
    const { rerender } = render(<Example />)
    await userEvent.click(screen.getByRole("switch"))
    expect(screen.getByRole("switch")).toBeChecked()
    rerender(<Example loading />)
    expect(screen.getByRole("switch")).toBeDisabled()
    expect(screen.getByRole("switch")).toHaveAttribute("aria-busy", "true")
    expect(document.querySelector(".spinner-border-sm")).toBeInTheDocument()
  })
  it("renders thumb icons, swaps them with checkedIcon and hides them while loading", async () => {
    const { rerender } = render(<Switch aria-label="Theme" icon={<svg data-testid="sun" />} checkedIcon={<svg data-testid="moon" />} />)
    const sun = screen.getByTestId("sun").parentElement!
    const moon = screen.getByTestId("moon").parentElement!
    expect(sun).toHaveClass("sheen-switch-icon")
    expect(sun).toHaveAttribute("data-when", "unchecked")
    expect(moon).toHaveAttribute("data-when", "checked")
    expect(sun).toHaveAttribute("aria-hidden", "true")
    await userEvent.click(screen.getByRole("switch"))
    expect(sun.closest(".sheen-switch-thumb")).toHaveAttribute("data-state", "checked")
    rerender(<Switch aria-label="Theme" icon={<svg data-testid="sun" />} />)
    expect(screen.getByTestId("sun").parentElement).not.toHaveAttribute("data-when")
    rerender(<Switch aria-label="Theme" loading icon={<svg data-testid="sun" />} />)
    expect(screen.queryByTestId("sun")).not.toBeInTheDocument()
  })
})
