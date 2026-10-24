import * as React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Spinner } from "../../registry/react/components/spinner/spinner"
describe("Spinner", () => {
  it("announces translated loading, size, tone, and forwards its ref", () => {
    const ref = React.createRef<SVGSVGElement>()
    render(<Spinner ref={ref} label="Working" size="lg" color="success" />)
    expect(screen.getByRole("status", { name: "Working" })).toBe(ref.current)
    expect(ref.current).toHaveAttribute("data-color", "success")
    expect(ref.current).toHaveAttribute("data-size", "lg")
    expect(ref.current?.querySelectorAll("line")).toHaveLength(8)
  })
  it("can be decorative when the parent supplies the announcement", () => {
    render(<Spinner aria-hidden />)
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })
})
