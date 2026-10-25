"use client"

// Ported from boot-ui. Built-in SVG paths from Lucide (ISC).
import * as React from "react"

export type QRCodeLevel = "L" | "M" | "Q" | "H"

export type QRCodeShape = "square" | "rounded" | "dots"

export type Matrix = { count: number; get: (row: number, col: number) => boolean }

export type QRCodeContextValue = {
  value: string
  size: number
  level: QRCodeLevel
  margin: number
  shape: QRCodeShape
  foregroundColor: string
  backgroundColor: string
  matrix: Matrix | null
  status: "loading" | "ready" | "error"
  /** Odd number of modules cleared in the middle for an overlay (0 = none). */
  hole: number
  setHasOverlay: (has: boolean) => void
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>
}

export const QRCodeContext = React.createContext<QRCodeContextValue | null>(null)

export function useQRCode(name: string) {
  const context = React.useContext(QRCodeContext)
  if (!context) throw new Error(`\`${name}\` must be used within \`QRCode\``)
  return context
}

export function roundedRect(x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, w / 2, h / 2)
  const n = (v: number) => +v.toFixed(3)
  return (
    `M${n(x + r)} ${n(y)}h${n(w - 2 * r)}a${n(r)} ${n(r)} 0 0 1 ${n(r)} ${n(r)}v${n(h - 2 * r)}` +
    `a${n(r)} ${n(r)} 0 0 1 ${n(-r)} ${n(r)}h${n(-(w - 2 * r))}a${n(r)} ${n(r)} 0 0 1 ${n(-r)} ${n(-r)}` +
    `v${n(-(h - 2 * r))}a${n(r)} ${n(r)} 0 0 1 ${n(r)} ${n(-r)}z`
  )
}

export function qrPath(matrix: Matrix, margin: number, shape: QRCodeShape, hole: number) {
  const { count } = matrix
  const holeStart = (count - hole) / 2
  const inHole = (r: number, c: number) => hole > 0 && r >= holeStart && r < holeStart + hole && c >= holeStart && c < holeStart + hole
  // The three 7×7 finder patterns ("eyes") at the corners.
  const eyes = [
    [0, 0],
    [0, count - 7],
    [count - 7, 0],
  ]
  const inEye = (r: number, c: number) => eyes.some(([er, ec]) => r >= er && r < er + 7 && c >= ec && c < ec + 7)
  const dark = (r: number, c: number) => matrix.get(r, c) && !inHole(r, c)

  let d = ""
  if (shape === "square") {
    // Merge each row's runs into single rectangles: a smaller path and no hairline seams.
    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) {
        if (!dark(r, c)) continue
        let end = c
        while (end + 1 < count && dark(r, end + 1)) end++
        d += `M${c + margin} ${r + margin}h${end - c + 1}v1h${-(end - c + 1)}z`
        c = end
      }
    }
    return d
  }

  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (!dark(r, c) || inEye(r, c)) continue
      d +=
        shape === "dots" ? roundedRect(c + margin + 0.1, r + margin + 0.1, 0.8, 0.8, 0.4) : roundedRect(c + margin, r + margin, 1, 1, 0.3)
    }
  }
  // Soft eyes: a rounded ring and a rounded centre.
  for (const [er, ec] of eyes) {
    const x = ec + margin
    const y = er + margin
    d += roundedRect(x, y, 7, 7, 2.2) + roundedRect(x + 1, y + 1, 5, 5, 1.5) + roundedRect(x + 2, y + 2, 3, 3, 1)
  }
  return d
}

const escapeAttribute = (value: string) => value.replace(/[&<>"']/g, char => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&apos;"}[char]!))

export function svgMarkup(context: QRCodeContextValue) {
  const { matrix, margin, shape, hole, foregroundColor, backgroundColor, size } = context
  if (!matrix) return ""
  const total = matrix.count + margin * 2
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${total} ${total}"${shape === "square" ? ' shape-rendering="crispEdges"' : ""}>` +
    `<rect width="${total}" height="${total}" fill="${escapeAttribute(backgroundColor)}"/>` +
    `<path fill="${escapeAttribute(foregroundColor)}" fill-rule="evenodd" d="${qrPath(matrix, margin, shape, hole)}"/></svg>`
  )
}

export function paint(canvas: HTMLCanvasElement, context: QRCodeContextValue, pixels: number) {
  const { matrix, margin, shape, hole, foregroundColor, backgroundColor } = context
  if (!matrix) return
  canvas.width = pixels
  canvas.height = pixels
  const ctx = canvas.getContext("2d")
  if (!ctx) return
  const scale = pixels / (matrix.count + margin * 2)
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.fillStyle = backgroundColor
  ctx.fillRect(0, 0, pixels, pixels)
  ctx.scale(scale, scale)
  ctx.fillStyle = foregroundColor
  ctx.fill(new Path2D(qrPath(matrix, margin, shape, hole)), "evenodd")
}
