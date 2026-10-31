import { it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Stepper, StepperNav, StepperStep, StepperPanel, StepperNext } from "../../registry/react/components/stepper/stepper"
it("marks the current step and advances panels", async () => {
 const user=userEvent.setup();render(<Stepper><StepperNav><StepperStep title="Cart"/><StepperStep title="Pay"/></StepperNav><StepperPanel index={0}>First panel</StepperPanel><StepperPanel index={1}>Second panel</StepperPanel><StepperNext /></Stepper>)
 expect(screen.getByText("Cart", { selector: ".rax-step-title" }).closest("li")).toHaveAttribute("aria-current","step")
 await user.click(screen.getByRole("button",{name:"Next"}))
 expect(screen.getByText("Pay", { selector: ".rax-step-title" }).closest("li")).toHaveAttribute("aria-current","step")
 expect(screen.getByText("Second panel")).toBeVisible()
 expect(screen.getByText("First panel")).not.toBeVisible()
})
