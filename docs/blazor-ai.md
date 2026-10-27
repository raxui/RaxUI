# Blazor AI

`sheenui add ai` installs the AI conversation parts with `button`, `toggle` and the shared `ai.css`. No npm package, CDN or NuGet package is added. Markdown is rendered by `AIMarkdownParser.cs`, a source-owned C# parser that the CLI installs and hash-checks like the Razor files (#121).

```razor
<AIConversation>
    <AIMessage From="user">@prompt</AIMessage>
    <AIMessage From="assistant">
        <AIReasoning Streaming="@thinking">@reasoning</AIReasoning>
        <AIResponse Markdown Streaming="@streaming" Text="@answer" />
        <AIActions CopyText="@answer" OnRegenerate="Regenerate" @bind-Feedback="feedback" />
    </AIMessage>
</AIConversation>
<AIPromptInput Status="@status" OnSubmit="Ask" OnStop="Stop" />
```

## Parts

- `AIConversation` is a `role="log"` live region. `AIMessage From="user|assistant"` adds the assistant avatar (`Avatar` to replace it).
- `AIResponse` renders `Text`, or `ChildContent`. `Markdown` renders the subset below. `Streaming` shows the caret and sets `aria-busy`. `CopyLabel`/`CopiedLabel` translate code-block copy buttons.
- `AIReasoning` opens while `Streaming`, counts seconds after interactivity, and folds 700 ms after it ends unless the user opened it. `Duration` overrides the count. `ThinkingLabel` and `DoneLabel` (`{s}` = seconds) translate it.
- `AIToolCall` takes `Name`, `Status` (`pending`/`running`/`completed`/`error`), optional `Title`, `Input`, `Output` and `Error` as text, `DefaultOpen`, and a label per status and section. Serialize objects before passing them, for example as indented JSON.
- `AISources` lists `AITypes.Source(Title, Url)` with host names. `Label` uses `{n}`. Links go through the same URL check as Markdown.
- `AICodeBlock` shows code with its language and a copy button.
- `AIActions` provides copy (`CopyText`), regenerate (`OnRegenerate`) and thumbs feedback (`@bind-Feedback`: `up`, `down` or null). Each button appears only when its parameter is set.
- `AISuggestions` renders `Suggestions` and calls `OnSelect`.
- `AIPromptInput` takes `Status` (`ready`/`submitted`/`streaming`), `OnSubmit`, `OnStop`, `Placeholder`, `Label`, `Tools`, `MaxRows`, `SendLabel` and `StopLabel`. Enter sends and Shift+Enter adds a line; IME composition is respected. The draft stays in the browser, and only a submitted prompt is sent to .NET.

Copy reports "Copied" only after the browser accepts the clipboard write, as in React. Copy and regenerate buttons use `title` for their tooltip.

## Markdown subset

Supported: ATX headings (`#`–`######`), paragraphs, hard breaks (two spaces or `\`), `**bold**`/`__bold__`, `*em*`/`_em_` (intraword `_` stays literal), `~~strike~~`, inline code, fenced code (```` ``` ```` or `~~~`, with language), ordered and bullet lists with nesting and loose/tight spacing, task lists, blockquotes, GFM tables with alignment, horizontal rules, `[links](url "title")`, `<autolinks>`, and bare `http(s)://` and `www.` links.

Not supported: setext headings, indented code blocks, reference-style links, footnotes, and HTML. HTML in the text is shown as literal text and never rendered. Links are kept only for `http`, `https`, `mailto` and relative URLs; other schemes such as `javascript:` or `data:` keep their text without a link. Images render as links to the image, so model output cannot load remote resources.

## Streaming

While `Streaming` is true, the text first goes through `CloseOpenMarks` (a port of React's `closeOpenMarks`) so a half-written `**`, `~~` or code span renders closed. `AIResponse` renders at most once per `RenderInterval` (default 50 ms) and always renders the final text, because under Interactive Server each render is a network diff. Unchanged text is not parsed again. Changed text is parsed whole, which is linear in its length.

## SSR and tests

Static SSR renders every part read-only, including the Markdown. The prompt field stays disabled until interactive. `AIMarkdownTests` covers the subset, the HTML and URL safety rules, `CloseOpenMarks`, and parsing every streamed prefix. `GeneratedAppTests.AI.cs` installs `ai` into generated .NET 8/9/10 apps. It checks injection safety, actions, burst streaming, the example's full flow (reasoning, tool, Markdown, sources, copy, Arabic, Stop), themes, and static SSR. `examples/blazor/ai/` contains the React-equivalent assistant, which SheenDemo hosts at `#ai`.
