using SheenUI.Cli;
using SheenUI.Cli.Configuration;
using SheenUI.Cli.Registry;

namespace SheenUI.Integration.Tests;

public class ComponentStylesTests : IDisposable
{
    private readonly string _app = Path.Combine(Path.GetTempPath(), "SheenUI_Styles_" + Guid.NewGuid().ToString("N"));
    private string Styles => Path.Combine(_app, "wwwroot/css/sheenui");
    private string Core => Path.Combine(Styles, "sheenui.css");

    public ComponentStylesTests()
    {
        Directory.CreateDirectory(_app);
        InstallationWorkflowTests.CreateSampleBlazorProject(_app);
        Run("init");
    }

    private void Run(params string[] args)
    {
        var error = new StringWriter();
        Assert.True(Program.Run(args, _app, TextWriter.Null, error) == 0, error.ToString());
    }

    [Fact]
    public void Button_installs_only_its_css_and_one_import_and_init_preserves_it()
    {
        Run("add", "button");
        Assert.Equal(["button.css"], Directory.GetFiles(Path.Combine(Styles, "components")).Select(Path.GetFileName));
        var css = File.ReadAllText(Core);
        Assert.Equal(1, css.Split("@import url(\"components/button.css\");").Length - 1);
        Assert.DoesNotContain(".sheen-dialog", css);
        Assert.DoesNotContain(".sheen-input", css);
        Assert.Contains("@import url(\"starter.css\");", css);
        Assert.True(File.Exists(Path.Combine(Styles, "starter.css")));
        var before = InstallationWorkflowTests.SnapshotFiles(_app);
        Run("add", "button");
        Run("init");
        Assert.Equal(before, InstallationWorkflowTests.SnapshotFiles(_app));
    }

    [Fact]
    public void Imports_follow_dependency_order_and_a_component_without_css_adds_no_import()
    {
        Run("add", "combobox");
        var registry = new EmbeddedRegistry();
        var expected = registry.ResolveComponents("combobox").SelectMany(m => m.Assets).Select(a => $"@import url(\"{a.Target}\");").ToArray();
        Assert.True(expected.Length > 1);
        Assert.Equal(expected, File.ReadLines(Core).Where(l => l.StartsWith("@import url(\"components/", StringComparison.Ordinal)));
        Run("add", "form");
        Assert.DoesNotContain("components/form.css", File.ReadAllText(Core));
    }

    [Fact]
    public void Edited_component_css_is_kept_on_repeated_adds_with_its_original_lock_hash()
    {
        Run("add", "button");
        var file = Path.Combine(Styles, "components/button.css");
        var original = SheenUiLock.LoadOrCreate(_app).FindTrackedFile("wwwroot/css/sheenui/components/button.css")!.InstalledHash;
        File.AppendAllText(file, "\n/* local customization */\n");
        var edited = File.ReadAllText(file);
        Run("add", "button");
        Run("add", "button");
        Assert.Equal(edited, File.ReadAllText(file));
        Assert.Equal(original, SheenUiLock.LoadOrCreate(_app).FindTrackedFile("wwwroot/css/sheenui/components/button.css")!.InstalledHash);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void Unsafe_core_edit_is_refused_before_any_write(bool importListOnly)
    {
        if (importListOnly)
            File.WriteAllText(Core, File.ReadAllText(Core).Replace("/* sheenui:imports:end */", "@import url(\"custom.css\");\n/* sheenui:imports:end */"));
        else
            File.AppendAllText(Core, "\n.custom { color: red; }\n");
        var before = InstallationWorkflowTests.SnapshotFiles(_app);
        var error = new StringWriter();
        Assert.Equal(1, Program.Run(["add", "button"], _app, TextWriter.Null, error));
        Assert.Contains("Restore the CLI-installed file", error.ToString());
        Assert.Equal(before, InstallationWorkflowTests.SnapshotFiles(_app));
    }

    [Fact]
    public void Failure_after_css_write_restores_the_core_component_css_and_lock()
    {
        File.Delete(Path.Combine(_app, "Components/_Imports.razor"));
        Directory.CreateDirectory(Path.Combine(_app, "Components/_Imports.razor"));
        var before = InstallationWorkflowTests.SnapshotFiles(_app);
        Assert.Equal(1, Program.Run(["add", "button"], _app, TextWriter.Null, TextWriter.Null));
        Assert.Equal(before, InstallationWorkflowTests.SnapshotFiles(_app));
        Assert.False(Directory.Exists(Path.Combine(Styles, "components")));
    }

    public void Dispose()
    {
        try { Directory.Delete(_app, true); } catch (IOException) { } catch (UnauthorizedAccessException) { }
    }
}
