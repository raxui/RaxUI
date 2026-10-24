import { beforeEach, afterEach, vi } from "vitest"
export const animate = vi.fn(() => ({ cancel: vi.fn() }))
export let reduced = false
export function reduceMotion(value: boolean) { reduced = value }
beforeEach(() => {
  reduced = false
  animate.mockClear()
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: reduced, addEventListener() {}, removeEventListener() {} })))
  vi.spyOn(HTMLElement.prototype, "offsetLeft", "get").mockImplementation(function (this: HTMLElement) { return Number(this.getAttribute("data-x") ?? this.textContent?.match(/^\d+$/)?.[0] ?? 0) * 40 })
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(40)
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(32)
  Object.defineProperty(HTMLElement.prototype, "animate", { configurable: true, value: animate })
})
afterEach(() => { vi.unstubAllGlobals(); delete (HTMLElement.prototype as unknown as { animate?: unknown }).animate })
