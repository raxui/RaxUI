import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { Field, FieldControl, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet, focusFirstInvalid } from "../../registry/react/components/field/field"

beforeEach(() => {
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }))
  Element.prototype.scrollIntoView = vi.fn()
})

describe("Field", () => {
  it("wires a control to its label, description, error and state, preserving external descriptions", () => {
    render(<Field id="email" invalid required disabled>
      <FieldLabel>Email</FieldLabel>
      <FieldControl><input aria-describedby="external" aria-invalid={false} /></FieldControl>
      <FieldDescription>Private address</FieldDescription>
      <FieldError>Enter an email</FieldError>
    </Field>)
    const input = screen.getByRole("textbox")
    expect(input).toHaveAttribute("id", "email")
    expect(input).toHaveAttribute("aria-labelledby", "email-label")
    expect(input).toHaveAttribute("aria-describedby", "external email-description email-error")
    expect(input).toHaveAttribute("aria-invalid", "true")
    expect(input).toHaveAttribute("aria-required", "true")
    expect(input).toBeDisabled()
    expect(screen.getByText("*")).toHaveAttribute("aria-hidden", "true")
  })

  it("removes description and error references when those parts unmount", () => {
    const view = (show: boolean) => <Field invalid={show}>
      <FieldLabel>Name</FieldLabel><FieldControl><input /></FieldControl>
      {show && <FieldDescription>Hint</FieldDescription>}<FieldError>Required</FieldError>
    </Field>
    const { rerender } = render(view(true))
    expect(screen.getByRole("textbox")).toHaveAccessibleDescription("Hint Required")
    rerender(view(false))
    expect(screen.getByRole("textbox")).not.toHaveAttribute("aria-describedby")
    expect(screen.queryByText("Required")).not.toBeInTheDocument()
  })

  it("supports translated optional hints and native disabled groups", () => {
    render(<FieldSet disabled optional><FieldLegend optionalText="Not mandatory">Preferences</FieldLegend>
      <input type="checkbox" aria-label="Updates" />
    </FieldSet>)
    expect(screen.getByRole("checkbox")).toBeDisabled()
    expect(screen.getByText("Not mandatory")).toBeInTheDocument()
  })

  it("focuses the first invalid control and restarts its field motion", () => {
    const { container } = render(<form><Field invalid><FieldLabel>First</FieldLabel>
      <FieldControl><input /></FieldControl></Field><input aria-invalid="true" aria-label="Second" /></form>)
    expect(focusFirstInvalid(container)).toBe(true)
    expect(screen.getByRole("textbox", { name: "First" })).toHaveFocus()
    const field = container.querySelector(".sheen-field")!
    expect(field).toHaveAttribute("data-shake")
    fireEvent.animationEnd(field)
    expect(field).not.toHaveAttribute("data-shake")
    expect(focusFirstInvalid(document.createElement("form"))).toBe(false)
  })

  it("focuses without motion when reduced motion is requested", () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true }))
    const { container } = render(<Field invalid><FieldLabel>Name</FieldLabel><FieldControl><input /></FieldControl></Field>)
    focusFirstInvalid(container)
    expect(screen.getByRole("textbox")).toHaveFocus()
    expect(container.querySelector(".sheen-field")).not.toHaveAttribute("data-shake")
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ block: "center", behavior: "instant" })
  })
})
