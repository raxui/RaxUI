using System.Diagnostics;
using Program = BlazorUI.Cli.Program;
using Microsoft.Playwright;

namespace BlazorUI.Integration.Tests;

/// <summary>
/// End-to-end: a real 'dotnet new blazor' app, BlazorUI installed into it, and a real 'dotnet build'.
/// </summary>
[Trait("Category", "E2E")]
public class GeneratedAppTests : IDisposable
{
    private readonly string _root = Path.Combine(Path.GetTempPath(), "BlazorUI_E2E_" + Guid.NewGuid().ToString("N"));

    public void Dispose()
    {
        try
        {
            Directory.Delete(_root, true);
        }
        catch
        {
            // Ignore cleanup errors
        }
    }

    [Fact]
    public async Task Init_and_add_button_produce_an_app_that_builds_and_reruns_cleanly()
    {
        var app = Path.Combine(_root, "SampleApp");
        Dotnet(_root, "new", "blazor", "--interactivity", "Server", "-n", "SampleApp", "-o", app);

        var output = new StringWriter();
        var error = new StringWriter();
        Assert.True(Program.Run(["init"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "button"], app, output, error) == 0, error.ToString());

        var home = Path.Combine(app, "Components", "Pages", "Home.razor");
        File.AppendAllText(home, """

            @rendermode InteractiveServer
            <Button id="bui-click" Disabled="@(!ready)" OnClick="@(() => count++)">Click</Button>
            <p id="count">@count</p>
            <div data-bui-appearance="flat"><Button id="bui-flat">Flat</Button></div>
            <Button id="bui-glass" Appearance="glass">Glass</Button>
            @code {
                private int count;
                private bool ready;
                protected override void OnAfterRender(bool firstRender)
                {
                    if (firstRender) { ready = true; StateHasChanged(); }
                }
            }
            """);

        Dotnet(app, "build", "-warnaserror:RZ10012");

        // The bundle reference from the template must still be present after init.
        var appRazor = File.ReadAllText(Path.Combine(app, "Components", "App.razor"));
        Assert.Contains("SampleApp.styles.css", appRazor);
        Assert.True(appRazor.IndexOf("bootstrap.min.css", StringComparison.Ordinal) <
                    appRazor.IndexOf("css/blazorui/blazorui.css", StringComparison.Ordinal));
        Assert.True(appRazor.IndexOf("css/blazorui/blazorui.css", StringComparison.Ordinal) <
                    appRazor.IndexOf("SampleApp.styles.css", StringComparison.Ordinal));

        var before = InstallationWorkflowTests.SnapshotFiles(app);
        Assert.True(Program.Run(["init"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "button"], app, output, error) == 0, error.ToString());
        Assert.Equal(before, InstallationWorkflowTests.SnapshotFiles(app));
        await VerifyInBrowser(app);
    }

    private static async Task VerifyInBrowser(string app)
    {
        var start = new ProcessStartInfo("dotnet")
        {
            WorkingDirectory = app,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
        };
        foreach (var arg in new[] { "run", "--no-build", "--no-launch-profile", "--urls", "http://127.0.0.1:0" })
            start.ArgumentList.Add(arg);
        start.Environment["ASPNETCORE_ENVIRONMENT"] = "Development";
        using var process = Process.Start(start)!;
        var address = new TaskCompletionSource<string>(TaskCreationOptions.RunContinuationsAsynchronously);
        var stdout = new System.Text.StringBuilder();
        process.OutputDataReceived += (_, e) =>
        {
            if (e.Data == null) return;
            stdout.AppendLine(e.Data);
            const string marker = "Now listening on: ";
            var index = e.Data.IndexOf(marker, StringComparison.Ordinal);
            if (index >= 0) address.TrySetResult(e.Data[(index + marker.Length)..].Trim());
        };
        process.BeginOutputReadLine();
        var stderr = process.StandardError.ReadToEndAsync();
        try
        {
            var url = await address.Task.WaitAsync(TimeSpan.FromSeconds(60));
            using var playwright = await Playwright.CreateAsync();
            await using var browser = await playwright.Chromium.LaunchAsync(new() { Headless = true });
            var page = await browser.NewPageAsync();
            await page.GotoAsync(url);
            var button = page.Locator("#bui-click");
            await Assertions.Expect(button).ToBeEnabledAsync();
            await button.ClickAsync();
            await button.ClickAsync();
            await Assertions.Expect(page.Locator("#count")).ToHaveTextAsync("2");
            // Same classes and look as the React Button (shared theme, ADR 007).
            await Assertions.Expect(button).ToHaveClassAsync(new System.Text.RegularExpressions.Regex("\\bbtn bui-button btn-glass btn-glass-primary\\b"));
            var color = await button.EvaluateAsync<string>("el => getComputedStyle(el).backgroundColor");
            Assert.NotEqual("rgba(0, 0, 0, 0)", color);
            Assert.NotEqual("transparent", color);
            await Assertions.Expect(button).ToHaveCSSAsync("display", "inline-flex");
            Assert.False(string.IsNullOrWhiteSpace(await button.EvaluateAsync<string>("el => getComputedStyle(el).getPropertyValue('--bui-glass-blur')")));
            Assert.NotEqual("none", await button.EvaluateAsync<string>("el => getComputedStyle(el).boxShadow"));
            Assert.Equal("none", await page.Locator("#bui-flat").EvaluateAsync<string>("el => getComputedStyle(el).boxShadow"));
            Assert.Contains("blur", await page.Locator("#bui-glass").EvaluateAsync<string>("el => getComputedStyle(el).backdropFilter"));
        }
        finally
        {
            if (!process.HasExited) process.Kill(entireProcessTree: true);
            await process.WaitForExitAsync();
            await stderr;
        }
    }

    private static void Dotnet(string workingDirectory, params string[] args)
    {
        Directory.CreateDirectory(workingDirectory);
        var startInfo = new ProcessStartInfo("dotnet")
        {
            WorkingDirectory = workingDirectory,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
        };
        foreach (var arg in args)
            startInfo.ArgumentList.Add(arg);

        using var process = Process.Start(startInfo)!;
        var stdout = process.StandardOutput.ReadToEndAsync();
        var stderr = process.StandardError.ReadToEndAsync();
        if (!process.WaitForExit(TimeSpan.FromMinutes(5)))
        {
            process.Kill(entireProcessTree: true);
            process.WaitForExit();
            Assert.Fail($"'dotnet {string.Join(' ', args)}' timed out.");
        }
        Assert.True(process.ExitCode == 0, $"'dotnet {string.Join(' ', args)}' failed:\n{stdout.Result}\n{stderr.Result}");
    }
}
