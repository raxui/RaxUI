"use client"

// Built-in SVG paths from Lucide (ISC).

// ---- Icons -------------------------------------------------------------------
const Icon = ({ d }: { d: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
)
const ArrowUpIcon = () => <Icon d="M12 19V5M5 12l7-7 7 7" />
const SearchIcon = () => <Icon d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-3.5-3.5" />
const PlusCircleIcon = () => <Icon d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 8v8M8 12h8" />
const ColumnsIcon = () => <Icon d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4" />
const XIcon = () => <Icon d="M18 6 6 18M6 6l12 12" />
const ChevronsLeftIcon = () => <Icon d="m11 17-5-5 5-5M18 17l-5-5 5-5" />
const ChevronLeftIcon = () => <Icon d="m15 18-6-6 6-6" />
const ChevronRightIcon = () => <Icon d="m9 18 6-6-6-6" />
const ChevronsRightIcon = () => <Icon d="m13 17 5-5-5-5M6 17l5-5-5-5" />
const InboxIcon = () => <Icon d="M22 12h-6l-2 3h-4l-2-3H2M5.5 5h13l3.5 7v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6Z" />
export {
  ArrowUpIcon,
  SearchIcon,
  PlusCircleIcon,
  ColumnsIcon,
  XIcon,
  ChevronsLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsRightIcon,
  InboxIcon,
}
