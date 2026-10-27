using SheenUI.Internal.TextEditor;
namespace SheenUI.Integration.Tests;

public class TextEditorHtmlTests
{
    [Theory]
    [InlineData("<p>Hello <strong>world</strong></p>", "<p>Hello <strong>world</strong></p>")]
    [InlineData("<h2 dir=\"auto\" style=\"text-align: center\">T</h2>", "<h2 dir=\"auto\" style=\"text-align: center\">T</h2>")]
    [InlineData("<p><b>b</b><i>i</i><strike>s</strike><u>u</u><mark>m</mark><code>c</code></p>", "<p><strong>b</strong><em>i</em><s>s</s><u>u</u><mark>m</mark><code>c</code></p>")]
    [InlineData("<pre><code class=\"language-ts\">a &lt; b</code></pre>", "<pre><code class=\"language-ts\">a &lt; b</code></pre>")]
    [InlineData("<ol start=\"3\"><li><p>x</p></li></ol><hr><blockquote><p>q</p></blockquote>", "<ol start=\"3\"><li><p>x</p></li></ol><hr><blockquote><p>q</p></blockquote>")]
    [InlineData("<ul data-type=\"taskList\"><li data-checked=\"true\" data-type=\"taskItem\"><label><input type=\"checkbox\" checked=\"checked\"><span></span></label><div><p>Done</p></div></li></ul>",
                "<ul data-type=\"taskList\"><li data-checked=\"true\" data-type=\"taskItem\"><label><input type=\"checkbox\" checked=\"checked\" disabled><span></span></label><div><p>Done</p></div></li></ul>")]
    [InlineData("<p><a href=\"https://example.com/a?b=1&amp;c=2\">x</a></p>", "<p><a href=\"https://example.com/a?b=1&amp;c=2\" target=\"_blank\" rel=\"noopener noreferrer nofollow\">x</a></p>")]
    [InlineData("<P>Upper<BR>case</P>", "<p>Upper<br>case</p>")]
    [InlineData("<p>مرحباً <strong>بالعالم</strong></p>", "<p>مرحباً <strong>بالعالم</strong></p>")]
    [InlineData("<p>unclosed <strong>bold", "<p>unclosed <strong>bold</strong></p>")]
    [InlineData("<p>a</strong> b</p>", "<p>a b</p>")]
    public void Keeps_the_editor_schema(string input, string expected) => Assert.Equal(expected, TextEditorHtml.Sanitize(input));

    [Theory]
    [InlineData("<script>alert(1)</script><p>ok</p>", "<p>ok</p>")]
    [InlineData("<SCRIPT src=x></SCRIPT>", "")]
    [InlineData("<p>a<script>if (1 < 2) alert(1)</script>b</p>", "<p>ab</p>")]
    [InlineData("<img src=x onerror=alert(1)>", "")]
    [InlineData("<p onclick=\"alert(1)\" style=\"color:red\">x</p>", "<p>x</p>")]
    [InlineData("<p style=\"text-align:center;background:url(javascript:alert(1))\">x</p>", "<p>x</p>")]
    [InlineData("<svg onload=alert(1)><circle/></svg><p>x</p>", "<p>x</p>")]
    [InlineData("<iframe src=\"https://evil\"></iframe>", "")]
    [InlineData("<style>p{}</style><p>x</p>", "<p>x</p>")]
    [InlineData("<!-- <script>alert(1)</script> --><p>x</p>", "<p>x</p>")]
    [InlineData("<scr<script>ipt>alert(1)</script>", "ipt&gt;alert(1)")]
    [InlineData("<a href=\"javascript:alert(1)\">x</a>", "<a target=\"_blank\" rel=\"noopener noreferrer nofollow\">x</a>")]
    [InlineData("<a href=\"JaVaScRiPt:alert(1)\">x</a>", "<a target=\"_blank\" rel=\"noopener noreferrer nofollow\">x</a>")]
    [InlineData("<a href=\"&#106;avascript:alert(1)\">x</a>", "<a target=\"_blank\" rel=\"noopener noreferrer nofollow\">x</a>")]
    [InlineData("<a href=\"java&#x09;script:alert(1)\">x</a>", "<a target=\"_blank\" rel=\"noopener noreferrer nofollow\">x</a>")]
    [InlineData("<a href=\" data:text/html,<b>x</b>\">x</a>", "<a target=\"_blank\" rel=\"noopener noreferrer nofollow\">x</a>")]
    [InlineData("<a href=\"https://x\" target=\"_self\" rel=\"opener\" onmouseover=\"x\">x</a>", "<a href=\"https://x\" target=\"_blank\" rel=\"noopener noreferrer nofollow\">x</a>")]
    [InlineData("<input type=\"text\" value=\"x\" autofocus onfocus=\"alert(1)\">", "<input disabled>")]
    [InlineData("<code class=\"x onerror\">c</code>", "<code>c</code>")]
    [InlineData("<p title=\"a>b\" dir=\"x\">t</p>", "<p>t</p>")]
    [InlineData("&lt;script&gt;alert(1)&lt;/script&gt;", "&lt;script&gt;alert(1)&lt;/script&gt;")]
    [InlineData("<p>1 < 2 & 3 > 2</p>", "<p>1 &lt; 2 &amp; 3 &gt; 2</p>")]
    [InlineData("<math><mi xlink:href=\"javascript:alert(1)\">x</mi></math>", "")]
    public void Removes_everything_else(string input, string expected) => Assert.Equal(expected, TextEditorHtml.Sanitize(input));

    [Theory]
    [InlineData("/docs#a", "/docs#a")]
    [InlineData("#top", "#top")]
    [InlineData("mailto:a@b.c", "mailto:a@b.c")]
    [InlineData("tel:+9647700000000", "tel:+9647700000000")]
    [InlineData("vbscript:msgbox", null)]
    [InlineData("", null)]
    public void Allows_only_safe_links(string href, string? expected) => Assert.Equal(expected, TextEditorHtml.SafeHref(href));

    [Theory]
    [InlineData("", 0)]
    [InlineData("<p>Hello <strong>world</strong></p>", 11)]
    [InlineData("<p>a &amp; b</p><p>c</p>", 6)]
    [InlineData("<p>مرحباً</p>", 6)]
    public void Counts_text_like_the_editor(string html, int length) => Assert.Equal(length, TextEditorHtml.TextLength(html));
}
