namespace BlazorUI.Cli.Commands;

/// <summary>
/// Writes files while remembering their original bytes, so an ordinary failure can restore
/// previous contents and remove newly created files (ADR 003).
/// </summary>
public sealed class FileBackup
{
    // path -> original bytes, or null when the file did not exist
    private readonly Dictionary<string, byte[]?> _originals = new(StringComparer.OrdinalIgnoreCase);

    public void Write(string path, byte[] bytes)
    {
        Remember(path);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        File.WriteAllBytes(path, bytes);
    }

    public void WriteText(string path, string content)
    {
        Remember(path);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        File.WriteAllText(path, content);
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
    }
}
