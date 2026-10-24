import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Progress, ProgressCircle } from "../../registry/react/components/progress/progress"
describe("Progress", () => {
  it("exposes normalized values and translated visible and accessible labels", () => {
    render(<Progress label="Upload" value={20} max={40} showValue formatValue={(v, m) => `${v} of ${m} files`} />)
    const bar = screen.getByRole("progressbar", { name: "Upload" })
    expect(bar).toHaveAttribute("aria-valuenow", "20")
    expect(bar).toHaveAttribute("aria-valuemax", "40")
    expect(bar).toHaveAttribute("aria-valuetext", "20 of 40 files")
    expect(screen.getByText("20 of 40 files")).toBeVisible()
    expect(bar.firstElementChild).toHaveStyle({ transform: "translateX(-50%)" })
  })
  it("clamps out of range values and normalizes invalid maxima", () => {
    const { rerender } = render(<Progress value={150} max={0} successOnComplete />)
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100")
    expect(screen.getByRole("progressbar")).toHaveAttribute("data-color", "success")
    rerender(<Progress value={-10} />)
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0")
  })
  it("renders indeterminate without a current value, including segmented requests", () => {
    render(<Progress value={null} segments={4} label="Loading" />)
    const bar = screen.getByRole("progressbar", { name: "Loading" })
    expect(bar).not.toHaveAttribute("aria-valuenow")
    expect(bar).toHaveAttribute("data-state", "indeterminate")
    expect(bar.querySelector(".sheen-progress-indicator")).toBeInTheDocument()
  })
  it("fills segments in turn and renders circle values", () => {
    render(<><Progress value={50} segments={4} /><ProgressCircle value={25} aria-label="Circle" /></>)
    expect(document.querySelectorAll(".sheen-progress-segment")).toHaveLength(4)
    expect(screen.getByRole("progressbar", { name: "Circle" })).toHaveAttribute("aria-valuenow", "25")
  })
})
