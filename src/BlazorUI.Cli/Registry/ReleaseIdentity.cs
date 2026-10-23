using System.Reflection;

namespace BlazorUI.Cli.Registry;

public static class ReleaseIdentity
{
    public static string Version { get; } = typeof(ReleaseIdentity).Assembly
        .GetCustomAttributes<AssemblyMetadataAttribute>()
        .Single(a => a.Key == "RegistryVersion").Value!;

    /// <summary>
    /// Accepts files written by this or an older CLI; rejects files from a newer CLI,
    /// whose content this release cannot know about.
    /// </summary>
    public static void EnsureSupported(string recordedVersion, string fileName)
    {
        if (Compare(recordedVersion, Version) > 0)
        {
            throw new InvalidOperationException(
                $"'{fileName}' was written by BlazorUI {recordedVersion}, which is newer than this CLI ({Version}). " +
                $"Install BlazorUI.Cli {recordedVersion} or later.");
        }
    }

    /// <summary>Semantic Version 2.0 precedence: build metadata ignored, prerelease below release.</summary>
    public static int Compare(string a, string b)
    {
        var (coreA, preA) = Parse(a);
        var (coreB, preB) = Parse(b);

        var result = coreA.CompareTo(coreB);
        if (result != 0)
            return result;

        if (preA.Length == 0 || preB.Length == 0)
            return preB.Length.CompareTo(preA.Length);

        for (var i = 0; i < Math.Min(preA.Length, preB.Length); i++)
        {
            var numericA = int.TryParse(preA[i], out var numberA);
            var numericB = int.TryParse(preB[i], out var numberB);

            result = (numericA, numericB) switch
            {
                (true, true) => numberA.CompareTo(numberB),
                (true, false) => -1,
                (false, true) => 1,
                _ => string.CompareOrdinal(preA[i], preB[i]),
            };

            if (result != 0)
                return Math.Sign(result);
        }

        return preA.Length.CompareTo(preB.Length);
    }

    private static (System.Version Core, string[] Prerelease) Parse(string version)
    {
        var text = version.Split('+')[0];
        var dash = text.IndexOf('-');
        var core = dash >= 0 ? text[..dash] : text;

        if (core.Count(c => c == '.') != 2 || !System.Version.TryParse(core, out var parsed))
            throw new InvalidOperationException($"Invalid version '{version}'.");

        return (parsed, dash >= 0 ? text[(dash + 1)..].Split('.') : []);
    }
}
