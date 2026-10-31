using System.Text.RegularExpressions;

namespace RaxUI.Cli.Commands;

/// <summary>The appearance and accent chosen at init, written as data attributes on the host's &lt;html&gt; tag.</summary>
public static class ThemeChoice
{
    public static readonly string[] Appearances = ["default", "flat", "glass"];

    // "blue" is the unthemed default and writes no attribute.
    public static readonly string[] Accents = ["blue", "emerald", "indigo", "amber"];

    public static string? NormalizeAppearance(string? value) => Normalize(value, Appearances, "appearance");

    public static string? NormalizeAccent(string? value) => Normalize(value, Accents, "accent");

    private static string? Normalize(string? value, string[] allowed, string name)
    {
        if (value == null)
            return null;
        var match = allowed.FirstOrDefault(a => string.Equals(a, value, StringComparison.OrdinalIgnoreCase));
        return match ?? throw new InvalidOperationException($"Unknown {name} '{value}'. Choose one of: {string.Join(", ", allowed)}.");
    }

    /// <summary>Asks for a choice by number or name; Enter keeps the first option. End of input keeps it too.</summary>
    public static string Ask(TextReader input, TextWriter output, string title, string[] options)
    {
        while (true)
        {
            output.WriteLine($"{title}:");
            for (var i = 0; i < options.Length; i++)
                output.WriteLine($"  {i + 1}) {options[i]}{(i == 0 ? " (default)" : "")}");
            output.Write("> ");
            var line = input.ReadLine();
            if (line == null)
                return options[0];
            var answer = line.Trim();
            if (answer.Length == 0)
                return options[0];
            if (int.TryParse(answer, out var number) && number >= 1 && number <= options.Length)
                return options[number - 1];
            var named = options.FirstOrDefault(o => string.Equals(o, answer, StringComparison.OrdinalIgnoreCase));
            if (named != null)
                return named;
            output.WriteLine($"'{answer}' is not an option.");
        }
    }

    /// <summary>Sets or removes one attribute on the first &lt;html&gt; tag; a null value removes it.</summary>
    public static string SetHtmlAttribute(string content, string name, string? value)
    {
        var tag = Regex.Match(content, @"<html\b[^>]*>", RegexOptions.IgnoreCase);
        if (!tag.Success)
            return content;

        var updated = Regex.Replace(tag.Value, @"\s" + Regex.Escape(name) + @"=""[^""]*""", "");
        if (value != null)
            updated = updated.Insert(updated.Length - 1, $" {name}=\"{value}\"");
        return content.Remove(tag.Index, tag.Length).Insert(tag.Index, updated);
    }
}
