import { it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import "./navigation-test-support"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "../../registry/react/components/accordion/accordion"
it("opens, navigates and collapses single items with the keyboard", async () => {
 const user = userEvent.setup()
 render(<Accordion type="single" collapsible><AccordionItem value="a"><AccordionTrigger>A</AccordionTrigger><AccordionContent>First</AccordionContent></AccordionItem><AccordionItem value="b"><AccordionTrigger>B</AccordionTrigger><AccordionContent>Second</AccordionContent></AccordionItem></Accordion>)
 const a = screen.getByRole("button", { name: "A" }); a.focus()
 await user.keyboard("{Enter}"); expect(a).toHaveAttribute("aria-expanded", "true")
 await user.keyboard("{ArrowDown}{Enter}"); expect(a).toHaveAttribute("aria-expanded", "false")
 const b = screen.getByRole("button", { name: "B" }); expect(b).toHaveAttribute("aria-expanded", "true")
 await user.keyboard("{Enter}"); expect(b).toHaveAttribute("aria-expanded", "false")
 await user.keyboard("{Home}"); expect(a).toHaveFocus()
 await user.keyboard("{End}"); expect(b).toHaveFocus()
})
