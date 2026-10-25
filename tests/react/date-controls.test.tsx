import * as React from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { NativeDateInput as DateInput } from "../../registry/react/components/date-input/date-input"
import { NativeTimePicker as TimePicker } from "../../registry/react/components/time-picker/time-picker"
import { NativeDateTimeInput as DateTimeInput } from "../../registry/react/components/date-time-input/date-time-input"
import { NativeDateRangeInput as DateRangeInput } from "../../registry/react/components/date-range-input/date-range-input"
import { Wired, expectWiring } from "./control-test-utils"

describe("native dates and times", () => {
  it.each([[DateInput, "date", "2026-10-24"], [TimePicker, "time", "13:45"], [DateTimeInput, "datetime-local", "2026-10-24T13:45"]] as const)("wires and forwards a native %s", (Control, type, value) => {
    const ref = React.createRef<HTMLInputElement>()
    render(<Wired><Control ref={ref} defaultValue={value} /></Wired>)
    expectWiring(ref.current!)
    expect(ref.current).toHaveAttribute("type", type)
    expect(ref.current).toHaveValue(value)
  })
  it("updates an uncontrolled range and constrains both endpoints", () => {
    const change = vi.fn()
    render(<DateRangeInput defaultValue={{ start: "2026-01-01", end: "2026-02-01" }} onChange={change} name="start" endName="end" />)
    const start = screen.getByLabelText("Start date"), end = screen.getByLabelText("End date")
    expect(start).toHaveAttribute("max", "2026-02-01")
    expect(end).toHaveAttribute("min", "2026-01-01")
    fireEvent.change(start, { target: { value: "2026-01-20" } })
    expect(change).toHaveBeenLastCalledWith({ start: "2026-01-20", end: "2026-02-01" })
    expect(end).toHaveAttribute("min", "2026-01-20")
  })
  it("keeps a controlled invalid range and connects its translated error", () => {
    render(<DateRangeInput value={{ start: "2026-02-01", end: "2026-01-01" }} orderMessage="Wrong order" />)
    expect(screen.getByRole("alert")).toHaveTextContent("Wrong order")
    for (const input of document.querySelectorAll("input")) {
      expect(input).toHaveAttribute("aria-invalid", "true")
      expect(input).toHaveAccessibleDescription("Wrong order")
    }
  })
})
