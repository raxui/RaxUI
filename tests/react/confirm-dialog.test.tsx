import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { RaxThemeProvider } from "@/lib/theme"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "../../registry/react/components/confirm-dialog/confirm-dialog"

describe("ConfirmDialog", () => {
  it("is a named alert dialog in the theme root, focuses Cancel, and cancels on Escape", async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(
      <RaxThemeProvider data-testid="root">
        <ConfirmDialog trigger={<Button>Delete</Button>} title="Delete file?" description="This cannot be undone." tone="destructive" onCancel={onCancel} />
      </RaxThemeProvider>,
    )
    await user.click(screen.getByRole("button", { name: "Delete" }))

    const dialog = screen.getByRole("alertdialog", { name: "Delete file?" })
    expect(dialog).toHaveAccessibleDescription("This cannot be undone.")
    expect(dialog).toHaveClass("rax-confirm")
    expect(dialog).toHaveAttribute("data-tone", "destructive")
    expect(screen.getByTestId("root")).toContainElement(dialog)
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus()
    expect(screen.getByRole("button", { name: "Confirm" })).toHaveClass("btn-glass-destructive", "rax-confirm-action")

    await user.keyboard("{Escape}")
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it("requires the typed text, shows a failed confirm, and closes once it succeeds", async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    const onConfirm = vi.fn().mockRejectedValueOnce(new Error("Network error")).mockResolvedValueOnce(undefined)
    render(<ConfirmDialog defaultOpen title="Delete project?" confirmationText="my-app" onConfirm={onConfirm} onCancel={onCancel} />)

    const action = screen.getByRole("button", { name: "Confirm" })
    expect(action).toBeDisabled()
    await user.type(screen.getByLabelText("Type my-app to confirm"), "my-app")
    expect(action).toBeEnabled()

    await user.click(action)
    expect(await screen.findByRole("alert")).toHaveTextContent("Network error")
    expect(screen.getByRole("alertdialog")).toBeInTheDocument()

    await user.click(action)
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument())
    expect(onConfirm).toHaveBeenCalledTimes(2)
    expect(onCancel).not.toHaveBeenCalled()
  })
})
