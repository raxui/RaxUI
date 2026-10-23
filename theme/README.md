# Shared theme

The single source of the BlazorUI theme and component styles, shared by the React and Blazor libraries ([ADR 005](../docs/adr/005-multi-framework-shared-theme.md), [ADR 007](../docs/adr/007-blazor-shared-theme.md)).

- React installs these SCSS partials and compiles them with Bootstrap.
- Blazor gets them precompiled: `npm run theme:css` (`build-css.mjs`) writes `registry/styles/blazorui.css` from `_core.scss` and `components/`, without Bootstrap. A test fails when that file is stale.
- Component styles live in `scss/components/` (for example `_button.scss`, from boot-ui `src/components/ui/_button.scss`).

## Provenance

Copied once from [boot-ui](https://github.com/SaadAlsaree/boot-ui) `src/styles/`, commit `4b973e103077eec2ba19025b8c71093449023232`. This repository owns it from now on; boot-ui is a read-only reference.

Changes since the copy:

- `_appearance.scss`: opaque glass under `prefers-reduced-transparency: reduce`.

## Contract

Any element may carry these attributes; components resolve their look from CSS custom properties under them.

| Attribute | Values |
| --- | --- |
| `data-bs-theme` | `light`, `dark` |
| `data-bui-appearance` | `default`, `flat`, `glass` |
| `data-bui-accent` | `emerald`, `indigo`, `amber` (omit for Bootstrap defaults) |
| `data-bui-density` | `comfortable`, `compact` |
| `dir` | `ltr`, `rtl` |

Semantic tokens set by the appearance: `--bui-surface-bg`, `--bui-border-color`, `--bui-control-shadow`, `--bui-surface-shadow`, `--bui-control-radius`, `--bui-surface-filter`. Components use these and never test the appearance name.

## Import order

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
| `_accents.scss` | `data-bui-accent` themes |
| `_appearance.scss` | `data-bui-appearance` and `data-bui-density` tokens |
| `_materials.scss` | `glass-ultrathin` / `thin` / `regular` / `thick` classes |
| `_mixins.scss` | `glass()`, `motion-safe` |
| `_animations.scss`, `_text.scss` | Shared keyframes and text helpers |
| `_core.scss` | Imports everything above, in order |
