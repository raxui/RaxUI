import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, isRequiredInSchema } from "../../registry/react/components/form/form"
import { FormRow, FormRowLink, FormSection } from "../../registry/react/components/form-section/form-section"

const schema = z.object({ name: z.string().min(1, "Name is required"), nickname: z.string().optional() })
function Example({ onSubmit = vi.fn() }: { onSubmit?: (values: z.infer<typeof schema>) => void }) {
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { name: "", nickname: "" }, shouldFocusError: false })
  return <Form {...form} schema={schema}><form onSubmit={form.handleSubmit(onSubmit)} noValidate>
    <FormField control={form.control} name="name" render={({ field }) => <FormItem>
      <FormLabel>Name</FormLabel><FormControl><input {...field} /></FormControl>
      <FormDescription>Your full name</FormDescription><FormMessage />
    </FormItem>} />
    <FormSection title="Profile" footer="Visible to friends">
      <FormField control={form.control} name="nickname" render={({ field }) => <FormRow label="Nickname" optional><input {...field} /></FormRow>} />
      <FormRowLink label="Settings" value="English" />
    </FormSection>
    <button type="submit">Save</button>
  </form></Form>
}

beforeEach(() => {
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }))
  Element.prototype.scrollIntoView = vi.fn()
})

describe("Form", () => {
  it("derives required hints from the schema and supports optional settings rows", () => {
    render(<Example />)
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveAttribute("aria-required", "true")
    expect(screen.getByText("*")).toBeInTheDocument()
    expect(screen.getByRole("textbox", { name: /Nickname/ })).not.toHaveAttribute("aria-required")
    expect(screen.getByText("(Optional)")).toBeInTheDocument()
    expect(screen.getByRole("region", { name: "Profile" })).toHaveClass("rax-form-section")
    expect(screen.getByRole("button", { name: /Settings/ })).toHaveAttribute("type", "button")
  })

  it("shows schema errors, focuses the first invalid control, and submits corrected values", async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<Example onSubmit={onSubmit} />)
    await user.click(screen.getByRole("button", { name: "Save" }))
    expect(await screen.findByText("Name is required")).toBeInTheDocument()
    const name = screen.getByRole("textbox", { name: "Name" })
    expect(name).toHaveAttribute("aria-invalid", "true")
    expect(name).toHaveAccessibleDescription("Your full name Name is required")
    await waitFor(() => expect(name).toHaveFocus())
    expect(onSubmit).not.toHaveBeenCalled()
    await user.type(name, "Ada")
    await user.click(screen.getByRole("button", { name: "Save" }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0]).toEqual({ name: "Ada", nickname: "" })
    expect(screen.queryByText("Name is required")).not.toBeInTheDocument()
  })

  it("matches boot-ui empty-value semantics for nested schemas and explicit optional types", () => {
    const nested = z.object({ users: z.array(z.object({ email: z.email(), alias: z.string().optional() })), consent: z.literal(true), note: z.string() })
    expect(isRequiredInSchema(nested, "users.0.email")).toBe(true)
    expect(isRequiredInSchema(nested, "users.0.alias")).toBe(false)
    expect(isRequiredInSchema(nested, "consent")).toBe(true)
    expect(isRequiredInSchema(nested, "note")).toBe(false)
    expect(isRequiredInSchema(nested, "missing")).toBeUndefined()
  })
})
