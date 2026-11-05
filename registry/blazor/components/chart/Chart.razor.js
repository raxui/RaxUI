// RaxUI Chart behavior over Chart.js (ChartTypes.razor.js, ADR 020). Source-owned: edit freely.
// Colours, fonts and direction come from the --rax-chart-* tokens and the page theme, and are re-read whenever a
// theme attribute changes anywhere on the page, so accent, dark mode and RTL apply without a round trip to .NET.
//
// ChartTypes.razor.js is the unchanged Chart.js 4.6.1 UMD build, which bundles @kurkle/color 0.3.2. Both are MIT:
//
// The MIT License (MIT)
// Copyright (c) 2014-2024 Chart.js Contributors
// Copyright (c) 2018-2024 Jukka Kurkela (@kurkle/color)
//
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
// documentation files (the "Software"), to deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all copies or substantial portions of the
// Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
// WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
// COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
import "./ChartTypes.razor.js"

const Chart = globalThis.Chart
const instances = new Map()
const THEME = ["data-bs-theme", "data-rax-appearance", "data-rax-accent", "data-rax-density", "dir"]
let observer, queued, probe

// Any CSS colour to rgba() with a new alpha, by painting one pixel; unparseable colours pass through unchanged.
function fade(color, alpha) {
  probe ??= document.createElement("canvas").getContext("2d", { willReadFrequently: true })
  if (!probe) return color
  probe.clearRect(0, 0, 1, 1)
  probe.fillStyle = "#000"
  probe.fillStyle = color
  probe.fillRect(0, 0, 1, 1)
  const [r, g, b] = probe.getImageData(0, 0, 1, 1).data
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function readTheme(root) {
  const style = getComputedStyle(root), token = (name) => style.getPropertyValue(name).trim()
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

// "1"–"6" names a palette token; anything else is a CSS colour validated by the component.
const pick = (color, theme, index) => /^[1-6]$/.test(color ?? "") ? theme.palette[Number(color) - 1] : color || theme.palette[index % theme.palette.length]

export function chartConfig(o, theme) {
  const circular = o.type === "doughnut" || o.type === "pie", spark = o.type === "sparkline"
  const area = o.type === "area" || spark, bar = o.type === "bar", horizontal = bar && o.horizontal
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches
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
  const axis = (index) => ({
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
  }
}

function restyleAll() {
  queued = 0
  for (const s of instances.values()) if (s.root.isConnected) paint(s)
}

function paint(s) {
  const next = chartConfig(s.o, readTheme(s.root)), data = s.chart.data
  data.labels = next.data.labels
  // Keep dataset objects so Chart.js animates from the old values to the new ones.
  next.data.datasets.forEach((d, i) => (data.datasets[i] ? Object.assign(data.datasets[i], d) : data.datasets.push(d)))
  data.datasets.length = next.data.datasets.length
  s.chart.options = next.options
  s.chart.update()
}

export function sync(root, o) {
  if (!root?.isConnected) return
  let s = instances.get(o.id)
  const key = `${o.type}:${!!o.horizontal}`
  if (s && (s.key !== key || s.root !== root)) { s.chart.destroy(); s = undefined }
  if (s) { s.o = o; paint(s); return }
  const theme = readTheme(root)
  Chart.defaults.font.family = theme.font
  s = { root, o, key, chart: new Chart(root.querySelector("canvas"), chartConfig(o, theme)) }
  instances.set(o.id, s)
  root.dataset.state = "ready"
  observer ??= new MutationObserver(() => { queued ||= requestAnimationFrame(restyleAll) })
  observer.observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: THEME })
}

export function dispose(id) {
  const s = instances.get(id)
  if (!s) return
  s.chart.destroy()
  instances.delete(id)
  if (!instances.size) { observer?.disconnect(); observer = undefined }
}
