using BlazorUI.Cli.Configuration;
using BlazorUI.Cli.Project;
using BlazorUI.Cli.Registry;

namespace BlazorUI.Cli.Commands;

public static class AddCommand
{
    public static int Execute(string workingDirectory, string componentName, TextWriter output, TextWriter error)
    {
        var backupFiles = new Dictionary<string, string?>();

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

            var lockPath = Path.Combine(workingDirectory, BlazorUiLock.DefaultFileName);
            var lockFile = BlazorUiLock.LoadOrCreate(workingDirectory);

            // 1. Validate files and check for conflicts before writing anything
            var plannedWrites = new List<(string SourceRel, string TargetPath, string RelTarget, byte[] Bytes, string Hash)>();

            // Capitalize folder name (e.g., button -> Button)
            var componentFolder = char.ToUpperInvariant(manifest.Name[0]) + manifest.Name[1..];
            var baseComponentsDir = Path.Combine(workingDirectory, config.ComponentsPath, componentFolder);

            foreach (var file in manifest.Files)
            {
                EmbeddedRegistry.ValidatePathSafety(file.Source);
                EmbeddedRegistry.ValidatePathSafety(file.Target);

                var sourceRel = $"components/{manifest.Name}/{file.Source}";
                var bytes = registry.GetResourceBytes(sourceRel);
                var hash = EmbeddedRegistry.ComputeSha256(bytes);

                if (!string.Equals(file.Sha256, hash, StringComparison.OrdinalIgnoreCase))
                {
                    throw new InvalidOperationException(
                        $"Manifest integrity check failed for '{file.Source}'. Expected hash '{file.Sha256}', but got '{hash}'.");
                }

                var fileName = Path.GetFileName(file.Target);
                var targetPath = Path.Combine(baseComponentsDir, fileName);
                var relTarget = Path.GetRelativePath(workingDirectory, targetPath).Replace('\\', '/');

                if (File.Exists(targetPath))
                {
                    var existingBytes = File.ReadAllBytes(targetPath);
                    var existingHash = EmbeddedRegistry.ComputeSha256(existingBytes);
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

                plannedWrites.Add((sourceRel, targetPath, relTarget, bytes, hash));
            }

            // 2. Perform staged file writes
            Directory.CreateDirectory(baseComponentsDir);
            var lockedFiles = new List<LockedFile>();

            foreach (var write in plannedWrites)
            {
                if (File.Exists(write.TargetPath))
                {
                    backupFiles[write.TargetPath] = File.ReadAllText(write.TargetPath);
                }
                else
                {
                    backupFiles[write.TargetPath] = null;
                }

                File.WriteAllBytes(write.TargetPath, write.Bytes);

                lockedFiles.Add(new LockedFile
                {
                    Target = write.RelTarget,
                    SourceHash = write.Hash,
                    InstalledHash = write.Hash
                });
            }

            // 3. Update Components/_Imports.razor
            UpdateImportsRazor(project, componentFolder, backupFiles);

            // 4. Update lock file (written LAST per ADR 003)
            lockFile.Components[manifest.Name] = new LockedComponent
            {
                Version = manifest.Version,
                Files = lockedFiles
            };

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

    private static void UpdateImportsRazor(ProjectContext project, string componentFolder, Dictionary<string, string?> backupFiles)
    {
        var importsPath = project.ImportsRazorPath;
        var usingDirective = $"@using {project.RootNamespace}.Components.UI.{componentFolder}";

        var currentContent = File.Exists(importsPath) ? File.ReadAllText(importsPath) : "";
        if (!backupFiles.ContainsKey(importsPath))
            backupFiles[importsPath] = File.Exists(importsPath) ? currentContent : null;

        if (currentContent.Contains(usingDirective, StringComparison.OrdinalIgnoreCase))
            return;

        var separator = currentContent.Contains("\r\n") ? "\r\n" : "\n";
        var newContent = currentContent.TrimEnd();
        if (!string.IsNullOrEmpty(newContent))
            newContent += separator;
        newContent += usingDirective + separator;

        File.WriteAllText(importsPath, newContent);
    }
}
