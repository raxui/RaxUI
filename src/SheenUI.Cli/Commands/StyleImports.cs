using System.Text;
using SheenUI.Cli.Configuration;
using SheenUI.Cli.Registry;

namespace SheenUI.Cli.Commands;

/// <summary>Plans edits to the leading import list without changing the core (ADR 015).</summary>
public static class StyleImports
{
    public const string Start = "/* sheenui:imports:start */\n";
    public const string End = "/* sheenui:imports:end */\n";

    public static byte[] Append(byte[] current, IEnumerable<string> targets)
    {
        var text = Encoding.UTF8.GetString(current);
        var end = text.IndexOf(End, StringComparison.Ordinal);
        if (!text.StartsWith(Start, StringComparison.Ordinal) || end < Start.Length)
            throw new InvalidOperationException("sheenui.css has no supported import list. Restore the CLI-installed file and retry; keep custom rules in another stylesheet.");
        var list = text[Start.Length..end];
        foreach (var target in targets.Distinct(StringComparer.Ordinal))
        {
            var line = $"@import url(\"{target}\");\n";
            if (!list.Split('\n').Contains(line.TrimEnd('\n'), StringComparer.Ordinal))
                list += line;
        }
        return Encoding.UTF8.GetBytes(Start + list + text[end..]);
    }

    public static void Verify(byte[] current, LockedFile? tracked, byte[] source)
    {
        if (tracked == null || EmbeddedRegistry.ComputeSha256(current) != tracked.InstalledHash)
            throw new InvalidOperationException("sheenui.css was modified locally or is not managed by SheenUI. Restore the CLI-installed file from backup and retry; keep custom rules in another stylesheet and component edits in components/<name>.css.");
        var text = Encoding.UTF8.GetString(current);
        var end = text.IndexOf(End, StringComparison.Ordinal);
        if (!text.StartsWith(Start, StringComparison.Ordinal) || end < Start.Length ||
            Start + text[end..] != Encoding.UTF8.GetString(source))
            throw new InvalidOperationException("sheenui.css core differs from this release. Restore the CLI-installed file and retry; automatic migration is not supported.");
    }

    /// <summary>Replaces the tracked core while keeping its installed import list and adjusting component assets.</summary>
    public static byte[] UpdateCore(byte[] current, LockedFile? tracked, byte[] source,
        IEnumerable<string> additions, IEnumerable<string> removals)
    {
        if (tracked == null || EmbeddedRegistry.ComputeSha256(current) != tracked.InstalledHash)
            throw new InvalidOperationException("sheenui.css was modified locally or is not managed by SheenUI. Merge or restore it before updating; keep custom rules in another stylesheet.");

        var text = Encoding.UTF8.GetString(current);
        var end = text.IndexOf(End, StringComparison.Ordinal);
        var next = Encoding.UTF8.GetString(source);
        if (!text.StartsWith(Start, StringComparison.Ordinal) || end < Start.Length ||
            !next.StartsWith(Start + End, StringComparison.Ordinal))
            throw new InvalidOperationException("sheenui.css has no supported import list. A manual migration is required.");

        var removedLines = removals.Select(target => $"@import url(\"{target}\");").ToHashSet(StringComparer.Ordinal);
        var lines = text[Start.Length..end].Split('\n')
            .Where(line => line.Length > 0 && !removedLines.Contains(line));
        var list = string.Concat(lines.Select(line => line + "\n"));
        return Append(Encoding.UTF8.GetBytes(Start + list + next[Start.Length..]), additions);
    }
}
