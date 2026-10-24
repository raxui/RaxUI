import * as React from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { Switch } from "../../registry/react/switch/switch"
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
})
