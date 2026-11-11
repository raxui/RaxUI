# Blazor TextEditor

`raxui add text-editor` installs a rich-text editor with `button`, `dropdown-menu`, `popover`, `input`, `textarea` and the shared `text-editor.css`. It runs the same engine as React, Tiptap 3.31.4, bundled reproducibly into `TextEditorContent.razor.js` (ADR 020, #121). No npm package, CDN or NuGet package is added.

```razor
<TextEditor aria-label="Release notes" @bind-Value="html" MaxLength="2000" ShowCount Placeholder="Write…" />
<TextEditorView Html="@savedHtml" />
```

## Value and forms

- The value is HTML; `""` means empty. Edits reach `ValueChanged` after a 300 ms pause and immediately on blur. HTML longer than 16,000 characters is sent as a stream, so documents above SignalR's 32 KB message limit work without changing hub options.
- Changing `Value` from C# replaces the content. Values the editor itself reported are not pushed back, so the caret never jumps.
- Inside an `EditForm`, `@bind-Value` notifies the `EditContext`. Validation sets `data-invalid` on the root, and `aria-invalid` plus the Field's `aria-describedby` on the editable element. Validate the visible text, not the markup; the example's `TextLengthAttribute` shows how.
- `Name` adds a hidden input with the HTML for plain form posts, including static SSR.
- `GetHtmlAsync()` returns the current HTML, including a change still inside the 300 ms pause, and reports it through `ValueChanged`. Call it before acting on a keyboard shortcut (the comment example sends with Ctrl+Enter). `FocusAsync()` and `ClearAsync()` are also available.

## Toolbar and editing

- `Toolbar` is `full` (default), `basic` or `none`. `Tools` sets your own list from `TextEditorTypes.Tools.Full` names (`"|"` is a separator); unknown names throw.
- `ToolbarPosition="bottom"` puts the tools in the footer for comment or chat composers. `FooterEnd` adds content after the counter, such as a Send button.
- `BubbleMenu` (default true) shows formatting tools over selected text. It is placed in `<body>`, so it is never clipped, and takes the editor's theme attributes.
- `MaxLength` stops typing at the limit, and `ShowCount` shows the counter ring with `LimitLabel`.
- `MinHeight` and `MaxHeight` are CSS lengths; the text scrolls past `MaxHeight` while the toolbar stays put. `Variant` is `glass` or `filled`.
- `Disabled`, `ReadOnly`, `Invalid`, `AutoFocus`, `Direction`, `Placeholder`, `ContentClass`, `Appearance` and `Class` behave as in React. `id` and `aria-*` attributes go to the editable element, everything else to the root.
- Keyboard: Markdown input rules (`# `, `- `, `1. `, `[] `, `> `, ```` ``` ````, `**bold**`), the Tiptap shortcuts shown in tool titles (Ctrl or ⌘), Ctrl/⌘+Shift+L/E/R/J for alignment, and Ctrl/⌘+K for a link. The toolbar is one tab stop; arrows, Home and End move between tools, reversed in RTL. Paragraphs and headings use `dir="auto"`, so mixed Arabic and English text lays out per paragraph.
- `Labels` (`TextEditorTypes.Labels`) translates every built-in text. Shortcut notation follows the platform (Ctrl+B or ⌘B).

The toolbar's pressed and disabled states, the menus, the link form and the counter update in the browser. Formatting and selection changes never wait for the server; only the HTML value travels to .NET.

## Safety and static SSR

Before interactivity, and in static SSR, the editor shows its HTML read-only through `TextEditorHtml.Sanitize`, an allowlist of exactly the editor's schema. Tags are rebuilt from tokens; `script`, `style`, `iframe`, `svg` and similar elements are dropped with their content; links keep only `http`, `https`, `mailto`, `tel` and relative URLs and always get `rel="noopener noreferrer nofollow"`; only `text-align` survives in `style`. The interactive editor parses content through ProseMirror's schema, which also drops unknown markup. Use `TextEditorView` to display stored HTML elsewhere. Don't render editor HTML with `MarkupString` directly.

React's `extensions` and `editorRef` are not available: the engine is a fixed, reproducible bundle, and C# cannot pass JavaScript extensions.

## Tests

`TextEditorHtmlTests` covers the schema and 20 injection vectors. `GeneratedAppTests.TextEditor.cs` installs the editor into generated .NET 8/9/10/11 apps. It covers bubble placement on the first selection, bubble and toolbar formatting, the heading menu, the link popover, undo, the C# round trip, the comment composer, `EditForm` validation, Arabic RTL keyboard order, injection safety, a 40 KB value over the stream, read-only toggling, the hidden form value, themes, and static SSR. `examples/blazor/text-editor/` holds the React-equivalent examples, which RaxDemo hosts at `#text-editor`. `npm run check` verifies the engine bundle rebuilds byte for byte.
