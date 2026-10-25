"use client"

// Ported from boot-ui. Built-in SVG paths from Lucide (ISC).

export const Icon = ({ d, flip }: { d: string; flip?: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={flip ? "sheen-editor-flip" : undefined}
  >
    <path d={d} />
  </svg>
)

export const ICONS = {
  undo: <Icon flip d="M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />,
  redo: <Icon flip d="m15 14 5-5-5-5M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />,
  bold: <Icon d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z" />,
  italic: <Icon d="M19 4h-9M14 20H5M15 4 9 20" />,
  underline: <Icon d="M6 4v6a6 6 0 0 0 12 0V4M4 20h16" />,
  strike: <Icon d="M16 4H9a3 3 0 0 0-2.83 4M14 12a4 4 0 0 1 0 8H6M4 12h16" />,
  code: <Icon d="m16 18 6-6-6-6M8 6l-6 6 6 6" />,
  highlight: <Icon d="m9 11-6 6v3h9l3-3M22 12l-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" />,
  link: <Icon d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />,
  bulletList: <Icon flip d="M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01" />,
  orderedList: <Icon flip d="M10 6h11M10 12h11M10 18h11M4 6h1v4M4 10h2M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />,
  taskList: <Icon flip d="m3 17 2 2 4-4M3 7l2 2 4-4M13 6h8M13 12h8M13 18h8" />,
  alignStart: <Icon flip d="M21 6H3M15 12H3M17 18H3" />,
  alignCenter: <Icon d="M21 6H3M17 12H7M19 18H5" />,
  alignEnd: <Icon flip d="M21 6H3M21 12H9M21 18H7" />,
  alignJustify: <Icon d="M3 6h18M3 12h18M3 18h18" />,
  blockquote: <Icon flip d="M17 6H3M21 12H8M21 18H8M3 12v6" />,
  codeBlock: <Icon d="M10 9.5 8 12l2 2.5M14 9.5l2 2.5-2 2.5M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />,
  horizontalRule: <Icon d="M3 12h18M8 6h8M8 18h8" />,
  clear: <Icon d="M4 7V4h16v3M5 20h6M13 4 8 20M15 15l5 5M20 15l-5 5" />,
  chevron: <Icon d="m6 9 6 6 6-6" />,
  open: <Icon d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />,
  unlink: (
    <Icon d="M18.8 12.3 20.6 10.5a5 5 0 0 0-7.1-7.1l-1.7 1.7M5.2 11.8l-1.7 1.7a5 5 0 0 0 7.1 7.1l1.7-1.7M8 2v3M2 8h3M16 22v-3M22 16h-3" />
  ),
  check: <Icon d="M20 6 9 17l-5-5" />,
}
