using BlazorUI.Cli.Configuration;
using BlazorUI.Cli.Project;
using BlazorUI.Cli.Registry;

namespace BlazorUI.Cli.Commands;

public static class InitCommand
{
    private static readonly (string Source, string TargetName)[] SharedAssets =
    [
        ("styles/tokens.css", "tokens.css"),
        ("styles/themes.css", "themes.css"),
    ];

    public static int Execute(string workingDirectory, TextWriter output, TextWriter error)
    {
        var backup = new FileBackup();

        try
        {
            var project = ProjectContext.Detect(workingDirectory);
            var registry = new EmbeddedRegistry();
            var index = registry.GetIndex();

            output.WriteLine($"Initializing BlazorUI for project '{project.ProjectName}'...");

            var config = BlazorUiConfig.Load(workingDirectory) ?? new BlazorUiConfig
            {
                Framework = "blazor",
                TargetFramework = "net10.0",
                RegistryVersion = index.Version,
                ComponentsPath = "Components/UI",
                StylesPath = "wwwroot/css/blazorui",
                Bootstrap = new BootstrapConfig { Managed = false },
                Theme = new ThemeConfig { Default = "light", DarkMode = true, Rtl = false }
            };

            var lockFile = BlazorUiLock.LoadOrCreate(workingDirectory);
            lockFile.RegistryVersion = index.Version;

            var stylesDir = Path.Combine(workingDirectory, config.StylesPath);

            // 1. Plan shared styles and check for conflicts before writing anything
            var plannedWrites = new List<(string TargetPath, string RelTarget, byte[] Bytes, string Hash)>();

            foreach (var asset in SharedAssets)
            {
                var bytes = registry.GetResourceBytes(asset.Source);
                var hash = EmbeddedRegistry.ComputeSha256(bytes);
                var targetPath = Path.Combine(stylesDir, asset.TargetName);
                var relTarget = Path.GetRelativePath(workingDirectory, targetPath).Replace('\\', '/');

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

            // 4. Save config, then lock last
            backup.Remember(Path.Combine(workingDirectory, BlazorUiConfig.DefaultFileName));
            config.Save(workingDirectory);
            backup.Remember(Path.Combine(workingDirectory, BlazorUiLock.DefaultFileName));
            lockFile.Save(workingDirectory);

            output.WriteLine("BlazorUI initialized successfully.");
            output.WriteLine($"  - Configuration: {BlazorUiConfig.DefaultFileName}");
            output.WriteLine($"  - Shared styles: {config.StylesPath}/");
            output.WriteLine($"  - Host links updated in: {Path.GetRelativePath(workingDirectory, project.AppRazorPath).Replace('\\', '/')}");
            return 0;
        }
        catch (Exception ex)
        {
            error.WriteLine($"Error during init: {ex.Message}");
            backup.Restore();
            return 1;
        }
    }

    private static void UpdateAppRazor(ProjectContext project, FileBackup backup)
    {
        var appContent = File.ReadAllText(project.AppRazorPath);

        // Same @Assets[...] form as the template's own links, so the files get fingerprinted.
        var links = new[]
        {
            (Path: "css/blazorui/tokens.css", Markup: """<link rel="stylesheet" href="@Assets["css/blazorui/tokens.css"]" />"""),
            (Path: "css/blazorui/themes.css", Markup: """<link rel="stylesheet" href="@Assets["css/blazorui/themes.css"]" />"""),
        };

        var missing = links.Where(l => !appContent.Contains(l.Path, StringComparison.OrdinalIgnoreCase)).ToList();
        if (missing.Count == 0)
            return;

        var lines = appContent.Split(["\r\n", "\r", "\n"], StringSplitOptions.None).ToList();
        var insertionIndex = -1;
        string? reference = null;

        // Insert after the Bootstrap link (load order: Bootstrap, tokens, themes, styles bundle)
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
