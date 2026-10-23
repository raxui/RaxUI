using System.Text;
using BlazorUI.Cli.Configuration;
using BlazorUI.Cli.Project;
using BlazorUI.Cli.Registry;

namespace BlazorUI.Cli.Commands;

/// <summary>
/// Replaces the unmodified <c>dotnet new blazor</c> layout and sample pages with the BlazorUI starter
/// layout and welcome page (ADR 008). A template file is replaced or removed only when its content is
/// byte-for-byte a known template version; anything the developer changed is kept and reported.
/// </summary>
public static class StarterApp
{
    public const string ItemName = "starter";
    private const string MainLayout = "Components/Layout/MainLayout.razor";

    // SHA-256 of .NET 10 template files (--interactivity Server and None; Visual Studio produces the
    // same files), with line endings normalized to LF and the project name replaced by {{name}}.
    private static readonly Dictionary<string, string[]> TemplateHashes = new()
    {
        [MainLayout] =
        [
            "ed2aed0b7f089fac8e1659a7ed564e6b21bec2017213e9ce1e886a1b71876e43",
            "2bfd79b3ad587751d051086952d16945ad08d88f045a7a53d27f0fff2c5fe707",
        ],
        ["Components/Layout/MainLayout.razor.css"] = ["212b70f685a4fd2639fbd7a5d1151c4feb1e61f86987635b83affaca12bd45af"],
        ["Components/Layout/NavMenu.razor"] =
        [
            "62020a244945aae64b3849214800365819c0ae5e24877694fad62976da3c6a6f",
            "259b22b05a7d87c5574c00ed734d35e0630629ccaf63f07d9863fd1336b0bfe8",
        ],
        ["Components/Layout/NavMenu.razor.css"] = ["efc5d4330245bade87901de30202741ea7220c5b4721f190dba084a898765a16"],
        ["Components/Pages/Home.razor"] = ["597102dd1b63515a15ec00e0eeee502623194e8403a94088e85b0648a6d622f7"],
        ["Components/Pages/Counter.razor"] = ["3a00d5a97c3264266bb33584e0252b6b3d726b2f72c0b62140e9f9c6c5473475"],
        ["Components/Pages/Weather.razor"] = ["377c0117b2bf4937f87e58aa4a06d3d81c10097289ed30184e34958e3bdc67f1"],
    };

    // Only reachable through the template layout, so they go once that layout is replaced.
    private static readonly string[] TemplateLeftovers =
    [
        "Components/Layout/MainLayout.razor.css",
        "Components/Layout/NavMenu.razor",
        "Components/Layout/NavMenu.razor.css",
        "Components/Pages/Counter.razor",
        "Components/Pages/Weather.razor",
    ];

    public sealed record Write(string FullPath, string RelativePath, byte[] Bytes, string Hash);

    public sealed record Plan(ComponentManifest Manifest, List<Write> Writes, List<string> Deletes, List<string> Notes);

    public static Plan Prepare(string workingDirectory, string projectName, BlazorUiLock lockFile, EmbeddedRegistry registry)
    {
        bool IsTemplate(string fullPath, string relative) => IsTemplateFile(fullPath, relative, projectName);

        var manifest = registry.GetStarterManifest();
        var writes = new List<Write>();
        var deletes = new List<string>();
        var notes = new List<string>();

        foreach (var file in manifest.Files)
        {
            var relative = $"Components/{file.Target}";
            var fullPath = Resolve(workingDirectory, relative);
            var bytes = registry.GetResourceBytes($"{manifest.SourceDirectory}/{file.Source}");
            var hash = EmbeddedRegistry.ComputeSha256(bytes);
            var tracked = lockFile.FindTrackedFile(relative);

            if (tracked != null)
            {
                // Installed by an earlier init: refresh only an unchanged copy from this release.
                if (!string.Equals(tracked.SourceHash, hash, StringComparison.OrdinalIgnoreCase))
                    notes.Add($"Kept {relative} from an earlier BlazorUI release.");
                else if (File.Exists(fullPath) && Hash(fullPath) == tracked.InstalledHash)
                    writes.Add(new Write(fullPath, relative, bytes, hash));
            }
            else if (IsTemplate(fullPath, relative))
            {
                writes.Add(new Write(fullPath, relative, bytes, hash));
            }
            else if (File.Exists(fullPath))
            {
                notes.Add($"Kept your {relative} (it differs from the Blazor template), so the BlazorUI version was not installed.");
            }
        }

        var layoutIsOurs = writes.Any(w => w.RelativePath == MainLayout) || lockFile.FindTrackedFile(MainLayout) != null;
        if (layoutIsOurs)
        {
            foreach (var relative in TemplateLeftovers)
            {
                var fullPath = Resolve(workingDirectory, relative);
                if (IsTemplate(fullPath, relative))
                    deletes.Add(fullPath);
                else if (File.Exists(fullPath))
                    notes.Add($"Kept your {relative} (it differs from the Blazor template); remove it if you no longer need it.");
            }
        }

        return new Plan(manifest, writes, deletes, notes);
    }

    private static string Resolve(string workingDirectory, string relative)
    {
        var fullPath = Path.Combine(workingDirectory, relative);
        ProjectPath.Validate(workingDirectory, fullPath);
        return fullPath;
    }

    private static bool IsTemplateFile(string fullPath, string relative, string projectName)
    {
        if (!File.Exists(fullPath))
            return false;
        // The template writes the project name into NavMenu's brand link.
        var text = File.ReadAllText(fullPath).Replace("\r\n", "\n").Replace(projectName, "{{name}}");
        return TemplateHashes[relative].Contains(EmbeddedRegistry.ComputeSha256(Encoding.UTF8.GetBytes(text)));
    }

    private static string Hash(string fullPath) => EmbeddedRegistry.ComputeSha256(File.ReadAllBytes(fullPath));
}
