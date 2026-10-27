// Allowlist sanitizer for TextEditor HTML shown without the editor (static SSR, read-only display).
// It tokenizes the input and rebuilds markup from the editor's own schema; nothing from the input is copied through raw.
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Net;
using System.Text;
using System.Text.RegularExpressions;
namespace SheenUI.Internal.TextEditor;

internal static partial class TextEditorHtml
{
    // Tags the Tiptap schema produces, with the attributes each may keep.
    private static readonly Dictionary<string, string[]> Allowed = new(StringComparer.Ordinal)
    {
        ["p"] = ["style", "dir"], ["h1"] = ["style", "dir"], ["h2"] = ["style", "dir"], ["h3"] = ["style", "dir"],
        ["strong"] = [], ["em"] = [], ["u"] = [], ["s"] = [], ["code"] = ["class"], ["mark"] = [], ["a"] = ["href"],
        ["br"] = [], ["hr"] = [], ["blockquote"] = [], ["pre"] = [], ["ul"] = ["data-type"], ["ol"] = ["start"],
        ["li"] = ["data-type", "data-checked"], ["label"] = [], ["input"] = ["type", "checked"], ["span"] = [], ["div"] = [],
    };
    // Equivalent tags normalize to the schema's names.
    private static readonly Dictionary<string, string> Aliases = new(StringComparer.Ordinal) { ["b"] = "strong", ["i"] = "em", ["strike"] = "s", ["del"] = "s" };
    // Dropped together with everything inside them.
    private static readonly HashSet<string> Dropped = new(StringComparer.Ordinal) { "script", "style", "iframe", "object", "embed", "template", "textarea", "title", "noscript", "svg", "math", "select", "xmp", "noembed", "noframes", "plaintext", "head" };
    private static readonly HashSet<string> Void = new(StringComparer.Ordinal) { "br", "hr", "input" };

    [GeneratedRegex(@"^[a-zA-Z][a-zA-Z0-9-]*")] private static partial Regex TagName();
    [GeneratedRegex(@"\G\s*([^\s""'>/=]+)(?:\s*=\s*(?:""([^""]*)""|'([^']*)'|([^\s>]+)))?")] private static partial Regex Attribute();
    [GeneratedRegex(@"^\s*text-align\s*:\s*(left|center|right|justify|start|end)\s*;?\s*$", RegexOptions.IgnoreCase)] private static partial Regex TextAlign();
    [GeneratedRegex(@"^language-[\w+#.-]{1,40}$")] private static partial Regex LanguageClass();

    public static string Sanitize(string? html)
    {
        if (string.IsNullOrEmpty(html)) return "";
        var output = new StringBuilder(html.Length);
        var open = new List<string>();
        var i = 0;
        while (i < html.Length)
        {
            var lt = html.IndexOf('<', i);
            if (lt < 0) { Text(output, html[i..]); break; }
            Text(output, html[i..lt]);
            i = lt;
            if (string.CompareOrdinal(html, i, "<!--", 0, 4) == 0) { var end = html.IndexOf("-->", i + 4, StringComparison.Ordinal); i = end < 0 ? html.Length : end + 3; continue; }
            if (i + 1 < html.Length && html[i + 1] is '!' or '?') { var end = html.IndexOf('>', i); i = end < 0 ? html.Length : end + 1; continue; }
            var closing = i + 1 < html.Length && html[i + 1] == '/';
            var name = TagName().Match(html[(i + (closing ? 2 : 1))..]);
            if (!name.Success) { Text(output, "<"); i++; continue; }
            var tag = name.Value.ToLowerInvariant();
            tag = Aliases.GetValueOrDefault(tag, tag);
            var cursor = i + (closing ? 2 : 1) + name.Length;
            var attributes = new List<(string Name, string? Value)>();
            if (!closing)
                for (var m = Attribute().Match(html, cursor); m.Success && m.Index == cursor; m = Attribute().Match(html, cursor))
                {
                    attributes.Add((m.Groups[1].Value.ToLowerInvariant(), m.Groups[2].Success ? m.Groups[2].Value : m.Groups[3].Success ? m.Groups[3].Value : m.Groups[4].Success ? m.Groups[4].Value : null));
                    cursor = m.Index + m.Length;
                }
            var gt = html.IndexOf('>', cursor);
            i = gt < 0 ? html.Length : gt + 1;
            if (Dropped.Contains(tag))
            {
                if (closing) continue;
                // Skip to the matching end tag; raw-text elements may contain anything, including "<".
                var end = html.IndexOf("</" + tag, i, StringComparison.OrdinalIgnoreCase);
                if (end < 0) { i = html.Length; continue; }
                var close = html.IndexOf('>', end);
                i = close < 0 ? html.Length : close + 1;
                continue;
            }
            if (!Allowed.TryGetValue(tag, out var names)) continue;
            if (closing)
            {
                var at = open.LastIndexOf(tag);
                if (at < 0) continue;
                for (var k = open.Count - 1; k >= at; k--) output.Append("</").Append(open[k]).Append('>');
                open.RemoveRange(at, open.Count - at);
                continue;
            }
            output.Append('<').Append(tag);
            foreach (var (attr, value) in attributes.Where(a => names.Contains(a.Name)).DistinctBy(a => a.Name))
                if (Clean(tag, attr, value is null ? "" : WebUtility.HtmlDecode(value)) is { } safe)
                    output.Append(' ').Append(attr).Append("=\"").Append(WebUtility.HtmlEncode(safe)).Append('"');
            if (tag == "a") output.Append(" target=\"_blank\" rel=\"noopener noreferrer nofollow\"");
            if (tag == "input") output.Append(" disabled");
            output.Append('>');
            if (!Void.Contains(tag)) open.Add(tag);
        }
        for (var k = open.Count - 1; k >= 0; k--) output.Append("</").Append(open[k]).Append('>');
        return output.ToString();
    }

    /// <summary>Characters as the editor counts them: text only, without markup.</summary>
    public static int TextLength(string? html) => WebUtility.HtmlDecode(Regex.Replace(Sanitize(html), "<[^>]*>", "")).Length;

    private static string? Clean(string tag, string attribute, string value) => attribute switch
    {
        "href" => SafeHref(value),
        "style" => TextAlign().Match(value) is { Success: true } m ? $"text-align: {m.Groups[1].Value.ToLowerInvariant()}" : null,
        "dir" => value.ToLowerInvariant() is "ltr" or "rtl" or "auto" ? value.ToLowerInvariant() : null,
        "start" => int.TryParse(value, NumberStyles.None, CultureInfo.InvariantCulture, out var n) ? n.ToString(CultureInfo.InvariantCulture) : null,
        "data-type" => (tag, value) is ("ul", "taskList") or ("li", "taskItem") ? value : null,
        "data-checked" => value is "true" or "false" ? value : null,
        "type" => value.Equals("checkbox", StringComparison.OrdinalIgnoreCase) ? "checkbox" : null,
        "checked" => "checked",
        "class" => LanguageClass().IsMatch(value) ? value : null,
        _ => null,
    };

    // Same rule as the editor's link form: web, mail and phone links or relative ones. Control characters and
    // whitespace are removed first, as browsers ignore them inside a scheme ("java\tscript:").
    public static string? SafeHref(string value)
    {
        var url = new string(value.Where(c => !char.IsControl(c)).ToArray()).Trim();
        var compact = new string(url.Where(c => !char.IsWhiteSpace(c)).ToArray());
        var colon = compact.IndexOf(':');
        if (colon < 0 || compact.IndexOfAny(['/', '?', '#']) is var first and >= 0 && first < colon) return url.Length == 0 ? null : url;
        return compact[..colon].ToLowerInvariant() is "http" or "https" or "mailto" or "tel" ? url : null;
    }

    private static void Text(StringBuilder output, string text)
    {
        if (text.Length > 0) output.Append(WebUtility.HtmlEncode(WebUtility.HtmlDecode(text)));
    }
}
