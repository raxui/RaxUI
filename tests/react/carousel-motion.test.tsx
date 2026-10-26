import { act, render } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import useEmblaCarousel from "embla-carousel-react"
import { Carousel } from "../../registry/react/components/carousel/carousel"

const embla = vi.hoisted(() => vi.fn((_options?: Record<string,unknown>, _plugins?: unknown[]) => [() => {}, undefined]))
vi.mock("embla-carousel-react", () => ({ default: embla }))
let reduced = false
const listeners = new Set<() => void>()
beforeEach(() => {
 reduced = false; listeners.clear(); embla.mockClear(); useEmblaCarousel.globalOptions=undefined
 vi.stubGlobal("matchMedia", (media: string) => ({
  media, get matches() { return reduced },
  addEventListener: (_event: string, callback: () => void) => listeners.add(callback),
  removeEventListener: (_event: string, callback: () => void) => listeners.delete(callback),
 }))
})
const options = () => embla.mock.calls[embla.mock.calls.length - 1][0]
describe("Carousel motion options", () => {
 it("uses the reference Embla duration when no custom duration is supplied", () => {
  render(<Carousel/>); expect(options()).toHaveProperty("duration",25)
 })
 it.each([0,15,55])("preserves an explicit duration of %i", duration => {
  render(<Carousel opts={{duration}}/>); expect(options()).toHaveProperty("duration",duration)
 })
 it("uses instant movement for reduced motion and restores the default afterward", () => {
  reduced = true; render(<Carousel/>); expect(options()).toHaveProperty("duration",0)
  act(() => { reduced=false; listeners.forEach(update=>update()) })
  expect(options()).toHaveProperty("duration",25)
 })
 it("respects the global duration and lets explicit options override it",()=>{
  useEmblaCarousel.globalOptions={duration:64}
  const view=render(<Carousel/>); expect(options()).toHaveProperty("duration",64)
  view.rerender(<Carousel opts={{duration:32}}/>); expect(options()).toHaveProperty("duration",32)
 })
 it("restores a custom duration after the motion preference changes", () => {
  reduced = true; render(<Carousel opts={{duration:42}}/>); expect(options()).toHaveProperty("duration",0)
  act(() => { reduced=false; listeners.forEach(update=>update()) })
  expect(options()).toHaveProperty("duration",42)
 })
})
