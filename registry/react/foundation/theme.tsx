"use client"

import * as React from "react"

export type BootAppearance = "default" | "flat" | "glass"
export interface BootTheme {
  appearance: BootAppearance
  mode?: "light" | "dark"
  density?: "comfortable" | "compact"
  direction?: "ltr" | "rtl"
}
export type BootThemeOptions = Partial<BootTheme>
const ThemeContext = React.createContext<BootTheme>({ appearance: "default" })

/** Undefined inherits; explicit `default` resets the appearance. No global DOM mutations. */
export function useBootTheme(options: BootThemeOptions = {}): BootTheme {
  const parent = React.useContext(ThemeContext)
  const appearance = options.appearance ?? parent.appearance
  const mode = options.mode ?? parent.mode
  const density = options.density ?? parent.density
  const direction = options.direction ?? parent.direction
  return React.useMemo(() => ({ appearance, mode, density, direction }), [appearance, mode, density, direction])
}

export function bootThemeAttributes(theme: BootTheme) {
  return {
    "data-bui-appearance": theme.appearance,
    "data-bs-theme": theme.mode,
    "data-bui-density": theme.density,
    dir: theme.direction,
  }
}

/** Context-only boundary used by composite components and their React portals. */
export function BootThemeBoundary({ value, children }: { value: BootTheme; children: React.ReactNode }) {
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export interface BootThemeProviderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "dir">, BootThemeOptions {}

export function BootThemeProvider({ appearance, mode, density, direction, children, ...props }: BootThemeProviderProps) {
  const theme = useBootTheme({ appearance, mode, density, direction })
  return (
    <BootThemeBoundary value={theme}>
      <div {...props} {...bootThemeAttributes(theme)}>
        {children}
      </div>
    </BootThemeBoundary>
  )
}

export const BootAppearanceScope = BootThemeProvider
