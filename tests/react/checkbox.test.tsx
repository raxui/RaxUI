import * as React from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { Checkbox } from "../../registry/react/components/checkbox/checkbox"
import { Wired, expectWiring } from "./control-test-utils"

describe("Checkbox", () => {
  it("wires Field and toggles an uncontrolled checkbox with Space", async () => {
    const user = userEvent.setup()
    render(<Wired><Checkbox /></Wired>)
    const checkbox = screen.getByRole("checkbox")
    expectWiring(checkbox)
    await user.tab(); await user.keyboard(" ")
    expect(checkbox).toBeChecked()
    await user.keyboard(" ")
    expect(checkbox).not.toBeChecked()
  })
  it("announces mixed state and updates a controlled checkbox", async () => {
    function Example() {
      const [checked, setChecked] = React.useState<boolean | "indeterminate">("indeterminate")
      return <Checkbox checked={checked} onCheckedChange={setChecked} aria-label="All" />
    }
    render(<Example />)
    expect(screen.getByRole("checkbox")).toHaveAttribute("aria-checked", "mixed")
    await userEvent.click(screen.getByRole("checkbox"))
    expect(screen.getByRole("checkbox")).toBeChecked()
  })
})
