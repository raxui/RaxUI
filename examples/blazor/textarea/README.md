# Blazor Textarea examples

These samples match `react-test/src/examples/textarea-usage-example.tsx` and use
the library components and shared theme, without an extra UI dependency.

Install `textarea`, `input` and `button` with the RaxUI CLI. `input` supplies the
optional toolbar action styles. Copy the three `.razor` files in this folder
into an interactive page/component namespace and render:

```razor
<TextareaExamples />
```

Set `Arabic="true"` and the surrounding `dir="rtl"` to preview the Arabic version.
The independent notes example always uses RTL. Theme appearance and light/dark
mode inherit from the surrounding RaxUI theme.

- Composer: auto-grow from 2 to 8 rows, 280-character ring, warning/limit states,
  disabled empty submit, Post and Ctrl/Meta+Enter, newest three trimmed posts.
- Bio: live minimum-20-character validation and associated help text.
- Feedback: plain field with the native vertical resize grip.
- Release notes: filled field, auto-grow and a 120-character ring.
- Disabled field and Arabic notes with a 200-character ring.

Like the React reference, formatting, link and attachment buttons illustrate
footer composition; they do not implement rich text or uploads. Posts stay in
local component memory and are not sent to a service.

`Textarea` uses live `@bind-Value` updates and retains InputTextArea's validation
and static SSR form mapping. Use `Footer`/`FooterEnd` for custom actions;
`OnKeyDown` and `OnInput` expose input callbacks. `MaxLength` remains a native
HTML constraint. The counter uses UTF-16 length, matching JavaScript and React.