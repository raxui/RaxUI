# Shared theme

The single source of the RaxUI theme and component styles, shared by the React and Blazor libraries ([ADR 005](../docs/adr/005-multi-framework-shared-theme.md), [ADR 007](../docs/adr/007-blazor-shared-theme.md)).

- React installs these SCSS partials and compiles them with Bootstrap.
- Blazor gets them precompiled: `npm run theme:css` (`build-css.mjs`) writes core-only `registry/blazor/styles/raxui.css`, one `styles/components/<name>.css` per styled component, and `starter/starter.css`, without Bootstrap ([ADR 015](../docs/adr/015-per-component-css.md)). Every generated file is checked for staleness. Definitions-only `_variables.scss` and `_mixins.scss` are loaded for each component; runtime core tokens are emitted once. `_input-mixins.scss` is a helper and has no standalone asset.
- Component styles live in `scss/components/` (for example `_button.scss`, from boot-ui `src/components/ui/_button.scss`). `_starter.scss` styles the app shell and welcome page that `init` installs ([ADR 008](../docs/adr/008-starter-app.md)).

## Provenance

Copied once from [boot-ui](https://github.com/SaadAlsaree/boot-ui) `src/styles/`, commit `4b973e103077eec2ba19025b8c71093449023232`. This repository owns it from now on; boot-ui is a read-only reference.

Changes since the copy:

- `_appearance.scss`: opaque glass under `prefers-reduced-transparency: reduce`.
- `_appearance.scss`: an element that switches mode (`data-bs-theme`) without an appearance re-declares the default material, so surfaces follow the inner mode (dark mode with the default appearance showed light panels).
- Fields (input, textarea, select trigger, upload zone) use their own recessed material (`--rax-field-bg`, `--rax-field-border`, `--rax-field-shadow`): shadow on the top inner edge, faint light on the bottom one, no backdrop blur. `filled` is the default field variant.
- Glass surfaces derive from `--rax-glass-alpha` and `--rax-glass-blur` (default 16px, saturate 140%), so material classes change cards and overlays too. The `glass()` mixin (`variant="glass"`) follows the appearance: opaque under `default` and `flat`.
- `components/_button.scss`: no focus ring on mouse clicks when app styles (the Blazor template's `app.css`) ring every `:focus`; keyboard focus keeps it.

## Contract

Any element may carry these attributes; components resolve their look from CSS custom properties under them.

| Attribute | Values |
| --- | --- |
| `data-bs-theme` | `light`, `dark` |
| `data-rax-appearance` | `default`, `flat`, `glass` |
| `data-rax-accent` | `emerald`, `indigo`, `amber` (omit for Bootstrap defaults) |
| `data-rax-density` | `comfortable`, `compact` |
| `dir` | `ltr`, `rtl` |

Semantic tokens set by the appearance: `--rax-surface-bg`, `--rax-border-color`, `--rax-control-shadow`, `--rax-surface-shadow`, `--rax-control-radius`, `--rax-surface-filter`, `--rax-field-bg`, `--rax-field-border`, `--rax-field-shadow`. Components use these and never test the appearance name.

## Import order

Glass appearance uses compact contact shadows (2px blur on controls, 8px on
surfaces) with reduced opacity in both light and dark mode. The glass edge and
backdrop blur remain intact. Override `--rax-control-shadow` and
`--rax-surface-shadow` on the appearance boundary to customize elevation.

```scss
// Your Bootstrap variables, e.g. $primary: #0a84ff;
@import "variables";                 // theme defaults for Bootstrap variables
@import "bootstrap/scss/bootstrap";
@import "core";                      // tokens, accents, mixins, animations, materials, text, appearance
@import "components/button";         // one line per installed component
```

## Files

| File | Purpose |
| --- | --- |
| `_variables.scss` | Bootstrap Sass variable defaults (radii, font) |
| `_tokens.scss` | Glass, shadow, radius, control-size, font, and motion tokens, light and dark |
| `_accents.scss` | `data-rax-accent` themes |
| `_appearance.scss` | `data-rax-appearance` and `data-rax-density` tokens |
| `_materials.scss` | `glass-ultrathin` / `thin` / `regular` / `thick` classes, and opt-in `glass-sheen` light reflections (uses `::after`) |
| `_mixins.scss` | `glass()`, `motion-safe` |
| `_animations.scss`, `_text.scss` | Shared keyframes and text helpers |
| `_core.scss` | Imports everything above, in order |
