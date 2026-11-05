import { render } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

// jsdom has no canvas: record what the component hands Chart.js instead. Browser tests cover painting.
const created: FakeChart[] = []
class FakeChart {
  static register() {}
  static defaults = { font: { family: "" } }
  data: { labels?: unknown[]; datasets: Record<string, unknown>[] }
  options: Record<string, unknown>
  type: string
  update = vi.fn()
  destroy = vi.fn()
  constructor(_canvas: HTMLCanvasElement, config: { type: string; data: FakeChart["data"]; options: FakeChart["options"] }) {
    this.type = config.type
    this.data = config.data
    this.options = config.options
    created.push(this)
  }
}
vi.mock("chart.js", async (original) => ({ ...(await original<object>()), Chart: FakeChart }))

const { Chart, chartConfig } = await import("../../registry/react/components/chart/chart")

const theme = { palette: ["#111111", "#222222", "#333333"], text: "#666666", grid: "#eeeeee", surface: "#ffffff", fillAlpha: 0.2, font: "sans-serif", rtl: false }
const base = { labels: ["Jan", "Feb", "Mar"], stacked: false, horizontal: false, legend: true, grid: true }
const sales = [
  { name: "Revenue", data: [12, 19, 7] },
  { name: "Cost", data: [5, 8, 3], color: "3" },
]

beforeEach(() => {
  created.length = 0
})

describe("Chart", () => {
  it("renders an accessible figure with a data table, then marks itself ready", () => {
    const { getByRole } = render(<Chart type="bar" label="Sales" labels={base.labels} series={sales} />)
    const figure = getByRole("figure", { name: "Sales" })
    expect(figure).toHaveAttribute("data-state", "ready")
    expect(figure.style.getPropertyValue("--rax-chart-height")).toBe("300px")
    expect(getByRole("table", { name: "Sales" })).toHaveTextContent("Revenue")
    expect(getByRole("rowheader", { name: "Feb" }).parentElement).toHaveTextContent("Feb198")
    expect(created).toHaveLength(1)
    expect(created[0].type).toBe("bar")
  })

  it("updates the same Chart.js instance for new data and recreates it for a new type", () => {
    const { rerender } = render(<Chart type="line" labels={base.labels} series={sales} />)
    const first = created[0]
    rerender(<Chart type="line" labels={base.labels} series={[{ name: "Revenue", data: [1, 2, 3] }]} />)
    expect(created).toHaveLength(1)
    expect(first.update).toHaveBeenCalled()
    expect(first.data.datasets).toHaveLength(1)
    expect(first.data.datasets[0].data).toEqual([1, 2, 3])
    rerender(<Chart type="bar" labels={base.labels} series={sales} />)
    expect(first.destroy).toHaveBeenCalled()
    expect(created).toHaveLength(2)
  })

  it("takes palette slots in order, by number, or as CSS colours", () => {
    const config = chartConfig({ ...base, type: "line", series: [...sales, { name: "Tax", data: [1, 1, 1], color: "#abcdef" }] }, theme)
    expect(config.data.datasets.map((d) => d.borderColor)).toEqual(["#111111", "#333333", "#abcdef"])
  })

  it("colours each doughnut slice and draws only the first series", () => {
    const config = chartConfig({ ...base, type: "doughnut", series: [{ ...sales[0], colors: [undefined, "1"] }, sales[1]] }, theme)
    expect(config.type).toBe("doughnut")
    expect(config.data.datasets).toHaveLength(1)
    expect(config.data.datasets[0].backgroundColor).toEqual(["#111111", "#111111", "#333333"])
  })

  it("mirrors the axes in RTL", () => {
    const rtl = { ...theme, rtl: true }
    const vertical = chartConfig({ ...base, type: "bar", series: sales }, rtl).options!.scales as Record<string, Record<string, unknown>>
    expect(vertical.x.reverse).toBe(true)
    expect(vertical.y.position).toBe("right")
    const horizontal = chartConfig({ ...base, type: "bar", horizontal: true, series: sales }, rtl)
    expect(horizontal.options!.indexAxis).toBe("y")
    const scales = horizontal.options!.scales as Record<string, Record<string, unknown>>
    expect(scales.x.reverse).toBe(true)
    expect(scales.y.position).toBe("right")
  })

  it("draws a sparkline without axes, legend or tooltip", () => {
    const config = chartConfig({ ...base, type: "sparkline", series: sales.slice(0, 1) }, theme)
    const scales = config.options!.scales as Record<string, Record<string, unknown>>
    expect(config.type).toBe("line")
    expect(scales.x.display).toBe(false)
    expect(config.options!.plugins!.legend!.display).toBe(false)
    expect(config.options!.plugins!.tooltip!.enabled).toBe(false)
    expect((config.data.datasets[0] as { fill: unknown }).fill).toBe("origin")
  })

  it("stacks area series on the one below", () => {
    const config = chartConfig({ ...base, type: "area", stacked: true, series: sales }, theme)
    expect(config.data.datasets.map((d) => (d as { fill: unknown }).fill)).toEqual(["origin", "-1"])
  })
})
