import { it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MenuToggle } from "../../registry/react/components/menu-toggle/menu-toggle"
it("announces and toggles expanded state with translated names", async () => {
 const user=userEvent.setup();render(<MenuToggle openLabel="Show navigation" closeLabel="Hide navigation" aria-controls="nav" />)
 await user.click(screen.getByRole("button",{name:"Show navigation"}))
 expect(screen.getByRole("button",{name:"Hide navigation"})).toHaveAttribute("aria-expanded","true")
 expect(screen.getByRole("button")).toHaveAttribute("aria-controls","nav")
})
