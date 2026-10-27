# React-equivalent Blazor AI example

Install `ai` and copy `AIExamples.razor` into your app. Render it in an interactive render mode:

```razor
<AIExamples />
```

Pick a suggestion or type a question. A simulated model thinks line by line, calls a search tool, then streams a Markdown answer with code, a list or table, sources, and copy/regenerate/feedback actions. Arabic questions get an Arabic, right-to-left answer, and Stop ends an answer midway. Nothing is sent to a model or a service. See the [component API](../../../docs/blazor-ai.md).
