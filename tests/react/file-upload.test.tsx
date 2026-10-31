import * as React from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useForm, Controller } from "react-hook-form"
import { describe, expect, it, vi } from "vitest"
import { FileUpload } from "../../registry/react/components/file-upload/file-upload"
import { Field, FieldLabel, FieldError } from "../../registry/react/components/field/field"
import { Wired, expectWiring } from "./control-test-utils"

const file = (name = "notes.txt", content = "abc", type = "text/plain") => new File([content], name, { type })
describe("FileUpload", () => {
  it("wires Field and forwards the native focusable ref", () => {
    const ref = React.createRef<HTMLInputElement>()
    render(<Wired><FileUpload ref={ref} /></Wired>)
    expectWiring(ref.current!)
    expect(ref.current).toHaveAttribute("type", "file")
  })
  it("shows app-owned progress, replaces a batch and removes files", async () => {
    const changed = vi.fn(), user = userEvent.setup()
    render(<FileUpload aria-label="Files" maxFiles={2} onChange={changed} progress={() => 40} removeLabel="Delete" />)
    await user.upload(screen.getByLabelText("Files"), [file(), file("second.txt")])
    expect(screen.getAllByRole("progressbar")[0]).toHaveAttribute("aria-valuenow", "40")
    await user.click(screen.getByRole("button", { name: "Delete notes.txt" }))
    expect(changed.mock.calls.at(-1)?.[0].map((f: File) => f.name)).toEqual(["second.txt"])
    await user.upload(screen.getByLabelText("Files"), file("replacement.txt"))
    expect(screen.queryByText("second.txt")).not.toBeInTheDocument()
  })
  it.each([
    [{ accept: ".png,image/*" }, [file()], "This file type is not allowed."],
    [{ maxSize: 2 }, [file()], "This file is too large."],
    [{ maxFiles: 1 }, [file(), file("other.txt")], "Too many files selected."],
  ])("rejects invalid drops with connected errors", (props, files, message) => {
    const changed = vi.fn()
    render(<FileUpload {...props} onChange={changed} aria-label="Files" />)
    fireEvent.drop(document.querySelector("label")!, { dataTransfer: { files } })
    expect(screen.getByRole("alert")).toHaveTextContent(message)
    expect(screen.getByLabelText("Files")).toHaveAccessibleDescription(message)
    expect(changed).toHaveBeenLastCalledWith([])
  })
  it("does not accept a drop through a disabled Field", () => {
    const changed = vi.fn()
    render(<Field disabled><FieldLabel>Files</FieldLabel><FileUpload onChange={changed} /></Field>)
    fireEvent.drop(document.querySelector(".rax-upload-zone")!, { dataTransfer: { files: [file()] } })
    expect(changed).not.toHaveBeenCalled()
  })
  it("binds File[] through Controller and Field and submits it", async () => {
    const save = vi.fn(), user = userEvent.setup()
    function Example() {
      const { control, handleSubmit } = useForm({ defaultValues: { files: [] as File[] } })
      return <form onSubmit={handleSubmit(save)}><Controller control={control} name="files" rules={{ validate: files => files.length > 0 || "Required" }}
        render={({ field, fieldState }) => <Field invalid={!!fieldState.error}><FieldLabel>Files</FieldLabel><FileUpload {...field} /><FieldError>{fieldState.error?.message}</FieldError></Field>} />
        <button>Save</button></form>
    }
    render(<Example />)
    await user.click(screen.getByRole("button", { name: "Save" }))
    expect(await screen.findByText("Required")).toBeInTheDocument()
    await user.upload(screen.getByLabelText("Files"), file())
    await user.click(screen.getByRole("button", { name: "Save" }))
    await waitFor(() => expect(save).toHaveBeenCalled())
    expect(save.mock.calls[0][0].files[0].name).toBe("notes.txt")
  })
})
