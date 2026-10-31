"use client"

import * as React from "react"

export type RaxAppearance = "default" | "flat" | "glass"
export interface RaxTheme {
  appearance: RaxAppearance
  mode?: "light" | "dark"
  density?: "comfortable" | "compact"
  direction?: "ltr" | "rtl"
}
export type RaxThemeOptions = Partial<RaxTheme>
const ThemeContext = React.createContext<RaxTheme>({ appearance: "default" })
const PortalContainerContext = React.createContext<HTMLElement | null>(null)

/** The nearest RaxThemeProvider element. Overlays portal into it to inherit its theme attributes and accent. */
export function useRaxPortalContainer(): HTMLElement | undefined {
  return React.useContext(PortalContainerContext) ?? undefined
}

/** Undefined inherits; explicit `default` resets the appearance. No global DOM mutations. */
export function useRaxTheme(options: RaxThemeOptions = {}): RaxTheme {
  const parent = React.useContext(ThemeContext)
  const appearance = options.appearance ?? parent.appearance
  const mode = options.mode ?? parent.mode
  const density = options.density ?? parent.density
  const direction = options.direction ?? parent.direction
  return React.useMemo(() => ({ appearance, mode, density, direction }), [appearance, mode, density, direction])
}

export function raxThemeAttributes(theme: RaxTheme) {
  return {
    "data-rax-appearance": theme.appearance,
    "data-bs-theme": theme.mode,
    "data-rax-density": theme.density,
    dir: theme.direction,
  }
}

/** Context-only boundary used by composite components and their React portals. */
export function RaxThemeBoundary({ value, children }: { value: RaxTheme; children: React.ReactNode }) {
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export interface RaxThemeProviderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "dir">, RaxThemeOptions {}

export function RaxThemeProvider({ appearance, mode, density, direction, children, ...props }: RaxThemeProviderProps) {
  const theme = useRaxTheme({ appearance, mode, density, direction })
  const [element, setElement] = React.useState<HTMLDivElement | null>(null)
  return (
    <RaxThemeBoundary value={theme}>
      <PortalContainerContext.Provider value={element}>
        <div ref={setElement} {...props} {...raxThemeAttributes(theme)}>
          {children}
        </div>
      </PortalContainerContext.Provider>
    </RaxThemeBoundary>
  )
}

export const RaxAppearanceScope = RaxThemeProvider
