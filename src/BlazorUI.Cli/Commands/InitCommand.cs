using BlazorUI.Cli.Configuration;
using BlazorUI.Cli.Project;
using BlazorUI.Cli.Registry;

namespace BlazorUI.Cli.Commands;

public static class InitCommand
{
    // The shared theme compiled for Blazor: tokens, appearances, accents, and component styles (ADR 007).
    private static readonly (string Source, string TargetName)[] SharedAssets =
    [
        ("styles/blazorui.css", "blazorui.css"),
    ];

    // Stylesheets from releases before the shared theme; their tokens now come from blazorui.css.
    private static readonly string[] LegacyStylesheets = ["css/blazorui/tokens.css", "css/blazorui/themes.css"];

    // The theme needs Bootstrap 5.3 (data-bs-theme, --bs-btn-* variables). The .NET 8 template ships 5.1,
    // so its unmodified copy is replaced in place with the bundled 5.3 (MIT) (ADR 009).
    private const string Bootstrap51TemplateSha256 = "cfc391e34328c09f0680ae8ff3d63e86224ae7e71c973147ccb84540b2fdd9b8";
    public const string BundledBootstrapSource = "bootstrap/bootstrap.min.css";
    public const string BundledBootstrapSha256 = "d85327d99c7a3ee1f9b5d0500d1370acea3ad2db39c163c2f51f232baedbdede";

    public static int Execute(string workingDirectory, TextWriter output, TextWriter error)
    {
        var backup = new FileBackup();

        try
        {
            var project = ProjectContext.Detect(workingDirectory);
            var registry = new EmbeddedRegistry();
            var index = registry.GetIndex();
            // Read before any write; printed after a successful init.
            var interactivityWarning = CheckInteractiveServer(workingDirectory);

            output.WriteLine($"Initializing BlazorUI for project '{project.ProjectName}'...");

            var config = BlazorUiConfig.Load(workingDirectory) ?? new BlazorUiConfig
            {
                Framework = "blazor",
                TargetFramework = project.TargetFramework,
                RegistryVersion = index.Version,
                ComponentsPath = "Components/UI",
                StylesPath = "wwwroot/css/blazorui",
                Bootstrap = new BootstrapConfig { Managed = false },
                Theme = new ThemeConfig { Default = "light", DarkMode = true, Rtl = false }
            };

            var lockFile = BlazorUiLock.LoadOrCreate(workingDirectory);
            ProjectPath.Validate(workingDirectory, project.AppRazorPath);
            ProjectPath.Validate(workingDirectory, Path.Combine(workingDirectory, BlazorUiConfig.DefaultFileName));
            lockFile.RegistryVersion = index.Version;
            config.RegistryVersion = index.Version;
            config.TargetFramework = project.TargetFramework; // follows a retargeted project

            var stylesDir = Path.Combine(workingDirectory, config.StylesPath);

            // 1. Plan shared styles and check for conflicts before writing anything
            var plannedWrites = new List<(string TargetPath, string RelTarget, byte[] Bytes, string Hash)>();

            foreach (var asset in SharedAssets)
            {
                var bytes = registry.GetResourceBytes(asset.Source);
                var hash = EmbeddedRegistry.ComputeSha256(bytes);
                var targetPath = Path.Combine(stylesDir, asset.TargetName);
                ProjectPath.Validate(workingDirectory, targetPath);
                var relTarget = Path.GetRelativePath(workingDirectory, targetPath).Replace('\\', '/');
                lockFile.EnsureSameSource(relTarget, hash);

                if (File.Exists(targetPath))
                {
                    var existingHash = EmbeddedRegistry.ComputeSha256(File.ReadAllBytes(targetPath));
                    var tracked = lockFile.FindTrackedFile(relTarget);

                    if (tracked == null)
                    {
                        throw new InvalidOperationException(
                            $"File '{relTarget}' already exists and is not managed by BlazorUI. Refusing to overwrite unknown file.");
                    }

                    if (!string.Equals(tracked.InstalledHash, existingHash, StringComparison.OrdinalIgnoreCase))
                    {
                        throw new InvalidOperationException(
                            $"File '{relTarget}' was modified locally. Refusing to overwrite.");
                    }
                }

                plannedWrites.Add((targetPath, relTarget, bytes, hash));
            }

            var bootstrapUpgrade = PlanBootstrap(workingDirectory, project, lockFile, registry);
            if (bootstrapUpgrade != null)
                plannedWrites.Add(bootstrapUpgrade.Value);

            // Starter layout and welcome page replace the unmodified template ones (ADR 008).
            var starter = StarterApp.Prepare(workingDirectory, project.ProjectName, lockFile, registry);

            // 2. Write shared styles
            foreach (var write in plannedWrites)
            {
                backup.Write(write.TargetPath, write.Bytes);
                lockFile.Assets[write.RelTarget] = new LockedFile
                {
                    Target = write.RelTarget,
                    SourceHash = write.Hash,
                    InstalledHash = write.Hash
                };
            }

            // 3. Update App.razor style links
            UpdateAppRazor(project, backup);

            // 4. Starter: write the layout and welcome page, remove template leftovers
            foreach (var write in starter.Writes)
                backup.Write(write.FullPath, write.Bytes);
            foreach (var path in starter.Deletes)
                backup.Delete(path);
            if (starter.Writes.Count > 0)
            {
                var files = lockFile.Components.TryGetValue(StarterApp.ItemName, out var previous)
                    ? previous.Files.ToDictionary(f => f.Target)
                    : [];
                foreach (var write in starter.Writes)
                    files[write.RelativePath] = new LockedFile { Target = write.RelativePath, SourceHash = write.Hash, InstalledHash = write.Hash };
                lockFile.Components[StarterApp.ItemName] = new LockedComponent
                {
                    Version = starter.Manifest.Version,
                    RegistryVersion = ReleaseIdentity.Version,
                    ManifestSha256 = starter.Manifest.ManifestSha256,
                    Files = [.. files.Values.OrderBy(f => f.Target, StringComparer.Ordinal)],
                };
            }

            // 5. Save config, then lock last
            backup.Remember(Path.Combine(workingDirectory, BlazorUiConfig.DefaultFileName));
            config.Save(workingDirectory);
            backup.Remember(Path.Combine(workingDirectory, BlazorUiLock.DefaultFileName));
            lockFile.Save(workingDirectory);

            output.WriteLine("BlazorUI initialized successfully.");
            output.WriteLine($"  - Configuration: {BlazorUiConfig.DefaultFileName}");
            output.WriteLine($"  - Shared styles: {config.StylesPath}/");
            output.WriteLine($"  - Host links updated in: {Path.GetRelativePath(workingDirectory, project.AppRazorPath).Replace('\\', '/')}");
            if (bootstrapUpgrade != null)
                output.WriteLine($"  - Bootstrap 5.3: {bootstrapUpgrade.Value.RelTarget}");
            foreach (var write in starter.Writes)
                output.WriteLine($"  - Starter: {write.RelativePath}");
            foreach (var path in starter.Deletes)
                output.WriteLine($"  - Removed template file: {Path.GetRelativePath(workingDirectory, path).Replace('\\', '/')}");
            foreach (var note in starter.Notes)
                output.WriteLine($"Note: {note}");
            if (interactivityWarning != null)
                output.WriteLine(interactivityWarning);

            var appContent = File.ReadAllText(project.AppRazorPath);
            var legacy = LegacyStylesheets.Where(path => appContent.Contains(path, StringComparison.OrdinalIgnoreCase)).ToList();
            if (legacy.Count > 0)
            {
                output.WriteLine(
                    "Note: Components/App.razor still links stylesheets from an earlier BlazorUI release (" + string.Join(", ", legacy) +
                    "). The shared theme in css/blazorui/blazorui.css replaces them: remove those links and files.");
            }
            return 0;
        }
        catch (Exception ex)
        {
            error.WriteLine($"Error during init: {ex.Message}");
            backup.Restore();
            return 1;
        }
    }

    /// <summary>
    /// Returns a write that upgrades the unmodified .NET 8 template Bootstrap 5.1 to the bundled 5.3,
    /// or refreshes a copy installed by an earlier init. Any other Bootstrap older than 5.3 stops init
    /// with instructions; newer or unrecognized files are left alone.
    /// </summary>
    private static (string TargetPath, string RelTarget, byte[] Bytes, string Hash)? PlanBootstrap(
        string workingDirectory, ProjectContext project, BlazorUiLock lockFile, EmbeddedRegistry registry)
    {
        var path = project.BootstrapCssPath;
        ProjectPath.Validate(workingDirectory, path);
        var relative = Path.GetRelativePath(workingDirectory, path).Replace('\\', '/');
        var current = EmbeddedRegistry.ComputeSha256(File.ReadAllBytes(path));
        var tracked = lockFile.FindTrackedFile(relative);

        if (tracked != null || current == Bootstrap51TemplateSha256)
        {
            var bytes = registry.GetResourceBytes(BundledBootstrapSource);
            var hash = EmbeddedRegistry.ComputeSha256(bytes);
            if (hash != BundledBootstrapSha256)
                throw new InvalidOperationException($"Integrity check failed for '{BundledBootstrapSource}'.");

            if (tracked != null)
            {
                lockFile.EnsureSameSource(relative, hash);
                if (!string.Equals(tracked.InstalledHash, current, StringComparison.OrdinalIgnoreCase))
                    throw new InvalidOperationException($"File '{relative}' was modified locally. Refusing to overwrite.");
            }

            return (path, relative, bytes, hash);
        }

        var header = File.ReadLines(path).Take(5).FirstOrDefault(line => line.Contains("Bootstrap", StringComparison.Ordinal)) ?? "";
        var match = System.Text.RegularExpressions.Regex.Match(header, @"Bootstrap\s+v(\d+)\.(\d+)");
        if (!match.Success)
            return null;

        var version = new Version(int.Parse(match.Groups[1].Value), int.Parse(match.Groups[2].Value));
        if (version < new Version(5, 3))
        {
            throw new InvalidOperationException(
                $"BlazorUI needs Bootstrap 5.3 or later, but '{relative}' is Bootstrap {version}. " +
                "Replace it with Bootstrap 5.3 (https://getbootstrap.com), then run init again.");
        }

        return null;
    }

    /// <summary>
    /// The supported target is Interactive Server (ADR 002). Program.cs is the developer's code,
    /// so init only warns when the two registrations are missing; it never edits the file.
    /// </summary>
    private static string? CheckInteractiveServer(string workingDirectory)
    {
        var programPath = Path.Combine(workingDirectory, "Program.cs");
        ProjectPath.Validate(workingDirectory, programPath);
        if (!File.Exists(programPath))
            return null;

        var program = File.ReadAllText(programPath);
        var missing = new List<string>();
        if (!program.Contains("AddInteractiveServerComponents", StringComparison.Ordinal))
            missing.Add("builder.Services.AddRazorComponents().AddInteractiveServerComponents();");
        if (!program.Contains("AddInteractiveServerRenderMode", StringComparison.Ordinal))
            missing.Add("app.MapRazorComponents<App>().AddInteractiveServerRenderMode();");

        if (missing.Count == 0)
            return null;

        return "Warning: Program.cs does not enable Interactive Server, so components render but do not respond to clicks. " +
               "Create the app with 'dotnet new blazor --interactivity Server', or add:" + Environment.NewLine +
               string.Join(Environment.NewLine, missing.Select(line => "  " + line));
    }

    private static void UpdateAppRazor(ProjectContext project, FileBackup backup)
    {
        var appContent = File.ReadAllText(project.AppRazorPath);

        // Same form as the template's own links: @Assets[...] (fingerprinted) on .NET 9+, a plain URL on .NET 8.
        var links = new[]
        {
            (Path: "css/blazorui/blazorui.css", Markup: project.UsesAssetsDirective
                ? """<link rel="stylesheet" href="@Assets["css/blazorui/blazorui.css"]" />"""
                : """<link rel="stylesheet" href="css/blazorui/blazorui.css" />"""),
        };

        var missing = links.Where(l => !appContent.Contains(l.Path, StringComparison.OrdinalIgnoreCase)).ToList();
        if (missing.Count == 0)
            return;

        var lines = appContent.Split(["\r\n", "\r", "\n"], StringSplitOptions.None).ToList();
        var insertionIndex = -1;
        string? reference = null;

        // Insert after the Bootstrap link (load order: Bootstrap, shared theme, styles bundle)
        for (int i = 0; i < lines.Count; i++)
        {
            if (lines[i].Contains("<link", StringComparison.OrdinalIgnoreCase) &&
                lines[i].Contains("bootstrap", StringComparison.OrdinalIgnoreCase))
            {
                insertionIndex = i + 1;
                reference = lines[i];
                break;
            }
        }

        // Otherwise before the generated {AssemblyName}.styles.css bundle
        if (insertionIndex == -1)
        {
            var bundle = $"{project.AssemblyName}.styles.css";
            for (int i = 0; i < lines.Count; i++)
            {
                if (lines[i].Contains("<link", StringComparison.OrdinalIgnoreCase) &&
                    lines[i].Contains(bundle, StringComparison.OrdinalIgnoreCase))
                {
                    insertionIndex = i;
                    reference = lines[i];
                    break;
                }
            }
        }

        if (insertionIndex == -1)
        {
            throw new InvalidOperationException(
                $"Could not find the Bootstrap or '{project.AssemblyName}.styles.css' link in '{project.AppRazorPath}'. " +
                "Add these links manually after Bootstrap: " + string.Join(" ", links.Select(l => l.Markup)));
        }

        var indent = new string(reference!.TakeWhile(char.IsWhiteSpace).ToArray());
        lines.InsertRange(insertionIndex, missing.Select(l => indent + l.Markup));

        var separator = appContent.Contains("\r\n") ? "\r\n" : "\n";
        backup.WriteText(project.AppRazorPath, string.Join(separator, lines));
    }
}
