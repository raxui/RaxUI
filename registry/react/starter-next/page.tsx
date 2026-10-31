"use client"

// RaxUI starter page for Next.js: app shell and welcome page, installed by `raxui-react init` (ADR 008, 011).
// Source-owned: replace it with your own home page. The root layout (app/layout.tsx) stays yours.
import Link from "next/link"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { RaxThemeProvider, type RaxAppearance } from "@/lib/theme"

type Accent = "emerald" | "indigo" | "amber" | undefined

export default function Home() {
  const [appearance, setAppearance] = useState<RaxAppearance>("default")
  const [mode, setMode] = useState<"light" | "dark">("light")
  const [accent, setAccent] = useState<Accent>(undefined)
  const [direction, setDirection] = useState<"ltr" | "rtl">("ltr")

  const rows = [
    { label: "Appearance", value: appearance, set: setAppearance, options: [["Default", "default"], ["Flat", "flat"], ["Glass", "glass"]] },
    { label: "Mode", value: mode, set: setMode, options: [["Light", "light"], ["Dark", "dark"]] },
    { label: "Accent", value: accent, set: setAccent, options: [["Blue", undefined], ["Emerald", "emerald"], ["Indigo", "indigo"], ["Amber", "amber"]] },
    { label: "Direction", value: direction, set: setDirection, options: [["LTR", "ltr"], ["RTL", "rtl"]] },
  ] as const

  return (
    <RaxThemeProvider className="rax-app" appearance={appearance} mode={mode} direction={direction} data-rax-accent={accent}>
      <header className="rax-app-header">
        <Link className="rax-app-brand" href="/">RaxUI</Link>
        <span className="rax-app-header-end">Theme playground</span>
      </header>

      <main className="rax-app-main">
        <div className="rax-welcome">
          <section className="rax-welcome-intro">
            <h1>Welcome to your RaxUI app</h1>
            <p className="rax-welcome-lead">
              Your components live in <code>src/components/ui</code> and are yours to edit. Try the theme below: every
              RaxUI component follows it.
            </p>
          </section>

          <section className="rax-panel rax-theme-panel" aria-labelledby="theme-heading">
            <h2 id="theme-heading">Theme</h2>
            {rows.map((row) => (
              <div className="rax-theme-row" key={row.label}>
                <span className="rax-theme-label">{row.label}</span>
                <div className="rax-theme-options" role="group" aria-label={row.label}>
                  {row.options.map(([text, value]) => {
                    const selected = row.value === value
                    return row.label === "Accent" ? (
                      <button
                        key={text}
                        type="button"
                        className="rax-accent-swatch"
                        data-rax-accent={value}
                        data-rax-swatch={value ?? "blue"}
                        aria-label={text}
                        title={text}
                        aria-pressed={selected}
                        onClick={() => setAccent(value as Accent)}
                      />
                    ) : (
                      <Button
                        key={text}
                        size="sm"
                        variant={selected ? "default" : "secondary"}
                        aria-pressed={selected}
                        onClick={() => (row.set as (next: typeof value) => void)(value)}
                      >
                        {text}
                      </Button>
                    )
                  })}
                </div>
              </div>
            ))}
          </section>

          <section className="rax-panel rax-preview-panel" aria-labelledby="preview-heading">
            <h2 id="preview-heading">Preview</h2>
            <p className="rax-preview-description">One component, six variants. Use the theme controls to compare their appearance.</p>
            <div className="rax-preview-row">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="tinted">Tinted</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
            </div>
            <p className="rax-preview-hint">Use Tab to explore keyboard focus.</p>
          </section>

          <section className="rax-next-steps" aria-labelledby="next-heading">
            <h2 id="next-heading">Next steps</h2>
            <p>Button is already installed. Add more components, then use them in your pages:</p>
            <pre>
              <code>npx raxui-react add &lt;component&gt;</code>
            </pre>
            <p className="mt-3 mb-0">
              Edit this page in <code>app/page.tsx</code>. The theme provider and its options live in{" "}
              <code>src/lib/theme.tsx</code>.
            </p>
          </section>
        </div>
      </main>
    </RaxThemeProvider>
  )
}
