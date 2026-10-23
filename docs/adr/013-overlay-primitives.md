# ADR 013 — Overlay primitives: native HTML in Blazor, Radix in React

- **Status:** Accepted
- **Date:** 2026-10-24

## Context

Dialog and DropdownMenu need focus management, dismissal, keyboard navigation, ARIA, and positioning. React uses Radix for this ([ADR 006](006-react-first-milestone.md)). Blazor has no equivalent that fits SheenUI's three constraints: unstyled, source-owned (copied, not a package), and supporting .NET 8, 9, and 10 ([ADR 009](009-dotnet-8-9-10.md)). Reviewed options (October 2026):

- Bootstrap-based libraries (`Blazor.Bootstrap`, `Havit.Blazor`, `BootstrapBlazor`, `BlazorStrap`) are styled NuGet packages; `Blazorise` has a commercial license.
- Headless libraries (`BlazorBlueprint.Primitives`, `Soenneker.Bradix.Suite`) target .NET 10 only.
- Fluent UI Blazor v5 is styled and wraps web components in Shadow DOM, which the shared SCSS cannot reach.
- Bootstrap's own JavaScript (`Modal`, `Dropdown`) changes the DOM outside Blazor's renderer.

## Decision

- **Blazor builds its own primitives on the platform:** `Dialog` uses `<dialog>` with `showModal()` (top layer, focus containment, `Esc`, inert background, focus return). `DropdownMenu` uses the `popover` attribute with a `popovertarget` trigger (top layer, light dismiss, `Esc`). A small collocated JavaScript module (`<Component>.razor.js`, installed with the component) adds what the platform lacks: backdrop-click dismissal, menu positioning, and menu keyboard navigation.
- **React keeps Radix** (`@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`). Portals render inside the nearest `SheenThemeProvider` element, so overlays inherit mode, appearance, accent, density, and direction.
- **One behavior contract for both frameworks:**
  - Dialog: `role="dialog"`, `aria-modal`, labelled by its title and described by its description; `Esc` and a click outside the panel close it; focus moves inside on open and returns to the opener on close; page scroll is locked while open.
  - DropdownMenu: the trigger has `aria-haspopup="menu"` and `aria-expanded`; the menu has `role="menu"` and items `role="menuitem"`. Opening with the keyboard (`Enter`, `Space`, `ArrowDown`) focuses the first item; opening with the pointer focuses the menu, and the first `ArrowDown` moves to the first item. `ArrowDown`/`ArrowUp` move and wrap, `Home`/`End` jump, typing a letter jumps to the next matching item, disabled items are skipped; `Enter`/`Space` select; selecting, `Esc`, `Tab`, or a click outside closes the menu and focus returns to the trigger. The menu opens below the trigger, aligned to its inline start, and flips above when there is no room.
- **Shared styling:** both frameworks use the same classes (`sheen-dialog*`, `sheen-dropdown-*`) from `theme/scss/components/`. Blazor gets them compiled into `sheenui.css`; React gets the partials.
- **Blazor render mode:** both components need an interactive render mode (Server, WebAssembly, or Auto) for opening from C#, closing back into C# state, and the JavaScript module.
- **Installer:** Blazor component folders may contain one JavaScript file type (`js`), next to the `.razor` files.

## Alternatives Considered

- **A Blazor package dependency:** none meets all three constraints above.
- **Bootstrap JavaScript:** works without new code, but its DOM changes conflict with Blazor re-rendering and enhanced navigation, and its state lives outside C#.
- **CSS anchor positioning instead of JavaScript positioning:** not yet available in every supported browser.

## Consequences

- SheenUI owns the keyboard and ARIA code for Blazor menus, so it needs its own browser tests.
- The two frameworks can drift; the contract above is the reference for both.
- Browsers without `popover` (before 2024) are not supported by Blazor `DropdownMenu`.
