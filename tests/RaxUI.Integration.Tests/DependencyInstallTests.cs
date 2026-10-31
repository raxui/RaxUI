using RaxUI.Cli;
using RaxUI.Cli.Commands;
using RaxUI.Cli.Configuration;
using RaxUI.Cli.Registry;

namespace RaxUI.Integration.Tests;

// `add` installs a component's dependencies first, as one transaction (issue #37, phase 0).
// TestRegistry/ is embedded in this assembly: alpha depends on beta.
public class DependencyInstallTests : IDisposable
{
    private static readonly EmbeddedRegistry TestRegistry =
        new(typeof(DependencyInstallTests).Assembly, "RaxUI.Integration.Tests.TestRegistry.");

    private readonly string _app = Path.Combine(Path.GetTempPath(), "RaxUI_Deps_" + Guid.NewGuid().ToString("N"));
    private readonly StringWriter _output = new();
    private readonly StringWriter _error = new();

    public DependencyInstallTests()
    {
        Directory.CreateDirectory(_app);
        InstallationWorkflowTests.CreateSampleBlazorProject(_app);
        Assert.Equal(0, Program.Run(["init"], _app, new StringWriter(), new StringWriter()));
    }

    public void Dispose()
    {
        try { Directory.Delete(_app, true); } catch (IOException) { } catch (UnauthorizedAccessException) { }
    }

    private int Add(string name) => AddCommand.Execute(_app, name, _output, _error, TestRegistry);
    private string Ui(string relative) => Path.Combine(_app, "Components", "UI", relative);
    private string Imports => File.ReadAllText(Path.Combine(_app, "Components", "_Imports.razor"));

    [Fact]
    public void Add_installs_the_dependency_first_with_imports_and_lock_entries()
    {
        Assert.Equal(0, Add("alpha"));

        Assert.True(File.Exists(Ui("Beta/Beta.razor")));
        Assert.True(File.Exists(Ui("Alpha/Alpha.razor")));
        Assert.Contains("@using TestConsumerApp.Components.UI.Beta", Imports);
        Assert.Contains("@using TestConsumerApp.Components.UI.Alpha", Imports);
        var lockFile = RaxUiLock.LoadOrCreate(_app);
        Assert.True(lockFile.Components.ContainsKey("beta"));
        Assert.True(lockFile.Components.ContainsKey("alpha"));
        var text = _output.ToString();
        Assert.True(text.IndexOf("Dependency 'beta' installed", StringComparison.Ordinal) <
                    text.IndexOf("Component 'alpha' installed", StringComparison.Ordinal));
    }

    [Fact]
    public void An_installed_dependency_is_kept_with_its_local_edits()
    {
        Assert.Equal(0, Add("beta"));
        File.WriteAllText(Ui("Beta/Beta.razor"), "<span>My beta</span>\n");

        Assert.Equal(0, Add("alpha"));

        Assert.Equal("<span>My beta</span>\n", File.ReadAllText(Ui("Beta/Beta.razor")));
        Assert.True(File.Exists(Ui("Alpha/Alpha.razor")));
        Assert.Contains("Dependency 'beta' is already installed; kept as is.", _output.ToString());
    }

    [Fact]
    public void A_conflict_in_the_requested_component_writes_nothing()
    {
        Directory.CreateDirectory(Ui("Alpha"));
        File.WriteAllText(Ui("Alpha/Alpha.razor"), "mine");
        var importsBefore = Imports;
        var lockBefore = File.ReadAllText(Path.Combine(_app, RaxUiLock.DefaultFileName));

        Assert.Equal(1, Add("alpha"));

        Assert.Contains("not managed by RaxUI", _error.ToString());
        Assert.False(Directory.Exists(Ui("Beta")), "The dependency was not written either.");
        Assert.Equal("mine", File.ReadAllText(Ui("Alpha/Alpha.razor")));
        Assert.Equal(importsBefore, Imports);
        Assert.Equal(lockBefore, File.ReadAllText(Path.Combine(_app, RaxUiLock.DefaultFileName)));
    }

    [Fact]
    public void Adding_again_changes_no_file()
    {
        Assert.Equal(0, Add("alpha"));
        var before = InstallationWorkflowTests.SnapshotFiles(_app);

        Assert.Equal(0, Add("alpha"));

        Assert.Equal(before, InstallationWorkflowTests.SnapshotFiles(_app));
    }
}
