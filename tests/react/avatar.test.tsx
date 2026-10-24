import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { Avatar, AvatarImage, AvatarFallback, AvatarBadge, getInitials } from "../../registry/react/components/avatar/avatar"
describe("Avatar", () => {
  it("derives Unicode initials, sizes and translated presence", () => {
    render(<Avatar size="lg" shape="rounded" ring><AvatarFallback name="Saad Alsaree" /><AvatarBadge status="online" label="Available" /></Avatar>)
    expect(screen.getByRole("img", { name: "Saad Alsaree" })).toHaveTextContent("SA")
    expect(screen.getByRole("img", { name: "Available" })).toHaveAttribute("data-status", "online")
    expect(document.querySelector(".sheen-avatar")).toHaveClass("sheen-avatar-lg", "sheen-avatar-rounded", "sheen-avatar-ring")
    expect(getInitials("???? ????????")).toBe("??")
    expect(getInitials(" ")).toBe("")
  })
  it("shows fallback after image load errors and image after success", async () => {
    let image: HTMLImageElement | undefined
    const NativeImage = window.Image
    vi.stubGlobal("Image", function () { image = document.createElement("img"); return image })
    const { rerender } = render(<Avatar><AvatarImage src="/missing.png" alt="Profile" /><AvatarFallback fallbackLabel="Unknown person">SA</AvatarFallback></Avatar>)
    await waitFor(() => expect(image).toBeDefined())
    fireEvent(image!, new Event("error"))
    await waitFor(() => expect(screen.getByRole("img", { name: "Unknown person" })).toBeVisible())
    rerender(<Avatar><AvatarImage src="/ok.png" alt="Profile" /><AvatarFallback>SA</AvatarFallback></Avatar>)
    Object.defineProperties(image!, { complete: { value: true }, naturalWidth: { value: 64 } })
    fireEvent.load(image!)
    await waitFor(() => expect(screen.getByRole("img", { name: "Profile" })).toBeInTheDocument())
    vi.stubGlobal("Image", NativeImage)
    vi.unstubAllGlobals()
  })
})
