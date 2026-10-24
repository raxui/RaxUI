import { it, expect } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { reduceMotion } from "./navigation-test-support"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../registry/react/components/tabs/tabs"

it.each([false, true])("moves the indicator with keyboard selection (reduced=%s)", async reduced => {
  reduceMotion(reduced)
  const user = userEvent.setup()
  render(<Tabs defaultValue="a"><TabsList aria-label="Sections"><TabsTrigger value="a" data-x="1">A</TabsTrigger><TabsTrigger value="b" data-x="2">B</TabsTrigger><TabsTrigger value="c" disabled>C</TabsTrigger></TabsList><TabsContent value="a">First</TabsContent><TabsContent value="b">Second</TabsContent></Tabs>)
  const list = screen.getByRole("tablist")
  expect(list.style.getPropertyValue("--sheen-tabs-indicator-x")).toBe("40px")
  screen.getByRole("tab", { name: "A" }).focus()
  await user.keyboard("{ArrowRight}")
  await waitFor(() => expect(screen.getByRole("tab", { name: "B" })).toHaveAttribute("aria-selected", "true"))
  await waitFor(() => expect(list.style.getPropertyValue("--sheen-tabs-indicator-x")).toBe("80px"))
  expect(list.style.getPropertyValue("--sheen-tabs-indicator-width")).toBe("40px")
  expect(screen.getByRole("tabpanel")).toHaveTextContent("Second")
  await user.keyboard("{Home}")
  await waitFor(() => expect(screen.getByRole("tab", { name: "A" })).toHaveFocus())
  await user.keyboard("{End}")
  expect(screen.getByRole("tab", { name: "B" })).toHaveFocus()
})
it("mirrors horizontal keys in RTL", async () => {
  const user = userEvent.setup()
  render(<Tabs dir="rtl" defaultValue="b"><TabsList><TabsTrigger value="a">A</TabsTrigger><TabsTrigger value="b">B</TabsTrigger><TabsTrigger value="c">C</TabsTrigger></TabsList></Tabs>)
  screen.getByRole("tab", { name: "B" }).focus()
  await user.keyboard("{ArrowRight}")
  expect(screen.getByRole("tab", { name: "A" })).toHaveFocus()
})
