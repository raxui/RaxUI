using System.Diagnostics;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using SheenUI.Cli.Project;
using SheenUI.Cli.Registry;

namespace SheenUI.Cli.Commands;

/// <summary>
/// Durable, project-local write-ahead journal for init, add and update (ADR 018). Original bytes are saved
/// before each change, so a killed process is rolled back by the next invocation or 'sheenui recover'.
/// The journal directory is created on the first change; Commit() or Restore() removes it.
/// </summary>
public sealed partial class FileTransaction(string projectDirectory)
{
    public const string DirectoryName = ".sheenui-transaction";
    private const long MaxJournalBytes = 8 * 1024 * 1024;
    private static readonly StringComparer PathComparer = OperatingSystem.IsWindows() ? StringComparer.OrdinalIgnoreCase : StringComparer.Ordinal;
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
    private static readonly UTF8Encoding Utf8 = new(encoderShouldEmitUTF8Identifier: false);

    // Test-only instrumentation (operation, project-relative path); crash tests set it through a startup hook.
    private static Action<string, string>? s_afterOperation = null;

    private readonly string _root = Path.GetFullPath(projectDirectory);
    private Journal? _journal;

    private sealed class Journal
    {
        public int SchemaVersion { get; set; }
        public string Root { get; set; } = "";
        public int Pid { get; set; }
        public long Started { get; set; }
        public string Phase { get; set; } = "open";
        public List<FileRecord> Files { get; set; } = [];
        public List<DirectoryRecord> Directories { get; set; } = [];
    }

    private sealed class FileRecord
    {
        public string Target { get; set; } = "";
        public Backup? Before { get; set; }
        public List<string?> After { get; set; } = [];
        public int Mode { get; set; }
    }

    private sealed class Backup
    {
        public string File { get; set; } = "";
        public string Hash { get; set; } = "";
    }

    private sealed class DirectoryRecord
    {
        public string Target { get; set; } = "";
        public long? Created { get; set; }
    }

    [GeneratedRegex(@"^(journal\.json|journal\.next|write\.next|recovery\.lock|before-\d+)$")]
    private static partial Regex ReservedFile();

    [GeneratedRegex(@"^[a-f0-9]{64}$")]
    private static partial Regex Digest();

    [GeneratedRegex(@"^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)", RegexOptions.IgnoreCase)]
    private static partial Regex DeviceName();

    public void Write(string path, byte[] bytes)
    {
        var entry = Remember(path);
        entry.After.Add(Hash(bytes));
        Persist(_root, _journal!);
        CreateParents(entry.Target);
        Replace(_root, entry.Target, bytes, entry.Mode);
        s_afterOperation?.Invoke("write", entry.Target);
    }

    public void WriteText(string path, string content) => Write(path, Utf8.GetBytes(content));

    /// <summary>Deletes a file; Restore() writes it back.</summary>
    public void Delete(string path)
    {
        var entry = Remember(path);
        entry.After.Add(null);
        Persist(_root, _journal!);
        File.Delete(Checked(_root, entry.Target));
        s_afterOperation?.Invoke("delete", entry.Target);
    }

    /// <summary>Durably marks the installation complete, then removes the journal and backups.</summary>
    public void Commit()
    {
        if (_journal == null)
            return;
        _journal.Phase = "committed";
        Persist(_root, _journal);
        Cleanup(_root);
        _journal = null;
    }

    /// <summary>Rolls back after a handled failure; reports, instead of throwing, when that is impossible.</summary>
    public void Restore(TextWriter error)
    {
        if (_journal == null)
            return;
        try
        {
            Rollback(_root, _journal, keepChanges: false);
            _journal.Phase = "recovered";
            Persist(_root, _journal);
            Cleanup(_root);
            _journal = null;
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or InvalidOperationException)
        {
            error.WriteLine($"Rollback incomplete: {ex.Message}");
            error.WriteLine($"Original backups retained in {DirectoryName}; run 'sheenui recover' before retrying.");
        }
    }

    /// <summary>
    /// Finishes an interrupted transaction before new writes: rolls back an open one, cleans up a committed one.
    /// Returns false when there is nothing to recover.
    /// </summary>
    public static bool Recover(string projectDirectory, bool keepChanges, TextWriter output)
    {
        var root = Path.GetFullPath(projectDirectory);
        var directory = Path.Combine(root, DirectoryName);
        if (!Directory.Exists(directory) && !File.Exists(directory))
            return false;
        try
        {
            Checked(root, DirectoryName, metadata: true);
            var names = Directory.GetFileSystemEntries(directory).Select(Path.GetFileName).ToList();
            // No journal and no backups: the process stopped before its first project change, or after cleanup removed them.
            if (!names.Contains("journal.json") && !names.Any(name => name!.StartsWith("before-", StringComparison.Ordinal)))
            {
                Cleanup(root);
                output.WriteLine("Removed an unused SheenUI transaction directory.");
                return true;
            }

            var journal = Load(root);
            if (Alive(journal))
                throw new InvalidOperationException($"SheenUI CLI process {journal.Pid} is still running; retry after it exits.");
            var lockPath = Checked(root, $"{DirectoryName}/recovery.lock", metadata: true);
            if (File.Exists(lockPath))
                throw new InvalidOperationException($"Recovery lock exists. After confirming no recovery process is running, remove only {DirectoryName}/recovery.lock and retry.");
            Durable(lockPath, Utf8.GetBytes(Environment.ProcessId.ToString()));
            try
            {
                var committed = journal.Phase == "committed";
                var kept = journal.Phase == "open" ? Rollback(root, journal, keepChanges) : [];
                if (!committed)
                    journal.Phase = "recovered";
                Persist(root, journal);
                Cleanup(root);
                output.WriteLine(committed
                    ? "Cleaned up a completed SheenUI installation."
                    : "Recovered interrupted SheenUI installation." + (kept.Count > 0 ? $" Kept changed paths: {string.Join(", ", kept)}." : ""));
                return true;
            }
            catch
            {
                if (File.Exists(lockPath))
                    File.Delete(lockPath);
                throw;
            }
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or InvalidOperationException or JsonException)
        {
            throw new InvalidOperationException(
                $"{ex.Message}{Environment.NewLine}Recovery journal retained at '{directory}'. Do not delete it before checking its backups (docs/adr/018-blazor-cli-recovery.md).", ex);
        }
    }

    private FileRecord Remember(string path)
    {
        var journal = _journal ?? Begin();
        var target = Path.GetRelativePath(_root, Path.GetFullPath(path)).Replace('\\', '/');
        var full = Checked(_root, target);
        var entry = journal.Files.Find(file => PathComparer.Equals(file.Target, target));
        if (entry != null)
            return entry;

        var original = ReadExisting(_root, target);
        entry = new FileRecord { Target = target };
        if (original != null)
        {
            entry.Before = new Backup { File = $"before-{journal.Files.Count}", Hash = Hash(original)! };
            Durable(Checked(_root, $"{DirectoryName}/{entry.Before.File}", metadata: true), original);
            if (!OperatingSystem.IsWindows())
                entry.Mode = (int)File.GetUnixFileMode(full);
        }
        journal.Files.Add(entry);
        return entry;
    }

    private Journal Begin()
    {
        var directory = Checked(_root, DirectoryName, metadata: true);
        if (Directory.Exists(directory) || File.Exists(directory))
            throw new InvalidOperationException("Another installation or an interrupted transaction exists; run 'sheenui recover' first.");
        Directory.CreateDirectory(directory);
        using var self = Process.GetCurrentProcess();
        var journal = new Journal
        {
            SchemaVersion = 1,
            Root = _root,
            Pid = Environment.ProcessId,
            Started = self.StartTime.ToUniversalTime().Ticks,
        };
        // CreateNew, then a non-overwriting move: of two concurrent CLIs only one owns the journal.
        var next = Checked(_root, $"{DirectoryName}/journal.next", metadata: true);
        Durable(next, JsonSerializer.SerializeToUtf8Bytes(journal, JsonOptions));
        File.Move(next, Checked(_root, $"{DirectoryName}/journal.json", metadata: true), overwrite: false);
        return _journal = journal;
    }

    private void CreateParents(string target)
    {
        var parts = target.Split('/');
        for (var i = 1; i < parts.Length; i++)
        {
            var relative = string.Join('/', parts[..i]);
            var full = Checked(_root, relative);
            if (Directory.Exists(full))
                continue;
            var record = new DirectoryRecord { Target = relative };
            _journal!.Directories.Add(record);
            Persist(_root, _journal);
            Directory.CreateDirectory(full);
            // shortcut: .NET exposes no inode and Unix creation times drift as entries change, so 0 records the
            // creation without an identity there; read the inode through a native stat if replaced directories matter.
            record.Created = OperatingSystem.IsWindows() ? Directory.GetCreationTimeUtc(full).Ticks : 0;
            Persist(_root, _journal);
        }
    }

    private static List<string> Rollback(string root, Journal journal, bool keepChanges)
    {
        var conflicts = journal.Files
            .Where(file => Hash(ReadExisting(root, file.Target)) is var current && current != file.Before?.Hash && !file.After.Contains(current))
            .Select(file => file.Target)
            .ToList();
        if (conflicts.Count > 0 && !keepChanges)
        {
            throw new InvalidOperationException(
                $"Interrupted installation: recovery stopped without changing files. Preserved changed paths: {string.Join(", ", conflicts)}. " +
                $"Original backups are in {DirectoryName}. Review them, then run 'sheenui recover --keep-changes' to keep the changed paths and restore the remaining files.");
        }

        foreach (var file in Enumerable.Reverse(journal.Files))
        {
            if (conflicts.Contains(file.Target))
                continue;
            var current = Hash(ReadExisting(root, file.Target));
            if (current == file.Before?.Hash)
                continue;
            if (!file.After.Contains(current))
                throw new InvalidOperationException($"'{file.Target}' changed during recovery; backups were retained.");
            if (file.Before == null)
                File.Delete(Checked(root, file.Target));
            else
                Replace(root, file.Target, ReadBackup(root, file), file.Mode);
            s_afterOperation?.Invoke("restore", file.Target);
        }

        foreach (var record in Enumerable.Reverse(journal.Directories))
        {
            var full = Checked(root, record.Target);
            // An uncertain creation, a replacement directory, or one with new content belongs to the user.
            if (record.Created == null || !Directory.Exists(full) ||
                (record.Created != 0 && Directory.GetCreationTimeUtc(full).Ticks != record.Created) ||
                Directory.EnumerateFileSystemEntries(full).Any())
                continue;
            Directory.Delete(full);
        }
        return conflicts;
    }

    private static void Cleanup(string root)
    {
        var directory = Checked(root, DirectoryName, metadata: true);
        var names = Directory.GetFileSystemEntries(directory).Select(entry => Path.GetFileName(entry)!).ToList();
        if (names.Any(name => !ReservedFile().IsMatch(name)))
            throw new InvalidOperationException($"Unknown files in {DirectoryName}; move them out before retrying. Backups were retained.");
        // Validate the complete set first; never recurse or follow a link.
        foreach (var name in names)
        {
            var full = Checked(root, $"{DirectoryName}/{name}", metadata: true);
            if (!File.Exists(full))
                throw new InvalidOperationException($"Invalid journal entry '{name}'; backups were retained.");
        }
        foreach (var name in names.Where(name => name is not "journal.json" and not "recovery.lock")
                     .Append("journal.json").Append("recovery.lock").Where(names.Contains))
        {
            File.Delete(Path.Combine(directory, name));
            s_afterOperation?.Invoke("cleanup", name);
        }
        Directory.Delete(directory);
    }

    private static Journal Load(string root)
    {
        var path = Checked(root, $"{DirectoryName}/journal.json", metadata: true);
        if (!File.Exists(path) || new FileInfo(path).Length > MaxJournalBytes)
            throw new InvalidOperationException("Missing or oversized recovery journal.");
        var journal = JsonSerializer.Deserialize<Journal>(File.ReadAllBytes(path), JsonOptions);
        if (journal is not { SchemaVersion: 1, Pid: > 0, Phase: "open" or "committed" or "recovered", Files: not null, Directories: not null } ||
            !PathComparer.Equals(journal.Root, root))
            throw new InvalidOperationException("Unsupported or invalid recovery journal.");

        var targets = new HashSet<string>(PathComparer);
        for (var index = 0; index < journal.Files.Count; index++)
        {
            var file = journal.Files[index];
            Checked(root, file.Target);
            if (!targets.Add(file.Target) || file.After == null || file.After.Any(hash => hash != null && !Digest().IsMatch(hash)) ||
                file.Mode is < 0 or > 511)
                throw new InvalidOperationException("Invalid recovery file record.");
            if (file.Before != null)
            {
                if (!Digest().IsMatch(file.Before.Hash ?? "") || file.Before.File != $"before-{index}")
                    throw new InvalidOperationException("Invalid original backup record.");
                if (journal.Phase == "open")
                    ReadBackup(root, file);
            }
        }
        foreach (var record in journal.Directories)
            Checked(root, record.Target);
        return journal;
    }

    private static byte[] ReadBackup(string root, FileRecord file)
    {
        var path = Checked(root, $"{DirectoryName}/{file.Before!.File}", metadata: true);
        var bytes = File.Exists(path) ? File.ReadAllBytes(path) : null;
        if (bytes == null || Hash(bytes) != file.Before.Hash)
            throw new InvalidOperationException($"Original backup for '{file.Target}' is missing or damaged.");
        return bytes;
    }

    private static bool Alive(Journal journal)
    {
        try
        {
            using var process = Process.GetProcessById(journal.Pid);
            // A reused process id belongs to another program; start times are read with sub-second drift on Linux.
            return !process.HasExited && Math.Abs(process.StartTime.ToUniversalTime().Ticks - journal.Started) < TimeSpan.TicksPerSecond;
        }
        catch (ArgumentException)
        {
            return false;
        }
        catch (Exception ex) when (ex is InvalidOperationException or System.ComponentModel.Win32Exception or NotSupportedException)
        {
            throw new InvalidOperationException($"Cannot establish whether CLI process {journal.Pid} is still running.");
        }
    }

    /// <summary>Validates a journal path lexically, against the project root, and refuses any link on the way.</summary>
    private static string Checked(string root, string relative, bool metadata = false)
    {
        var parts = relative?.Split('/') ?? [];
        if (relative == null || relative.Contains('\\') || relative.Contains(':') || relative.Any(char.IsControl) ||
            parts.Any(part => part is "" or "." or ".." || part.EndsWith('.') || part.EndsWith(' ') || DeviceName().IsMatch(part)) ||
            (!metadata && PathComparer.Equals(parts[0], DirectoryName)))
            throw new InvalidOperationException($"Unsafe recovery path '{relative}'.");
        var full = Path.Combine([root, .. parts]);
        ProjectPath.Validate(root, full);
        var current = root;
        foreach (var part in parts)
        {
            current = Path.Combine(current, part);
            FileSystemInfo info = Directory.Exists(current) ? new DirectoryInfo(current) : new FileInfo(current);
            if (info.LinkTarget != null)
                throw new InvalidOperationException($"Recovery refuses linked path '{relative}'.");
        }
        return full;
    }

    private static byte[]? ReadExisting(string root, string target)
    {
        var full = Checked(root, target);
        if (Directory.Exists(full))
            throw new InvalidOperationException($"Recovery expected a regular file at '{target}'.");
        return File.Exists(full) ? File.ReadAllBytes(full) : null;
    }

    private static string? Hash(byte[]? bytes) => bytes == null ? null : EmbeddedRegistry.ComputeSha256(bytes);

    private static void Durable(string path, byte[] bytes)
    {
        using var stream = new FileStream(path, FileMode.CreateNew, FileAccess.Write, FileShare.None);
        stream.Write(bytes);
        stream.Flush(flushToDisk: true);
    }

    private static void Persist(string root, Journal journal)
    {
        var next = Checked(root, $"{DirectoryName}/journal.next", metadata: true);
        File.Delete(next);
        Durable(next, JsonSerializer.SerializeToUtf8Bytes(journal, JsonOptions));
        Move(next, Checked(root, $"{DirectoryName}/journal.json", metadata: true));
        s_afterOperation?.Invoke("journal", journal.Phase);
    }

    /// <summary>Writes to a synced staging file on the same filesystem, then renames it into place.</summary>
    private static void Replace(string root, string target, byte[] bytes, int mode)
    {
        var stage = Checked(root, $"{DirectoryName}/write.next", metadata: true);
        File.Delete(stage);
        Durable(stage, bytes);
        if (mode != 0 && !OperatingSystem.IsWindows())
            File.SetUnixFileMode(stage, (UnixFileMode)mode);
        Move(stage, Checked(root, target));
    }

    // Antivirus, indexers and dev-server watchers briefly lock files on Windows.
    private static void Move(string source, string destination)
    {
        for (var attempt = 1; ; attempt++)
        {
            try
            {
                File.Move(source, destination, overwrite: true);
                return;
            }
            catch (Exception ex) when (attempt < 10 && (ex is UnauthorizedAccessException ||
                                                        ex is IOException and not FileNotFoundException and not DirectoryNotFoundException))
            {
                Thread.Sleep(25 * attempt);
            }
        }
    }
}
