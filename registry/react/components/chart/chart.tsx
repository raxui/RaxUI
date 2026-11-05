"use client"

// Chart.js with colours, fonts and direction read from the --rax-chart-* tokens and the page theme.
// chartConfig matches Blazor's Chart.razor.js; keep the two in step.
import * as React from "react"
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  DoughnutController,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PieController,
  PointElement,
  Tooltip,
  type ChartConfiguration,
} from "chart.js"
import { cn } from "@/lib/utils"
import { useMergedRef } from "@/lib/refs"

ChartJS.register(ArcElement, BarController, BarElement, CategoryScale, DoughnutController, Filler, Legend, LinearScale, LineController, LineElement, PieController, PointElement, Tooltip)

export type ChartType = "line" | "area" | "bar" | "doughnut" | "pie" | "sparkline"

export interface ChartSeries {
  /** Shown in the legend, the tooltip and the accessible data table. */
  name: string
  /** Values in label order. */
  data: number[]
  /** A palette slot "1"–"6" (the --rax-chart-* tokens) or a CSS colour. Empty takes the next slot. */
  color?: string
  /** Doughnut and pie only: a colour per slice, in label order, in the same forms as `color`. */
  colors?: (string | undefined)[]
}

export interface ChartProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Defaults to `line`. */
  type?: ChartType
  /** Category labels: the x axis, or the slices of a doughnut or pie. */
  labels: string[]
  /** Doughnut and pie charts draw the first series only. */
  series: ChartSeries[]
  /** Bar and area: stack the series instead of drawing them side by side or overlapping. */
  stacked?: boolean
  /** Bar only: bars grow along the x axis. */
  horizontal?: boolean
  legend?: boolean
  grid?: boolean
  /** Height in pixels. Defaults to 300, or 48 for a sparkline. */
  height?: number
  /** Accessible name of the chart and caption of its data table. */
  label?: string
}

interface ChartOptions {
  type: ChartType
  labels: string[]
  series: ChartSeries[]
  stacked: boolean
  horizontal: boolean
  legend: boolean
  grid: boolean
}

interface ChartTheme {
  palette: string[]
  text: string
  grid: string
  surface: string
  fillAlpha: number
  font: string
  rtl: boolean
}

const THEME = ["data-bs-theme", "data-rax-appearance", "data-rax-accent", "data-rax-density", "dir"]
let probe: CanvasRenderingContext2D | null | undefined

// Any CSS colour to rgba() with a new alpha, by painting one pixel; unparseable colours pass through unchanged.
function fade(color: string, alpha: number) {
  if (probe === undefined) {
    try {
      probe = document.createElement("canvas").getContext("2d", { willReadFrequently: true })
    } catch {
      probe = null // jsdom has no canvas
    }
  }
  if (!probe) return color
  probe.clearRect(0, 0, 1, 1)
  probe.fillStyle = "#000"
  probe.fillStyle = color
  probe.fillRect(0, 0, 1, 1)
  const [r, g, b] = probe.getImageData(0, 0, 1, 1).data
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function readTheme(root: Element): ChartTheme {
  const style = getComputedStyle(root)
  const token = (name: string) => style.getPropertyValue(name).trim()
  return {
    palette: [1, 2, 3, 4, 5, 6].map((i) => token(`--rax-chart-${i}`)).filter(Boolean),
    text: token("--rax-chart-text"),
    grid: token("--rax-chart-grid"),
    surface: token("--rax-chart-surface"),
    fillAlpha: Number(token("--rax-chart-fill-alpha")) || 0.18,
    font: style.fontFamily,
    rtl: style.direction === "rtl",
  }
}

const pick = (color: string | undefined, theme: ChartTheme, index: number) =>
  /^[1-6]$/.test(color ?? "") ? theme.palette[Number(color) - 1] : color || theme.palette[index % theme.palette.length]

export function chartConfig(o: ChartOptions, theme: ChartTheme): ChartConfiguration {
  const circular = o.type === "doughnut" || o.type === "pie"
  const spark = o.type === "sparkline"
  const area = o.type === "area" || spark
  const bar = o.type === "bar"
  const horizontal = bar && o.horizontal
  const reduced = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
  const direction = theme.rtl ? "rtl" : "ltr"
  const datasets = circular
    ? o.series.slice(0, 1).map((s) => ({
        label: s.name,
        data: s.data,
        backgroundColor: o.labels.map((_, i) => pick(s.colors?.[i], theme, i)),
        borderColor: theme.surface,
        borderWidth: 2,
        hoverOffset: 6,
      }))
    : o.series.map((s, i) => {
        const color = pick(s.color, theme, i)
        return {
          label: s.name,
          data: s.data,
          borderColor: color,
          backgroundColor: area ? fade(color, theme.fillAlpha) : color,
          fill: area ? (o.stacked && i > 0 ? "-1" : "origin") : false,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: spark ? 0 : bar ? undefined : 2.5,
          pointHoverRadius: spark ? 0 : 4,
          borderRadius: bar ? 6 : 0,
          maxBarThickness: 40,
        }
      })
  const axis = (index: boolean) => ({
    stacked: o.stacked,
    beginAtZero: !index,
    grid: { display: !index && o.grid, color: theme.grid },
    border: { display: false },
    ticks: { color: theme.text },
  })
  const scales = circular
    ? {}
    : spark
      ? { x: { display: false, reverse: theme.rtl }, y: { display: false, stacked: o.stacked } }
      : horizontal
        ? { y: { ...axis(true), position: theme.rtl ? "right" : "left" }, x: { ...axis(false), reverse: theme.rtl } }
        : { x: { ...axis(true), reverse: theme.rtl }, y: { ...axis(false), position: theme.rtl ? "right" : "left" } }
  return {
    type: circular ? o.type : bar ? "bar" : "line",
    data: { labels: o.labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: reduced ? false : { duration: 400 },
      locale: document.documentElement.lang || undefined,
      indexAxis: horizontal ? "y" : "x",
      interaction: circular ? { mode: "nearest", intersect: true } : { mode: "index", intersect: false },
      layout: { padding: spark ? 2 : 0 },
      scales,
      plugins: {
        legend: {
          display: !spark && o.legend,
          position: "bottom",
          rtl: theme.rtl,
          textDirection: direction,
          labels: { color: theme.text, usePointStyle: true, pointStyle: "circle", boxWidth: 8, boxHeight: 8, padding: 16 },
        },
        tooltip: { enabled: !spark, rtl: theme.rtl, textDirection: direction, usePointStyle: true, boxPadding: 4 },
      },
    },
  } as ChartConfiguration
}

function paint(chart: ChartJS, o: ChartOptions, root: Element) {
  const next = chartConfig(o, readTheme(root))
  const data = chart.data
  data.labels = next.data.labels
  // Keep dataset objects so Chart.js animates from the old values to the new ones.
  next.data.datasets.forEach((d, i) => (data.datasets[i] ? Object.assign(data.datasets[i], d) : data.datasets.push(d)))
  data.datasets.length = next.data.datasets.length
  chart.options = next.options as ChartJS["options"]
  chart.update()
}

export const Chart = React.forwardRef<HTMLDivElement, ChartProps>(
  (
    {
      type = "line",
      labels,
      series,
      stacked = false,
      horizontal = false,
      legend = true,
      grid = true,
      height,
      label = "Chart",
      className,
      style,
      ...props
    },
    ref,
  ) => {
    const rootRef = React.useRef<HTMLDivElement | null>(null)
    const mergedRef = useMergedRef(rootRef, ref)
    const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
    const chartRef = React.useRef<ChartJS | null>(null)
    const [ready, setReady] = React.useState(false)
    const options: ChartOptions = { type, labels, series, stacked, horizontal, legend, grid }
    const optionsRef = React.useRef(options)
    optionsRef.current = options
    const json = JSON.stringify(options)
    const shown = type === "doughnut" || type === "pie" ? series.slice(0, 1) : series

    // A new type or orientation needs a new Chart.js instance; anything else updates in place.
    React.useEffect(() => {
      const root = rootRef.current
      const canvas = canvasRef.current
      if (!root || !canvas) return
      const theme = readTheme(root)
      ChartJS.defaults.font.family = theme.font
      const chart = new ChartJS(canvas, chartConfig(optionsRef.current, theme))
      chartRef.current = chart
      setReady(true)
      let queued = 0
      const observer = new MutationObserver(() => {
        queued ||= requestAnimationFrame(() => {
          queued = 0
          paint(chart, optionsRef.current, root)
        })
      })
      observer.observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: THEME })
      return () => {
        cancelAnimationFrame(queued)
        observer.disconnect()
        chart.destroy()
        chartRef.current = null
        setReady(false)
      }
    }, [type, horizontal])

    React.useEffect(() => {
      const root = rootRef.current
      if (chartRef.current && root) paint(chartRef.current, optionsRef.current, root)
    }, [json])

    return (
      <div
        ref={mergedRef}
        role="figure"
        aria-label={label}
        data-type={type}
        data-state={ready ? "ready" : undefined}
        className={cn("rax-chart", className)}
        style={{ "--rax-chart-height": `${height ?? (type === "sparkline" ? 48 : 300)}px`, ...style } as React.CSSProperties}
        {...props}
      >
        <canvas ref={canvasRef} aria-hidden="true" />
        <table className="visually-hidden">
          <caption>{label}</caption>
          <thead>
            <tr>
              <td />
              {shown.map((s) => (
                <th key={s.name} scope="col">
                  {s.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {labels.map((row, i) => (
              <tr key={`${row}-${i}`}>
                <th scope="row">{row}</th>
                {shown.map((s) => (
                  <td key={s.name}>{s.data[i]?.toLocaleString() ?? ""}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  },
)
Chart.displayName = "Chart"
