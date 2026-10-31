using RaxUI.Cli;
using RaxUI.Cli.Configuration;

namespace RaxUI.Integration.Tests;

public class InstallationWorkflowTests : IDisposable
{
    private readonly string _testDirectory;

    public InstallationWorkflowTests()
    {
        _testDirectory = Path.Combine(Path.GetTempPath(), "RaxUI_Tests_" + Guid.NewGuid().ToString("N"));
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

    private void CreateSampleBlazorProject(bool includeBootstrap = true) => CreateSampleBlazorProject(_testDirectory, includeBootstrap);

    internal static void CreateSampleBlazorProject(string _testDirectory, bool includeBootstrap = true)
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
                <link rel="stylesheet" href="@Assets["lib/bootstrap/bootstrap.min.css"]" />
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

        var config = RaxUiConfig.Load(_testDirectory);
        Assert.NotNull(config);
        Assert.Equal("net10.0", config.TargetFramework);

        var lockFile = RaxUiLock.LoadOrCreate(_testDirectory);
        Assert.True(File.Exists(Path.Combine(_testDirectory, "wwwroot", "css", "raxui", "raxui.css")));
        Assert.NotEmpty(lockFile.Assets);

        var appContent = File.ReadAllText(Path.Combine(_testDirectory, "Components", "App.razor"));
        Assert.Contains("""<link rel="stylesheet" href="@Assets["css/raxui/raxui.css"]" />""", appContent);
        Assert.DoesNotContain("tokens.css", appContent);

        // 2. Run 'add button'
        var addCode = Program.Run(["add", "button"], _testDirectory, output, error);
        Assert.Equal(0, addCode);

        var buttonRazor = Path.Combine(_testDirectory, "Components", "UI", "Button", "Button.razor");
        Assert.True(File.Exists(buttonRazor));
        // Styles come from the shared theme, not CSS isolation (ADR 007).
        Assert.False(File.Exists(buttonRazor + ".css"));

        var importsContent = File.ReadAllText(Path.Combine(_testDirectory, "Components", "_Imports.razor"));
        Assert.Contains("@using TestConsumerApp.Components.UI.Button", importsContent);

        lockFile = RaxUiLock.LoadOrCreate(_testDirectory);
        Assert.True(lockFile.Components.ContainsKey("button"));
        Assert.Equal(2, lockFile.Components["button"].Files.Count);
    }

    [Fact]
    public void Init_rejects_unsupported_target_frameworks()
    {
        CreateSampleBlazorProject();
        var csproj = Path.Combine(_testDirectory, "TestConsumerApp.csproj");
        File.WriteAllText(csproj, File.ReadAllText(csproj).Replace("net10.0", "net7.0"));

        var error = new StringWriter();
        Assert.Equal(1, Program.Run(["init"], _testDirectory, new StringWriter(), error));
        Assert.Contains("targets net7.0. Supported: net8.0, net9.0, net10.0", error.ToString());
    }

    [Fact]
    public void Init_records_the_target_framework_and_uses_plain_links_on_net8()
    {
        CreateSampleBlazorProject();
        var csproj = Path.Combine(_testDirectory, "TestConsumerApp.csproj");
        File.WriteAllText(csproj, File.ReadAllText(csproj).Replace("net10.0", "net8.0"));

        Assert.Equal(0, Program.Run(["init"], _testDirectory, new StringWriter(), new StringWriter()));
        Assert.Equal("net8.0", RaxUiConfig.Load(_testDirectory)!.TargetFramework);
        Assert.Contains("""<link rel="stylesheet" href="css/raxui/raxui.css" />""",
            File.ReadAllText(Path.Combine(_testDirectory, "Components", "App.razor")));
    }

    [Fact]
    public void Init_stops_on_an_unrecognized_Bootstrap_older_than_5_3()
    {
        CreateSampleBlazorProject();
        var bootstrap = Path.Combine(_testDirectory, "wwwroot", "lib", "bootstrap", "bootstrap.min.css");
        File.WriteAllText(bootstrap, "@charset \"UTF-8\";/*!\n * Bootstrap  v5.2.3 (https://getbootstrap.com/)\n */");

        var error = new StringWriter();
        Assert.Equal(1, Program.Run(["init"], _testDirectory, new StringWriter(), error));
        Assert.Contains("needs Bootstrap 5.3 or later", error.ToString());
        Assert.False(File.Exists(Path.Combine(_testDirectory, RaxUiConfig.DefaultFileName)));
    }

    [Fact]
    public void Init_keeps_a_changed_layout_and_home_page_and_removes_nothing()
    {
        CreateSampleBlazorProject();
        var layout = Path.Combine(_testDirectory, "Components", "Layout", "MainLayout.razor");
        var home = Path.Combine(_testDirectory, "Components", "Pages", "Home.razor");
        var weather = Path.Combine(_testDirectory, "Components", "Pages", "Weather.razor");
        Directory.CreateDirectory(Path.GetDirectoryName(layout)!);
        Directory.CreateDirectory(Path.GetDirectoryName(home)!);
        File.WriteAllText(layout, "@inherits LayoutComponentBase\n<div class=\"mine\">@Body</div>\n");
        File.WriteAllText(home, "@page \"/\"\n<h1>My home</h1>\n");
        File.WriteAllText(weather, "@page \"/weather\"\n");

        var output = new StringWriter();
        Assert.Equal(0, Program.Run(["init"], _testDirectory, output, new StringWriter()));

        Assert.Contains("class=\"mine\"", File.ReadAllText(layout));
        Assert.Contains("My home", File.ReadAllText(home));
        Assert.True(File.Exists(weather)); // the template layout was not replaced, so its pages stay
        Assert.Contains("Kept your Components/Layout/MainLayout.razor", output.ToString());
        Assert.Contains("Kept your Components/Pages/Home.razor", output.ToString());
        Assert.Equal("wwwroot/css/raxui/starter.css", Assert.Single(RaxUiLock.LoadOrCreate(_testDirectory).Components["starter"].Files).Target);
    }

    [Fact]
    public void Init_points_out_stylesheets_from_an_earlier_release()
    {
        CreateSampleBlazorProject();
        var appRazor = Path.Combine(_testDirectory, "Components", "App.razor");
        File.WriteAllText(appRazor, File.ReadAllText(appRazor).Replace(
            """<link rel="stylesheet" href="app.css" />""",
            """<link rel="stylesheet" href="@Assets["css/raxui/tokens.css"]" />""" + "\n" + """<link rel="stylesheet" href="app.css" />"""));

        var output = new StringWriter();
        var error = new StringWriter();
        Assert.Equal(0, Program.Run(["init"], _testDirectory, output, error));

        Assert.Contains("earlier RaxUI release (css/raxui/tokens.css)", output.ToString());
        Assert.Contains("css/raxui/tokens.css", File.ReadAllText(appRazor)); // reported, not removed
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
        var themeMatches = System.Text.RegularExpressions.Regex.Matches(appContent, "raxui\\.css");
        Assert.Single(themeMatches);

        var importsContent = File.ReadAllText(Path.Combine(_testDirectory, "Components", "_Imports.razor"));
        var usingMatches = System.Text.RegularExpressions.Regex.Matches(importsContent, "TestConsumerApp\\.Components\\.UI\\.Button");
        Assert.Single(usingMatches);
    }

    [Fact]
    public void Repeated_commands_change_no_file_bytes()
    {
        CreateSampleBlazorProject();

        var output = new StringWriter();
        var error = new StringWriter();

        Assert.Equal(0, Program.Run(["init"], _testDirectory, output, error));
        Assert.Equal(0, Program.Run(["add", "button"], _testDirectory, output, error));
        var before = SnapshotFiles(_testDirectory);

        Assert.Equal(0, Program.Run(["init"], _testDirectory, output, error));
        Assert.Equal(0, Program.Run(["add", "button"], _testDirectory, output, error));

        Assert.Equal(before, SnapshotFiles(_testDirectory));
    }

    [Fact]
    public void Lock_file_records_manifest_digest_and_hashes()
    {
        CreateSampleBlazorProject();

        var output = new StringWriter();
        var error = new StringWriter();

        Assert.Equal(0, Program.Run(["init"], _testDirectory, output, error));
        Assert.Equal(0, Program.Run(["add", "button"], _testDirectory, output, error));

        var button = RaxUiLock.LoadOrCreate(_testDirectory).Components["button"];
        Assert.Matches("^[0-9a-f]{64}$", button.ManifestSha256);
        Assert.All(button.Files, f => Assert.Matches("^[0-9a-f]{64}$", f.InstalledHash));
    }

    [Fact]
    public void Init_refuses_to_overwrite_unknown_style_file_and_writes_nothing()
    {
        CreateSampleBlazorProject();
        var stylesDir = Path.Combine(_testDirectory, "wwwroot", "css", "raxui");
        Directory.CreateDirectory(stylesDir);
        var tokens = Path.Combine(stylesDir, "raxui.css");
        File.WriteAllText(tokens, "/* my own tokens */");
        var appBefore = File.ReadAllText(Path.Combine(_testDirectory, "Components", "App.razor"));

        var output = new StringWriter();
        var error = new StringWriter();
        var code = Program.Run(["init"], _testDirectory, output, error);

        Assert.Equal(1, code);
        Assert.Contains("not managed by RaxUI", error.ToString());
        Assert.Equal("/* my own tokens */", File.ReadAllText(tokens));
        Assert.Equal(appBefore, File.ReadAllText(Path.Combine(_testDirectory, "Components", "App.razor")));
        Assert.False(File.Exists(Path.Combine(_testDirectory, RaxUiConfig.DefaultFileName)));
    }

    [Fact]
    public void Init_notes_static_ssr_without_editing_when_Program_cs_enables_no_interactivity()
    {
        CreateSampleBlazorProject();
        var programPath = Path.Combine(_testDirectory, "Program.cs");
        // The default 'dotnet new blazor' template, without --interactivity Server.
        var program = """
            var builder = WebApplication.CreateBuilder(args);
            builder.Services.AddRazorComponents();
            var app = builder.Build();
            app.MapRazorComponents<App>();
            app.Run();
            """;
        File.WriteAllText(programPath, program);

        var output = new StringWriter();
        var error = new StringWriter();
        var code = Program.Run(["init"], _testDirectory, output, error);

        Assert.Equal(0, code);
        Assert.Contains("components render as static SSR", output.ToString());
        Assert.Contains(".AddInteractiveServerComponents();", output.ToString());
        Assert.Contains(".AddInteractiveServerRenderMode();", output.ToString());
        Assert.Equal(program, File.ReadAllText(programPath));
    }

    [Fact]
    public void Init_does_not_warn_when_Program_cs_enables_interactive_server()
    {
        CreateSampleBlazorProject();
        File.WriteAllText(Path.Combine(_testDirectory, "Program.cs"), """
            var builder = WebApplication.CreateBuilder(args);
            builder.Services.AddRazorComponents().AddInteractiveServerComponents();
            var app = builder.Build();
            app.MapRazorComponents<App>().AddInteractiveServerRenderMode();
            app.Run();
            """);

        var output = new StringWriter();
        Assert.Equal(0, Program.Run(["init"], _testDirectory, output, new StringWriter()));
        Assert.DoesNotContain("Warning", output.ToString());
        Assert.DoesNotContain("Note: Program.cs", output.ToString());
    }

    // WebAssembly and Auto (ADR 021): the server project keeps config, lock and styles; components go to the client.
    [Fact]
    public void Add_and_update_install_components_into_the_WebAssembly_client_project()
    {
        var host = Path.Combine(_testDirectory, "TestConsumerApp");
        var client = Path.Combine(_testDirectory, "TestConsumerApp.Client");
        Directory.CreateDirectory(host);
        Directory.CreateDirectory(client);
        CreateSampleBlazorProject(host);
        var csproj = Path.Combine(host, "TestConsumerApp.csproj");
        File.WriteAllText(csproj, File.ReadAllText(csproj).Replace("</Project>",
            """<ItemGroup><ProjectReference Include="..\TestConsumerApp.Client\TestConsumerApp.Client.csproj" /></ItemGroup></Project>"""));
        File.WriteAllText(Path.Combine(host, "Program.cs"), """
            builder.Services.AddRazorComponents().AddInteractiveWebAssemblyComponents();
            app.MapRazorComponents<App>().AddInteractiveWebAssemblyRenderMode();
            """);
        File.WriteAllText(Path.Combine(client, "TestConsumerApp.Client.csproj"), """
            <Project Sdk="Microsoft.NET.Sdk.BlazorWebAssembly">
              <PropertyGroup><TargetFramework>net10.0</TargetFramework></PropertyGroup>
            </Project>
            """);
        File.WriteAllText(Path.Combine(client, "_Imports.razor"), "@using TestConsumerApp.Client\n");

        var output = new StringWriter();
        var error = new StringWriter();
        Assert.True(Program.Run(["init"], host, output, error) == 0, error.ToString());
        Assert.DoesNotContain("Warning", output.ToString());
        Assert.Contains("TestConsumerApp.Client/Components/UI/", output.ToString());
        Assert.True(Program.Run(["add", "dialog"], host, output, error) == 0, error.ToString());

        Assert.True(File.Exists(Path.Combine(client, "Components", "UI", "Dialog", "Dialog.razor.js")));
        Assert.False(Directory.Exists(Path.Combine(host, "Components", "UI")));
        Assert.True(File.Exists(Path.Combine(host, "wwwroot", "css", "raxui", "components", "dialog.css")));
        const string directive = "@using TestConsumerApp.Client.Components.UI.Dialog";
        Assert.Contains(directive, File.ReadAllText(Path.Combine(client, "_Imports.razor")));
        Assert.Contains(directive, File.ReadAllText(Path.Combine(host, "Components", "_Imports.razor")));
        Assert.Contains(RaxUiLock.LoadOrCreate(host).Components["dialog"].Files, file => file.Target == "Components/UI/Dialog/Dialog.razor");
        Assert.False(Directory.Exists(Path.Combine(_testDirectory, ".raxui-transaction")));

        // Update resolves the same targets in the client and protects its local edits.
        var dialog = Path.Combine(client, "Components", "UI", "Dialog", "Dialog.razor");
        Assert.True(Program.Run(["update", "--dry-run"], host, output, error) == 0, error.ToString());
        File.AppendAllText(dialog, "@* local edit *@");
        Assert.True(Program.Run(["add", "dialog"], host, new StringWriter(), error) != 0);
        Assert.EndsWith("@* local edit *@", File.ReadAllText(dialog));

        // The client project itself is not an init target.
        var clientError = new StringWriter();
        Assert.Equal(1, Program.Run(["init"], client, new StringWriter(), clientError));
        Assert.Contains("Run RaxUI in the server project", clientError.ToString());
    }

    [Fact]
    public void Init_reports_manual_steps_when_host_has_no_known_link()
    {
        CreateSampleBlazorProject();
        var appRazor = Path.Combine(_testDirectory, "Components", "App.razor");
        File.WriteAllText(appRazor, "<html><head></head><body><Routes /></body></html>");

        var output = new StringWriter();
        var error = new StringWriter();
        var code = Program.Run(["init"], _testDirectory, output, error);

        Assert.Equal(1, code);
        Assert.Contains("Add these links manually", error.ToString());
        Assert.Equal("<html><head></head><body><Routes /></body></html>", File.ReadAllText(appRazor));
    }

    [Fact]
    public void Root_namespace_comes_from_evaluated_msbuild_properties()
    {
        CreateSampleBlazorProject();
        // Defined only in Directory.Build.props, not in the .csproj
        var csproj = Path.Combine(_testDirectory, "TestConsumerApp.csproj");
        File.WriteAllText(csproj, File.ReadAllText(csproj).Replace("<RootNamespace>TestConsumerApp</RootNamespace>", ""));
        File.WriteAllText(Path.Combine(_testDirectory, "Directory.Build.props"),
            "<Project><PropertyGroup><RootNamespace>Contoso.Web</RootNamespace></PropertyGroup></Project>");

        var output = new StringWriter();
        var error = new StringWriter();
        Assert.Equal(0, Program.Run(["init"], _testDirectory, output, error));
        Assert.Equal(0, Program.Run(["add", "button"], _testDirectory, output, error));

        var importsContent = File.ReadAllText(Path.Combine(_testDirectory, "Components", "_Imports.razor"));
        Assert.Contains("@using Contoso.Web.Components.UI.Button", importsContent);
    }

    internal static Dictionary<string, string> SnapshotFiles(string root) =>
        Directory.GetFiles(root, "*", SearchOption.AllDirectories)
            .Where(f => !f.Contains($"{Path.DirectorySeparatorChar}obj{Path.DirectorySeparatorChar}") &&
                        !f.Contains($"{Path.DirectorySeparatorChar}bin{Path.DirectorySeparatorChar}"))
            .ToDictionary(
                f => Path.GetRelativePath(root, f),
                f => Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(File.ReadAllBytes(f))));

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
        Assert.Contains("not managed by RaxUI", error.ToString());
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
        Assert.False(File.Exists(Path.Combine(_testDirectory, RaxUiConfig.DefaultFileName)));
    }
}
