"use client"

import * as React from "react"

export type SheenAppearance = "default" | "flat" | "glass"
export interface SheenTheme {
  appearance: SheenAppearance
  mode?: "light" | "dark"
  density?: "comfortable" | "compact"
  direction?: "ltr" | "rtl"
}
export type SheenThemeOptions = Partial<SheenTheme>
const ThemeContext = React.createContext<SheenTheme>({ appearance: "default" })
const PortalContainerContext = React.createContext<HTMLElement | null>(null)

/** The nearest SheenThemeProvider element. Overlays portal into it to inherit its theme attributes and accent. */
export function useSheenPortalContainer(): HTMLElement | undefined {
  return React.useContext(PortalContainerContext) ?? undefined
}

/** Undefined inherits; explicit `default` resets the appearance. No global DOM mutations. */
export function useSheenTheme(options: SheenThemeOptions = {}): SheenTheme {
  const parent = React.useContext(ThemeContext)
  const appearance = options.appearance ?? parent.appearance
  const mode = options.mode ?? parent.mode
  const density = options.density ?? parent.density
  const direction = options.direction ?? parent.direction
  return React.useMemo(() => ({ appearance, mode, density, direction }), [appearance, mode, density, direction])
}

export function sheenThemeAttributes(theme: SheenTheme) {
  return {
    "data-sheen-appearance": theme.appearance,
    "data-bs-theme": theme.mode,
    "data-sheen-density": theme.density,
    dir: theme.direction,
  }
}

/** Context-only boundary used by composite components and their React portals. */
export function SheenThemeBoundary({ value, children }: { value: SheenTheme; children: React.ReactNode }) {
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export interface SheenThemeProviderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "dir">, SheenThemeOptions {}

export function SheenThemeProvider({ appearance, mode, density, direction, children, ...props }: SheenThemeProviderProps) {
  const theme = useSheenTheme({ appearance, mode, density, direction })
  const [element, setElement] = React.useState<HTMLDivElement | null>(null)
  return (
    <SheenThemeBoundary value={theme}>
      <PortalContainerContext.Provider value={element}>
        <div ref={setElement} {...props} {...sheenThemeAttributes(theme)}>
          {children}
        </div>
      </PortalContainerContext.Provider>
    </SheenThemeBoundary>
  )
}

export const SheenAppearanceScope = SheenThemeProvider
