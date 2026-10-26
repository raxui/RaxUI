using System.Reflection;
using System.Text;
using SheenUI.Cli;
using SheenUI.Cli.Commands;
using SheenUI.Cli.Configuration;
using SheenUI.Cli.Registry;

namespace SheenUI.Integration.Tests;

public class UpdateWorkflowTests : IDisposable
{
    private readonly string _app = Path.Combine(Path.GetTempPath(), "SheenUI_Update_" + Guid.NewGuid().ToString("N"));
    private readonly StringWriter _output = new();
    private readonly StringWriter _error = new();
    private string ButtonPath => Path.Combine(_app, "Components/UI/Button/Button.razor");
    private string LockPath => Path.Combine(_app, SheenUiLock.DefaultFileName);

    public UpdateWorkflowTests()
    {
        Directory.CreateDirectory(_app);
        InstallationWorkflowTests.CreateSampleBlazorProject(_app);
        Assert.Equal(0, Program.Run(["init"], _app, _output, _error));
        Assert.Equal(0, Program.Run(["add", "button"], _app, _output, _error));
    }

    private int Update(string? component = null, bool dryRun = false) =>
        UpdateCommand.Execute(_app, component, dryRun, _output, _error);

    // Simulate a real prior registry release: its installed bytes and both hashes agree.
    private void InstallOldButton()
    {
        var old = Encoding.UTF8.GetBytes("<button>Previous release</button>\n");
        File.WriteAllBytes(ButtonPath, old);
        var locked = SheenUiLock.LoadOrCreate(_app);
        var tracked = locked.FindTrackedFile("Components/UI/Button/Button.razor")!;
        tracked.SourceHash = tracked.InstalledHash = EmbeddedRegistry.ComputeSha256(old);
        locked.Components["button"].RegistryVersion = "0.0.1";
        locked.Components["button"].ManifestSha256 = new string('0', 64);
        locked.Save(_app);
    }

    [Fact]
    public void Updates_components_and_shared_core_preserving_starter_and_imports_then_is_idempotent()
    {
        InstallOldButton();
        var corePath = Path.Combine(_app, "wwwroot/css/sheenui/sheenui.css");
        var oldSource = Encoding.UTF8.GetBytes(StyleImports.Start + StyleImports.End + ":root { --old: 1; }\n");
        var oldInstalled = StyleImports.Append(oldSource, ["starter.css", "components/button.css"]);
        File.WriteAllBytes(corePath, oldInstalled);
        var locked = SheenUiLock.LoadOrCreate(_app);
        var tracked = locked.Assets["wwwroot/css/sheenui/sheenui.css"];
        tracked.SourceHash = EmbeddedRegistry.ComputeSha256(oldSource);
        tracked.InstalledHash = EmbeddedRegistry.ComputeSha256(oldInstalled);
        locked.Save(_app);
        var starterBefore = locked.Components["starter"];
        Directory.CreateDirectory(Path.Combine(_app, "Components/Pages"));
        File.WriteAllText(Path.Combine(_app, "Components/Pages/Home.razor"), "My custom demo home");
        var source = new EmbeddedRegistry().GetResourceBytes("components/button/Button.razor");

        Assert.True(Update() == 0, _error.ToString());

        Assert.Equal(source, File.ReadAllBytes(ButtonPath));
        Assert.Equal("My custom demo home", File.ReadAllText(Path.Combine(_app, "Components/Pages/Home.razor")));
        var after = SheenUiLock.LoadOrCreate(_app);
        Assert.Equal(starterBefore.ManifestSha256, after.Components["starter"].ManifestSha256);
        Assert.Equal(ReleaseIdentity.Version, after.Components["button"].RegistryVersion);
        Assert.Equal(EmbeddedRegistry.ComputeSha256(source), after.FindTrackedFile("Components/UI/Button/Button.razor")!.SourceHash);
        StyleImports.Verify(File.ReadAllBytes(corePath), after.FindTrackedFile("wwwroot/css/sheenui/sheenui.css"),
            new EmbeddedRegistry().GetResourceBytes("styles/sheenui.css"));
        Assert.Contains("@import url(\"starter.css\");", File.ReadAllText(corePath));
        Assert.Contains("@import url(\"components/button.css\");", File.ReadAllText(corePath));
        var snapshot = InstallationWorkflowTests.SnapshotFiles(_app);
        Assert.Equal(0, Update());
        Assert.Equal(snapshot, InstallationWorkflowTests.SnapshotFiles(_app));
        Assert.Equal(0, Program.Run(["add", "button"], _app, _output, _error));
    }

    [Fact]
    public void Dry_run_lists_updates_without_writing_anything()
    {
        InstallOldButton();
        var before = InstallationWorkflowTests.SnapshotFiles(_app);
        Assert.Equal(0, Update(dryRun: true));
        Assert.Contains("Update: Components/UI/Button/Button.razor", _output.ToString());
        Assert.Contains("no files were changed", _output.ToString());
        Assert.Equal(before, InstallationWorkflowTests.SnapshotFiles(_app));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void A_local_and_upstream_conflict_aborts_the_entire_update(bool dryRun)
    {
        InstallOldButton();
        File.AppendAllText(ButtonPath, "<!-- my local edit -->");
        var before = InstallationWorkflowTests.SnapshotFiles(_app);
        Assert.Equal(1, Update(dryRun: dryRun));
        Assert.Contains("changed locally and in the registry", _error.ToString());
        Assert.Contains("No files were changed", _error.ToString());
        Assert.Equal(before, InstallationWorkflowTests.SnapshotFiles(_app));
    }

    [Fact]
    public void Local_edits_are_kept_when_upstream_is_unchanged_without_resetting_the_baseline()
    {
        var beforeLock = SheenUiLock.LoadOrCreate(_app);
        var originalHash = beforeLock.FindTrackedFile("Components/UI/Button/Button.razor")!.InstalledHash;
        File.AppendAllText(ButtonPath, "<!-- my local edit -->");
        var edited = File.ReadAllBytes(ButtonPath);

        Assert.Equal(0, Update());

        Assert.Equal(edited, File.ReadAllBytes(ButtonPath));
        Assert.Equal(originalHash, SheenUiLock.LoadOrCreate(_app).FindTrackedFile("Components/UI/Button/Button.razor")!.InstalledHash);
        Assert.Contains("Kept local edits", _output.ToString());
    }

    [Fact]
    public void A_manually_merged_file_matching_the_new_release_is_accepted()
    {
        var current = File.ReadAllBytes(ButtonPath);
        InstallOldButton();
        File.WriteAllBytes(ButtonPath, current);
        Assert.Equal(0, Update());
        Assert.Equal(EmbeddedRegistry.ComputeSha256(current), SheenUiLock.LoadOrCreate(_app).FindTrackedFile("Components/UI/Button/Button.razor")!.SourceHash);
    }

    [Fact]
    public void Modified_core_is_a_conflict_even_if_a_component_can_be_updated()
    {
        InstallOldButton();
        File.AppendAllText(Path.Combine(_app, "wwwroot/css/sheenui/sheenui.css"), "/* app rule */");
        var before = InstallationWorkflowTests.SnapshotFiles(_app);
        Assert.Equal(1, Update());
        Assert.Contains("sheenui.css was modified locally", _error.ToString());
        Assert.Equal(before, InstallationWorkflowTests.SnapshotFiles(_app));
    }

    [Fact]
    public void A_single_component_does_not_update_unrelated_installed_components()
    {
        Assert.Equal(0, Program.Run(["add", "dialog"], _app, _output, _error));
        InstallOldButton();
        var dialogPath = Path.Combine(_app, "Components/UI/Dialog/Dialog.razor");
        File.WriteAllText(dialogPath, "locally modified dialog");
        Assert.Equal(0, Update("BUTTON"));
        Assert.Equal("locally modified dialog", File.ReadAllText(dialogPath));
    }

    [Fact]
    public void New_dependencies_are_installed_in_the_same_update()
    {
        var registry = new EmbeddedRegistry(typeof(DependencyInstallTests).Assembly, "SheenUI.Integration.Tests.TestRegistry.");
        Assert.Equal(0, AddCommand.Execute(_app, "alpha", _output, _error, registry));
        // The older alpha did not include beta as a dependency.
        var locked = SheenUiLock.LoadOrCreate(_app);
        locked.Components.Remove("beta");
        locked.Save(_app);
        File.Delete(Path.Combine(_app, "Components/UI/Beta/Beta.razor"));
        var importsPath = Path.Combine(_app, "Components/_Imports.razor");
        File.WriteAllLines(importsPath, File.ReadAllLines(importsPath).Where(line => !line.EndsWith(".Beta", StringComparison.Ordinal)));

        Assert.True(UpdateCommand.Execute(_app, "alpha", false, _output, _error, registry) == 0, _error.ToString());

        Assert.True(File.Exists(Path.Combine(_app, "Components/UI/Beta/Beta.razor")));
        Assert.Contains("@using TestConsumerApp.Components.UI.Beta", File.ReadAllText(importsPath));
        Assert.True(SheenUiLock.LoadOrCreate(_app).Components.ContainsKey("beta"));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void Obsolete_files_are_removed_only_if_unmodified(bool localEdit)
    {
        var path = Path.Combine(_app, "Components/UI/Button/Old.razor");
        File.WriteAllText(path, "old upstream file");
        var locked = SheenUiLock.LoadOrCreate(_app);
        var hash = EmbeddedRegistry.ComputeSha256(File.ReadAllBytes(path));
        locked.Components["button"].Files.Add(new LockedFile { Target = "Components/UI/Button/Old.razor", SourceHash = hash, InstalledHash = hash });
        locked.Save(_app);
        if (localEdit) File.AppendAllText(path, " local edit");
        var before = InstallationWorkflowTests.SnapshotFiles(_app);

        Assert.Equal(localEdit ? 1 : 0, Update());

        if (localEdit)
        {
            Assert.Contains("removed upstream but modified locally", _error.ToString());
            Assert.Equal(before, InstallationWorkflowTests.SnapshotFiles(_app));
        }
        else Assert.False(File.Exists(path));
    }

    [Fact]
    public void Missing_lock_or_locally_deleted_component_requires_explicit_recovery()
    {
        File.Delete(ButtonPath);
        var before = InstallationWorkflowTests.SnapshotFiles(_app);
        Assert.Equal(1, Update());
        Assert.Equal(before, InstallationWorkflowTests.SnapshotFiles(_app));
        File.Delete(LockPath);
        before = InstallationWorkflowTests.SnapshotFiles(_app);
        Assert.Equal(1, Update());
        Assert.Contains("lock.json is required", _error.ToString());
        Assert.Equal(before, InstallationWorkflowTests.SnapshotFiles(_app));
    }

    [Fact]
    public void Failed_lock_write_rolls_back_component_and_config_changes()
    {
        InstallOldButton();
        var before = InstallationWorkflowTests.SnapshotFiles(_app);
        // A held file handle blocks the write only on Windows; fail right after the lock write on every platform.
        var hook = typeof(FileTransaction).GetField("s_afterOperation", BindingFlags.NonPublic | BindingFlags.Static)!;
        var thread = Environment.CurrentManagedThreadId;
        hook.SetValue(null, (Action<string, string>)((operation, path) =>
        {
            if (Environment.CurrentManagedThreadId == thread && operation == "write" && path == SheenUiLock.DefaultFileName)
                throw new IOException("Simulated lock write failure.");
        }));
        try
        {
            Assert.Equal(1, Update());
        }
        finally
        {
            hook.SetValue(null, null);
        }
        Assert.Contains("Simulated lock write failure.", _error.ToString());
        Assert.Equal(before, InstallationWorkflowTests.SnapshotFiles(_app));
        Assert.False(Path.Exists(Path.Combine(_app, FileTransaction.DirectoryName)));
    }

    [Fact]
    public void Component_directory_link_outside_the_project_is_rejected_before_writes()
    {
        var outside = Path.Combine(Path.GetTempPath(), "SheenUI_UpdateOutside_" + Guid.NewGuid().ToString("N"));
        var folder = Path.Combine(_app, "Components/UI/Button");
        Directory.Move(folder, outside);
        try
        {
            if (OperatingSystem.IsWindows())
            {
                using var process = System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo("cmd.exe")
                {
                    Arguments = $"/c mklink /J \"{folder}\" \"{outside}\"",
                    UseShellExecute = false,
                    RedirectStandardOutput = true,
                    CreateNoWindow = true,
                })!;
                process.WaitForExit();
                Assert.Equal(0, process.ExitCode);
            }
            else Directory.CreateSymbolicLink(folder, outside);
            var before = InstallationWorkflowTests.SnapshotFiles(outside);
            var lockBefore = File.ReadAllBytes(LockPath);

            Assert.Equal(1, Update());

            Assert.Contains("escapes", _error.ToString());
            Assert.Equal(before, InstallationWorkflowTests.SnapshotFiles(outside));
            Assert.Equal(lockBefore, File.ReadAllBytes(LockPath));
        }
        finally
        {
            if (Directory.Exists(folder)) Directory.Delete(folder);
            Directory.Move(outside, folder);
        }
    }

    public void Dispose() => Directory.Delete(_app, recursive: true);
}
