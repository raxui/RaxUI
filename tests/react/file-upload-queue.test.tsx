import * as React from "react"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { FileUpload, type FileUploadContext } from "../../registry/react/components/file-upload/file-upload"
import { Field, FieldLabel } from "../../registry/react/components/field/field"

const file = (name: string, size = 3) => new File(["x".repeat(size)], name, { type: "text/plain", lastModified: 1 })
function pick(container: HTMLElement, files: File[]) { fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files } }) }
beforeEach(() => {
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true, addEventListener() {}, removeEventListener() {} })))
})

describe("FileUpload queue", () => {
  it("keeps valid files when other incoming files fail validation and ignores duplicates", () => {
    const rejected = vi.fn(), changed = vi.fn(), good = file("notes.txt")
    const { container } = render(<FileUpload variant="dropzone" accept=".txt" minSize={2} maxSize={5} maxFiles={2} onReject={rejected} onValueChange={changed} />)
    pick(container, [good, good, file("empty.txt", 1), file("large.txt", 6), file("wrong.pdf")])
    expect(changed).toHaveBeenLastCalledWith([good])
    expect(rejected.mock.calls[0][0].map((r: { reason: string }) => r.reason)).toEqual(["too-small", "too-large", "type"])
    pick(container, [file("second.txt"), file("third.txt")])
    expect(changed.mock.calls.at(-1)?.[0].map((f: File) => f.name)).toEqual(["notes.txt", "second.txt"])
    expect(screen.getByRole("alert")).toHaveTextContent("third.txt")
  })

  it("limits concurrency, pumps the next file and clamps valid progress", async () => {
    const pending: { resolve: (value: unknown) => void; context: FileUploadContext }[] = []
    const upload = vi.fn((_file: File, context: FileUploadContext) => new Promise(resolve => pending.push({ resolve, context })))
    const uploaded = vi.fn()
    const { container } = render(<FileUpload variant="dropzone" upload={upload} concurrency={2} onUploaded={uploaded} />)
    pick(container, [file("one.txt"), file("two.txt"), file("three.txt")])
    await waitFor(() => expect(upload).toHaveBeenCalledTimes(2))
    act(() => { pending[0].context.onProgress(48); pending[0].context.onProgress(NaN) })
    expect(screen.getByRole("progressbar", { name: "one.txt" })).toHaveAttribute("aria-valuenow", "48")
    await act(async () => pending[0].resolve("ok"))
    await waitFor(() => expect(upload).toHaveBeenCalledTimes(3))
    expect(uploaded).toHaveBeenCalledWith(expect.objectContaining({ name: "one.txt" }), "ok")
  })

  it("shows synchronous upload failures and retries the same file", async () => {
    const upload = vi.fn().mockImplementationOnce(() => { throw new Error("Offline") }).mockResolvedValue("done")
    const { container } = render(<FileUpload variant="dropzone" upload={upload} />)
    pick(container, [file("retry.txt")])
    expect(await screen.findByText("Offline")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Retry: retry.txt" }))
    await waitFor(() => expect(upload).toHaveBeenCalledTimes(2))
    expect(await screen.findByText(/Uploaded$/)).toBeInTheDocument()
  })

  it("aborts a cancelled upload and starts the next waiting file", async () => {
    const contexts: FileUploadContext[] = []
    const upload = vi.fn((_file: File, context: FileUploadContext) => new Promise(() => {
      contexts.push(context)
    }))
    const { container } = render(<FileUpload variant="dropzone" upload={upload} concurrency={1} />)
    pick(container, [file("cancel.txt"), file("next.txt")])
    await waitFor(() => expect(upload).toHaveBeenCalledTimes(1))
    fireEvent.click(screen.getByRole("button", { name: "Cancel upload: cancel.txt" }))
    await waitFor(() => expect(upload).toHaveBeenCalledTimes(2))
    expect(contexts[0].signal.aborted).toBe(true)
    expect(screen.queryByText("cancel.txt")).not.toBeInTheDocument()
  })

  it("aborts on unmount and never starts remaining queued files", async () => {
    let finish!: () => void, context!: FileUploadContext
    const upload = vi.fn((_file: File, next: FileUploadContext) => new Promise<void>(resolve => { context = next; finish = resolve }))
    const { container, unmount } = render(<FileUpload variant="dropzone" upload={upload} concurrency={1} />)
    pick(container, [file("one.txt"), file("two.txt")])
    await waitFor(() => expect(upload).toHaveBeenCalledTimes(1))
    unmount(); expect(context.signal.aborted).toBe(true)
    await act(async () => finish())
    expect(upload).toHaveBeenCalledTimes(1)
  })

  it("appends pasted files and replaces a file in compact single mode", () => {
    const { container, rerender } = render(<FileUpload variant="dropzone" aria-label="Attachments" />)
    const zone = screen.getByRole("button", { name: "Attachments" })
    fireEvent.paste(zone, { clipboardData: { files: [file("paste.txt")] } })
    expect(screen.getByText("paste.txt")).toBeInTheDocument()
    rerender(<FileUpload variant="compact" multiple={false} />)
    pick(container, [file("replacement.txt")])
    expect(screen.queryByText("paste.txt")).not.toBeInTheDocument()
    expect(screen.getByText("replacement.txt")).toBeInTheDocument()
  })

  it("inherits disabled Field state and exposes a focusable zone ref", () => {
    const changed = vi.fn(), ref = React.createRef<HTMLDivElement>()
    render(<Field disabled><FieldLabel>Attachments</FieldLabel><FileUpload variant="dropzone" ref={ref} onValueChange={changed} /></Field>)
    expect(ref.current).toHaveAttribute("role", "button")
    expect(ref.current).toHaveAttribute("aria-disabled", "true")
    fireEvent.drop(ref.current!, { dataTransfer: { files: [file("disabled.txt")] } })
    expect(changed).not.toHaveBeenCalled()
  })
})

it("does not start another upload when completion unmounts the picker", async () => {
  const upload = vi.fn().mockResolvedValue("done")
  const completed = vi.fn(() => view.unmount())
  const view = render(<FileUpload variant="dropzone" upload={upload} concurrency={1} onUploaded={completed} />)
  pick(view.container, [file("one.txt"), file("two.txt")])
  await waitFor(() => expect(completed).toHaveBeenCalled())
  await act(async () => {})
  expect(upload).toHaveBeenCalledTimes(1)
})
