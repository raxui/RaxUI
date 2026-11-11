<!-- Plain Markdown and absolute URLs only: this README is also the NuGet package readme, which does not render raw HTML or resolve relative links. -->
![RaxUI](https://raw.githubusercontent.com/raxui/RaxUI/main/docs/assets/raxui-logo.png)

# RaxUI

Source-owned Blazor and React components with one shared theme.
A CLI copies the components into your app. You own the code and can change any of it.

**[raxui.com](https://raxui.com/)**

**[Blazor dashboard demo](https://blazor.raxui.com/)**

[![Website](https://img.shields.io/badge/website-raxui.com-blue)](https://raxui.com/)
[![NuGet](https://img.shields.io/nuget/vpre/RaxUI?label=nuget)](https://www.nuget.org/packages/RaxUI)
[![npm](https://img.shields.io/npm/v/@raxui/react?label=npm)](https://www.npmjs.com/package/@raxui/react)
[![MIT license](https://img.shields.io/badge/license-MIT-blue)](https://github.com/raxui/RaxUI/blob/main/LICENSE)

> **Preview:** RaxUI is in preview. APIs and file layouts can still change between releases.

## Features

- **68 components** for Blazor and React, from buttons and forms to data grids, charts, calendars, chat and a rich text editor.
- **Your code, not a dependency.** `add` copies `.razor` or `.tsx` files and their CSS into your project. Installed components run without the CLI.
- **One theme, three looks.** `default`, `flat` and `glass` appearances, light and dark mode, accents, density and RTL, set with HTML attributes.
- **Built on Bootstrap 5.3.** React uses Radix UI for behaviour and accessibility. Blazor uses native `<dialog>` and `popover` with small JavaScript modules.
- **Safe installs.** Your edits are never silently overwritten. Interrupted installs roll back, and Blazor has an `update` command that shows conflicts first.

## Quick start

### Blazor

For Blazor Web Apps on .NET 8, 9, 10 or 11.

```sh
dotnet tool install --global RaxUI --prerelease
dotnet new blazor --interactivity Server -n MyApp
cd MyApp
raxui init
raxui add button dialog
```

```razor
<Button OnClick="@(() => count++)">Clicked @count times</Button>
```

### React

For React 18.3 or 19, on Vite 6+ or Next.js 15+ (App Router, without Tailwind).

```sh
npm install -D --save-exact @raxui/react
npx @raxui/react init
npx @raxui/react add button dialog
```

```tsx
// src/App.tsx
import { Button } from "./components/ui/button"

export default function App() {
  return <Button>Save</Button>
}
```

### Theme

Any element can set the theme for the components inside it:

```html
<div data-rax-appearance="glass" data-bs-theme="dark" data-rax-accent="emerald" dir="rtl">
  ...
</div>
```

`init` asks for an appearance and an accent. To skip the questions, pass `--appearance glass --accent emerald`.

## Documentation

| Guide | What it covers |
| --- | --- |
| [Website & Documentation](https://raxui.com/) | Official documentation, live components, and interactive examples |
| [Dashboard demo](https://blazor.raxui.com/) | A full admin dashboard built with RaxUI Blazor components |
| [Blazor guide](https://github.com/raxui/RaxUI/blob/main/docs/blazor.md) | Render modes, `init` and `add`, icons, install guarantees, `raxui update` |
| [React guide](https://github.com/raxui/RaxUI/blob/main/docs/react.md) | Vite and Next.js setup, theme provider, components, recovery |
| [Component notes](https://github.com/raxui/RaxUI/blob/main/docs/components.md) | Usage and parameters for every component family |
| [Shared theme](https://github.com/raxui/RaxUI/blob/main/theme/README.md) | Tokens, appearances, glass materials |
| [Architecture](https://github.com/raxui/RaxUI/blob/main/ARCHITECTURE.md) and [decisions](https://github.com/raxui/RaxUI/tree/main/docs/adr) | How the registry, CLIs and theme fit together |

RaxUI was previously named SheenUI, and BlazorUI before that. If you have an app using an older name, see [ADR 022](https://github.com/raxui/RaxUI/blob/main/docs/adr/022-raxui-identity.md).

## Contributing

To build, test or release RaxUI, read the [contributing guide](https://github.com/raxui/RaxUI/blob/main/CONTRIBUTING.md).

## License

Licensed under the [MIT license](https://github.com/raxui/RaxUI/blob/main/LICENSE).
