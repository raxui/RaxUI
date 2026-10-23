using System.Text;
using SheenUI.Cli.Configuration;
using SheenUI.Cli.Project;
using SheenUI.Cli.Registry;

namespace SheenUI.Cli.Commands;

/// <summary>
/// Replaces the unmodified <c>dotnet new blazor</c> layout and sample pages with the SheenUI starter
/// layout and welcome page (ADR 008). A template file is replaced or removed only when its content is
/// byte-for-byte a known template version; anything the developer changed is kept and reported.
/// </summary>
public static class StarterApp
{
    public const string ItemName = "starter";
    private const string MainLayout = "Components/Layout/MainLayout.razor";

    // SHA-256 of .NET 8, 9, and 10 template files (--interactivity Server and None; the SDK of each
    // version and Visual Studio produce the same files), with line endings normalized to LF and the
    // project name replaced by {{name}}.
    private static readonly Dictionary<string, string[]> TemplateHashes = new()
    {
        [MainLayout] =
        [
            "ed2aed0b7f089fac8e1659a7ed564e6b21bec2017213e9ce1e886a1b71876e43", // 9, 10 Server
            "2bfd79b3ad587751d051086952d16945ad08d88f045a7a53d27f0fff2c5fe707", // 8, 9, 10 None
            "5ea33a836decaa39d06b9386bbdd71ca2ba58b46091f461b4a66c481562482b6", // 8 Server
        ],
        ["Components/Layout/MainLayout.razor.css"] =
        [
            "212b70f685a4fd2639fbd7a5d1151c4feb1e61f86987635b83affaca12bd45af", // 9, 10
            "d30709b08e4a01978d8f98edb4519cf3c6a8a98e1f3944df9943b8f4441c5feb", // 8
        ],
        ["Components/Layout/NavMenu.razor"] =
        [
            "62020a244945aae64b3849214800365819c0ae5e24877694fad62976da3c6a6f", // 9, 10 Server
            "259b22b05a7d87c5574c00ed734d35e0630629ccaf63f07d9863fd1336b0bfe8", // 9, 10 None
            "65acf429c1ef9c7b31cdf430994db0a52ef46be5226555fd346713540d17e3e0", // 8 Server
            "36248157843753b412e71d5b461f19e324d6481b486b764b1f96bf3f7a8d7317", // 8 None
        ],
        ["Components/Layout/NavMenu.razor.css"] =
        [
            "efc5d4330245bade87901de30202741ea7220c5b4721f190dba084a898765a16", // 9, 10
            "f90d08c634c75f35354979b665a18f8ea34697a237eb603270d6573be4d92d1e", // 8
        ],
        ["Components/Pages/Home.razor"] = ["597102dd1b63515a15ec00e0eeee502623194e8403a94088e85b0648a6d622f7"],
        ["Components/Pages/Counter.razor"] = ["3a00d5a97c3264266bb33584e0252b6b3d726b2f72c0b62140e9f9c6c5473475"],
        // Replaced with a minimal app.css: the template's version overrides Bootstrap buttons, links, fonts,
        // and focus rings, which conflicts with the theme.
        ["wwwroot/app.css"] =
        [
            "3cdbc4c8048bf7ad2aa569952793eeaf36ebd05e21a1d427bbebbf5e4287b84d", // 9, 10
            "43cb223fd4a2655f0634ece59071136a963a47f5eb8506c4f746809e51e61c5a", // 8
        ],
        ["Components/Pages/Weather.razor"] =
        [
            "377c0117b2bf4937f87e58aa4a06d3d81c10097289ed30184e34958e3bdc67f1", // 10
            "b3d7d04fb7b686256f8774a44cd23da3fc171121556ce8d7344b86b80c24fc44", // 9
            "eebad1032d22b558c64f341ced2d30a5278e696bd7b768b3980fe7a8562f096c", // 8
        ],
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

    public static Plan Prepare(string workingDirectory, string projectName, SheenUiLock lockFile, EmbeddedRegistry registry)
    {
        bool IsTemplate(string fullPath, string relative) => IsTemplateFile(fullPath, relative, projectName);

        var manifest = registry.GetStarterManifest();
        var writes = new List<Write>();
        var deletes = new List<string>();
        var notes = new List<string>();

        foreach (var file in manifest.Files)
        {
            var relative = file.Destination == "wwwroot" ? $"wwwroot/{file.Target}" : $"Components/{file.Target}";
            var fullPath = Resolve(workingDirectory, relative);
            var bytes = registry.GetResourceBytes($"{manifest.SourceDirectory}/{file.Source}");
            var hash = EmbeddedRegistry.ComputeSha256(bytes);
            var tracked = lockFile.FindTrackedFile(relative);

            if (tracked != null)
            {
                // Installed by an earlier init: refresh only an unchanged copy from this release.
                if (!string.Equals(tracked.SourceHash, hash, StringComparison.OrdinalIgnoreCase))
                    notes.Add($"Kept {relative} from an earlier SheenUI release.");
                else if (File.Exists(fullPath) && Hash(fullPath) == tracked.InstalledHash)
                    writes.Add(new Write(fullPath, relative, bytes, hash));
            }
            else if (IsTemplate(fullPath, relative))
            {
                writes.Add(new Write(fullPath, relative, bytes, hash));
            }
            else if (File.Exists(fullPath))
            {
                notes.Add($"Kept your {relative} (it differs from the Blazor template), so the SheenUI version was not installed.");
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
