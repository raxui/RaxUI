using System.Net;
using System.Text;
using RaxUI.Internal.AI;
namespace RaxUI.Integration.Tests;

public class AIMarkdownTests
{
    // Mirrors AIMarkdown.razor: every text node is HTML-encoded.
    private static string Html(IEnumerable<MdNode> nodes)
    {
        var s = new StringBuilder();
        foreach (var node in nodes)
        {
            switch (node)
            {
                case MdText t: s.Append(WebUtility.HtmlEncode(t.Value)); break;
                case MdCode c: s.Append("<code>").Append(WebUtility.HtmlEncode(c.Value)).Append("</code>"); break;
                case MdBreak: s.Append("<br>"); break;
                case MdSpan { Tag: "" } span: s.Append(Html(span.Children)); break;
                case MdSpan span: s.Append($"<{span.Tag}>").Append(Html(span.Children)).Append($"</{span.Tag}>"); break;
                case MdLink l: s.Append($"<a href=\"{WebUtility.HtmlEncode(l.Url)}\">").Append(Html(l.Children)).Append("</a>"); break;
                case MdHeading h: s.Append($"<h{h.Level}>").Append(Html(h.Children)).Append($"</h{h.Level}>"); break;
                case MdParagraph p: s.Append("<p>").Append(Html(p.Children)).Append("</p>"); break;
                case MdFence f: s.Append($"<pre lang=\"{f.Language}\">").Append(WebUtility.HtmlEncode(f.Code)).Append("</pre>"); break;
                case MdQuote q: s.Append("<blockquote>").Append(Html(q.Blocks)).Append("</blockquote>"); break;
                case MdRule: s.Append("<hr>"); break;
                case MdList list:
                    s.Append(list.Ordered ? $"<ol start=\"{list.Start}\">" : "<ul>");
                    foreach (var item in list.Items)
                    {
                        s.Append("<li>"); if (item.Checked is { } c) s.Append(c ? "[x]" : "[ ]");
                        s.Append(list.Tight ? Html(item.Blocks.SelectMany(b => b is MdParagraph p ? p.Children : [b])) : Html(item.Blocks)).Append("</li>");
                    }
                    s.Append(list.Ordered ? "</ol>" : "</ul>"); break;
                case MdTable table:
                    s.Append("<table><tr>");
                    for (var i = 0; i < table.Head.Count; i++) s.Append($"<th{(table.Align[i] is { } a ? $" {a}" : "")}>").Append(Html(table.Head[i])).Append("</th>");
                    s.Append("</tr>");
                    foreach (var row in table.Rows) s.Append("<tr>").Append(string.Concat(row.Select(cell => "<td>" + Html(cell) + "</td>"))).Append("</tr>");
                    s.Append("</table>"); break;
            }
        }
        return s.ToString();
    }
    private static string Md(string text) => Html(AIMarkdownParser.Parse(text));

    [Theory]
    [InlineData("# Title\n\nSome **bold**, *em*, ~~gone~~ and `x < y`.", "<h1>Title</h1><p>Some <strong>bold</strong>, <em>em</em>, <del>gone</del> and <code>x &lt; y</code>.</p>")]
    [InlineData("## Heading ##", "<h2>Heading</h2>")]
    [InlineData("snake_case_name and __strong__ and _em_", "<p>snake_case_name and <strong>strong</strong> and <em>em</em></p>")]
    [InlineData("a  \nb\\\nc\nd", "<p>a<br>b<br>c\nd</p>")]
    [InlineData("\\*not em\\*", "<p>*not em*</p>")]
    [InlineData("```ts\nconst a = 1 < 2\n```\nafter", "<pre lang=\"ts\">const a = 1 &lt; 2</pre><p>after</p>")]
    [InlineData("~~~\nunterminated", "<pre lang=\"\">unterminated</pre>")]
    [InlineData("> quote **x**\n> more\n\n---", "<blockquote><p>quote <strong>x</strong>\nmore</p></blockquote><hr>")]
    [InlineData("- one\n- two\n  - nested\n- three", "<ul><li>one</li><li>two<ul><li>nested</li></ul></li><li>three</li></ul>")]
    [InlineData("3. c\n4. d", "<ol start=\"3\"><li>c</li><li>d</li></ol>")]
    [InlineData("- [ ] todo\n- [x] done", "<ul><li>[ ]todo</li><li>[x]done</li></ul>")]
    [InlineData("- a\n\n- b", "<ul><li><p>a</p></li><li><p>b</p></li></ul>")]
    [InlineData("| A | B |\n|:--|--:|\n| 1 | `a|b` |\n| 2 |", "<table><tr><th left>A</th><th right>B</th></tr><tr><td>1</td><td><code>a|b</code></td></tr><tr><td>2</td><td></td></tr></table>")]
    [InlineData("[site](https://example.com \"t\") and <https://x.org>", "<p><a href=\"https://example.com\">site</a> and <a href=\"https://x.org\">https://x.org</a></p>")]
    [InlineData("Visit https://example.com/a_(b). Now", "<p>Visit <a href=\"https://example.com/a_(b)\">https://example.com/a_(b)</a>. Now</p>")]
    [InlineData("مرحباً **بالعالم**", "<p>مرحباً <strong>بالعالم</strong></p>")]
    public void Renders_the_documented_GFM_subset(string markdown, string html) => Assert.Equal(html, Md(markdown));

    [Theory]
    [InlineData("<script>alert(1)</script>", "<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>")]
    [InlineData("<img src=x onerror=alert(1)>", "<p>&lt;img src=x onerror=alert(1)&gt;</p>")]
    [InlineData("[x](javascript:alert(1))", "<p>x</p>")]
    [InlineData("[x](JaVaScRiPt:alert(1))", "<p>x</p>")]
    [InlineData("[x](data:text/html,hi)", "<p>x</p>")]
    [InlineData("![pixel](https://tracker.example/p.png)", "<p><a href=\"https://tracker.example/p.png\">pixel</a></p>")]
    [InlineData("[ok](/docs#a) [mail](mailto:a@b.c)", "<p><a href=\"/docs#a\">ok</a> <a href=\"mailto:a@b.c\">mail</a></p>")]
    public void Never_emits_raw_html_or_unsafe_urls(string markdown, string html) => Assert.Equal(html, Md(markdown));

    [Theory]
    [InlineData("Some **bold", "Some **bold**")]
    [InlineData("a `code", "a `code`")]
    [InlineData("~~x and **y", "~~x and **y**~~")]
    [InlineData("```js\nlet a = '**'", "```js\nlet a = '**'")]
    [InlineData("done **x** `y`", "done **x** `y`")]
    public void Closes_open_marks_while_streaming_like_React(string partial, string closed) => Assert.Equal(closed, AIMarkdownParser.CloseOpenMarks(partial));

    [Fact]
    public void Every_streamed_prefix_parses()
    {
        const string text = "# T\n\n- [x] **a** `b`\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n```cs\nvar x = 1;\n```\n> q [l](https://a.b)";
        for (var i = 0; i <= text.Length; i++) AIMarkdownParser.Parse(AIMarkdownParser.CloseOpenMarks(text[..i]));
    }
}
