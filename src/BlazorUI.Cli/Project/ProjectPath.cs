namespace BlazorUI.Cli.Project;

/// <summary>Checks both lexical paths and existing links before accessing project files.</summary>
public static class ProjectPath
{
    private static readonly StringComparison Comparison = OperatingSystem.IsWindows()
        ? StringComparison.OrdinalIgnoreCase : StringComparison.Ordinal;

    public static void Validate(string root, string path)
    {
        root = Path.GetFullPath(root);
        path = Path.GetFullPath(path);
        if (!Contains(root, path))
            throw new InvalidOperationException($"Path '{path}' escapes the project directory.");

        var physicalRoot = Resolve(root, 0);
        var current = root;
        foreach (var segment in Path.GetRelativePath(root, path).Split(Path.DirectorySeparatorChar))
        {
            current = Path.Combine(current, segment);
            if (!Contains(physicalRoot, Resolve(current, 0)))
                throw new InvalidOperationException($"Path '{current}' escapes the project directory through a link.");
        }
    }

    private static bool Contains(string root, string path) =>
        string.Equals(root, path, Comparison) ||
        path.StartsWith(Path.TrimEndingDirectorySeparator(root) + Path.DirectorySeparatorChar, Comparison);

    private static string Resolve(string path, int depth)
    {
        if (depth > 64)
            throw new InvalidOperationException($"Too many symbolic links in '{path}'.");
        var parent = Path.GetDirectoryName(path);
        if (parent == null)
            return path;
        var resolved = Path.Combine(Resolve(parent, depth + 1), Path.GetFileName(path));
        FileSystemInfo info = Directory.Exists(resolved) ? new DirectoryInfo(resolved) : new FileInfo(resolved);
        var target = info.LinkTarget;
        if (target == null)
            return resolved;
        var absoluteTarget = Path.GetFullPath(target, Path.GetDirectoryName(resolved)!);
        return Resolve(absoluteTarget, depth + 1);
    }
}
