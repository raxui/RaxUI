using System.Diagnostics;
using System.Security.Cryptography;
using RaxUI.Cli;
using RaxUI.Cli.Commands;
using RaxUI.Cli.Configuration;

namespace RaxUI.Integration.Tests;

/// <summary>Kills real CLI processes right after actual filesystem operations, then recovers (ADR 018).</summary>
public class CrashRecoveryTests : IDisposable
{
    private readonly string _app = Path.Combine(Path.GetTempPath(), "RaxUI_Crash_" + Guid.NewGuid().ToString("N"));
    private string Transaction => Path.Combine(_app, FileTransaction.DirectoryName);
    private string AppRazor => Path.Combine(_app, "Components", "App.razor");

    public CrashRecoveryTests()
    {
        Directory.CreateDirectory(_app);
        InstallationWorkflowTests.CreateSampleBlazorProject(_app);
    }

    private (int Code, string Output, string Error) Cli(params string[] args)
    {
        var output = new StringWriter();
        var error = new StringWriter();
        return (Program.Run(args, _app, output, error), output.ToString(), error.ToString());
    }

    private void Crash(string at, params string[] args)
    {
        var marker = Path.Combine(Path.GetTempPath(), "RaxUI_CrashMarker_" + Guid.NewGuid().ToString("N"));
        var start = new ProcessStartInfo("dotnet") { UseShellExecute = false, RedirectStandardOutput = true, RedirectStandardError = true };
        string[] arguments = ["exec", Path.Combine(AppContext.BaseDirectory, "RaxUI.Cli.dll"), .. args, "--cwd", _app];
        foreach (var arg in arguments)
            start.ArgumentList.Add(arg);
        start.Environment["DOTNET_STARTUP_HOOKS"] = typeof(CrashRecoveryTests).Assembly.Location;
        start.Environment["RAXUI_TEST_CRASH_AT"] = at;
        start.Environment["RAXUI_TEST_CRASH_MARKER"] = marker;
        using var process = Process.Start(start)!;
        var stdout = process.StandardOutput.ReadToEndAsync();
        var stderr = process.StandardError.ReadToEndAsync();
        Assert.True(process.WaitForExit(TimeSpan.FromMinutes(2)), $"CLI did not reach crash point {at}.");
        try
        {
            Assert.True(File.Exists(marker), $"CLI exited ({process.ExitCode}) before crash point {at}: {stdout.Result}{stderr.Result}");
        }
        finally
        {
            File.Delete(marker);
        }
        Assert.True(Directory.Exists(Transaction));
    }

    private SortedDictionary<string, string> Snapshot()
    {
        var result = new SortedDictionary<string, string>(StringComparer.Ordinal);
        foreach (var entry in Directory.EnumerateFileSystemEntries(_app, "*", SearchOption.AllDirectories))
        {
            var relative = Path.GetRelativePath(_app, entry).Replace('\\', '/');
            if (relative.Split('/')[0] is FileTransaction.DirectoryName or "obj" or "bin")
                continue;
            result[relative] = Directory.Exists(entry) ? "directory" : Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(entry)));
        }
        return result;
    }

    [Fact]
    public void Crash_after_the_first_init_write_is_rolled_back_and_init_then_succeeds()
    {
        var before = Snapshot();
        Crash("write:*", "init");
        Assert.NotEqual(before, Snapshot());

        var recovered = Cli("recover");
        Assert.True(recovered.Code == 0, recovered.Error);
        Assert.Contains("Recovered interrupted RaxUI installation.", recovered.Output);
        Assert.Equal(before, Snapshot());
        Assert.False(Path.Exists(Transaction));
        Assert.Equal(0, Cli("init").Code);
    }

    [Fact]
    public void Crash_after_the_lock_write_but_before_the_commit_marker_still_rolls_back()
    {
        var before = Snapshot();
        Crash("write:" + RaxUiLock.DefaultFileName, "init");
        Assert.True(File.Exists(Path.Combine(_app, RaxUiLock.DefaultFileName)));

        // The next init recovers first, then installs normally.
        var init = Cli("init");
        Assert.True(init.Code == 0, init.Error);
        Assert.Contains("Recovered interrupted RaxUI installation.", init.Output);
        Assert.False(Path.Exists(Transaction));
        Assert.NotEqual(before, Snapshot());
    }

    [Theory]
    [InlineData("journal:committed")]
    [InlineData("cleanup:before-")]
    public void Crash_after_the_commit_marker_only_cleans_up_and_keeps_the_installation(string at)
    {
        Crash(at, "init");
        var installed = Snapshot();
        Assert.True(File.Exists(Path.Combine(_app, RaxUiLock.DefaultFileName)));

        var recovered = Cli("recover");
        Assert.True(recovered.Code == 0, recovered.Error);
        Assert.Contains("Cleaned up a completed RaxUI installation.", recovered.Output);
        Assert.Equal(installed, Snapshot());
        Assert.False(Path.Exists(Transaction));
    }

    [Fact]
    public void Crash_during_add_restores_the_initialized_project()
    {
        Assert.Equal(0, Cli("init").Code);
        var before = Snapshot();
        Crash("write:*", "add", "button");

        Assert.True(Cli("recover").Code == 0);
        Assert.Equal(before, Snapshot());
    }

    [Fact]
    public void User_edits_block_automatic_rollback_and_keep_changes_preserves_them()
    {
        var before = Snapshot();
        Crash("write:" + RaxUiLock.DefaultFileName, "init");
        File.AppendAllText(AppRazor, "<!-- my edit -->");
        var userFile = Path.Combine(_app, "wwwroot", "css", "raxui", "mine.css");
        File.WriteAllText(userFile, "/* mine */");
        var edited = Snapshot();

        var refused = Cli("recover");
        Assert.Equal(1, refused.Code);
        Assert.Contains("Preserved changed paths: Components/App.razor", refused.Error);
        Assert.Equal(edited, Snapshot());
        Assert.Equal(1, Cli("init").Code);
        Assert.Equal(edited, Snapshot());

        var kept = Cli("recover", "--keep-changes");
        Assert.True(kept.Code == 0, kept.Error);
        Assert.Contains("Kept changed paths: Components/App.razor", kept.Output);
        Assert.EndsWith("<!-- my edit -->", File.ReadAllText(AppRazor));
        Assert.Equal("/* mine */", File.ReadAllText(userFile));
        Assert.False(File.Exists(Path.Combine(_app, RaxUiLock.DefaultFileName)));
        Assert.All(before.Keys.Where(key => key != "Components/App.razor"), key => Assert.Equal(before[key], Snapshot()[key]));
    }

    [Fact]
    public void Interrupted_rollback_is_replayable_after_removing_the_reported_recovery_lock()
    {
        var before = Snapshot();
        Crash("write:" + RaxUiLock.DefaultFileName, "init");
        Crash("restore:*", "recover");

        var locked = Cli("recover");
        Assert.Equal(1, locked.Code);
        Assert.Contains("Recovery lock exists", locked.Error);
        File.Delete(Path.Combine(Transaction, "recovery.lock"));

        Assert.True(Cli("recover").Code == 0);
        Assert.Equal(before, Snapshot());
    }

    [Fact]
    public void Damaged_backups_and_traversing_journals_stop_before_project_writes()
    {
        Crash("write:" + RaxUiLock.DefaultFileName, "init");
        var crashed = Snapshot();
        var backup = Directory.GetFiles(Transaction, "before-*").First();
        var original = File.ReadAllBytes(backup);
        File.WriteAllText(backup, "damaged");
        var damaged = Cli("recover");
        Assert.Equal(1, damaged.Code);
        Assert.Contains("missing or damaged", damaged.Error);
        Assert.Contains("Recovery journal retained", damaged.Error);
        Assert.Equal(crashed, Snapshot());

        File.WriteAllBytes(backup, original);
        var journal = Path.Combine(Transaction, "journal.json");
        var json = File.ReadAllText(journal);
        File.WriteAllText(journal, json.Replace("\"target\":\"Components/App.razor\"", "\"target\":\"../outside.razor\""));
        var traversal = Cli("recover");
        Assert.Equal(1, traversal.Code);
        Assert.Contains("Unsafe recovery path", traversal.Error);
        Assert.Equal(crashed, Snapshot());

        File.WriteAllText(journal, json);
        Assert.True(Cli("recover").Code == 0);
    }

    [Fact]
    public void A_live_owner_blocks_recovery_and_new_installs()
    {
        var transaction = new FileTransaction(_app);
        var file = Path.Combine(_app, "Components", "Owned.razor");
        transaction.Write(file, [1, 2, 3]);

        var recover = Cli("recover");
        Assert.Equal(1, recover.Code);
        Assert.Contains("is still running", recover.Error);
        Assert.Equal(1, Cli("init").Code);

        transaction.Restore(TextWriter.Null);
        Assert.False(File.Exists(file));
        Assert.False(Path.Exists(Transaction));
    }

    [Fact]
    public void Dry_run_and_other_commands_never_recover_or_take_recovery_options()
    {
        Assert.Equal(0, Cli("init").Code);
        Crash("write:*", "add", "button");
        var crashed = Snapshot();

        var dryRun = Cli("update", "--dry-run");
        Assert.Equal(1, dryRun.Code);
        Assert.Contains("run 'raxui recover' first", dryRun.Error);
        var option = Cli("add", "button", "--keep-changes");
        Assert.Equal(1, option.Code);
        Assert.Contains("only supported by recover", option.Error);
        Assert.Equal(crashed, Snapshot());
        Assert.True(Directory.Exists(Transaction));
    }

    [Fact]
    public void An_unused_transaction_directory_is_removed_and_nothing_else_is_reported()
    {
        Assert.Contains("No interrupted RaxUI installation found.", Cli("recover").Output);
        Directory.CreateDirectory(Transaction);
        File.WriteAllText(Path.Combine(Transaction, "journal.next"), "{");

        Assert.Contains("Removed an unused RaxUI transaction directory.", Cli("recover").Output);
        Assert.False(Path.Exists(Transaction));
    }

    public void Dispose() => Directory.Delete(_app, recursive: true);
}
