import * as React from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, describe, expect, it, vi } from "vitest"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { DatePicker, DateRangePicker } from "../../registry/react/components/date-picker/date-picker"
import { RaxThemeProvider } from "../../registry/react/foundation/theme"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "../../registry/react/components/form/form"
import { Wired, expectWiring } from "./control-test-utils"

beforeAll(() => {
  window.matchMedia ??= ((query: string) => ({matches: query.includes("640"), media:query, addEventListener() {}, removeEventListener() {}})) as typeof window.matchMedia
  globalThis.ResizeObserver ??= class {observe() {} unobserve() {} disconnect() {}} as unknown as typeof ResizeObserver
})

describe("DatePicker", () => {
  it.each([DatePicker,DateRangePicker])("forwards its trigger ref and wires Field labels, errors and required state", Control => {
    const ref=React.createRef<HTMLButtonElement>()
    render(<Wired><Control ref={ref} locale="en-GB" /></Wired>)
    expectWiring(ref.current!)
  })
  it("opens on the selected day, skips blocked dates, posts ISO and restores focus", async () => {
    const user=userEvent.setup(),change=vi.fn()
    render(<RaxThemeProvider mode="dark" data-testid="theme"><DatePicker aria-label="Due date" locale="en-GB" name="due" defaultValue={new Date(2026,9,15)} min={new Date(2026,9,10)} max={new Date(2026,9,20)} isDateDisabled={d=>d.getDate()===16} onChange={change} /></RaxThemeProvider>)
    const trigger=screen.getByRole("button",{name:"Due date"})
    await user.click(trigger)
    const dialog=screen.getByRole("dialog",{name:"Choose date"})
    expect(document.getElementById(trigger.getAttribute("aria-controls")!)).toBe(dialog)
    expect(screen.getByTestId("theme")).toContainElement(dialog)
    await waitFor(()=>expect(document.activeElement).toHaveAttribute("data-date","2026-10-15"))
    const blocked=dialog.querySelector<HTMLElement>('[data-date="2026-10-16"]')!
    expect(blocked).toHaveAttribute("aria-disabled","true")
    fireEvent.click(blocked)
    expect(change).not.toHaveBeenCalled()
    await user.click(dialog.querySelector<HTMLElement>('[data-date="2026-10-17"]')!)
    expect(change).toHaveBeenLastCalledWith(new Date(2026,9,17))
    expect(document.querySelector('input[name="due"]')).toHaveValue("2026-10-17")
    await waitFor(()=>expect(trigger).toHaveFocus())
    await user.click(screen.getByRole("button",{name:"Clear date"}))
    expect(document.querySelector('input[name="due"]')).toHaveValue("")
    expect(trigger).toHaveFocus()
  })
  it("closes an existing popup when the control becomes disabled", async () => {
    const user=userEvent.setup()
    const view=render(<DatePicker aria-label="Date" locale="en-GB" />)
    await user.click(screen.getByRole("button",{name:"Date"}))
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    view.rerender(<DatePicker aria-label="Date" locale="en-GB" disabled />)
    expect(screen.queryByRole("dialog")).toBeNull()
    view.rerender(<DatePicker aria-label="Date" locale="en-GB" />)
    expect(screen.queryByRole("dialog")).toBeNull()
  })
  it("keeps a controlled value until its parent accepts the change", async () => {
    const user=userEvent.setup(),change=vi.fn()
    render(<DatePicker locale="en-GB" aria-label="Fixed" value={new Date(2026,9,15)} name="date" onChange={change} />)
    await user.click(screen.getByRole("button",{name:"Clear date"}))
    expect(change).toHaveBeenLastCalledWith(null)
    expect(document.querySelector('input[name="date"]')).toHaveValue("2026-10-15")
  })
  it("supports a local RTL field, translated actions, read-only and disabled submission", async () => {
    const user=userEvent.setup()
    const view=render(<div dir="rtl"><DatePicker locale="ar-IQ" aria-label="الموعد" calendarLabel="اختيار الموعد" clearLabel="مسح" defaultValue={new Date(2026,9,15)} /></div>)
    await user.click(screen.getByRole("button",{name:"الموعد"}))
    expect(screen.getByRole("dialog",{name:"اختيار الموعد"})).toHaveAttribute("dir","rtl")
    await user.keyboard("{Escape}")
    view.rerender(<DatePicker aria-label="Read only" readOnly name="date" defaultValue={new Date(2026,9,15)} />)
    await user.click(screen.getByRole("button",{name:"Read only"}))
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(screen.queryByRole("button",{name:"Clear date"})).toBeNull()
    view.rerender(<DatePicker aria-label="Disabled" disabled name="date" defaultValue={new Date(2026,9,15)} />)
    expect(screen.getByRole("button",{name:"Disabled"})).toBeDisabled()
    expect(document.querySelector('input[name="date"]')).toBeDisabled()
  })
})

describe("DateRangePicker", () => {
  const initial={from:new Date(2026,9,10),to:new Date(2026,9,13)}
  const presets=[{label:"First week",range:()=>({from:new Date(2026,9,1),to:new Date(2026,9,7)})}]
  it("keeps preset edits in a draft until Apply and discards Cancel/Escape edits", async () => {
    const user=userEvent.setup(),change=vi.fn()
    render(<DateRangePicker aria-label="Period" locale="en-GB" name="period" defaultValue={initial} presets={presets} onChange={change} />)
    const trigger=screen.getByRole("button",{name:"Period"})
    await user.click(trigger)
    await user.click(screen.getByRole("button",{name:"First week"}))
    expect(change).not.toHaveBeenCalled()
    expect(document.querySelector('input[name="period_from"]')).toHaveValue("2026-10-10")
    await user.click(screen.getByRole("button",{name:"Cancel"}))
    await user.click(trigger)
    expect(screen.getByRole("dialog")).toHaveTextContent(/10\s*–\s*13 Oct 2026/)
    await user.click(screen.getByRole("button",{name:"First week"}));await user.keyboard("{Escape}")
    expect(change).not.toHaveBeenCalled()
    await user.click(trigger);await user.click(screen.getByRole("button",{name:"First week"}));await user.click(screen.getByRole("button",{name:"Apply"}))
    expect(change).toHaveBeenLastCalledWith({from:new Date(2026,9,1),to:new Date(2026,9,7)})
    expect(document.querySelector('input[name="period_from"]')).toHaveValue("2026-10-01")
    expect(document.querySelector('input[name="period_to"]')).toHaveValue("2026-10-07")
    await waitFor(()=>expect(trigger).toHaveFocus())
  })
  it("previews hovered dates and does not enable Apply before both endpoints are selected", async () => {
    const user=userEvent.setup()
    render(<DateRangePicker locale="en-GB" aria-label="Range" defaultValue={{from:new Date(2026,9,10)}} presets={[]} />)
    await user.click(screen.getByRole("button",{name:"Range"}))
    expect(screen.getByRole("button",{name:"Apply"})).toBeDisabled()
    const dialog=screen.getByRole("dialog")
    const end=dialog.querySelector<HTMLElement>('[data-date="2026-10-13"]')!
    fireEvent.mouseEnter(end)
    expect(dialog.querySelectorAll('[data-preview]')).not.toHaveLength(0)
    await user.click(end)
    expect(screen.getByRole("button",{name:"Apply"})).toBeEnabled()
  })
  it("blocks invalid preset ranges and renders reversed values without throwing", async () => {
    const user=userEvent.setup()
    const view=render(<DateRangePicker locale="en-GB" aria-label="Range" min={new Date(2026,9,5)} presets={presets} />)
    await user.click(screen.getByRole("button",{name:"Range"}));await user.click(screen.getByRole("button",{name:"First week"}))
    expect(screen.getByRole("button",{name:"Apply"})).toBeDisabled()
    await user.keyboard("{Escape}")
    view.rerender(<DateRangePicker locale="en-GB" aria-label="Range" value={{from:new Date(2026,9,13),to:new Date(2026,9,10)}} />)
    expect(screen.getByRole("button",{name:"Range"})).toHaveAttribute("aria-invalid","true")
  })
  it("normalizes ICU range separator spacing for stable hydration", () => {
    render(<DateRangePicker locale="en-GB" aria-label="Range" defaultValue={initial} />)
    expect(screen.getByRole("button",{name:"Range"}).textContent).toBe("10 – 13 Oct 2026")
  })
  it("formats a range when Intl.formatRange is unavailable", () => {
    const descriptor=Object.getOwnPropertyDescriptor(Intl.DateTimeFormat.prototype,"formatRange")!
    Object.defineProperty(Intl.DateTimeFormat.prototype,"formatRange",{configurable:true,value:undefined})
    try {
      render(<DateRangePicker locale="en-GB" aria-label="Range" defaultValue={initial} />)
      expect(screen.getByRole("button",{name:"Range"})).toHaveTextContent("10 Oct 2026 – 13 Oct 2026")
    } finally { Object.defineProperty(Intl.DateTimeFormat.prototype,"formatRange",descriptor) }
  })
  it("does not read default preset clocks during closed static rendering", () => {
    const preset=vi.fn(()=>initial)
    render(<DateRangePicker presets={[{label:"Preset",range:preset}]} />)
    expect(preset).not.toHaveBeenCalled()
  })
})

it("integrates a date value with react-hook-form/zod errors, focus and submission", async () => {
  const submit=vi.fn(),user=userEvent.setup()
  const schema=z.object({date:z.date().nullable().refine(value=>value!==null,"Date is required")})
  function Example(){
    const form=useForm({resolver:zodResolver(schema),defaultValues:{date:null as Date|null},shouldFocusError:false})
    return <Form {...form} schema={schema}><form onSubmit={form.handleSubmit(submit)} noValidate><FormField control={form.control} name="date" render={({field})=><FormItem><FormLabel>Date</FormLabel><FormControl><DatePicker {...field} locale="en-GB" /></FormControl><FormMessage /></FormItem>} /><button type="submit">Save</button></form></Form>
  }
  render(<Example />)
  await user.click(screen.getByRole("button",{name:"Save"}))
  expect(await screen.findByText("Date is required")).toBeInTheDocument()
  const trigger=screen.getByRole("button",{name:"Date"})
  await waitFor(()=>expect(trigger).toHaveFocus())
  await user.click(trigger)
  const day=screen.getByRole("dialog").querySelector<HTMLElement>('.rax-calendar-day[tabindex="0"]')!
  await user.click(day);await user.click(screen.getByRole("button",{name:"Save"}))
  await waitFor(()=>expect(submit).toHaveBeenCalled())
  expect(submit.mock.calls[0][0].date).toBeInstanceOf(Date)
})
