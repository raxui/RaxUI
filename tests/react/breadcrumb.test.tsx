import { it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { BreadcrumbTrail } from "../../registry/react/components/breadcrumb/breadcrumb"
it("provides real links and marks the current crumb", () => {
 render(<BreadcrumbTrail label="Location" items={[{label:"Home",href:"/"},{label:"Account",href:"/account"}]} />)
 expect(screen.getByRole("navigation", {name:"Location"})).toBeInTheDocument()
 expect(screen.getByRole("link", {name:"Home"})).toHaveAttribute("href","/")
 expect(screen.getByText("Account").closest('[aria-current="page"]')).toBeInTheDocument()
})
it("collapses the middle into an accessible menu trigger", () => {
 render(<BreadcrumbTrail maxItems={3} collapsedLabel="Hidden pages" items={["Home","One","Two","Three","Current"].map(label=>({label,href:"/"+label}))} />)
 expect(screen.getByRole("button", {name:"Hidden pages"})).toHaveAttribute("aria-haspopup","menu")
 expect(screen.queryByRole("link", {name:"One"})).not.toBeInTheDocument()
})
