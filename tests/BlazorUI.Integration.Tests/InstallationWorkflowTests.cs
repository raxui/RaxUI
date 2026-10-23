using BlazorUI.Cli;
using BlazorUI.Cli.Configuration;

namespace BlazorUI.Integration.Tests;

public class InstallationWorkflowTests : IDisposable
{
    private readonly string _testDirectory;

    public InstallationWorkflowTests()
    {
        _testDirectory = Path.Combine(Path.GetTempPath(), "BlazorUI_Tests_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(_testDirectory);
    }

    public void Dispose()
    {
        try
        {
            if (Directory.Exists(_testDirectory))
                Directory.Delete(_testDirectory, true);
        }
        catch
        {
            // Ignore cleanup errors
        }
    }

    private void CreateSampleBlazorProject(bool includeBootstrap = true)
    {
        var csprojContent = """
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <PropertyGroup>
                <TargetFramework>net10.0</TargetFramework>
                <RootNamespace>TestConsumerApp</RootNamespace>
                <AssemblyName>TestConsumerApp</AssemblyName>
              </PropertyGroup>
            </Project>
            """;
        File.WriteAllText(Path.Combine(_testDirectory, "TestConsumerApp.csproj"), csprojContent);

        if (includeBootstrap)
        {
            var bootstrapDir = Path.Combine(_testDirectory, "wwwroot", "lib", "bootstrap");
            Directory.CreateDirectory(bootstrapDir);
            File.WriteAllText(Path.Combine(bootstrapDir, "bootstrap.min.css"), "/* bootstrap css placeholder */");
        }

        var componentsDir = Path.Combine(_testDirectory, "Components");
        Directory.CreateDirectory(componentsDir);

        var appRazorContent = """
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <base href="/" />
                <link rel="stylesheet" href="lib/bootstrap/bootstrap.min.css" />
                <link rel="stylesheet" href="app.css" />
                <link rel="stylesheet" href="TestConsumerApp.styles.css" />
            </head>
            <body>
                <Routes />
            </body>
            </html>
            """;
        File.WriteAllText(Path.Combine(componentsDir, "App.razor"), appRazorContent);

        var importsRazorContent = """
            @using Microsoft.AspNetCore.Components.Web
            """;
        File.WriteAllText(Path.Combine(componentsDir, "_Imports.razor"), importsRazorContent);
    }

    [Fact]
    public void Full_Workflow_Init_and_Add_Button_succeeds_end_to_end()
    {
        CreateSampleBlazorProject();

        var output = new StringWriter();
        var error = new StringWriter();

        // 1. Run 'init'
        var initCode = Program.Run(["init"], _testDirectory, output, error);
        Assert.Equal(0, initCode);

        var config = BlazorUiConfig.Load(_testDirectory);
        Assert.NotNull(config);
        Assert.Equal("net10.0", config.TargetFramework);

        var lockFile = BlazorUiLock.LoadOrCreate(_testDirectory);
        Assert.True(File.Exists(Path.Combine(_testDirectory, "wwwroot", "css", "blazorui", "tokens.css")));
        Assert.True(File.Exists(Path.Combine(_testDirectory, "wwwroot", "css", "blazorui", "themes.css")));
        Assert.NotEmpty(lockFile.Assets);

        var appContent = File.ReadAllText(Path.Combine(_testDirectory, "Components", "App.razor"));
        Assert.Contains("css/blazorui/tokens.css", appContent);
        Assert.Contains("css/blazorui/themes.css", appContent);

        // 2. Run 'add button'
        var addCode = Program.Run(["add", "button"], _testDirectory, output, error);
        Assert.Equal(0, addCode);

        var buttonRazor = Path.Combine(_testDirectory, "Components", "UI", "Button", "Button.razor");
        var buttonCss = Path.Combine(_testDirectory, "Components", "UI", "Button", "Button.razor.css");
        Assert.True(File.Exists(buttonRazor));
        Assert.True(File.Exists(buttonCss));

        var importsContent = File.ReadAllText(Path.Combine(_testDirectory, "Components", "_Imports.razor"));
        Assert.Contains("@using TestConsumerApp.Components.UI.Button", importsContent);

        lockFile = BlazorUiLock.LoadOrCreate(_testDirectory);
        Assert.True(lockFile.Components.ContainsKey("button"));
        Assert.Equal(2, lockFile.Components["button"].Files.Count);
    }

    [Fact]
    public void Repeated_commands_are_idempotent_and_do_not_duplicate_links_or_imports()
    {
        CreateSampleBlazorProject();

        var output = new StringWriter();
        var error = new StringWriter();

        // Run twice
        Assert.Equal(0, Program.Run(["init"], _testDirectory, output, error));
        Assert.Equal(0, Program.Run(["init"], _testDirectory, output, error));

        Assert.Equal(0, Program.Run(["add", "button"], _testDirectory, output, error));
        Assert.Equal(0, Program.Run(["add", "button"], _testDirectory, output, error));

        var appContent = File.ReadAllText(Path.Combine(_testDirectory, "Components", "App.razor"));
        var tokensMatches = System.Text.RegularExpressions.Regex.Matches(appContent, "tokens\\.css");
        Assert.Single(tokensMatches);

        var importsContent = File.ReadAllText(Path.Combine(_testDirectory, "Components", "_Imports.razor"));
        var usingMatches = System.Text.RegularExpressions.Regex.Matches(importsContent, "TestConsumerApp\\.Components\\.UI\\.Button");
        Assert.Single(usingMatches);
    }

    [Fact]
    public void Add_refuses_to_overwrite_locally_modified_files()
    {
        CreateSampleBlazorProject();

        var output = new StringWriter();
        var error = new StringWriter();

        Assert.Equal(0, Program.Run(["init"], _testDirectory, output, error));
        Assert.Equal(0, Program.Run(["add", "button"], _testDirectory, output, error));

        // Modify installed Button.razor locally
        var buttonRazor = Path.Combine(_testDirectory, "Components", "UI", "Button", "Button.razor");
        var customContent = "<button class=\"custom-override\">Custom</button>";
        File.WriteAllText(buttonRazor, customContent);

        // Run add button again
        var secondRunCode = Program.Run(["add", "button"], _testDirectory, output, error);

        Assert.Equal(1, secondRunCode);
        Assert.Contains("modified locally", error.ToString());
        Assert.Equal(customContent, File.ReadAllText(buttonRazor)); // Local modification preserved!
    }

    [Fact]
    public void Add_refuses_to_overwrite_unknown_untracked_files()
    {
        CreateSampleBlazorProject();

        var output = new StringWriter();
        var error = new StringWriter();

        Assert.Equal(0, Program.Run(["init"], _testDirectory, output, error));

        // Create an untracked Button.razor before running add button
        var buttonDir = Path.Combine(_testDirectory, "Components", "UI", "Button");
        Directory.CreateDirectory(buttonDir);
        var buttonRazor = Path.Combine(buttonDir, "Button.razor");
        File.WriteAllText(buttonRazor, "<!-- unmanaged code -->");

        var addCode = Program.Run(["add", "button"], _testDirectory, output, error);

        Assert.Equal(1, addCode);
        Assert.Contains("not managed by BlazorUI", error.ToString());
        Assert.Equal("<!-- unmanaged code -->", File.ReadAllText(buttonRazor));
    }

    [Fact]
    public void Init_fails_when_bootstrap_is_missing()
    {
        CreateSampleBlazorProject(includeBootstrap: false);

        var output = new StringWriter();
        var error = new StringWriter();

        var initCode = Program.Run(["init"], _testDirectory, output, error);

        Assert.Equal(1, initCode);
        Assert.Contains("Bootstrap was not found", error.ToString());
        Assert.False(File.Exists(Path.Combine(_testDirectory, BlazorUiConfig.DefaultFileName)));
    }
}
