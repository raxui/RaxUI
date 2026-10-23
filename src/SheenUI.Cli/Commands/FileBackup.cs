namespace SheenUI.Cli.Commands;

/// <summary>
/// Writes files while remembering their original bytes, so an ordinary failure can restore
/// previous contents and remove newly created files (ADR 003).
/// </summary>
public sealed class FileBackup
{
    // path -> original bytes, or null when the file did not exist
    private readonly Dictionary<string, byte[]?> _originals = new(
        OperatingSystem.IsWindows() ? StringComparer.OrdinalIgnoreCase : StringComparer.Ordinal);
    private readonly List<string> _createdDirectories = [];

    private void CreateParent(string path)
    {
        var missing = new Stack<string>();
        var parent = Path.GetDirectoryName(path);
        while (parent != null && !Directory.Exists(parent))
        {
            missing.Push(parent);
            parent = Path.GetDirectoryName(parent);
        }
        foreach (var directory in missing)
        {
            Directory.CreateDirectory(directory);
            _createdDirectories.Add(directory);
        }
    }

    public void Write(string path, byte[] bytes)
    {
        Remember(path);
        CreateParent(path);
        File.WriteAllBytes(path, bytes);
    }

    public void WriteText(string path, string content)
    {
        Remember(path);
        CreateParent(path);
        File.WriteAllText(path, content);
    }

    /// <summary>Deletes a file; Restore() writes it back.</summary>
    public void Delete(string path)
    {
        Remember(path);
        File.Delete(path);
    }

    /// <summary>Records a file that will be created or replaced by other code (for example a JSON save).</summary>
    public void Remember(string path)
    {
        if (!_originals.ContainsKey(path))
            _originals[path] = File.Exists(path) ? File.ReadAllBytes(path) : null;
    }

    public void Restore()
    {
        foreach (var (path, original) in _originals)
        {
            try
            {
                if (original == null)
                {
                    if (File.Exists(path))
                        File.Delete(path);
                }
                else
                {
                    File.WriteAllBytes(path, original);
                }
            }
            catch
            {
                // Best effort: keep restoring the remaining files.
            }
        }
        foreach (var directory in _createdDirectories.AsEnumerable().Reverse())
        {
            try
            {
                // Non-recursive deletion preserves any files added by another process.
                Directory.Delete(directory, recursive: false);
            }
            catch (IOException) { }
            catch (UnauthorizedAccessException) { }
        }
    }
}
