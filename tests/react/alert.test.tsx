import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { Alert, AlertDescription, AlertActions } from "../../registry/react/components/alert/alert"
describe("Alert", () => {
  it.each(["info", "success", "neutral", "warning", "danger"] as const)("announces %s and exposes variant and appearance", (tone) => {
    render(<Alert tone={tone} title="Update" variant="outline" appearance="flat"><AlertDescription>Saved</AlertDescription><AlertActions>Details</AlertActions></Alert>)
    const alert = screen.getByRole(tone === "danger" || tone === "warning" ? "alert" : "status")
    expect(alert).toHaveAttribute("data-tone", tone)
    expect(alert).toHaveAttribute("data-variant", "outline")
    expect(alert).toHaveAttribute("data-rax-appearance", "flat")
    expect(alert).toHaveTextContent("UpdateSavedDetails")
  })
  it("dismisses without motion and reopens controlled alerts", async () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }))
    const change = vi.fn()
    const { rerender } = render(<Alert dismissible onOpenChange={change}>Saved</Alert>)
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }))
    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument())
    expect(change).toHaveBeenCalledWith(false)
    rerender(<Alert open title="Back" />)
    expect(screen.getByText("Back")).toBeInTheDocument()
    vi.unstubAllGlobals()
  })
  it("keeps the collapse until its animation ends and permits custom labels", async () => {
    vi.stubGlobal("matchMedia", () => ({ matches: false }))
    render(<Alert dismissible dismissLabel="Close message" icon={false}>Saved</Alert>)
    fireEvent.click(screen.getByRole("button", { name: "Close message" }))
    expect(screen.getByRole("status")).toHaveAttribute("data-state", "closed")
    fireEvent.animationEnd(screen.getByRole("status"))
    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument())
    vi.unstubAllGlobals()
  })
})
