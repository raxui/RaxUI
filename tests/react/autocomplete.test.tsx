import * as React from "react"
import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { Autocomplete } from "../../registry/react/components/autocomplete/autocomplete"
import { Wired, expectWiring } from "./control-test-utils"

describe("Autocomplete", () => {
  it("wires Field and forwards the text input ref", () => {
    const ref = React.createRef<HTMLInputElement>()
    render(<Wired><Autocomplete ref={ref} /></Wired>)
    expectWiring(ref.current!)
  })
  it("keeps focus in the input, searches and chooses with keyboard", async () => {
    const user = userEvent.setup(), change = vi.fn()
    render(<Autocomplete suggestions={["Alpha", "Gamma"]} onChange={change} aria-label="Search" />)
    const input = screen.getByRole("combobox")
    await user.type(input, "a")
    expect(input).toHaveFocus()
    await user.keyboard("{End}")
    expect(document.getElementById(input.getAttribute("aria-activedescendant")!)).toHaveTextContent("Gamma")
    await user.keyboard("{Enter}")
    expect(input).toHaveValue("Gamma")
    expect(change).toHaveBeenLastCalledWith("Gamma")
    expect(input).toHaveAttribute("aria-expanded", "false")
  })
  it("ignores stale async responses, aborts old requests and displays loading and empty text", async () => {
    const user = userEvent.setup()
    const requests: { query: string; signal: AbortSignal; resolve: (v: string[]) => void }[] = []
    const load = vi.fn((query: string, signal: AbortSignal) => new Promise<string[]>(resolve => requests.push({ query, signal, resolve })))
    render(<Autocomplete loadSuggestions={load} loadingMessage="Wait" emptyMessage="Nothing" aria-label="Search" />)
    const input = screen.getByRole("combobox")
    await user.click(input)
    expect(screen.getByRole("status")).toHaveTextContent("Wait")
    await user.type(input, "ab")
    await waitFor(() => expect(requests[requests.length - 1].query).toBe("ab"))
    expect(requests[0].signal.aborted).toBe(true)
    await act(async () => requests[requests.length - 1].resolve(["About"]))
    expect(await screen.findByRole("option")).toHaveTextContent("About")
    await act(async () => requests[0].resolve(["Stale"]))
    expect(screen.queryByText("Stale")).not.toBeInTheDocument()
    await user.type(input, "z")
    await act(async () => requests[requests.length - 1].resolve([]))
    expect(await screen.findByRole("status")).toHaveTextContent("Nothing")
  })
  it("reports async failure and supports controlled free text and Escape", async () => {
    const user = userEvent.setup()
    const load = vi.fn().mockRejectedValue(new Error("offline"))
    render(<Autocomplete value="Fixed" loadSuggestions={load} errorMessage="Unavailable" />)
    const input = screen.getByRole("combobox")
    await user.click(input)
    expect(await screen.findByRole("status")).toHaveTextContent("Unavailable")
    await user.keyboard("{Escape}")
    expect(input).toHaveAttribute("aria-expanded", "false")
    expect(input).toHaveValue("Fixed")
  })
})
