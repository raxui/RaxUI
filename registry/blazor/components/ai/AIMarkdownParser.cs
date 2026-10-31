// Source-owned GFM subset for AIResponse (#121). It builds a node tree only; Razor encodes all text, so raw HTML is never emitted.
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
namespace RaxUI.Internal.AI;

internal abstract record MdNode;
internal sealed record MdText(string Value) : MdNode;
internal sealed record MdCode(string Value) : MdNode;
internal sealed record MdBreak : MdNode;
internal sealed record MdSpan(string Tag, IReadOnlyList<MdNode> Children) : MdNode;
internal sealed record MdLink(string Url, IReadOnlyList<MdNode> Children) : MdNode;
internal sealed record MdHeading(int Level, IReadOnlyList<MdNode> Children) : MdNode;
internal sealed record MdParagraph(IReadOnlyList<MdNode> Children) : MdNode;
internal sealed record MdFence(string? Language, string Code) : MdNode;
internal sealed record MdQuote(IReadOnlyList<MdNode> Blocks) : MdNode;
internal sealed record MdRule : MdNode;
internal sealed record MdItem(IReadOnlyList<MdNode> Blocks, bool? Checked) : MdNode;
internal sealed record MdList(bool Ordered, int Start, bool Tight, IReadOnlyList<MdItem> Items) : MdNode;
internal sealed record MdTable(IReadOnlyList<string?> Align, IReadOnlyList<IReadOnlyList<MdNode>> Head, IReadOnlyList<IReadOnlyList<IReadOnlyList<MdNode>>> Rows) : MdNode;

internal static partial class AIMarkdownParser
{
    [GeneratedRegex(@"^ {0,3}(`{3,}|~{3,})\s*([\w+#.-]*)")] private static partial Regex FenceOpen();
    [GeneratedRegex(@"^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$")] private static partial Regex Heading();
    [GeneratedRegex(@"^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$")] private static partial Regex Rule();
    [GeneratedRegex(@"^( {0,3})([-*+]|\d{1,9}[.)])([ \t]+|$)")] private static partial Regex ListMarker();
    [GeneratedRegex(@"^\|?[ \t]*:?-+:?[ \t]*(\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$")] private static partial Regex Delimiter();
    [GeneratedRegex(@"^\[([ xX])\][ \t]+")] private static partial Regex Task();
    [GeneratedRegex(@"`[^`]*`")] private static partial Regex CodeSpan();

    public static IReadOnlyList<MdNode> Parse(string? text) => Blocks((text ?? "").Replace("\r\n", "\n").Replace('\r', '\n').Split('\n'));

    /// <summary>Port of React closeOpenMarks: closes a dangling code span, ** or ~~ in partial streamed text.</summary>
    public static string CloseOpenMarks(string text)
    {
        var fences = text.Split("```");
        if (fences.Length % 2 == 0) return text;
        var tail = fences[^1]; var closing = "";
        if (tail.Count(c => c == '`') % 2 == 1) closing += "`";
        var outside = CodeSpan().Replace(tail, "");
        if (Regex.Matches(outside, @"\*\*").Count % 2 == 1) closing += "**";
        if (Regex.Matches(outside, "~~").Count % 2 == 1) closing += "~~";
        return text + closing;
    }

    private static bool Blank(string line) => line.Trim().Length == 0;
    private static int Indent(string line) { var n = 0; foreach (var c in line) { if (c == ' ') n++; else if (c == '\t') n += 4 - n % 4; else break; } return n; }
    private static string Dedent(string line, int width)
    {
        var n = 0; var i = 0;
        while (i < line.Length && n < width && (line[i] == ' ' || line[i] == '\t')) { n += line[i] == '\t' ? 4 - n % 4 : 1; i++; }
        return line[i..];
    }
    private static bool StartsBlock(string line) =>
        FenceOpen().IsMatch(line) || Heading().IsMatch(line) || Rule().IsMatch(line) || line.TrimStart().StartsWith('>') || ListMarker().IsMatch(line);

    private static List<MdNode> Blocks(IReadOnlyList<string> lines)
    {
        var result = new List<MdNode>(); var i = 0;
        while (i < lines.Count)
        {
            var line = lines[i];
            if (Blank(line)) { i++; continue; }
            if (FenceOpen().Match(line) is { Success: true } fence)
            {
                var marker = fence.Groups[1].Value; var indent = Indent(line); var code = new List<string>(); i++;
                bool Closes(string l) { var t = l.Trim(); return Indent(l) <= 3 && t.Length >= marker.Length && t.All(ch => ch == marker[0]); }
                while (i < lines.Count && !Closes(lines[i])) code.Add(Dedent(lines[i++], indent));
                i++;
                result.Add(new MdFence(fence.Groups[2].Value is { Length: > 0 } language ? language : null, string.Join('\n', code)));
                continue;
            }
            if (Heading().Match(line) is { Success: true } heading) { result.Add(new MdHeading(heading.Groups[1].Length, Inlines(heading.Groups[2].Value))); i++; continue; }
            if (Rule().IsMatch(line)) { result.Add(new MdRule()); i++; continue; }
            if (line.TrimStart().StartsWith('>'))
            {
                var quoted = new List<string>();
                while (i < lines.Count && !Blank(lines[i]) && (lines[i].TrimStart().StartsWith('>') || !StartsBlock(lines[i])))
                {
                    var t = lines[i].TrimStart(); quoted.Add(t.StartsWith('>') ? (t.Length > 1 && t[1] == ' ' ? t[2..] : t[1..]) : t); i++;
                }
                result.Add(new MdQuote(Blocks(quoted)));
                continue;
            }
            if (ListMarker().IsMatch(line)) { result.Add(List(lines, ref i)); continue; }
            if (line.Contains('|') && i + 1 < lines.Count && Delimiter().IsMatch(lines[i + 1]) && Cells(line).Count == Cells(lines[i + 1]).Count) { result.Add(Table(lines, ref i)); continue; }
            var paragraph = new List<string>();
            while (i < lines.Count && !Blank(lines[i]) && (paragraph.Count == 0 || !StartsBlock(lines[i]))) paragraph.Add(lines[i++]);
            result.Add(new MdParagraph(Inlines(string.Join('\n', paragraph.Select(l => l.TrimStart())))));
        }
        return result;
    }

    private static MdList List(IReadOnlyList<string> lines, ref int i)
    {
        var first = ListMarker().Match(lines[i]); var ordered = char.IsDigit(first.Groups[2].Value[0]);
        var bullet = first.Groups[2].Value[^1]; var start = ordered ? int.Parse(first.Groups[2].Value[..^1]) : 1;
        var items = new List<MdItem>(); var tight = true;
        while (i < lines.Count)
        {
            var m = ListMarker().Match(lines[i]);
            if (!m.Success || char.IsDigit(m.Groups[2].Value[0]) != ordered || m.Groups[2].Value[^1] != bullet) break;
            var width = m.Groups[1].Length + m.Groups[2].Length + Math.Max(1, Math.Min(4, m.Groups[3].Value.Length));
            var body = new List<string> { lines[i][m.Length..] }; i++;
            while (i < lines.Count)
            {
                if (Blank(lines[i]))
                {
                    var next = i + 1 < lines.Count ? lines[i + 1] : null;
                    if (next is null || Blank(next) || Indent(next) < width) { if (next is not null && ListMarker().IsMatch(next) && Indent(next) < width) tight = false; break; }
                    body.Add(""); tight = false; i++; continue;
                }
                if (Indent(lines[i]) >= width) { body.Add(Dedent(lines[i], width)); i++; continue; }
                if (StartsBlock(lines[i])) break;
                body.Add(lines[i].TrimStart()); i++; // lazy paragraph continuation
            }
            if (i < lines.Count && Blank(lines[i])) i++;
            bool? check = null; var task = Task().Match(body[0]);
            if (task.Success) { check = task.Groups[1].Value != " "; body[0] = body[0][task.Length..]; }
            items.Add(new MdItem(Blocks(body), check));
        }
        return new MdList(ordered, start, tight, items);
    }

    private static List<string> Cells(string line)
    {
        var t = line.Trim(); if (t.StartsWith('|')) t = t[1..]; if (t.EndsWith('|') && !t.EndsWith("\\|")) t = t[..^1];
        var cells = new List<string>(); var cell = new StringBuilder(); var code = false;
        for (var k = 0; k < t.Length; k++)
        {
            if (t[k] == '\\' && k + 1 < t.Length && t[k + 1] == '|') { cell.Append('|'); k++; continue; }
            if (t[k] == '`') code = !code;
            if (t[k] == '|' && !code) { cells.Add(cell.ToString().Trim()); cell.Clear(); continue; }
            cell.Append(t[k]);
        }
        cells.Add(cell.ToString().Trim());
        return cells;
    }

    private static MdTable Table(IReadOnlyList<string> lines, ref int i)
    {
        var head = Cells(lines[i]);
        var align = Cells(lines[i + 1]).Select(c => c.StartsWith(':') && c.EndsWith(':') ? "center" : c.EndsWith(':') ? "right" : c.StartsWith(':') ? "left" : null).ToList();
        i += 2; var rows = new List<IReadOnlyList<IReadOnlyList<MdNode>>>();
        while (i < lines.Count && !Blank(lines[i]) && lines[i].Contains('|') && !StartsBlock(lines[i]))
        {
            var cells = Cells(lines[i++]);
            rows.Add(Enumerable.Range(0, head.Count).Select(c => (IReadOnlyList<MdNode>)Inlines(c < cells.Count ? cells[c] : "")).ToList());
        }
        return new MdTable(align, head.Select(c => (IReadOnlyList<MdNode>)Inlines(c)).ToList(), rows);
    }

    // React's urlTransform allows these protocols and relative URLs; anything else keeps its text without a link.
    public static string? SafeUrl(string url)
    {
        url = url.Trim();
        var colon = url.IndexOf(':');
        if (colon < 0 || url.IndexOfAny(['/', '?', '#']) is var slash and >= 0 && slash < colon) return url;
        var scheme = url[..colon].ToLowerInvariant();
        return scheme is "http" or "https" or "mailto" ? url : null;
    }

    private const string Punctuation = "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~";

    public static List<MdNode> Inlines(string text)
    {
        var nodes = new List<MdNode>(); var plain = new StringBuilder(); var i = 0;
        void Flush() { if (plain.Length > 0) { nodes.Add(new MdText(plain.ToString())); plain.Clear(); } }
        while (i < text.Length)
        {
            var c = text[i];
            if (c == '\\' && i + 1 < text.Length)
            {
                if (text[i + 1] == '\n') { Flush(); nodes.Add(new MdBreak()); i += 2; continue; }
                if (Punctuation.Contains(text[i + 1])) { plain.Append(text[i + 1]); i += 2; continue; }
            }
            if (c == '\n')
            {
                var hard = plain.Length >= 2 && plain[^1] == ' ' && plain[^2] == ' ';
                while (plain.Length > 0 && plain[^1] == ' ') plain.Length--;
                if (hard) { Flush(); nodes.Add(new MdBreak()); } else plain.Append('\n');
                i++; continue;
            }
            if (c == '`')
            {
                var run = 0; while (i + run < text.Length && text[i + run] == '`') run++;
                var fence = new string('`', run); var end = IndexOfRun(text, fence, i + run);
                if (end >= 0)
                {
                    Flush(); var code = text[(i + run)..end].Replace('\n', ' ');
                    if (code.Length > 2 && code[0] == ' ' && code[^1] == ' ' && code.Trim().Length > 0) code = code[1..^1];
                    nodes.Add(new MdCode(code)); i = end + run; continue;
                }
                plain.Append(fence); i += run; continue;
            }
            if (c == '!' && i + 1 < text.Length && text[i + 1] == '[' && TryLink(text, i + 1, out var imgEnd, out var alt, out var src))
            {
                // Images render as links so model output can't load remote resources.
                Flush(); var safe = SafeUrl(src); var children = Inlines(alt.Length > 0 ? alt : src);
                nodes.Add(safe is null ? new MdSpan("", children) : new MdLink(safe, children)); i = imgEnd; continue;
            }
            if (c == '[' && TryLink(text, i, out var linkEnd, out var label, out var href))
            {
                Flush(); var safe = SafeUrl(href); var children = Inlines(label);
                nodes.Add(safe is null ? new MdSpan("", children) : new MdLink(safe, children)); i = linkEnd; continue;
            }
            if (c == '<' && text.IndexOf('>', i) is var close and > 0 && Regex.IsMatch(text[(i + 1)..close], @"^(https?://|mailto:)[^\s<>]+$", RegexOptions.IgnoreCase))
            {
                Flush(); var url = text[(i + 1)..close]; nodes.Add(new MdLink(url, [new MdText(url.StartsWith("mailto:", StringComparison.OrdinalIgnoreCase) ? url[7..] : url)])); i = close + 1; continue;
            }
            if ((c == 'h' || c == 'w') && (i == 0 || !char.IsLetterOrDigit(text[i - 1])) && Regex.Match(text[i..], @"^(?:https?://|www\.)[^\s<]+", RegexOptions.IgnoreCase) is { Success: true } auto)
            {
                var url = auto.Value.TrimEnd('.', ',', ':', ';', '!', '?', '"', '\'', '*', '_', '~');
                while (url.EndsWith(')') && url.Count(ch => ch == ')') > url.Count(ch => ch == '(')) url = url[..^1];
                Flush(); nodes.Add(new MdLink(url.StartsWith("www.", StringComparison.OrdinalIgnoreCase) ? "http://" + url : url, [new MdText(url)])); i += url.Length; continue;
            }
            if (c is '*' or '_' or '~')
            {
                var run = 0; while (i + run < text.Length && text[i + run] == c) run++;
                var size = c == '~' ? (run >= 2 ? 2 : 0) : Math.Min(run, 2);
                // Intraword underscores are literal, as in GFM.
                var intraword = c == '_' && i > 0 && char.IsLetterOrDigit(text[i - 1]);
                if (size > 0 && !intraword && i + run < text.Length && !char.IsWhiteSpace(text[i + run]))
                {
                    var marker = new string(c, size); var end = FindClose(text, marker, i + size);
                    if (end > i + size)
                    {
                        Flush(); var tag = c == '~' ? "del" : size == 2 ? "strong" : "em";
                        nodes.Add(new MdSpan(tag, Inlines(text[(i + size)..end]))); i = end + size; continue;
                    }
                }
                plain.Append(c, run); i += run; continue;
            }
            plain.Append(c); i++;
        }
        Flush();
        return nodes;
    }

    private static int IndexOfRun(string text, string fence, int from)
    {
        for (var k = text.IndexOf(fence, from, StringComparison.Ordinal); k >= 0; k = text.IndexOf(fence, k + 1, StringComparison.Ordinal))
            if ((k + fence.Length == text.Length || text[k + fence.Length] != '`') && (k == 0 || text[k - 1] != '`')) return k;
        return -1;
    }

    // The next closing marker that follows non-space text, skipping code spans and escapes.
    private static int FindClose(string text, string marker, int from)
    {
        for (var k = from; k < text.Length; k++)
        {
            if (text[k] == '\\') { k++; continue; }
            if (text[k] == '`') { var run = 0; while (k + run < text.Length && text[k + run] == '`') run++; var end = IndexOfRun(text, new string('`', run), k + run); if (end >= 0) { k = end + run - 1; continue; } k += run - 1; continue; }
            if (string.CompareOrdinal(text, k, marker, 0, marker.Length) != 0 || char.IsWhiteSpace(text[k - 1])) continue;
            var after = k + marker.Length;
            if (after < text.Length && text[after] == marker[0]) { if (marker.Length == 1) { var run = 0; while (after + run < text.Length && text[after + run] == marker[0]) run++; k = after + run - 1; } continue; }
            if (marker[0] == '_' && after < text.Length && char.IsLetterOrDigit(text[after])) continue;
            return k;
        }
        return -1;
    }

    private static bool TryLink(string text, int open, out int end, out string label, out string url)
    {
        end = 0; label = url = "";
        var depth = 0; var k = open;
        for (; k < text.Length; k++)
        {
            if (text[k] == '\\') { k++; continue; }
            if (text[k] == '[') depth++;
            else if (text[k] == ']' && --depth == 0) break;
        }
        if (k >= text.Length - 1 || text[k + 1] != '(') return false;
        var close = k + 2; var parens = 0;
        for (; close < text.Length; close++)
        {
            if (text[close] == '(') parens++;
            else if (text[close] == ')' && parens-- == 0) break;
            else if (text[close] == '\n') return false;
        }
        if (close >= text.Length) return false;
        label = text[(open + 1)..k];
        var target = text[(k + 2)..close].Trim();
        var title = Regex.Match(target, "^(\\S+)\\s+(\"[^\"]*\"|'[^']*')$");
        url = (title.Success ? title.Groups[1].Value : target).Trim('<', '>');
        end = close + 1;
        return true;
    }
}
