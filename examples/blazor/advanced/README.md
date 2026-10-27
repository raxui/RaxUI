# Chat and SpeedDial examples

Install `chat`, `speed-dial`, `avatar`, `toggle`, and `switch` using the Blazor CLI. Copy the four Razor files into one namespace visible to the page, then render `<ChatExamples />` and `<SpeedDialExamples />`. `Arabic=true` localizes the primary example; both also include a separate Arabic example. Use an interactive render mode. The optional Arabic avatar uses `/avatars/astronaut.jpg` (or supply your own image).

Chat delivery is local simulation: toggle offline to exercise failure/retry. The composer owns no backend. The SpeedDial example only displays the selected action. See [the component contract](../../../docs/blazor-advanced-part1.md) for parameters, lifecycle, SSR and clipping limits.
