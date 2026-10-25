"use client"

// Ported from boot-ui. Built-in SVG paths from Lucide (ISC).
import * as React from "react"
import useEmblaCarousel, { type UseEmblaCarouselType } from "embla-carousel-react"
import Autoplay from "embla-carousel-autoplay"
import Fade from "embla-carousel-fade"

import { useSheenTheme } from "@/lib/theme"
import { cn } from "@/lib/utils"
import { prefersReducedMotion } from "@/lib/app-shell-utils"
import { getDirection } from "@/lib/direction"
import { assignRef } from "@/lib/refs"
import { Button, type ButtonProps } from "@/components/ui/button"

// -----------------------------------------------------------------------------
// Carousel — composable parts on Embla, plus:
//   slideSize  "80%" or { base: "85%", md: "50%", lg: "33.333%" } (no Tailwind)
//   gap        space between slides
//   autoplay   ms or Autoplay options; pauses on hover / focus, never runs under
//              prefers-reduced-motion, and <CarouselPlayPause> lets people stop it
//   effect     "slide" · "fade" · "scale" (neighbours shrink and dim)
//   <CarouselDots> (the active one fills with autoplay progress), <CarouselCounter>,
//   <CarouselThumbs render={(i) => <img …/>} />
// Keyboard: ←/→ (↑/↓ vertical), mirrored in RTL, which it picks up from `dir`.
// -----------------------------------------------------------------------------

type CarouselApi = UseEmblaCarouselType[1]
type CarouselOptions = Parameters<typeof useEmblaCarousel>[0]
type CarouselPlugin = NonNullable<Parameters<typeof useEmblaCarousel>[1]>[number]
type AutoplayOptions = NonNullable<Parameters<typeof Autoplay>[0]>

const DEFAULT_LABELS = {
  carousel: "carousel",
  slide: "slide",
  slideOf: (index: number, count: number) => `${index} of ${count}`,
  previous: "Previous slide",
  next: "Next slide",
  goTo: (index: number) => `Go to slide ${index}`,
  pause: "Pause autoplay",
  play: "Start autoplay",
}
export type CarouselLabels = typeof DEFAULT_LABELS

type SlideSize = string | { base?: string; sm?: string; md?: string; lg?: string; xl?: string }

interface CarouselContextValue {
  api: CarouselApi
  carouselRef: ReturnType<typeof useEmblaCarousel>[0]
  orientation: "horizontal" | "vertical"
  selected: number
  snapCount: number
  slideCount: number
  canPrev: boolean
  canNext: boolean
  prev: () => void
  next: () => void
  goTo: (index: number) => void
  hasAutoplay: boolean
  playing: boolean
  togglePlay: () => void
  /** Bumps whenever the autoplay timer restarts; ms until the next slide. */
  timer: { key: number; ms: number } | null
  effect: "slide" | "fade" | "scale"
  labels: CarouselLabels
}

const CarouselContext = React.createContext<CarouselContextValue | null>(null)

export function useCarousel() {
  const context = React.useContext(CarouselContext)
  if (!context) throw new Error("useCarousel must be used inside <Carousel>")
  return context
}

function sizeVars(size: SlideSize | undefined) {
  if (!size) return {}
  const s = typeof size === "string" ? { base: size } : size
  const vars: Record<string, string> = {}
  for (const [bp, value] of Object.entries(s)) if (value) vars[`--sheen-carousel-size-${bp}`] = value
  return vars
}

// ---- Root -------------------------------------------------------------------------------

export interface CarouselProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "dir"> {
  opts?: CarouselOptions
  plugins?: CarouselPlugin[]
  orientation?: "horizontal" | "vertical"
  setApi?: (api: CarouselApi) => void
  /** Width of each slide (height when vertical). Default 100%. */
  slideSize?: SlideSize
  /** Space between slides, e.g. "1rem". */
  gap?: string
  /** Auto-advance: delay in ms, or Autoplay options. */
  autoplay?: number | AutoplayOptions
  effect?: "slide" | "fade" | "scale"
  dir?: "ltr" | "rtl"
  /** Accessible name of the region, e.g. "Featured products". */
  label?: string
  labels?: Partial<CarouselLabels>
}

const Carousel = React.forwardRef<HTMLDivElement, CarouselProps>(
  (
    {
      opts,
      plugins = [],
      orientation = "horizontal",
      setApi,
      slideSize,
      gap,
      autoplay,
      effect = "slide",
      dir: dirProp,
      label,
      labels: labelsProp,
      className,
      style,
      children,
      onKeyDownCapture,
      ...props
    },
    ref,
  ) => {
    const theme = useSheenTheme()
    const rootRef = React.useRef<HTMLDivElement | null>(null)
    const labels = React.useMemo(() => ({ ...DEFAULT_LABELS, ...labelsProp }), [labelsProp])

    // Embla needs the direction up front; read it from the page if not given.
    const [dir, setDir] = React.useState<"ltr" | "rtl">(dirProp ?? "ltr")
    React.useLayoutEffect(() => {
      if (dirProp) return setDir(dirProp)
      setDir(getDirection(rootRef.current))
    }, [dirProp, theme.direction])

    const [reducedMotion, setReducedMotion] = React.useState(false)
    React.useEffect(() => {
      const media = window.matchMedia("(prefers-reduced-motion: reduce)")
      const update = () => setReducedMotion(media.matches)
      update(); media.addEventListener("change", update)
      return () => media.removeEventListener("change", update)
    }, [])
    const autoplayPlugin = React.useMemo(() => {
      if (autoplay === undefined || reducedMotion) return null
      const options = typeof autoplay === "number" ? { delay: autoplay } : autoplay
      return Autoplay({ stopOnInteraction: false, stopOnMouseEnter: true, stopOnFocusIn: true, ...options })
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(autoplay), reducedMotion])
    const fadePlugin = React.useMemo(() => (effect === "fade" ? Fade() : null), [effect])

    const [carouselRef, api] = useEmblaCarousel({ ...opts, axis: orientation === "horizontal" ? "x" : "y", direction: dir, duration: reducedMotion ? 0 : opts?.duration }, [
      ...plugins,
      ...(autoplayPlugin ? [autoplayPlugin] : []),
      ...(fadePlugin ? [fadePlugin] : []),
    ])

    const [state, setState] = React.useState({ selected: 0, snapCount: 0, slideCount: 0, canPrev: false, canNext: false })
    const [playing, setPlaying] = React.useState(false)
    const [paused, setPaused] = React.useState(false) // the user pressed pause
    const [timer, setTimer] = React.useState<{ key: number; ms: number } | null>(null)

    React.useEffect(() => {
      if (!api) return
      setApi?.(api)
      const sync = () =>
        setState({
          selected: api.selectedScrollSnap(),
          snapCount: api.scrollSnapList().length,
          slideCount: api.slideNodes().length,
          canPrev: api.canScrollPrev(),
          canNext: api.canScrollNext(),
        })
      sync()
      api.on("select", sync).on("reInit", sync)

      const ap = api.plugins().autoplay
      const onPlay = () => setPlaying(true)
      const onStop = () => {
        setPlaying(false)
        setTimer(null)
      }
      const onTimer = () => setTimer((t) => ({ key: (t?.key ?? 0) + 1, ms: ap?.timeUntilNext() ?? 0 }))
      if (ap) {
        setPlaying(ap.isPlaying())
        api
          .on("autoplay:play", onPlay)
          .on("autoplay:stop", onStop)
          .on("autoplay:timerset", onTimer)
          .on("autoplay:timerstopped", () => setTimer(null))
      }
      return () => {
        api.off("select", sync).off("reInit", sync)
        if (ap) api.off("autoplay:play", onPlay).off("autoplay:stop", onStop).off("autoplay:timerset", onTimer)
      }
    }, [api, setApi])

    // A paused carousel stays paused, even after hover / focus would resume it.
    React.useEffect(() => {
      const ap = api?.plugins().autoplay
      if (!ap || !paused) return
      ap.stop()
      const keepStopped = () => ap.stop()
      api!.on("autoplay:play", keepStopped)
      return () => {
        api!.off("autoplay:play", keepStopped)
      }
    }, [api, paused])

    const prev = React.useCallback(() => api?.scrollPrev(), [api])
    const next = React.useCallback(() => api?.scrollNext(), [api])
    const goTo = React.useCallback((i: number) => api?.scrollTo(i), [api])
    const togglePlay = React.useCallback(() => {
      const ap = api?.plugins().autoplay
      if (!ap) return
      if (paused) {
        setPaused(false)
        ap.play()
      } else setPaused(true)
    }, [api, paused])

    const context: CarouselContextValue = {
      api,
      carouselRef,
      orientation,
      ...state,
      prev,
      next,
      goTo,
      hasAutoplay: !!autoplayPlugin,
      playing: playing && !paused,
      togglePlay,
      timer: paused ? null : timer,
      effect,
      labels,
    }

    return (
      <CarouselContext.Provider value={context}>
        <div
          ref={(node) => {
            rootRef.current = node
            assignRef(ref, node)
          }}
          role="region"
          aria-roledescription={labels.carousel}
          aria-label={label}
          dir={dirProp}
          className={cn("sheen-carousel", className)}
          data-orientation={orientation}
          data-effect={effect}
          style={{ ...sizeVars(slideSize), ...(gap ? { "--sheen-carousel-gap": gap } : {}), ...style } as React.CSSProperties}
          onKeyDownCapture={(event) => {
            onKeyDownCapture?.(event)
            const target = event.target as HTMLElement
            if (event.defaultPrevented || target.closest("input, textarea, select, [contenteditable='true']")) return
            const rtl = dir === "rtl"
            const back = orientation === "vertical" ? "ArrowUp" : rtl ? "ArrowRight" : "ArrowLeft"
            const forward = orientation === "vertical" ? "ArrowDown" : rtl ? "ArrowLeft" : "ArrowRight"
            if (event.key === back) {
              event.preventDefault()
              prev()
            } else if (event.key === forward) {
              event.preventDefault()
              next()
            }
          }}
          {...props}
        >
          {children}
        </div>
      </CarouselContext.Provider>
    )
  },
)
Carousel.displayName = "Carousel"

// ---- Content & items ------------------------------------------------------------------

export interface CarouselContentProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Class for the clipping viewport (rounded corners, height for vertical…). */
  viewportClassName?: string
  viewportStyle?: React.CSSProperties
}

const CarouselContent = React.forwardRef<HTMLDivElement, CarouselContentProps>(
  ({ className, viewportClassName, viewportStyle, ...props }, ref) => {
    const { carouselRef, playing } = useCarousel()
    return (
      <div ref={carouselRef} className={cn("sheen-carousel-viewport", viewportClassName)} style={viewportStyle}>
        {/* Announce slide changes, except while it moves by itself. */}
        <div ref={ref} className={cn("sheen-carousel-container", className)} aria-live={playing ? "off" : "polite"} {...props} />
      </div>
    )
  },
)
CarouselContent.displayName = "CarouselContent"

const CarouselItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => {
  const { slideCount, selected, labels, api } = useCarousel()
  const [index, setIndex] = React.useState<number | null>(null)
  const nodeRef = React.useRef<HTMLDivElement | null>(null)

  // Position among the slides (for "3 of 8" and the active state).
  React.useEffect(() => {
    if (!api || !nodeRef.current) return
    const find = () => setIndex(api.slideNodes().indexOf(nodeRef.current!))
    find()
    api.on("reInit", find)
    return () => {
      api.off("reInit", find)
    }
  }, [api])

  const active =
    index !== null && api ? (api.scrollSnapList().length === slideCount ? index === selected : api.slidesInView().includes(index)) : false

  return (
    <div
      ref={(node) => {
        nodeRef.current = node
        assignRef(ref, node)
      }}
      role="group"
      aria-roledescription={labels.slide}
      aria-label={index !== null && slideCount ? labels.slideOf(index + 1, slideCount) : undefined}
      data-active={active || undefined}
      className={cn("sheen-carousel-item", className)}
      {...props}
    />
  )
})
CarouselItem.displayName = "CarouselItem"

// ---- Controls -------------------------------------------------------------------------

const Chevron = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.25}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="m9 6 6 6-6 6" />
  </svg>
)

const CarouselPrevious = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "secondary", size = "icon", children, ...props }, ref) => {
    const { prev, canPrev, orientation, labels } = useCarousel()
    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        className={cn("sheen-carousel-nav sheen-carousel-prev", className)}
        data-orientation={orientation}
        disabled={!canPrev}
        aria-label={labels.previous}
        onClick={prev}
        {...props}
      >
        {children ?? <Chevron />}
      </Button>
    )
  },
)
CarouselPrevious.displayName = "CarouselPrevious"

const CarouselNext = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "secondary", size = "icon", children, ...props }, ref) => {
    const { next, canNext, orientation, labels } = useCarousel()
    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        className={cn("sheen-carousel-nav sheen-carousel-next", className)}
        data-orientation={orientation}
        disabled={!canNext}
        aria-label={labels.next}
        onClick={next}
        {...props}
      >
        {children ?? <Chevron />}
      </Button>
    )
  },
)
CarouselNext.displayName = "CarouselNext"

export interface CarouselDotsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** `overlay`: on a glass pill over the slides (photos). */
  variant?: "default" | "overlay"
}

/** One dot per stop; the active one stretches into a pill that fills with autoplay progress. */
const CarouselDots = React.forwardRef<HTMLDivElement, CarouselDotsProps>(({ className, variant = "default", ...props }, ref) => {
  const { snapCount, selected, goTo, timer, labels } = useCarousel()
  if (snapCount < 2) return null
  return (
    <div ref={ref} className={cn("sheen-carousel-dots", className)} data-variant={variant} {...props}>
      {Array.from({ length: snapCount }, (_, i) => (
        <button
          key={i}
          type="button"
          className="sheen-carousel-dot"
          data-active={i === selected || undefined}
          aria-label={labels.goTo(i + 1)}
          aria-current={i === selected || undefined}
          onClick={() => goTo(i)}
        >
          {i === selected && timer && (
            <span key={timer.key} className="sheen-carousel-dot-progress" style={{ animationDuration: `${timer.ms}ms` }} />
          )}
        </button>
      ))}
    </div>
  )
})
CarouselDots.displayName = "CarouselDots"

/** "3 / 8" */
const CarouselCounter = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(({ className, ...props }, ref) => {
  const { selected, snapCount } = useCarousel()
  if (!snapCount) return null
  return (
    <span ref={ref} className={cn("sheen-carousel-counter", className)} aria-hidden="true" {...props}>
      {selected + 1} / {snapCount}
    </span>
  )
})
CarouselCounter.displayName = "CarouselCounter"

/** Pause / resume autoplay — anything that moves by itself needs one (WCAG 2.2.2). */
const CarouselPlayPause = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "secondary", size = "icon-sm", ...props }, ref) => {
    const { hasAutoplay, playing, togglePlay, labels } = useCarousel()
    if (!hasAutoplay) return null
    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        className={cn("sheen-carousel-playpause", className)}
        aria-label={playing ? labels.pause : labels.play}
        aria-pressed={!playing}
        onClick={togglePlay}
        {...props}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          {playing ? (
            <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />
          ) : (
            <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
          )}
        </svg>
      </Button>
    )
  },
)
CarouselPlayPause.displayName = "CarouselPlayPause"

export interface CarouselThumbsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Content of thumbnail i (usually an <img>). */
  render: (index: number) => React.ReactNode
}

/** A strip of thumbnails that follows the selection. */
const CarouselThumbs = React.forwardRef<HTMLDivElement, CarouselThumbsProps>(({ render, className, ...props }, ref) => {
  const { snapCount, selected, goTo, labels } = useCarousel()
  const stripRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    const strip = stripRef.current
    const thumb = strip?.children[selected] as HTMLElement | undefined
    if (!strip || !thumb) return
    // Centre the active thumb inside the strip without scrolling the page.
    const left = thumb.offsetLeft - (strip.clientWidth - thumb.clientWidth) / 2
    strip.scrollTo({ left, behavior: prefersReducedMotion() ? "auto" : "smooth" })
  }, [selected])

  return (
    <div
      ref={(node) => {
        stripRef.current = node
        assignRef(ref, node)
      }}
      className={cn("sheen-carousel-thumbs", className)}
      {...props}
    >
      {Array.from({ length: snapCount }, (_, i) => (
        <button
          key={i}
          type="button"
          className="sheen-carousel-thumb"
          data-active={i === selected || undefined}
          aria-label={labels.goTo(i + 1)}
          aria-current={i === selected || undefined}
          onClick={() => goTo(i)}
        >
          {render(i)}
        </button>
      ))}
    </div>
  )
})
CarouselThumbs.displayName = "CarouselThumbs"

export {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  CarouselDots,
  CarouselCounter,
  CarouselPlayPause,
  CarouselThumbs,
}
