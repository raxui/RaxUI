using SheenUI.Cli;
using SheenUI.Cli.Commands;
using SheenUI.Cli.Configuration;

namespace SheenUI.Integration.Tests;

// `init` records the chosen appearance and accent on <html>; `add` takes several component names.
public class InitThemeAndMultiAddTests : IDisposable
{
    private readonly string _app = Path.Combine(Path.GetTempPath(), "SheenUI_Theme_" + Guid.NewGuid().ToString("N"));
    private string AppRazor => Path.Combine(_app, "Components", "App.razor");

    public InitThemeAndMultiAddTests()
    {
        Directory.CreateDirectory(_app);
        InstallationWorkflowTests.CreateSampleBlazorProject(_app);
    }

    public void Dispose()
    {
        try { Directory.Delete(_app, true); } catch (IOException) { } catch (UnauthorizedAccessException) { }
    }

    private (int Code, string Error) Run(TextReader? input, params string[] args)
    {
        var error = new StringWriter();
        return (Program.Run(args, _app, TextWriter.Null, error, input), error.ToString());
    }

    [Fact]
    public void Flags_write_attributes_on_html_and_config()
    {
        Assert.Equal(0, Run(null, "init", "--appearance", "glass", "--accent", "emerald").Code);
        var app = File.ReadAllText(AppRazor);
        Assert.Contains("data-sheen-appearance=\"glass\"", app);
        Assert.Contains("data-sheen-accent=\"emerald\"", app);
        var theme = SheenUiConfig.Load(_app)!.Theme;
        Assert.Equal(("glass", "emerald"), (theme.Appearance, theme.Accent));
    }

    [Fact]
    public void Prompt_answers_by_number_and_name_and_enter_keeps_defaults()
    {
        Assert.Equal(0, Run(new StringReader("3\nindigo\n"), "init").Code);
        var app = File.ReadAllText(AppRazor);
        Assert.Contains("data-sheen-appearance=\"glass\"", app);
        Assert.Contains("data-sheen-accent=\"indigo\"", app);
    }

    [Fact]
    public void Defaults_write_no_attributes()
    {
        Assert.Equal(0, Run(new StringReader("\n\n"), "init").Code);
        var app = File.ReadAllText(AppRazor);
        Assert.DoesNotContain("data-sheen-appearance", app);
        Assert.DoesNotContain("data-sheen-accent", app);
    }

    [Fact]
    public void Second_init_keeps_the_choice_and_a_flag_replaces_it_without_duplicating_attributes()
    {
        Assert.Equal(0, Run(null, "init", "--appearance", "flat", "--accent", "amber").Code);
        Assert.Equal(0, Run(null, "init").Code);
        Assert.Contains("data-sheen-appearance=\"flat\"", File.ReadAllText(AppRazor));
        Assert.Equal(0, Run(null, "init", "--accent", "blue").Code);
        var app = File.ReadAllText(AppRazor);
        Assert.DoesNotContain("data-sheen-accent", app);
        Assert.Equal(1, app.Split("data-sheen-appearance").Length - 1);
    }

    [Fact]
    public void Bad_value_fails_before_anything_is_written()
    {
        var result = Run(null, "init", "--accent", "pink");
        Assert.Equal(1, result.Code);
        Assert.Contains("Unknown accent 'pink'", result.Error);
        Assert.False(File.Exists(Path.Combine(_app, SheenUiConfig.DefaultFileName)));
    }

    [Fact]
    public void Add_installs_several_components_in_one_command()
    {
        Assert.Equal(0, Run(null, "init").Code);
        var result = Run(null, "add", "button", "card", "input", "button");
        Assert.True(result.Code == 0, result.Error);
        foreach (var folder in new[] { "Button", "Card", "Input" })
            Assert.True(Directory.Exists(Path.Combine(_app, "Components", "UI", folder)), folder);
    }

    [Fact]
    public void Add_with_an_unknown_name_installs_nothing()
    {
        Assert.Equal(0, Run(null, "init").Code);
        var result = Run(null, "add", "button", "nope");
        Assert.Equal(1, result.Code);
        Assert.Contains("nope", result.Error);
        Assert.False(Directory.Exists(Path.Combine(_app, "Components", "UI", "Button")));
    }
}
