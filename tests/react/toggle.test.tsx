import { it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import "./navigation-test-support"
import { Toggle, ToggleGroup, ToggleGroupItem } from "../../registry/react/components/toggle/toggle"
it("toggles aria-pressed with the keyboard", async () => {
 const user=userEvent.setup();render(<Toggle>Bold</Toggle>); const button=screen.getByRole("button");button.focus()
 await user.keyboard(" ");expect(button).toHaveAttribute("aria-pressed","true")
 await user.keyboard(" ");expect(button).toHaveAttribute("aria-pressed","false")
})
it.each(["single","multiple"] as const)("selects %s group items", async type => {
 const user=userEvent.setup();render(<ToggleGroup type={type}><ToggleGroupItem value="a">A</ToggleGroupItem><ToggleGroupItem value="b">B</ToggleGroupItem></ToggleGroup>)
 await user.click(screen.getByText("A")); await user.click(screen.getByText("B"))
 expect(screen.getByText("A")).toHaveAttribute(type === "single" ? "aria-checked" : "aria-pressed", type === "single" ? "false" : "true")
 expect(screen.getByText("B")).toHaveAttribute(type === "single" ? "aria-checked" : "aria-pressed","true")
})
