using SheenUI.Cli.Configuration;
using SheenUI.Cli.Project;
using SheenUI.Cli.Registry;

namespace SheenUI.Cli.Commands;

public static class AddCommand
{
    private sealed record PlannedWrite(string TargetPath, string RelTarget, byte[] Bytes, string Hash, bool Keep = false);

    private sealed record PlannedComponent(ComponentManifest Manifest, string Folder, List<PlannedWrite> Writes);

    public static int Execute(string workingDirectory, string componentName, TextWriter output, TextWriter error,
        EmbeddedRegistry? registry = null)
    {
        var backup = new FileBackup();

        try
        {
            if (string.IsNullOrWhiteSpace(componentName))
            {
                error.WriteLine("Error: Component name must be specified. Example: 'sheenui add button'");
                return 1;
            }

            var config = SheenUiConfig.Load(workingDirectory);
            if (config == null)
            {
                error.WriteLine("Error: SheenUI is not initialized in this project. Please run 'sheenui init' first.");
                return 1;
            }

            var project = ProjectContext.Detect(workingDirectory);
            registry ??= new EmbeddedRegistry();

            // The component and its dependencies, dependencies first.
            var components = registry.ResolveComponents(componentName);
            var requested = components[^1];

            output.WriteLine($"Adding component '{requested.Name}' (v{requested.Version})...");

            var lockFile = SheenUiLock.LoadOrCreate(workingDirectory);
            ProjectPath.Validate(workingDirectory, project.ImportsRazorPath);
            var componentsDir = Path.Combine(workingDirectory, config.ComponentsPath);

            // 1. Plan every component and check every conflict before writing anything (ADR 003).
            var planned = new List<PlannedComponent>();
            var kept = new List<string>();
            foreach (var manifest in components)
            {
                // An installed dependency stays as it is, local edits included; only the requested component is (re)installed.
                if (manifest != requested && lockFile.Components.ContainsKey(manifest.Name))
                {
                    kept.Add(manifest.Name);
                    continue;
                }

                // The manifest validator guarantees every target is "<ComponentFolder>/<file>" in one folder.
                var folder = manifest.Files[0].Target.Split('/')[0];
                planned.Add(new PlannedComponent(manifest, folder, PlanWrites(workingDirectory, componentsDir, manifest, registry, lockFile)));
            }

            // Plan the core edit too, before any component write.
            var styleTargets = components.SelectMany(m => m.Assets).Select(a => a.Target).ToList();
            var corePath = Path.Combine(workingDirectory, config.StylesPath, "sheenui.css");
            byte[]? coreBytes = null;
            LockedFile? coreTracked = null;
            if (styleTargets.Count > 0)
            {
                ProjectPath.Validate(workingDirectory, corePath);
                var relative = Path.GetRelativePath(workingDirectory, corePath).Replace('\\', '/');
                var source = new EmbeddedRegistry().GetResourceBytes("styles/sheenui.css");
                lockFile.EnsureSameSource(relative, EmbeddedRegistry.ComputeSha256(source));
                coreTracked = lockFile.FindTrackedFile(relative);
                var current = File.ReadAllBytes(corePath);
                StyleImports.Verify(current, coreTracked, source);
                coreBytes = StyleImports.Append(current, styleTargets);
            }

            // 2. Write files, keeping originals for rollback
            foreach (var component in planned)
            {
                foreach (var write in component.Writes)
                    if (!write.Keep) backup.Write(write.TargetPath, write.Bytes);
            }

            if (coreBytes != null)
            {
                backup.Write(corePath, coreBytes);
                coreTracked!.InstalledHash = EmbeddedRegistry.ComputeSha256(coreBytes);
            }

            // 3. Update Components/_Imports.razor
            foreach (var component in planned)
                UpdateImportsRazor(project, component.Folder, backup);

            // 4. Update the lock file once, LAST (ADR 003)
            foreach (var component in planned)
            {
                lockFile.Components[component.Manifest.Name] = new LockedComponent
                {
                    Version = component.Manifest.Version,
                    RegistryVersion = ReleaseIdentity.Version,
                    ManifestSha256 = component.Manifest.ManifestSha256,
                    Files = component.Writes
                        .Select(w => new LockedFile { Target = w.RelTarget, SourceHash = w.Hash, InstalledHash = w.Keep ? lockFile.FindTrackedFile(w.RelTarget)!.InstalledHash : w.Hash })
                        .ToList()
                };
            }
            lockFile.RegistryVersion = ReleaseIdentity.Version;

            if (config.RegistryVersion != ReleaseIdentity.Version)
            {
                config.RegistryVersion = ReleaseIdentity.Version;
                backup.Remember(Path.Combine(workingDirectory, SheenUiConfig.DefaultFileName));
                config.Save(workingDirectory);
            }

            backup.Remember(Path.Combine(workingDirectory, SheenUiLock.DefaultFileName));
            lockFile.Save(workingDirectory);

            foreach (var component in planned)
            {
                var role = component.Manifest == requested ? "Component" : "Dependency";
                output.WriteLine($"{role} '{component.Manifest.Name}' installed successfully:");
                foreach (var w in component.Writes)
                    output.WriteLine(w.Keep ? $"  = Kept local edits: {w.RelTarget}" : $"  + {w.RelTarget}");
            }
            foreach (var name in kept)
                output.WriteLine($"Dependency '{name}' is already installed; kept as is.");
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

    private static List<PlannedWrite> PlanWrites(string workingDirectory, string componentsDir, ComponentManifest manifest,
        EmbeddedRegistry registry, SheenUiLock lockFile)
    {
        var writes = new List<PlannedWrite>();

        var files = manifest.Files.Select(f => (Source: $"{manifest.SourceDirectory}/{f.Source}", f.Target, Style: false))
            .Concat(manifest.Assets.Select(a => (Source: a.Source, a.Target, Style: true)));
        var config = SheenUiConfig.Load(workingDirectory)!;
        foreach (var file in files)
        {
            var bytes = registry.GetResourceBytes(file.Source);
            var hash = EmbeddedRegistry.ComputeSha256(bytes);
            var targetPath = Path.Combine(file.Style ? Path.Combine(workingDirectory, config.StylesPath) : componentsDir, file.Target);
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
                        $"Destination file '{relTarget}' already exists and is not managed by SheenUI. Refusing to overwrite unknown file.");
                }

                if (!string.Equals(tracked.InstalledHash, existingHash, StringComparison.OrdinalIgnoreCase))
                {
                    if (file.Style)
                    {
                        writes.Add(new PlannedWrite(targetPath, relTarget, File.ReadAllBytes(targetPath), hash, Keep: true));
                        continue;
                    }
                    throw new InvalidOperationException(
                        $"Destination file '{relTarget}' was modified locally. Refusing to overwrite modified file.");
                }
            }

            writes.Add(new PlannedWrite(targetPath, relTarget, bytes, hash));
        }

        return writes;
    }

    private static void UpdateImportsRazor(ProjectContext project, string componentFolder, FileBackup backup)
    {
        var importsPath = project.ImportsRazorPath;
        var usingDirective = $"@using {project.RootNamespace}.Components.UI.{componentFolder}";

        var currentContent = File.Exists(importsPath) ? File.ReadAllText(importsPath) : "";
        var updated = AppendImports(currentContent, [usingDirective]);
        if (updated == currentContent)
            return;

        backup.WriteText(importsPath, updated);
    }

    internal static string AppendImports(string currentContent, IEnumerable<string> directives)
    {
        var separator = currentContent.Contains("\r\n") ? "\r\n" : "\n";
        foreach (var directive in directives.Distinct(StringComparer.Ordinal))
        {
            if (currentContent.Split(["\r\n", "\n"], StringSplitOptions.None).Any(line => line.Trim() == directive))
                continue;
            currentContent = currentContent.TrimEnd();
            if (currentContent.Length > 0) currentContent += separator;
            currentContent += directive + separator;
        }
        return currentContent;
    }
}
