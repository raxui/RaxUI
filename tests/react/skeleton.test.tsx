import * as React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Skeleton, SkeletonText } from "../../registry/react/components/skeleton/skeleton"
describe("Skeleton", () => {
  it.each(["text", "circle", "rect", "pill"] as const)("renders a decorative %s placeholder", (shape) => {
    const ref = React.createRef<HTMLSpanElement>()
    render(<Skeleton ref={ref} shape={shape} width={40} animation="shimmer" />)
    expect(ref.current).toHaveAttribute("aria-hidden", "true")
    expect(ref.current).toHaveAttribute("data-shape", shape)
    expect(ref.current).toHaveStyle({ width: "40px" })
  })
  it("makes loading content inert and reveals it", () => {
    const { rerender } = render(<Skeleton><button>Save</button></Skeleton>)
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
    expect(document.querySelector("[inert]")).toBeInTheDocument()
    rerender(<Skeleton loading={false}><button>Save</button></Skeleton>)
    expect(screen.getByRole("button", { name: "Save" })).not.toHaveAttribute("inert")
  })
  it("renders requested lines with a shorter last line", () => {
    render(<SkeletonText lines={2} lastLineWidth="40%" />)
    expect(document.querySelectorAll(".sheen-skeleton")).toHaveLength(2)
    expect(document.querySelectorAll(".sheen-skeleton")[1]).toHaveStyle({ width: "40%" })
  })
})
