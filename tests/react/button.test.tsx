import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import * as React from "react"
import { describe, expect, it, vi } from "vitest"

import { BootAppearanceScope, BootThemeProvider } from "@/lib/theme"
import { Button, buttonVariants } from "../../registry/react/button/button"
import { compileTheme } from "./compile-theme"

describe("Button", () => {
  it("doesn't submit forms unless asked", () => {
    render(
      <>
        <Button>Plain</Button>
        <Button type="submit">Send</Button>
      </>,
    )
    expect(screen.getByRole("button", { name: "Plain" })).toHaveAttribute("type", "button")
    expect(screen.getByRole("button", { name: "Send" })).toHaveAttribute("type", "submit")
  })

  it("can render as its child, e.g. a link", () => {
    render(
      <Button asChild variant="outline">
        <a href="/docs">Docs</a>
      </Button>,
    )
    const link = screen.getByRole("link", { name: "Docs" })
    expect(link).toHaveClass("btn", "bui-button", "btn-glass", "btn-glass-outline")
    expect(link).not.toHaveAttribute("type")
  })

  it("maps variants and sizes to classes", () => {
    expect(buttonVariants({ variant: "destructive", size: "icon-sm" })).toBe(
      "btn bui-button btn-glass btn-glass-destructive btn-glass-icon btn-sm",
    )
    expect(buttonVariants()).toBe("btn bui-button btn-glass btn-glass-primary")
  })

  it("inherits appearance: component, then nearest scope, then provider, then default", () => {
    render(
      <>
        <Button>Bare</Button>
        <BootThemeProvider appearance="glass" mode="dark" direction="rtl">
          <Button>Provider</Button>
          <BootAppearanceScope appearance="flat">
            <Button>Scope</Button>
            <Button appearance="default">Explicit</Button>
          </BootAppearanceScope>
        </BootThemeProvider>
      </>,
    )
    const appearance = (name: string) => screen.getByRole("button", { name }).getAttribute("data-bui-appearance")
    expect(appearance("Bare")).toBe("default")
    expect(appearance("Provider")).toBe("glass")
    expect(appearance("Scope")).toBe("flat")
    expect(appearance("Explicit")).toBe("default")
    expect(screen.getByRole("button", { name: "Scope" })).toHaveAttribute("data-bs-theme", "dark")
    expect(screen.getByRole("button", { name: "Scope" })).toHaveAttribute("dir", "rtl")
  })

  it("tints with a semantic color", () => {
    render(<Button color="success">Save</Button>)
    expect(screen.getByRole("button", { name: "Save" }).style.getPropertyValue("--bui-btn-tint-rgb")).toBe(
      "var(--bs-success-rgb)",
    )
  })

  it("forwards its ref to the button element", () => {
    const ref = React.createRef<HTMLButtonElement>()
    render(<Button ref={ref}>Ref</Button>)
    expect(ref.current).toBe(screen.getByRole("button", { name: "Ref" }))
  })

  it("is reachable by keyboard and activates with Enter and Space", async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Go</Button>)

    await user.tab()
    expect(screen.getByRole("button", { name: "Go" })).toHaveFocus()
    await user.keyboard("{Enter}")
    await user.keyboard(" ")
    expect(onClick).toHaveBeenCalledTimes(2)
  })

  it("is skipped by keyboard and click when disabled", async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        Off
      </Button>,
    )
    await user.tab()
    expect(screen.getByRole("button", { name: "Off" })).not.toHaveFocus()
    await user.click(screen.getByRole("button", { name: "Off" }))
    expect(onClick).not.toHaveBeenCalled()
  })
})

describe("Button styles", () => {
  it("compile with the theme and Bootstrap", () => {
    const css = compileTheme(['@import "button";'], ["registry/react/button"])
    expect(css).toContain(".btn-glass-primary")
    expect(css).toContain(".btn-glass-outline")
  })
})
