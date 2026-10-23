using BlazorUI.Cli.Configuration;
using BlazorUI.Cli.Project;
using BlazorUI.Cli.Registry;

namespace BlazorUI.Cli.Commands;

public static class AddCommand
{
    public static int Execute(string workingDirectory, string componentName, TextWriter output, TextWriter error)
    {
        var backup = new FileBackup();

        try
        {
            if (string.IsNullOrWhiteSpace(componentName))
            {
                error.WriteLine("Error: Component name must be specified. Example: 'blazorui add button'");
                return 1;
            }

            var config = BlazorUiConfig.Load(workingDirectory);
            if (config == null)
            {
                error.WriteLine("Error: BlazorUI is not initialized in this project. Please run 'blazorui init' first.");
                return 1;
            }

            var project = ProjectContext.Detect(workingDirectory);
            var registry = new EmbeddedRegistry();
            var manifest = registry.GetComponentManifest(componentName);

            output.WriteLine($"Adding component '{manifest.Name}' (v{manifest.Version})...");

            var lockFile = BlazorUiLock.LoadOrCreate(workingDirectory);
            ProjectPath.Validate(workingDirectory, project.ImportsRazorPath);
            var componentsDir = Path.Combine(workingDirectory, config.ComponentsPath);

            // The manifest validator guarantees every target is "<ComponentFolder>/<file>" in one folder.
            var componentFolder = manifest.Files[0].Target.Split('/')[0];

            // 1. Plan and check for conflicts before writing anything
            var plannedWrites = new List<(string TargetPath, string RelTarget, byte[] Bytes, string Hash)>();

            foreach (var file in manifest.Files)
            {
                var bytes = registry.GetResourceBytes($"components/{manifest.Name}/{file.Source}");
                var hash = EmbeddedRegistry.ComputeSha256(bytes);
                var targetPath = Path.Combine(componentsDir, file.Target);
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
                            $"Destination file '{relTarget}' already exists and is not managed by BlazorUI. Refusing to overwrite unknown file.");
                    }

                    if (!string.Equals(tracked.InstalledHash, existingHash, StringComparison.OrdinalIgnoreCase))
                    {
                        throw new InvalidOperationException(
                            $"Destination file '{relTarget}' was modified locally. Refusing to overwrite modified file.");
                    }
                }

                plannedWrites.Add((targetPath, relTarget, bytes, hash));
            }

            // 2. Write files, keeping originals for rollback
            var lockedFiles = new List<LockedFile>();

            foreach (var write in plannedWrites)
            {
                backup.Write(write.TargetPath, write.Bytes);
                lockedFiles.Add(new LockedFile
                {
                    Target = write.RelTarget,
                    SourceHash = write.Hash,
                    InstalledHash = write.Hash
                });
            }

            // 3. Update Components/_Imports.razor
            UpdateImportsRazor(project, componentFolder, backup);

            // 4. Update lock file (written LAST per ADR 003)
            lockFile.Components[manifest.Name] = new LockedComponent
            {
                Version = manifest.Version,
                RegistryVersion = ReleaseIdentity.Version,
                ManifestSha256 = manifest.ManifestSha256,
                Files = lockedFiles
            };
            lockFile.RegistryVersion = ReleaseIdentity.Version;

            if (config.RegistryVersion != ReleaseIdentity.Version)
            {
                config.RegistryVersion = ReleaseIdentity.Version;
                backup.Remember(Path.Combine(workingDirectory, BlazorUiConfig.DefaultFileName));
                config.Save(workingDirectory);
            }

            backup.Remember(Path.Combine(workingDirectory, BlazorUiLock.DefaultFileName));
            lockFile.Save(workingDirectory);

            output.WriteLine($"Component '{manifest.Name}' installed successfully:");
            foreach (var w in plannedWrites)
            {
                output.WriteLine($"  + {w.RelTarget}");
            }
            output.WriteLine($"  * Updated: {Path.GetRelativePath(workingDirectory, project.ImportsRazorPath).Replace('\\', '/')}");

            return 0;
        }
        catch (Exception ex)
        {
            error.WriteLine($"Error adding component '{componentName}': {ex.Message}");
            backup.Restore();
            return 1;
        }
    }

    private static void UpdateImportsRazor(ProjectContext project, string componentFolder, FileBackup backup)
    {
        var importsPath = project.ImportsRazorPath;
        var usingDirective = $"@using {project.RootNamespace}.Components.UI.{componentFolder}";

        var currentContent = File.Exists(importsPath) ? File.ReadAllText(importsPath) : "";
        var alreadyPresent = currentContent
            .Split(["\r\n", "\n"], StringSplitOptions.None)
            .Any(line => line.Trim() == usingDirective);

        if (alreadyPresent)
            return;

        var separator = currentContent.Contains("\r\n") ? "\r\n" : "\n";
        var newContent = currentContent.TrimEnd();
        if (!string.IsNullOrEmpty(newContent))
            newContent += separator;
        newContent += usingDirective + separator;

        backup.WriteText(importsPath, newContent);
    }
}
