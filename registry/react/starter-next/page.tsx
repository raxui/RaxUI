"use client"

// BlazorUI starter page for Next.js: app shell and welcome page, installed by `blazorui-react init` (ADR 008, 011).
// Source-owned: replace it with your own home page. The root layout (app/layout.tsx) stays yours.
import Link from "next/link"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { BootThemeProvider, type BootAppearance } from "@/lib/theme"

type Accent = "emerald" | "indigo" | "amber" | undefined

export default function Home() {
  const [appearance, setAppearance] = useState<BootAppearance>("default")
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
    <BootThemeProvider className="bui-app" appearance={appearance} mode={mode} direction={direction} data-bui-accent={accent}>
      <header className="bui-app-header">
        <Link className="bui-app-brand" href="/">BlazorUI</Link>
        <span className="bui-app-header-end" />
      </header>

      <main className="bui-app-main">
        <div className="bui-welcome">
          <section>
            <h1>Welcome to your BlazorUI app</h1>
            <p className="bui-welcome-lead">
              Your components live in <code>src/components/ui</code> and are yours to edit. Try the theme below: every
              BlazorUI component follows it.
            </p>
          </section>

          <section className="bui-panel" aria-labelledby="theme-heading">
            <h2 id="theme-heading">Theme</h2>
            {rows.map((row) => (
              <div className="bui-theme-row" key={row.label}>
                <span className="bui-theme-label">{row.label}</span>
                <div className="bui-theme-options" role="group" aria-label={row.label}>
                  {row.options.map(([text, value]) => {
                    const selected = row.value === value
                    return (
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

          <section className="bui-panel" aria-labelledby="preview-heading">
            <h2 id="preview-heading">Preview</h2>
            <div className="bui-preview-row">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="tinted">Tinted</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
            </div>
          </section>

          <section className="bui-panel" aria-labelledby="next-heading">
            <h2 id="next-heading">Next steps</h2>
            <p>Button is already installed. Add more components, then use them in your pages:</p>
            <pre>
              <code>npx blazorui-react add &lt;component&gt;</code>
            </pre>
            <p className="mt-3 mb-0">
              Edit this page in <code>app/page.tsx</code>. The theme provider and its options live in{" "}
              <code>src/lib/theme.tsx</code>.
            </p>
          </section>
        </div>
      </main>
    </BootThemeProvider>
  )
}
