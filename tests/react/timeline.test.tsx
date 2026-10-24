import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Timeline, TimelineItem, TimelineGroup, relativeTime } from "../../registry/react/components/timeline/timeline"
describe("Timeline", () => {
  it("marks the current event and provides translated statuses and machine times", () => {
    render(<Timeline labels={{ current: "Active" }}><TimelineGroup>Today</TimelineGroup><TimelineItem title="Placed" status="done" time="09:00" dateTime="2026-10-24T09:00" /><TimelineItem title="Delivery" status="current" tone="success" marker={<svg aria-hidden />} description="On the way" /></Timeline>)
    expect(screen.getByRole("list")).toBeVisible()
    const current = screen.getByText("Delivery").closest("li")
    expect(current).toHaveAttribute("aria-current", "step")
    expect(current).toHaveAttribute("data-tone", "success")
    expect(current).toHaveTextContent("Active")
    expect(document.querySelector("time")).toHaveAttribute("datetime", "2026-10-24T09:00")
  })
  it("formats relative time with an explicit clock", () => {
    expect(relativeTime(0, { now: 3600000, locale: "en" })).toBe("1 hour ago")
  })
})
