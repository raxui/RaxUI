"use client"

// Ported from boot-ui. Built-in SVG paths from Lucide (ISC).
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { Button, type ButtonProps } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { assignRef } from "@/lib/refs"
import { type QRCodeLevel, type QRCodeShape, type Matrix, type QRCodeContextValue, QRCodeContext, useQRCode, qrPath, paint, svgMarkup } from "./qr-code-drawing"

export interface QRCodeProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onError"> {
  /** The text or URL to encode. */
  value: string
  /** Width and height in pixels. */
  size?: number
  /** Error correction: L ≈ 7%, M ≈ 15%, Q ≈ 25%, H ≈ 30% of the code can be lost. Use H with an overlay. */
  level?: QRCodeLevel
  /** Quiet zone around the code, in modules. Scanners need some; 0 removes it. */
  margin?: number
  /** `square` is the classic look; `rounded` and `dots` soften the modules and eyes. */
  shape?: QRCodeShape
  foregroundColor?: string
  backgroundColor?: string
  onGenerated?: () => void
  onError?: (error: Error) => void
  asChild?: boolean
}

export const QRCode = React.forwardRef<HTMLDivElement, QRCodeProps>(
  (
    {
      value,
      size = 200,
      level = "M",
      margin = 2,
      shape = "square",
      foregroundColor = "#000000",
      backgroundColor = "#ffffff",
      onGenerated,
      onError,
      asChild,
      className,
      style,
      ...props
    },
    ref,
  ) => {
    const [matrix, setMatrix] = React.useState<Matrix | null>(null)
    const [status, setStatus] = React.useState<QRCodeContextValue["status"]>("loading")
    const [hasOverlay, setHasOverlay] = React.useState(false)
    const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
    const callbacks = React.useRef({ onGenerated, onError })
    callbacks.current = { onGenerated, onError }

    React.useEffect(() => {
      let cancelled = false
      setMatrix(null)
      setStatus("loading")
      import("qrcode")
        .then(({ create }) => {
          if (cancelled) return
          const { modules } = create(value || " ", { errorCorrectionLevel: level })
          setMatrix({ count: modules.size, get: (row, col) => !!modules.get(row, col) })
          setStatus("ready")
          callbacks.current.onGenerated?.()
        })
        .catch((error: unknown) => {
          if (cancelled) return
          setMatrix(null)
          setStatus("error")
          callbacks.current.onError?.(error instanceof Error ? error : new Error(String(error)))
        })
      return () => {
        cancelled = true
      }
    }, [value, level])

    // About a fifth of the code, rounded to an odd number of modules so the hole stays centred.
    const hole = hasOverlay && matrix ? Math.max(3, Math.round(((matrix.count + margin * 2) * 0.22 - 1) / 2) * 2 + 1) : 0

    const contextValue = React.useMemo<QRCodeContextValue>(
      () => ({ value, size, level, margin, shape, foregroundColor, backgroundColor, matrix, status, hole, setHasOverlay, canvasRef }),
      [value, size, level, margin, shape, foregroundColor, backgroundColor, matrix, status, hole],
    )

    const Comp = asChild ? Slot : "div"
    const total = matrix ? matrix.count + margin * 2 : 1
    return (
      <QRCodeContext.Provider value={contextValue}>
        <Comp
          ref={ref}
          data-state={status}
          className={cn("rax-qr-code", className)}
          style={
            {
              "--rax-qr-size": `${size}px`,
              "--rax-qr-hole": `${(hole / total) * size}px`,
              "--rax-qr-bg": backgroundColor,
              ...style,
            } as React.CSSProperties
          }
          {...props}
        />
      </QRCodeContext.Provider>
    )
  },
)

QRCode.displayName = "QRCode"

export type QRCodeSvgProps = React.HTMLAttributes<HTMLDivElement> & { label?: string }

export const QRCodeSvg = React.forwardRef<HTMLDivElement, QRCodeSvgProps>(({ label = "QR code", className, ...props }, ref) => {
  const context = useQRCode("QRCodeSvg")
  const { matrix, margin, shape, hole, foregroundColor, backgroundColor, size } = context
  if (!matrix) return null
  const total = matrix.count + margin * 2
  return (
    <div ref={ref} className={cn("rax-qr-code-frame", className)} {...props}>
      <svg
        role="img"
        aria-label={label}
        width={size}
        height={size}
        viewBox={`0 0 ${total} ${total}`}
        shapeRendering={shape === "square" ? "crispEdges" : undefined}
      >
        <rect width={total} height={total} fill={backgroundColor} />
        <path fill={foregroundColor} fillRule="evenodd" d={qrPath(matrix, margin, shape, hole)} />
      </svg>
    </div>
  )
})

QRCodeSvg.displayName = "QRCodeSvg"

export type QRCodeCanvasProps = React.CanvasHTMLAttributes<HTMLCanvasElement> & { label?: string }

export const QRCodeCanvas = React.forwardRef<HTMLCanvasElement, QRCodeCanvasProps>(({ label = "QR code", className, style, ...props }, ref) => {
  const context = useQRCode("QRCodeCanvas")
  const innerRef = React.useRef<HTMLCanvasElement | null>(null)
  const setRef = (node: HTMLCanvasElement | null) => {
    innerRef.current = node
    context.canvasRef.current = node
    assignRef(ref, node)
  }
  React.useEffect(() => {
    if (innerRef.current) paint(innerRef.current, context, Math.round(context.size * (window.devicePixelRatio || 1)))
  }, [context])
  if (!context.matrix) return null
  return (
    <canvas
      ref={setRef}
      role="img"
      aria-label={label}
      className={cn("rax-qr-code-frame", className)}
      style={{ width: context.size, height: context.size, ...style }}
      {...props}
    />
  )
})

QRCodeCanvas.displayName = "QRCodeCanvas"

export type QRCodeImageProps = React.ImgHTMLAttributes<HTMLImageElement>

export const QRCodeImage = React.forwardRef<HTMLImageElement, QRCodeImageProps>(({ alt = "QR code", className, ...props }, ref) => {
  const context = useQRCode("QRCodeImage")
  const src = React.useMemo(() => {
    if (!context.matrix) return ""
    const canvas = document.createElement("canvas")
    paint(canvas, context, context.size * 2)
    return canvas.toDataURL("image/png")
  }, [context])
  if (!src) return null
  return (
    <img
      ref={ref}
      src={src}
      alt={alt}
      width={context.size}
      height={context.size}
      className={cn("rax-qr-code-frame", className)}
      {...props}
    />
  )
})

QRCodeImage.displayName = "QRCodeImage"

export const QRCodeOverlay = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => {
  const { setHasOverlay, matrix } = useQRCode("QRCodeOverlay")
  React.useEffect(() => {
    setHasOverlay(true)
    return () => setHasOverlay(false)
  }, [setHasOverlay])
  if (!matrix) return null
  return <div ref={ref} className={cn("rax-qr-code-overlay", className)} {...props} />
})

QRCodeOverlay.displayName = "QRCodeOverlay"

export const QRCodeSkeleton = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => {
  const { status } = useQRCode("QRCodeSkeleton")
  if (status !== "loading") return null
  return <div ref={ref} aria-hidden="true" className={cn("rax-qr-code-skeleton", className)} {...props} />
})

QRCodeSkeleton.displayName = "QRCodeSkeleton"

export interface QRCodeDownloadProps extends ButtonProps {
  /** File name without the extension. */
  filename?: string
  format?: "png" | "svg"
  /** PNG width in pixels. Defaults to four times `size` for print. */
  resolution?: number
}

export const QRCodeDownload = React.forwardRef<HTMLButtonElement, QRCodeDownloadProps>(
  ({ filename = "qrcode", format = "png", resolution, onClick, children, ...props }, ref) => {
    const context = useQRCode("QRCodeDownload")
    return (
      <Button
        ref={ref}
        variant="outline"
        size="sm"
        disabled={!context.matrix}
        onClick={(event) => {
          onClick?.(event)
          if (event.defaultPrevented || !context.matrix) return
          let href: string
          if (format === "svg") {
            href = URL.createObjectURL(new Blob([svgMarkup(context)], { type: "image/svg+xml" }))
          } else {
            const canvas = document.createElement("canvas")
            paint(canvas, context, resolution ?? context.size * 4)
            href = canvas.toDataURL("image/png")
          }
          const link = document.createElement("a")
          link.href = href
          link.download = `${filename}.${format}`
          link.click()
          if (href.startsWith("blob:")) setTimeout(() => URL.revokeObjectURL(href), 1000)
        }}
        {...props}
      >
        {children ?? (
          <>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19h14" />
            </svg>
            {format.toUpperCase()}
          </>
        )}
      </Button>
    )
  },
)

QRCodeDownload.displayName = "QRCodeDownload"
export type { QRCodeLevel } from "./qr-code-drawing"
export type { QRCodeShape } from "./qr-code-drawing"
