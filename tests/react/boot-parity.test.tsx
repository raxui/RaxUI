import * as React from "react"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, describe, expect, it, vi } from "vitest"
import { DateInput, DateTimeInput, TimeInput } from "../../registry/react/components/date-input/date-input"
import { TimePicker } from "../../registry/react/components/time-picker/time-picker"
import { Combobox } from "../../registry/react/components/combobox/combobox"
import { Autocomplete } from "../../registry/react/components/autocomplete/autocomplete"
import { Calendar } from "../../registry/react/components/calendar/calendar"
import { SheenThemeProvider } from "../../registry/react/foundation/theme"
import { Wired } from "./control-test-utils"

beforeAll(() => {
  HTMLElement.prototype.scrollTo ??= vi.fn()
  HTMLElement.prototype.scrollIntoView ??= vi.fn()
  globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver
})

describe("segmented date and time parity", () => {
  it("wires Field state and forwards focus to a segment", () => {
    const ref = React.createRef<HTMLDivElement>()
    render(<Wired><DateInput ref={ref} locale="en-US" /></Wired>)
    expect(ref.current).toHaveAttribute("id", "control")
    expect(ref.current).toHaveAttribute("aria-labelledby", "control-label")
    expect(ref.current).toHaveAttribute("aria-describedby", "control-description control-error")
    expect(ref.current).toHaveAttribute("aria-invalid", "true")
    expect(screen.getAllByRole("spinbutton")[0]).toHaveAttribute("aria-required", "true")
    act(() => ref.current!.focus())
    expect(document.activeElement).toHaveAttribute("role", "spinbutton")
  })
  it("clamps leap days when a year changes and posts a local ISO value", () => {
    const change = vi.fn()
    render(<DateInput locale="en-GB" defaultValue={new Date(2024, 1, 29)} name="birthday" onChange={change} />)
    fireEvent.keyDown(screen.getByRole("spinbutton", { name: "year" }), { key: "ArrowUp" })
    expect(change).toHaveBeenLastCalledWith(new Date(2025, 1, 28))
    expect(document.querySelector('input[name="birthday"]')).toHaveValue("2025-02-28")
  })
  it("accepts Arabic digits and clears the whole field", async () => {
    const user = userEvent.setup()
    render(<DateInput locale="en-GB" picker={false} clearable name="day" defaultValue={new Date(2026, 9, 25)} />)
    const day = screen.getByRole("spinbutton", { name: "day" })
    fireEvent.focus(day)
    fireEvent(day, new InputEvent("beforeinput", { bubbles: true, cancelable: true, inputType: "insertText", data: "١٢" }))
    expect(day).toHaveAttribute("aria-valuenow", "12")
    expect(document.querySelector('input[name="day"]')).toHaveValue("2026-10-12")
    await user.click(screen.getByRole("button", { name: "Clear" }))
    expect(document.querySelector('input[name="day"]')).toHaveValue("")
  })
  it("honors rejected controlled edits and preserves a time when the hour cycle changes", () => {
    const change = vi.fn()
    const view = render(<DateInput locale="en-GB" value={new Date(2026,9,25)} name="fixed" onChange={change} />)
    fireEvent.keyDown(screen.getByRole("spinbutton", {name:"year"}), {key:"ArrowUp"})
    expect(change).toHaveBeenLastCalledWith(new Date(2027,9,25))
    expect(document.querySelector('input[name="fixed"]')).toHaveValue("2026-10-25")
    view.unmount()
    const time = render(<TimeInput locale="en-GB" hourCycle={24} defaultValue={new Date(2026,9,25,18,30)} name="time" />)
    time.rerender(<TimeInput locale="en-GB" hourCycle={12} defaultValue={new Date(2026,9,25,18,30)} name="time" />)
    expect(screen.getByRole("spinbutton", {name:"hour"})).toHaveAttribute("aria-valuenow", "6")
    expect(document.querySelector('input[name="time"]')).toHaveValue("18:30")
  })
  it("honors range validation, read-only state, and disabled form submission", () => {
    const change = vi.fn()
    render(<DateInput locale="en-US" value={new Date(2026, 9, 25)} min={new Date(2026, 10, 1)} onChange={change} readOnly disabled name="date" aria-label="Date" />)
    expect(screen.getByRole("group", { name: "Date" })).toHaveAttribute("aria-invalid", "true")
    fireEvent.keyDown(screen.getByRole("spinbutton", { name: "year" }), { key: "ArrowUp" })
    expect(change).not.toHaveBeenCalled()
    expect(document.querySelector('input[name="date"]')).toBeDisabled()
    expect(screen.getByRole("button", { name: "Choose date" })).toBeDisabled()
  })
  it("combines date and time without shifting timezone and steps minutes", () => {
    render(<DateTimeInput locale="en-GB" hourCycle={24} minuteStep={15} name="appointment" defaultValue={new Date(2026,9,25,9,30)} />)
    fireEvent.keyDown(screen.getByRole("spinbutton", { name: "minute" }), { key: "ArrowUp" })
    expect(document.querySelector('input[name="appointment"]')).toHaveValue("2026-10-25T09:45")
  })
  it("ports the time-only field and wheel value contracts", () => {
    const change=vi.fn()
    render(<><TimeInput locale="en-GB" hourCycle={24} picker={false} name="opens" defaultValue={new Date(2026,9,25,9,30)} /><TimePicker locale="en-GB" hourCycle={24} defaultValue={{hours:9,minutes:30}} minuteStep={15} onChange={change} /></>)
    expect(document.querySelector('input[name="opens"]')).toHaveValue("09:30")
    fireEvent.keyDown(screen.getByRole("listbox", {name:"hour"}),{key:"ArrowDown"})
    expect(change).toHaveBeenLastCalledWith({hours:10,minutes:30})
    fireEvent.keyDown(screen.getByRole("listbox", {name:"minute"}),{key:"ArrowDown"})
    expect(change).toHaveBeenLastCalledWith({hours:10,minutes:45})
  })
  it("does not commit a late smooth-scroll frame before the requested last minute", () => {
    vi.useFakeTimers()
    const change = vi.fn()
    const view = render(<TimePicker locale="en-GB" hourCycle={24} defaultValue={{ hours: 0, minutes: 0 }} onChange={change} />)
    try {
      const minute = screen.getByRole("listbox", {name:"minute"})
      fireEvent.keyDown(minute, {key:"End"})
      expect(change).toHaveBeenLastCalledWith({hours:0,minutes:59})
      act(() => vi.advanceTimersByTime(600))
      minute.scrollTop = 57 * 36
      fireEvent.scroll(minute)
      act(() => vi.advanceTimersByTime(200))
      expect(change).toHaveBeenCalledTimes(1)
      expect(change).toHaveBeenLastCalledWith({hours:0,minutes:59})
      minute.scrollTop = 59 * 36
      fireEvent.scroll(minute)
      fireEvent.wheel(minute)
      minute.scrollTop = 58 * 36
      fireEvent.scroll(minute)
      act(() => vi.advanceTimersByTime(200))
      expect(change).toHaveBeenLastCalledWith({hours:0,minutes:58})
    } finally { view.unmount(); vi.useRealTimers() }
  })
  it("commits user scrolling after a StrictMode effect replay", async () => {
    const scroll = vi.spyOn(Element.prototype, "scrollTo").mockImplementation(function(this: Element, options?: ScrollToOptions | number) {
      if (typeof options === "object") this.scrollTop = options.top ?? 0
    })
    const change = vi.fn()
    render(<React.StrictMode><TimePicker locale="en-GB" hourCycle={24} minuteStep={5} defaultValue={{ hours: 13, minutes: 25 }} onChange={change} /></React.StrictMode>)
    const minutes = screen.getByRole("listbox", { name: "minute" })
    fireEvent.wheel(minutes)
    minutes.scrollTop = 8 * 36
    fireEvent.scroll(minutes)
    await waitFor(() => expect(change).toHaveBeenLastCalledWith({ hours: 13, minutes: 40 }))
    scroll.mockRestore()
  })
  it("gives multiple wheel pickers unique option IDs and blocks disabled keyboard changes", () => {
    const change=vi.fn()
    render(<><TimePicker locale="en-GB" disabled onChange={change} /><TimePicker locale="en-GB" /></>)
    const ids=screen.getAllByRole("option").map(el=>el.id)
    expect(new Set(ids).size).toBe(ids.length)
    fireEvent.keyDown(screen.getAllByRole("listbox")[0],{key:"ArrowDown"})
    expect(change).not.toHaveBeenCalled()
  })
  it("opens the shared custom calendar in its nearest dark theme", async () => {
    const user=userEvent.setup()
    render(<SheenThemeProvider mode="dark" appearance="glass" data-testid="theme"><DateInput locale="en-US" defaultValue={new Date(2026,9,25)} /></SheenThemeProvider>)
    await user.click(screen.getByRole("button",{name:"Choose date"}))
    const calendar=document.querySelector('.sheen-calendar')!
    expect(screen.getByTestId("theme")).toContainElement(calendar as HTMLElement)
    expect(calendar).toHaveAttribute("data-bs-theme","dark")
    await waitFor(() => expect(document.activeElement).toHaveClass("sheen-calendar-day"))
  })
  it("respects disabled calendar dates and keyboard month navigation", () => {
    const select=vi.fn()
    render(<Calendar locale="en-US" defaultMonth={new Date(2026,9,1)} selected={new Date(2026,9,25)} isDateDisabled={d=>d.getDate()===26} onSelect={select} />)
    const disabled=document.querySelector<HTMLButtonElement>('[data-date="2026-10-26"]')
    const days=[...document.querySelectorAll<HTMLButtonElement>('.sheen-calendar-day')]
    expect(disabled ?? days.find(el=>el.textContent==="26")).toHaveAttribute("aria-disabled", "true")
    const active=document.querySelector<HTMLElement>('.sheen-calendar-day[tabindex="0"]')!
    fireEvent.keyDown(active,{key:"PageDown"})
    expect(document.querySelector('.sheen-calendar')).toHaveTextContent("November")
  })
})

describe("rich choices parity", () => {
  const options=[{value:"r",label:"React",group:"Web",description:"UI library",keywords:["frontend"]},{value:"v",label:"Vue",group:"Web",disabled:true},{value:"s",label:"Svelte",group:"Other"}]
  it("supports grouped multi-select, chips, clear and repeated form inputs", async () => {
    const user=userEvent.setup()
    render(<Combobox options={options} multiple defaultValue={["r"]} clearable name="framework" aria-label="Frameworks" />)
    await user.click(screen.getByRole("combobox",{name:"Frameworks"}))
    expect(screen.getByRole("option", {name:/React/})).toHaveAttribute("aria-selected", "true")
    expect(screen.getByRole("option", {name:/Svelte/})).toHaveAttribute("aria-selected", "false")
    await user.click(screen.getByRole("option",{name:/Svelte/}))
    expect([...document.querySelectorAll<HTMLInputElement>('input[name="framework"]')].map(el=>el.value)).toEqual(["r","s"])
    expect(screen.getByRole("listbox")).toHaveAttribute("aria-multiselectable","true")
    await user.keyboard("{Escape}")
    await user.click(screen.getByRole("button",{name:"Remove React"}))
    expect(document.querySelector('input[name="framework"]')).toHaveValue("s")
    await user.click(screen.getByRole("button",{name:"Clear selection"}))
    expect(document.querySelector('input[name="framework"]')).toBeNull()
  })
  it("searches keywords and creates an option from unmatched text", async () => {
    const user=userEvent.setup(),create=vi.fn(label=>({value:label.toLowerCase(),label}))
    render(<Combobox options={options} onCreate={create} name="created" />)
    await user.click(screen.getByRole("combobox"))
    const input=screen.getByRole("combobox",{name:"Search options"})
    await user.type(input,"frontend")
    expect(screen.getByRole("option",{name:/React/})).toBeInTheDocument()
    await user.clear(input);await user.type(input,"Solid")
    await user.click(screen.getByRole("option",{name:/Create/}))
    expect(create).toHaveBeenCalledWith("Solid")
    expect(document.querySelector('input[name="created"]')).toHaveValue("solid")
  })
  it("keeps async results unfiltered and announces loading", async () => {
    const user=userEvent.setup(),search=vi.fn()
    const view=render(<Combobox options={[]} loading onSearchChange={search} aria-label="Remote" />)
    await user.click(screen.getByRole("combobox"))
    await user.type(screen.getByRole("combobox",{name:"Search options"}),"server-code")
    expect(search).toHaveBeenLastCalledWith("server-code")
    expect(screen.getByRole("status")).toHaveTextContent("Loading")
    view.rerender(<Combobox options={[{value:"r",label:"React"}]} onSearchChange={search} aria-label="Remote" />)
    expect(screen.getByRole("option")).toHaveTextContent("React")
  })
  it("separates selected value and label from typed search, skips disabled options and supports custom rendering", async () => {
    const user=userEvent.setup(),select=vi.fn(),input=vi.fn()
    render(<Autocomplete options={[{value:"id-1",label:"Alpha",description:"First"},{value:"id-2",label:"Beta",disabled:true},{value:"id-3",label:"Gamma"}]} minChars={0} onValueChange={select} onInputValueChange={input} renderOption={option=><span>{option.label} rich</span>} aria-label="Rich search" />)
    const field=screen.getByRole("combobox")
    await user.click(field)
    await user.keyboard("{Home}{ArrowDown}{Enter}")
    expect(field).toHaveValue("Gamma")
    expect(select).toHaveBeenLastCalledWith("id-3",expect.objectContaining({label:"Gamma"}))
    expect(input).toHaveBeenLastCalledWith("Gamma")
    await user.type(field,"x")
    expect(select).toHaveBeenLastCalledWith(null,null)
    expect(screen.queryByRole("option")).toBeNull()
    await user.click(screen.getByRole("button",{name:"Clear search"}))
    expect(field).toHaveValue("")
  })
  it("honors minimum query length, server filtering, read-only and selected aria semantics", async () => {
    const user=userEvent.setup()
    const view=render(<Autocomplete options={[{value:"r",label:"React"}]} filter={false} minChars={2} aria-label="Server" />)
    const field=screen.getByRole("combobox")
    await user.type(field,"x")
    expect(screen.queryByRole("listbox")).toBeNull()
    await user.type(field,"y")
    expect(screen.getByRole("option")).toHaveAttribute("aria-selected","false")
    await user.keyboard("{Enter}")
    expect(field).toHaveValue("React")
    view.rerender(<Autocomplete options={[{value:"r",label:"React"}]} readOnly minChars={0} aria-label="Server" />)
    await user.click(field)
    await waitFor(()=>expect(screen.queryByRole("listbox")).toBeNull())
  })
})
