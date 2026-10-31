import * as React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { Badge, BadgeCount } from "../../registry/react/components/badge/badge"
describe("Badge", () => {
  it.each(["tinted", "solid", "outline", "glass"] as const)("supports %s variants and ping", (variant) => {
    const ref = React.createRef<HTMLSpanElement>()
    render(<Badge ref={ref} variant={variant} color="success" dot="pulse" size="sm" shape="rounded" appearance="glass">Online</Badge>)
    expect(ref.current).toHaveAttribute("data-variant", variant)
    expect(ref.current).toHaveAttribute("data-color", "success")
    expect(ref.current?.querySelector(".rax-badge-dot")).toHaveAttribute("data-pulse", "true")
  })
  it("names removal and notification counts", () => {
    const remove = vi.fn()
    render(<><Badge onRemove={remove} removeLabel="Remove filter">Tag</Badge><BadgeCount count={120} getLabel={n => `${n} unread`}>Mail</BadgeCount></>)
    fireEvent.click(screen.getByRole("button", { name: "Remove filter" }))
    expect(remove).toHaveBeenCalledOnce()
    expect(screen.getByRole("status", { name: "120 unread" })).toHaveTextContent("99+")
  })
})
