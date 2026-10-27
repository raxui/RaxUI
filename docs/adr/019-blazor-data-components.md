# ADR 019 — Blazor data components

- **Status:** Accepted. Calculated, positioned rows were selected after the comparative experiment; the complete data components pass generated-app tests on .NET 8/9/10.
- **Date:** 2026-10-27
- **Tracking:** [Blazor phase 6, #74](https://github.com/SaadAlsaree/SheenUI/issues/74); [Blazor roadmap, #71](https://github.com/SaadAlsaree/SheenUI/issues/71).

## Context

React DataTable, DataGrid, Sortable and Resizable are the behavior and example reference. Blazor must match their accepted scope through source-owned components, the shared theme and Blazor-native state, without depending on React packages. Preserve the installation contract in [ADR 003](003-installation-and-registry-contract.md), the shared theme in [ADR 005](005-multi-framework-shared-theme.md), .NET 8/9/10 coverage in [ADR 009](009-dotnet-8-9-10.md), the collocated JavaScript pattern in [ADR 013](013-overlay-primitives.md), icon rules in [ADR 014](014-icons.md), and per-component CSS in [ADR 015](015-per-component-css.md).

The Blazor manifest currently declares registry component dependencies, not NuGet package installation. QuickGrid is a separate package and is not selected for this phase. [ADR 013](013-overlay-primitives.md) documents the source-owned platform approach for overlays; it is not a universal prohibition on every possible NuGet dependency.

## Agreed direction

### Shared styling

Reuse the existing shared classes and partials in theme/scss/components/ (for example sheen-grid-*). Blazor components emit the same class names and data attributes as React; do not create a separate Blazor SCSS source. New styles needed by both frameworks go into the shared partials. One shared style source still produces the per-framework, per-component CSS outputs that [ADR 015](015-per-component-css.md) requires.

### DataTable

Build on the existing table, pagination and other appropriate registry components. Implement state and data operations in C#, without adding QuickGrid or changing the installer to support NuGet packages.

Match React search, sorting, faceted filters, pagination, row selection and bulk actions, column visibility, density, loading and empty states. Stable row identifiers must preserve selection across sorting and filtering; reset or clamp paging when the resulting data changes. Keep column definitions, state/query logic, toolbar, body and paging views in focused files rather than one large component.

### DataGrid

Provide the React scope: fixed-height virtualized rows, editable text/number/select/date/checkbox cells with validation, keyboard navigation, copy/paste, row selection, column visibility, width adjustment and pinning, footer aggregates and status labels. Reuse existing SheenUI controls and shared styles.

Keep editing state in C#, keyed by the pair of stable row ID and column ID, including draft value and validation state. An input element is a view of the draft, not its storage. A rerender or virtualization change must not silently discard a draft. Use stable @key values for rows and editors. Track active identity separately from its current position in the sorted/filtered view.

Preserving a draft and preserving DOM focus are separate requirements. Navigation mode keeps focus on the grid container and references an existing active cell through aria-activedescendant. Editing focuses the actual editor and keeps that editor mounted while scrolling away and back. Do not silently cancel or commit editing merely because its row leaves the viewport. Move between navigation and editing modes explicitly, without stealing the editor's caret keys.

Keyboard behavior follows React's [useDataGridNavigation](../../registry/react/components/data-grid/use-data-grid-navigation.ts):

- Navigation mode: the grid is one tab stop; Tab/Shift+Tab leave the grid.
- Editing mode: Enter/Shift+Enter commit and move down/up; Tab/Shift+Tab commit and move to the next/previous column in the same row; Escape cancels. Movement clamps at the grid's edges: Tab on the last column (or Shift+Tab on the first) commits and stays, and never wraps to another row. A failed validation keeps the editor open with its draft.

Copy/paste follows React's single-cell scope. Ctrl/Cmd+C writes the plain text representation of the active cell's raw value (toText(valueOf(...)), not the column's display format) through navigator.clipboard.writeText; failures are ignored. A paste event outside editing takes the first line of text/plain, parses it for the column's editor type, and commits it. On a validation error:

- text, number and select: the editor opens with the pasted text as its draft and shows the error;
- date: the editor opens with the cell's previous value as its draft and shows the error;
- checkbox: no editor opens; a grid-level message with role="alert" reports the error, matching React's [DataGridStatus](../../registry/react/components/data-grid/data-grid-footer.tsx).

Copy and paste need the collocated JavaScript module; C# owns parsing, validation and the commit. Copying formatted text instead would be a deliberate behavior change for both frameworks, not a Blazor-only difference.

Pinned columns use sticky positioning and logical start/end offsets. When their combined width would leave less than 80px for scrolling data, retain only selection-column pinning until the viewport is wider, with a configurable hint. This avoids pinned groups covering the content on mobile. Verify combined horizontal scrolling, pinning and RTL. Separate state/model, editing, navigation, virtualization and view responsibilities.

### Sortable and Resizable

Use source-owned Razor components with collocated `<Component>.razor.js` modules. Keep continuous pointer motion in the browser; report completed reorder/resize results to C# rather than invoking the server on every pointer move. Support cancellation, disposal and component rerenders without DOM/state divergence.

- Sortable: React-equivalent vertical, horizontal and mixed layouts; handles, pointer/touch/keyboard operation, drag/drop motion, reduced-motion fallback and configurable instructions/announcements in an aria-live region. Preserve scrolling and ordinary interactive controls inside items.
- Resizable: horizontal/vertical groups, size constraints, collapsible panels, nested layouts, reset and optional layout persistence. Handles expose role="separator", an accessible name, aria-orientation, current/min/max values, associated panel controls, and keyboard resizing with arrows and Home/End.
- Resizable persistence matches React's autoSaveId: an opt-in storage key parameter; the JavaScript module reads and writes localStorage, falls back to in-memory state when storage throws or is blocked, and ignores missing or invalid saved layouts. Without the key, nothing is stored.
- Horizontal movement follows visual direction in RTL; vertical Up/Down behavior does not reverse. Test each orientation rather than globally reversing arrow keys.
- Parameterize built-in text and preserve the shared appearances, modes, accents and density.

## Decision: DataGrid virtualization

The comparative experiment selected a manually calculated fixed-height window over the ordinary framework Virtualize window for editor/focus retention. See the [recorded method, results and limits](../blazor-data-virtualization.md). The evaluation contract follows.

Compare the framework Virtualize component with a manually calculated fixed-height window. Use identical data, row height, editor behavior and scroll scenarios. The absence of a public rangeExtractor counterpart is a design concern, not a completed experiment result.

### Candidate A: framework Virtualize

Evaluate whether it can keep the active/editor row mounted outside its ordinary visible range while preserving normal virtualization, scroll geometry and stable ownership. Do not count a preserved C# draft alone as a pass for focus retention. Record any additional render layers or workarounds and their complexity. If meeting the contract requires fragile workarounds, prefer candidate B.

### Candidate B: calculated window with positioned rows

Follow the existing React body geometry: a relatively positioned sheen-grid-body has height rowCount * rowHeight. Rendered rows are absolutely positioned with transform: translateY(index * rowHeight) and the fixed row height. This represents distant active rows without spacer gaps or changing the visible rows' coordinates.

Calculate the visible range from the body's scroll offset and viewport height, with bounded overscan. Render the union of that range and the active/editor row indexes, remove duplicates and sort indexes ascending before rendering. Account for header/footer geometry when converting the scroller offset to a body row index. Clamp empty, end-of-data and resized viewport cases; recalculate on density/row-height changes.

The JavaScript module computes the range on scroll and resize and invokes C# only when the rendered range's start or end index changes, never on every scroll event. Range changes still occur about once per row during continuous scrolling, so updates are also coalesced: at most one range invocation is in flight; while it is pending, newer ranges replace each other and only the latest is sent after it completes. Stale ranges are never queued. Tune bounded overscan to reduce visible blanks under the tested latency and scrolling speeds. It cannot guarantee coverage for arbitrary speeds or distant jumps; measure blank duration and recovery delay in those cases.

Under Interactive Server each invocation crosses the server connection. The experiment measures invocation counts, visible blank duration, recovery and render delay during continuous scrolling and distant jumps with realistic network latency, not only on localhost. Measure actual Blazor interop round-trip latency in each test configuration rather than relying on the network-throttling preset alone.

The source reference already uses the same geometry in [DataGridBody](../../registry/react/components/data-grid/data-grid-body.tsx) and retains the active row through a sorted range union in [useDataGridVirtualizer](../../registry/react/components/data-grid/use-data-grid-virtualizer.ts). The small window calculation is only one part of the component, not an estimate for the complete accessible editing implementation.

### Shared accessibility requirements

Use grid/rowgroup/row/gridcell and column-header semantics, total row/column counts, and logical row/column indexes. aria-rowcount counts the header row, every data row, and the footer row when present, matching React (rows.length + 1 + (hasFooter ? 1 : 0)). Data rows start at aria-rowindex 2; indexes are not copied directly from zero-based array indexes. Every rendered row has a valid increasing index in DOM order. Render the retained row at its logical DOM position, not appended unconditionally after visible rows. aria-rowindex describes omitted rows; it does not make arbitrary DOM reading order safe. Never reference a missing active cell or create duplicate cell IDs/editors.

References: [WAI-ARIA grid/table properties](https://www.w3.org/WAI/ARIA/apg/practices/grid-and-table-properties/) and [grid interaction pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/).

### Experiment acceptance and decision gate

Run both candidates in a real browser with a large fixed-height data set, including the React example's 10,000-row scale. Exercise:

- Active row outside the visible window, far jumps in both directions, last rows and empty data; no overlap, incorrect total height or extra gap.
- Editing a draft (including invalid text), scrolling far away and back, and continuing typing; no draft loss, editor replacement or unintended focus transfer.
- Arrow navigation, PageUp/Down, Home/End, Ctrl+Home/End, Tab/Shift+Tab in both modes (including at the first/last column), Enter/F2, Escape, and moving to a row that has not yet rendered.
- Copy and valid/invalid paste on the active cell for each editor type, including a cell whose row was scrolled out of view.
- Sorting/filtering, viewport resize and density changes; identities remain valid and positions are recomputed.
- LTR/RTL, horizontal scrolling and pinned columns; valid ARIA references, unique IDs and increasing rendered row indexes.
- Bounded rendered row counts, scroll responsiveness, JavaScript-to-C# invocation counts, visible blank areas and render delay during continuous and fast scrolling under realistic latency, render frequency and implementation complexity, especially under Interactive Server.

Record results and limitations for each candidate. Choose the smallest implementation that satisfies the behavior, focus, geometry and accessibility contract. Test the selected approach on .NET 8/9/10 before accepting this ADR. The calculated window retained the editor and focus in the comparative .NET 10 probe; the complete component subsequently passed .NET 8/9/10 browser acceptance. Latency runs exposed temporary blanks in both candidates, recorded with their measured round trips. This result does not claim universal performance superiority or rule out every custom Virtualize integration.

## SSR and interactivity boundary

Static SSR means static display only in this phase: initial data/content and appropriate semantics. It does not include query-string sorting, filtering or pagination, editing, dragging, resizing, or restoration from browser storage. No URL-driven data navigation is being added by this decision. Do not rely on browser viewport measurements to produce static SSR output or silently render every large-data row; define and document a bounded initial grid preview during implementation.

The interactive features require an interactive render mode. Document the boundary and verify the supported .NET targets. The generated-app/browser baseline is Interactive Server; do not claim WebAssembly or Auto behavior was tested without corresponding evidence.

## Implementation order and delivery

1. DataTable.
2. Sortable.
3. Resizable.
4. DataGrid, after resolving the virtualization experiment.

Keep the components independently installable through the existing registry contract. Declare their component dependencies and assets, generate per-component CSS and refresh hashes. Add React-equivalent examples to SheenDemo, including Arabic and English, rather than inventing a smaller substitute scope. Reuse models and existing helpers where appropriate without coupling independent components or adding speculative abstractions.

Verify state logic with focused .NET tests and verify focus, keyboard, pointer/touch interactions, clipboard, movement and geometry in actual browser tests. Cover .NET 8/9/10, both languages/directions, default/flat/glass, light/dark, relevant density changes, desktop/mobile sizes and reduced motion. Browser touch emulation is not evidence of physical touch-device testing; DOM assertions are not a substitute for recording any screen-reader checks separately.

A documentation draft does not mark #74 complete. Acceptance requires the implemented components, registry/CLI installation checks, shared-theme regressions, consumer examples, documentation and applicable browser/static-SSR checks to pass.

## Alternatives not selected

- QuickGrid: introduces a separate package installation/versioning concern and an additional rendering contract to adapt to SheenUI. Build on the existing table/pagination components for this phase.
- React package wrappers inside Blazor: add a second UI runtime and do not provide Blazor-native ownership or binding.
- Native HTML drag/drop alone: does not meet the accepted mouse/touch/keyboard interaction scope without additional behavior.
- Canceling editing on scroll: violates the agreed draft/focus continuity contract.
- Multi-cell (TSV) copy/paste: beyond React's single-cell scope; not part of this phase.

## Consequences and remaining evidence

SheenUI owns the C# state and JavaScript interaction/accessibility behavior and must test both. The phase adds no new external runtime package or NuGet-installation capability. The calculated window resolves the virtualization choice. Registry installation/idempotence, C# state checks, keyboard/pointer/emulated-touch interactions, clipboard/editing, themes/RTL and static SSR passed in generated .NET 8/9/10 apps. Firefox/WebKit, physical touch devices, screen readers, WebAssembly and Auto were not verified; those remain separate validation work.
