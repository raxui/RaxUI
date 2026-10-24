using System.Text;
using SheenUI.Cli.Configuration;
using SheenUI.Cli.Project;
using SheenUI.Cli.Registry;

namespace SheenUI.Cli.Commands;

/// <summary>Updates source-owned components as one checked transaction; starter pages remain app-owned.</summary>
public static class UpdateCommand
{
    private static readonly StringComparer Paths = OperatingSystem.IsWindows()
        ? StringComparer.OrdinalIgnoreCase : StringComparer.Ordinal;
    private sealed record Change(string Path, string Relative, byte[]? Bytes);

    public static int Execute(string workingDirectory, string? componentName, bool dryRun,
        TextWriter output, TextWriter error, EmbeddedRegistry? registry = null)
    {
        var backup = new FileBackup();
        try
        {
            workingDirectory = Path.GetFullPath(workingDirectory);
            var config = SheenUiConfig.Load(workingDirectory)
                ?? throw new InvalidOperationException("SheenUI is not initialized. Run 'sheenui init' first.");
            var lockPath = Path.Combine(workingDirectory, SheenUiLock.DefaultFileName);
            ProjectPath.Validate(workingDirectory, lockPath);
            if (!File.Exists(lockPath))
                throw new InvalidOperationException("sheenui.lock.json is required to safely update installed files. Restore it from backup.");
            var locked = SheenUiLock.LoadOrCreate(workingDirectory);
            var project = ProjectContext.Detect(workingDirectory);
            registry ??= new EmbeddedRegistry();
            var requested = componentName is null
                ? locked.Components.Keys.Where(name => name != StarterApp.ItemName).OrderBy(name => name, StringComparer.Ordinal).ToArray()
                : [locked.Components.Keys.FirstOrDefault(name => string.Equals(name, componentName, StringComparison.OrdinalIgnoreCase))
                    ?? throw new InvalidOperationException($"Component '{componentName}' is not installed. Use 'sheenui add {componentName}' first.")];
            if (requested.Contains(StarterApp.ItemName))
                throw new InvalidOperationException("Starter pages and app styles are app-owned and are not updated.");

            var manifests = new Dictionary<string, ComponentManifest>(StringComparer.OrdinalIgnoreCase);
            foreach (var name in requested)
                foreach (var manifest in registry.ResolveComponents(name))
                    manifests.TryAdd(manifest.Name, manifest);

            var changes = new Dictionary<string, Change>(Paths);
            var claimed = new HashSet<string>(Paths);
            var conflicts = new List<string>();
            var notes = new List<string>();
            var oldFolders = Folders(locked.Components.Values.SelectMany(component => component.Files), config.ComponentsPath);
            var removedAssets = new List<string>();
            foreach (var manifest in manifests.Values)
            {
                locked.Components.TryGetValue(manifest.Name, out var previous);
                var next = new LockedComponent
                {
                    Version = manifest.Version,
                    RegistryVersion = ReleaseIdentity.Version,
                    ManifestSha256 = manifest.ManifestSha256,
                };
                var files = manifest.Files.Select(file => (
                        Source: $"{manifest.SourceDirectory}/{file.Source}",
                        Target: $"{config.ComponentsPath}/{file.Target}"))
                    .Concat(manifest.Assets.Select(asset => (Source: asset.Source, Target: $"{config.StylesPath}/{asset.Target}")));
                foreach (var file in files)
                {
                    var fullPath = CheckedPath(workingDirectory, file.Target);
                    if (!claimed.Add(file.Target))
                        throw new InvalidOperationException($"Multiple components target '{file.Target}'.");
                    var tracked = previous?.Files.SingleOrDefault(item => Paths.Equals(item.Target, file.Target));
                    var otherOwner = locked.Components.FirstOrDefault(pair => !string.Equals(pair.Key, manifest.Name, StringComparison.OrdinalIgnoreCase) &&
                        pair.Value.Files.Any(item => Paths.Equals(item.Target, file.Target)));
                    if (otherOwner.Value is not null)
                        throw new InvalidOperationException($"'{file.Target}' is owned by '{otherOwner.Key}', not '{manifest.Name}'.");

                    var bytes = registry.GetResourceBytes(file.Source);
                    var hash = EmbeddedRegistry.ComputeSha256(bytes);
                    var installed = hash;
                    if (Directory.Exists(fullPath))
                        conflicts.Add($"{file.Target}: a directory occupies the destination.");
                    else if (tracked is null && File.Exists(fullPath))
                        conflicts.Add($"{file.Target}: an untracked file occupies the destination.");
                    else if (tracked is not null && !File.Exists(fullPath))
                        conflicts.Add($"{file.Target}: the installed file was deleted locally.");
                    else if (tracked is null)
                        changes.Add(file.Target, new(fullPath, file.Target, bytes));
                    else
                    {
                        var current = EmbeddedRegistry.ComputeSha256(File.ReadAllBytes(fullPath));
                        if (current == hash) { /* Already matches the new release, including a manual merge. */ }
                        else if (current == tracked.InstalledHash)
                            changes.Add(file.Target, new(fullPath, file.Target, bytes));
                        else if (hash == tracked.SourceHash)
                        {
                            // Keep the original baseline: never reclassify local edits as registry content.
                            installed = tracked.InstalledHash;
                            notes.Add($"Kept local edits (upstream unchanged): {file.Target}");
                        }
                        else
                            conflicts.Add($"{file.Target}: changed locally and in the registry. Save your edits separately, restore the installed version, update, then reapply your edits; or replace the file with the exact new registry source and retry.");
                    }
                    next.Files.Add(new LockedFile { Target = file.Target, SourceHash = hash, InstalledHash = installed });
                }

                foreach (var old in previous?.Files ?? [])
                {
                    if (next.Files.Any(file => Paths.Equals(file.Target, old.Target))) continue;
                    // Lockfile paths are untrusted. Obsolete files must still be within this item's ownership boundary.
                    if (!old.Target.StartsWith(config.ComponentsPath + "/", StringComparison.Ordinal) &&
                        old.Target != $"{config.StylesPath}/components/{manifest.Name}.css")
                        throw new InvalidOperationException($"Unsupported obsolete component path '{old.Target}'.");
                    var fullPath = CheckedPath(workingDirectory, old.Target);
                    if (Directory.Exists(fullPath))
                        conflicts.Add($"{old.Target}: a directory occupies an obsolete file path.");
                    else if (File.Exists(fullPath))
                    {
                        if (EmbeddedRegistry.ComputeSha256(File.ReadAllBytes(fullPath)) != old.InstalledHash)
                            conflicts.Add($"{old.Target}: removed upstream but modified locally. Move your changes out of this file before updating.");
                        else
                            changes.Add(old.Target, new(fullPath, old.Target, null));
                    }
                    if (old.Target.StartsWith(config.StylesPath + "/", StringComparison.Ordinal))
                        removedAssets.Add(old.Target[(config.StylesPath.Length + 1)..]);
                }
                locked.Components[manifest.Name] = next;
            }

            // Always refresh the core together with components, retaining starter and unrelated imports.
            var coreRelative = $"{config.StylesPath}/sheenui.css";
            var corePath = CheckedPath(workingDirectory, coreRelative);
            var coreTracked = locked.FindTrackedFile(coreRelative);
            var coreSource = new EmbeddedRegistry().GetResourceBytes("styles/sheenui.css");
            var additions = manifests.Values.SelectMany(manifest => manifest.Assets).Select(asset => asset.Target);
            if (!File.Exists(corePath))
                conflicts.Add($"{coreRelative}: the installed shared theme is missing.");
            else
            {
                try
                {
                    var current = File.ReadAllBytes(corePath);
                    var bytes = StyleImports.UpdateCore(current, coreTracked, coreSource, additions, removedAssets);
                    if (!current.SequenceEqual(bytes)) changes.Add(coreRelative, new(corePath, coreRelative, bytes));
                    locked.Assets[coreRelative] = new LockedFile
                    {
                        Target = coreRelative,
                        SourceHash = EmbeddedRegistry.ComputeSha256(coreSource),
                        InstalledHash = EmbeddedRegistry.ComputeSha256(bytes),
                    };
                }
                catch (InvalidOperationException ex) { conflicts.Add($"{coreRelative}: {ex.Message}"); }
            }

            ProjectPath.Validate(workingDirectory, project.ImportsRazorPath);
            var imports = File.ReadAllText(project.ImportsRazorPath);
            var nextFolders = Folders(locked.Components.Values.SelectMany(component => component.Files), config.ComponentsPath);
            var removedDirectives = oldFolders.Except(nextFolders).Select(folder => $"@using {project.RootNamespace}.Components.UI.{folder}").ToHashSet();
            var separator = imports.Contains("\r\n") ? "\r\n" : "\n";
            var updatedImports = string.Join(separator, imports.Split(separator).Where(line => !removedDirectives.Contains(line.Trim())));
            updatedImports = AddCommand.AppendImports(updatedImports, manifests.Values.Select(manifest =>
                $"@using {project.RootNamespace}.Components.UI.{manifest.Files[0].Target.Split('/')[0]}"));
            if (updatedImports != imports)
            {
                var relative = Path.GetRelativePath(workingDirectory, project.ImportsRazorPath).Replace('\\', '/');
                changes.Add(relative, new(project.ImportsRazorPath, relative, Encoding.UTF8.GetBytes(updatedImports)));
            }

            output.WriteLine($"{(dryRun ? "Previewing" : "Updating")} {manifests.Count} component(s) to registry {ReleaseIdentity.Version}.");
            foreach (var change in changes.Values)
                output.WriteLine($"  {(change.Bytes is null ? "Delete" : File.Exists(change.Path) ? "Update" : "Add")}: {change.Relative}");
            foreach (var note in notes) output.WriteLine($"  {note}");
            if (conflicts.Count > 0)
            {
                foreach (var conflict in conflicts) error.WriteLine($"Conflict: {conflict}");
                error.WriteLine("No files were changed. Resolve the listed conflicts and retry; keep sheenui.lock.json.");
                return 1;
            }

            config.RegistryVersion = ReleaseIdentity.Version;
            config.TargetFramework = project.TargetFramework;
            locked.RegistryVersion = ReleaseIdentity.Version;
            if (dryRun)
            {
                output.WriteLine("Dry run complete. Configuration and lock metadata would also be refreshed; no files were changed.");
                return 0;
            }

            foreach (var change in changes.Values)
                if (change.Bytes is null) backup.Delete(change.Path);
                else backup.Write(change.Path, change.Bytes);
            // Starter entries and files deliberately stay as recorded; app layouts are never refreshed here.
            backup.Remember(Path.Combine(workingDirectory, SheenUiConfig.DefaultFileName));
            config.Save(workingDirectory);
            backup.Remember(lockPath);
            locked.Save(workingDirectory);
            output.WriteLine($"Update complete: {changes.Count} file change(s). Starter pages and app styles were left in place.");
            return 0;
        }
        catch (Exception ex)
        {
            backup.Restore();
            error.WriteLine($"Error during update: {ex.Message}");
            return 1;
        }
    }

    private static string CheckedPath(string root, string relative)
    {
        EmbeddedRegistry.ValidatePathSafety(relative);
        var path = Path.Combine(root, relative);
        ProjectPath.Validate(root, path);
        return path;
    }

    private static HashSet<string> Folders(IEnumerable<LockedFile> files, string componentsPath) => files
        .Where(file => file.Target.StartsWith(componentsPath + "/", StringComparison.Ordinal))
        .Select(file => file.Target[(componentsPath.Length + 1)..].Split('/')[0]).ToHashSet(StringComparer.Ordinal);
}
