import * as React from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, describe, expect, it, vi } from "vitest"
import { DateRangeInput } from "../../registry/react/components/date-range-input/date-range-input"
import { SheenThemeProvider } from "../../registry/react/foundation/theme"
import { Wired } from "./control-test-utils"

beforeAll(() => {
  window.matchMedia ??= ((query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} })) as typeof window.matchMedia
  globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver
})

describe("segmented DateRangeInput", () => {
  it("wires a Field, keeps unique inner IDs, and focuses its segments through the forwarded ref", () => {
    const ref=React.createRef<HTMLDivElement>()
    render(<Wired><DateRangeInput ref={ref} locale="en-GB" /></Wired>)
    expect(ref.current).toHaveAttribute("id","control")
    expect(ref.current).toHaveAttribute("aria-labelledby","control-label")
    expect(ref.current).toHaveAttribute("aria-describedby","control-description control-error")
    expect(screen.getByRole("group",{name:"Start date"})).toHaveAttribute("id","control-from")
    expect(screen.getByRole("group",{name:"End date"})).toHaveAttribute("id","control-to")
    expect(screen.getAllByRole("spinbutton")[0]).toHaveAttribute("aria-required","true")
    ref.current!.focus()
    expect(document.activeElement).toHaveAttribute("data-segment")
  })
  it("edits segmented endpoints, emits Date ranges and posts two ISO values", () => {
    const change=vi.fn()
    render(<DateRangeInput locale="en-GB" defaultValue={{from:new Date(2026,9,10),to:new Date(2026,9,13)}} name="stay" onChange={change} />)
    const end=screen.getByRole("group",{name:"End date"})
    fireEvent.keyDown(end.querySelector('[data-segment="day"]')!,{key:"ArrowUp"})
    expect(change).toHaveBeenLastCalledWith({from:new Date(2026,9,10),to:new Date(2026,9,14)})
    expect(document.querySelector('input[name="stay_from"]')).toHaveValue("2026-10-10")
    expect(document.querySelector('input[name="stay_to"]')).toHaveValue("2026-10-14")
  })
  it("marks reversed or disallowed-length ranges invalid without silently changing them", () => {
    const view=render(<DateRangeInput locale="en-GB" aria-label="Stay" value={{from:new Date(2026,9,10),to:new Date(2026,9,8)}} />)
    expect(screen.getByRole("group",{name:"Stay"})).toHaveAttribute("aria-invalid","true")
    view.rerender(<DateRangeInput locale="en-GB" aria-label="Stay" value={{from:new Date(2026,9,10),to:new Date(2026,9,11)}} minDays={2} />)
    expect(screen.getByRole("group",{name:"Stay"})).toHaveAttribute("aria-invalid","true")
  })
  it("applies presets, renders summary and keeps its calendar in the nearest theme", async () => {
    const user=userEvent.setup()
    render(<SheenThemeProvider mode="dark" direction="rtl" data-testid="theme"><DateRangeInput locale="en-GB" numberOfMonths={2} unit="nights" name="stay" presets={[{label:"Three nights",range:()=>({from:new Date(2026,9,10),to:new Date(2026,9,13)})}]} /></SheenThemeProvider>)
    await user.click(screen.getByRole("button",{name:"Choose dates"}))
    const popup=document.querySelector<HTMLElement>('.sheen-date-range-popover')!
    expect(screen.getByTestId("theme")).toContainElement(popup)
    expect(popup).toHaveAttribute("dir","rtl")
    expect(screen.getAllByRole("grid")).toHaveLength(2)
    await user.click(screen.getByRole("button",{name:"Three nights"}))
    expect(popup).toHaveTextContent("3 nights")
    expect(document.querySelector('input[name="stay_from"]')).toHaveValue("2026-10-10")
    await user.click(screen.getByRole("button",{name:"Done"}))
    await waitFor(()=>expect(document.querySelector('.sheen-date-range-popover')).toBeNull())
    await user.click(screen.getByRole("button",{name:"Clear dates"}))
    expect(document.querySelector('input[name="stay_from"]')).toHaveValue("")
    expect(document.querySelector('input[name="stay_to"]')).toHaveValue("")
  })
  it("blocks read-only editing and excludes disabled endpoint names from form posts", () => {
    const change=vi.fn()
    render(<DateRangeInput locale="en-GB" readOnly disabled name="stay" onChange={change} defaultValue={{from:new Date(2026,9,10),to:new Date(2026,9,13)}} />)
    expect(screen.getByRole("button",{name:"Choose dates"})).toBeDisabled()
    fireEvent.keyDown(screen.getAllByRole("spinbutton")[0],{key:"ArrowUp"})
    expect(change).not.toHaveBeenCalled()
    expect(document.querySelector('input[name="stay_from"]')).toBeDisabled()
    expect(document.querySelector('input[name="stay_to"]')).toBeDisabled()
  })
})
