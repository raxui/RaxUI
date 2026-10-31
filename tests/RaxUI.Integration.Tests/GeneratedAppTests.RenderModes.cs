using Microsoft.Playwright;
using Program = RaxUI.Cli.Program;
namespace RaxUI.Integration.Tests;

public partial class GeneratedAppTests
{
    // ADR 021: one install serves static SSR, Server, WebAssembly and Auto pages; components live in the client project.
    [Theory]
    [InlineData("net8.0", "Auto")]
    [InlineData("net9.0", "Auto")]
    [InlineData("net10.0", "Auto")]
    [InlineData("net10.0", "WebAssembly")]
    public async Task Components_work_in_every_render_mode(string targetFramework, string interactivity)
    {
        var solution = Path.Combine(_root, "SampleApp");
        var global = interactivity == "WebAssembly"; // --all-interactive: routes and pages run in the browser
        Dotnet(_root, ["new", "blazor", "-f", targetFramework, "--interactivity", interactivity, .. global ? new[] { "--all-interactive" } : [], "-n", "SampleApp", "-o", solution]);
        var app = Path.Combine(solution, "SampleApp");
        var client = Path.Combine(solution, "SampleApp.Client");

        var output = new StringWriter();
        var error = new StringWriter();
        Assert.True(Program.Run(["init"], app, output, error) == 0, error.ToString());
        Assert.DoesNotContain("Warning", output.ToString());
        foreach (var name in new[] { "button", "dialog" })
            Assert.True(Program.Run(["add", name], app, output, error) == 0, error.ToString());
        Assert.True(File.Exists(Path.Combine(client, "Components", "UI", "Dialog", "Dialog.razor.js")));
        Assert.False(Directory.Exists(Path.Combine(app, "Components", "UI")));

        static string Page(string route, string? mode) => $$"""
            @page "{{route}}"
            {{(mode is null ? "" : "@rendermode " + mode)}}
            <p id="runtime">@(ready ? (OperatingSystem.IsBrowser() ? "browser" : "server") : "")</p>
            <Button id="open-dialog" Disabled="@(!ready)" OnClick="@(() => dialogOpen = true)">Open dialog</Button>
            <p id="dialog-state">@dialogOpen</p>
            <Dialog @bind-Open="dialogOpen" Title="Delete file?" Description="This cannot be undone.">
                <Footer><Button Variant="outline" OnClick="@(() => dialogOpen = false)">Cancel</Button></Footer>
            </Dialog>
            @code {
                private bool ready;
                private bool dialogOpen;
                protected override void OnAfterRender(bool firstRender)
                {
                    if (firstRender) { ready = true; StateHasChanged(); }
                }
            }
            """;
        File.WriteAllText(Path.Combine(client, "Pages", "WasmDemo.razor"), Page("/wasm-demo", global ? null : "InteractiveWebAssembly"));
        if (!global)
        {
            File.WriteAllText(Path.Combine(client, "Pages", "AutoDemo.razor"), Page("/auto-demo", "InteractiveAuto"));
            File.WriteAllText(Path.Combine(app, "Components", "Pages", "ServerDemo.razor"), Page("/server-demo", "InteractiveServer"));
            File.WriteAllText(Path.Combine(app, "Components", "Pages", "StaticDemo.razor"), """
                @page "/static-demo"
                <Button id="static-button" Variant="outline">Static</Button>
                """);
        }
        var program = Path.Combine(app, "Program.cs");
        File.WriteAllText(program, "using Microsoft.AspNetCore.DataProtection;\n" + File.ReadAllText(program)
            .Replace("var app = builder.Build();", "builder.Services.AddDataProtection().UseEphemeralDataProtectionProvider(); var app = builder.Build();"));
        Dotnet(app, "build", "-warnaserror:RZ10012");

        await VerifyInBrowser(app, async (page, url) =>
        {
            var errors = new List<string>();
            page.PageError += (_, message) => errors.Add(message);
            foreach (var (route, runtime) in global ? [("/wasm-demo", "browser")]
                         : new[] { ("/wasm-demo", "browser"), ("/server-demo", "server"), ("/auto-demo", "") })
            {
                await page.GotoAsync(url.TrimEnd('/') + route);
                // The WebAssembly runtime downloads on first use.
                await Assertions.Expect(page.Locator("#open-dialog")).ToBeEnabledAsync(new() { Timeout = 60_000 });
                if (runtime != "")
                    await Assertions.Expect(page.Locator("#runtime")).ToHaveTextAsync(runtime);
                await VerifyDialog(page);
            }
            if (!global)
            {
                await page.GotoAsync(url.TrimEnd('/') + "/static-demo");
                var button = page.Locator("#static-button");
                await Assertions.Expect(button).ToHaveClassAsync(new System.Text.RegularExpressions.Regex("\\brax-button\\b"));
                Assert.Equal("600", await button.EvaluateAsync<string>("el => getComputedStyle(el).fontWeight"));
            }
            Assert.Empty(errors);
        });
    }
}
