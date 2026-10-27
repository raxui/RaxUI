# React-equivalent Blazor TextEditor examples

Install `text-editor`, `switch`, `avatar` and `field`, then copy `TextEditorExamples.razor` into your app and render it in an interactive render mode:

```razor
<TextEditorExamples />
```

- **Document:** the full toolbar with release notes, and a switch that shows the HTML the component reports to C#.
- **Comment composer:** tools in the footer, a 280-character counter, a Send button, and Ctrl+Enter. Earlier comments render through `TextEditorView`.
- **EditForm:** DataAnnotations with a visible-text length rule.
- **بالعربية:** RTL with Arabic labels and a custom tool list.

Data stays local. See the [component API](../../../docs/blazor-text-editor.md).
