# @raxui/react

The React CLI for [RaxUI](https://github.com/raxui/RaxUI): source-owned React components on Bootstrap 5.3 and Radix UI, with the shared RaxUI theme. `add` copies each component into your app, so you own the code.

Supports React 18.3 or 19 with TypeScript, on Vite 6+ or Next.js 15+ (App Router, without Tailwind). Requires Node.js 20 or later.

```sh
npm install -D --save-exact --ignore-scripts @raxui/react
npx @raxui/react init
npx @raxui/react add button dialog
```

`init` asks for an appearance (`default`, `flat`, `glass`) and an accent. Pass `--appearance glass --accent emerald` to skip the questions.

Read the [React guide](https://github.com/raxui/RaxUI/blob/main/docs/react.md) for setup, theming and every component. Licensed under MIT.
