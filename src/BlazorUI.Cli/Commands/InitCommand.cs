using System.Text.RegularExpressions;
using BlazorUI.Cli.Configuration;
using BlazorUI.Cli.Project;
using BlazorUI.Cli.Registry;

namespace BlazorUI.Cli.Commands;

public static class InitCommand
{
    public static int Execute(string workingDirectory, TextWriter output, TextWriter error)
    {
        var backupFiles = new Dictionary<string, string?>(); // path -> originalContent (null if newly created)

        try
        {
            var project = ProjectContext.Detect(workingDirectory);
            var registry = new EmbeddedRegistry();
            var index = registry.GetIndex();

            output.WriteLine($"Initializing BlazorUI for project '{project.ProjectName}'...");

            // 1. Config
            var configPath = Path.Combine(workingDirectory, BlazorUiConfig.DefaultFileName);
            var isNewConfig = !File.Exists(configPath);
            var config = BlazorUiConfig.Load(workingDirectory) ?? new BlazorUiConfig
            {
                Framework = "blazor",
                TargetFramework = "net10.0",
                RegistryVersion = index.Version,
                ComponentsPath = "Components/UI",
                ComponentsNamespace = $"{project.RootNamespace}.Components.UI",
                StylesPath = "wwwroot/css/blazorui",
                Bootstrap = new BootstrapConfig { Managed = false },
                Theme = new ThemeConfig { Default = "light", DarkMode = true, Rtl = false }
            };

            if (isNewConfig)
                backupFiles[configPath] = null;

            // 2. Lock
            var lockPath = Path.Combine(workingDirectory, BlazorUiLock.DefaultFileName);
            if (!File.Exists(lockPath))
                backupFiles[lockPath] = null;
            var lockFile = BlazorUiLock.LoadOrCreate(workingDirectory);
            lockFile.RegistryVersion = index.Version;

            // 3. Shared styles (tokens.css, themes.css)
            var stylesDir = Path.Combine(workingDirectory, config.StylesPath);
            Directory.CreateDirectory(stylesDir);

            var sharedAssets = new[]
            {
                (Source: "styles/tokens.css", TargetName: "tokens.css"),
                (Source: "styles/themes.css", TargetName: "themes.css")
            };

            foreach (var asset in sharedAssets)
            {
                var bytes = registry.GetResourceBytes(asset.Source);
                var hash = EmbeddedRegistry.ComputeSha256(bytes);

                var targetPath = Path.Combine(stylesDir, asset.TargetName);
                var relTarget = Path.GetRelativePath(workingDirectory, targetPath).Replace('\\', '/');

                if (File.Exists(targetPath))
                {
                    var existingBytes = File.ReadAllBytes(targetPath);
                    var existingHash = EmbeddedRegistry.ComputeSha256(existingBytes);
                    var tracked = lockFile.FindTrackedFile(relTarget);

                    if (tracked != null && !string.Equals(tracked.InstalledHash, existingHash, StringComparison.OrdinalIgnoreCase))
                    {
                        throw new InvalidOperationException(
                            $"File '{relTarget}' was modified locally. Refusing to overwrite.");
                    }
                    backupFiles[targetPath] = File.ReadAllText(targetPath);
                }
                else
                {
                    backupFiles[targetPath] = null;
                }

                File.WriteAllBytes(targetPath, bytes);

                lockFile.Assets[relTarget] = new LockedFile
                {
                    Target = relTarget,
                    SourceHash = hash,
                    InstalledHash = hash
                };
            }

            // 4. Update App.razor style links
            UpdateAppRazor(project, backupFiles);

            // 5. Save config and lock
            config.Save(workingDirectory);
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

            // Rollback
            foreach (var kvp in backupFiles)
            {
                try
                {
                    if (kvp.Value == null)
                    {
                        if (File.Exists(kvp.Key))
                            File.Delete(kvp.Key);
                    }
                    else
                    {
                        File.WriteAllText(kvp.Key, kvp.Value);
                    }
                }
                catch
                {
                    // Ignore secondary rollback failures
                }
            }

            return 1;
        }
    }

    private static void UpdateAppRazor(ProjectContext project, Dictionary<string, string?> backupFiles)
    {
        var appContent = File.ReadAllText(project.AppRazorPath);
        if (!backupFiles.ContainsKey(project.AppRazorPath))
            backupFiles[project.AppRazorPath] = appContent;

        var tokensLink = """<link rel="stylesheet" href="css/blazorui/tokens.css" />""";
        var themesLink = """<link rel="stylesheet" href="css/blazorui/themes.css" />""";

        // Check if already contains blazorui styles
        if (appContent.Contains("css/blazorui/tokens.css", StringComparison.OrdinalIgnoreCase) &&
            appContent.Contains("css/blazorui/themes.css", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        var lines = appContent.Split(["\r\n", "\r", "\n"], StringSplitOptions.None).ToList();
        var insertionIndex = -1;

        // Try to insert after bootstrap link
        for (int i = 0; i < lines.Count; i++)
        {
            if (lines[i].Contains("bootstrap", StringComparison.OrdinalIgnoreCase) &&
                lines[i].Contains("<link", StringComparison.OrdinalIgnoreCase))
            {
                insertionIndex = i + 1;
                break;
            }
        }

        // Otherwise try before {AssemblyName}.styles.css
        if (insertionIndex == -1)
        {
            for (int i = 0; i < lines.Count; i++)
            {
                if (lines[i].Contains(".styles.css", StringComparison.OrdinalIgnoreCase) &&
                    lines[i].Contains("<link", StringComparison.OrdinalIgnoreCase))
                {
                    insertionIndex = i;
                    break;
                }
            }
        }

        // Otherwise try before </head>
        if (insertionIndex == -1)
        {
            for (int i = 0; i < lines.Count; i++)
            {
                if (lines[i].Contains("</head>", StringComparison.OrdinalIgnoreCase))
                {
                    insertionIndex = i;
                    break;
                }
            }
        }

        if (insertionIndex == -1)
        {
            throw new InvalidOperationException(
                $"Could not find a valid insertion point (<head>, bootstrap link, or styles link) in '{project.AppRazorPath}'.");
        }

        var indent = "    ";
        var toInsert = new List<string>();

        if (!appContent.Contains("css/blazorui/tokens.css", StringComparison.OrdinalIgnoreCase))
            toInsert.Add($"{indent}{tokensLink}");

        if (!appContent.Contains("css/blazorui/themes.css", StringComparison.OrdinalIgnoreCase))
            toInsert.Add($"{indent}{themesLink}");

        lines.InsertRange(insertionIndex, toInsert);

        var separator = appContent.Contains("\r\n") ? "\r\n" : "\n";
        File.WriteAllText(project.AppRazorPath, string.Join(separator, lines) + separator);
    }
}
