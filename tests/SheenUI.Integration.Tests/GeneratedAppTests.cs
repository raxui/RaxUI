using System.Diagnostics;
using Program = SheenUI.Cli.Program;
using Microsoft.Playwright;

namespace SheenUI.Integration.Tests;

/// <summary>
/// End-to-end: a real 'dotnet new blazor' app, SheenUI installed into it, and a real 'dotnet build'.
/// </summary>
[Trait("Category", "E2E")]
public class GeneratedAppTests : IDisposable
{
    private readonly string _root = Path.Combine(Path.GetTempPath(), "SheenUI_E2E_" + Guid.NewGuid().ToString("N"));

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

    // Every supported Blazor Web App target (ADR 009); each needs its runtime installed.
    [Theory]
    [InlineData("net8.0")]
    [InlineData("net9.0")]
    [InlineData("net10.0")]
    public async Task Init_and_add_button_produce_an_app_that_builds_and_reruns_cleanly(string targetFramework)
    {
        var app = Path.Combine(_root, "SampleApp");
        Dotnet(_root, "new", "blazor", "-f", targetFramework, "--interactivity", "Server", "-n", "SampleApp", "-o", app);

        var output = new StringWriter();
        var error = new StringWriter();
        Assert.True(Program.Run(["init"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "button"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "dialog"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "dropdown-menu"], app, output, error) == 0, error.ToString());
        Assert.True(File.Exists(Path.Combine(app, "Components", "UI", "Dialog", "Dialog.razor.js")));

        // The .NET 8 template's Bootstrap 5.1 is upgraded in place to 5.3; 9 and 10 already ship 5.3.
        var bootstrap = Directory.GetFiles(Path.Combine(app, "wwwroot"), "bootstrap.min.css", SearchOption.AllDirectories).Single();
        Assert.Matches(@"Bootstrap\s+v5\.3\.", string.Join(" ", File.ReadLines(bootstrap).Take(3)));
        Assert.Contains(targetFramework == "net8.0" ? "href=\"css/sheenui/sheenui.css\"" : "@Assets[\"css/sheenui/sheenui.css\"]",
            File.ReadAllText(Path.Combine(app, "Components", "App.razor")));

        // The starter replaced the unmodified template layout and home page and removed the samples (ADR 008).
        var components = Path.Combine(app, "Components");
        Assert.Contains("class=\"sheen-app\"", File.ReadAllText(Path.Combine(components, "Layout", "MainLayout.razor")));
        Assert.Contains("Welcome to your SheenUI app", File.ReadAllText(Path.Combine(components, "Pages", "Home.razor")));
        foreach (var removed in new[] { "Layout/NavMenu.razor", "Layout/NavMenu.razor.css", "Layout/MainLayout.razor.css", "Pages/Counter.razor", "Pages/Weather.razor" })
            Assert.False(File.Exists(Path.Combine(components, removed)), removed);
        Assert.True(File.Exists(Path.Combine(components, "Pages", "Error.razor")));

        // The template app.css (button, link, font, and focus overrides) is replaced by the minimal one.
        var appCss = File.ReadAllText(Path.Combine(app, "wwwroot", "app.css"));
        Assert.DoesNotContain(".btn-primary", appCss);
        Assert.Contains(".validation-message", appCss);

        // Interactive test page; the starter pages stay as installed.
        var testPage = Path.Combine(components, "Pages", "TestPage.razor");
        File.WriteAllText(testPage, """
            @page "/test"
            @rendermode InteractiveServer
            <Button id="sheen-click" Disabled="@(!ready)" OnClick="@(() => count++)">Click</Button>
            <p id="count">@count</p>
            <div data-sheen-appearance="flat"><Button id="sheen-flat">Flat</Button></div>
            <Button id="sheen-glass" Appearance="glass">Glass</Button>
            <Button id="open-dialog" Disabled="@(!ready)" OnClick="@(() => dialogOpen = true)">Open dialog</Button>
            <p id="dialog-state">@dialogOpen</p>
            <Dialog @bind-Open="dialogOpen" Title="Delete file?" Description="This cannot be undone.">
                <Footer><Button Variant="outline" OnClick="@(() => dialogOpen = false)">Cancel</Button></Footer>
            </Dialog>
            <DropdownMenu>
                <Trigger>Options</Trigger>
                <ChildContent>
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem OnSelect="@(() => picked = "Edit")">Edit</DropdownMenuItem>
                    <DropdownMenuItem Disabled>Archive</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem OnSelect="@(() => picked = "Delete")">Delete</DropdownMenuItem>
                </ChildContent>
            </DropdownMenu>
            <p id="picked">@picked</p>
            @code {
                private int count;
                private bool ready;
                private bool dialogOpen;
                private string picked = "";
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
                    appRazor.IndexOf("css/sheenui/sheenui.css", StringComparison.Ordinal));
        Assert.True(appRazor.IndexOf("css/sheenui/sheenui.css", StringComparison.Ordinal) <
                    appRazor.IndexOf("SampleApp.styles.css", StringComparison.Ordinal));

        var before = InstallationWorkflowTests.SnapshotFiles(app);
        Assert.True(Program.Run(["init"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "button"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "dialog"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "dropdown-menu"], app, output, error) == 0, error.ToString());
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

            // Starter welcome page: theme switching through the query string, no template layout.
            await page.GotoAsync(url);
            await Assertions.Expect(page.Locator("h1")).ToHaveTextAsync("Welcome to your SheenUI app");
            Assert.Equal(0, await page.Locator(".sidebar, .navbar-brand").CountAsync());
            await Assertions.Expect(page.Locator("#blazor-error-ui")).ToBeHiddenAsync(); // shown only on an unhandled error
            var accents = page.GetByRole(AriaRole.Group, new() { Name = "Accent", Exact = true });
            await Assertions.Expect(accents.GetByRole(AriaRole.Link)).ToHaveCountAsync(4);
            await Assertions.Expect(accents.GetByRole(AriaRole.Link, new() { Name = "Blue", Exact = true }))
                .ToHaveAttributeAsync("aria-current", "true");
            await accents.GetByRole(AriaRole.Link, new() { Name = "Emerald", Exact = true }).ClickAsync();
            await Assertions.Expect(accents.GetByRole(AriaRole.Link, new() { Name = "Emerald", Exact = true }))
                .ToHaveAttributeAsync("aria-current", "true");
            await Assertions.Expect(page.GetByRole(AriaRole.Button, new() { Name = "Primary", Exact = true }))
                .ToHaveCSSAsync("background-color", "rgb(14, 122, 109)");
            await page.GotoAsync(url.TrimEnd('/') + "/?appearance=glass&mode=dark&accent=emerald&dir=rtl");
            var shell = page.Locator(".sheen-app");
            await Assertions.Expect(shell).ToHaveAttributeAsync("data-sheen-appearance", "glass");
            await Assertions.Expect(shell).ToHaveAttributeAsync("data-bs-theme", "dark");
            await Assertions.Expect(shell).ToHaveAttributeAsync("data-sheen-accent", "emerald");
            await Assertions.Expect(shell).ToHaveAttributeAsync("dir", "rtl");
            Assert.Contains("blur", await page.Locator(".sheen-panel").First.EvaluateAsync<string>("el => getComputedStyle(el).backdropFilter"));

            await page.GotoAsync(url.TrimEnd('/') + "/test");
            var button = page.Locator("#sheen-click");
            await Assertions.Expect(button).ToBeEnabledAsync();
            await button.ClickAsync();
            await button.ClickAsync();
            await Assertions.Expect(page.Locator("#count")).ToHaveTextAsync("2");
            // Same classes and look as the React Button (shared theme, ADR 007).
            await Assertions.Expect(button).ToHaveClassAsync(new System.Text.RegularExpressions.Regex("\\bbtn sheen-button btn-glass btn-glass-primary\\b"));
            var color = await button.EvaluateAsync<string>("el => getComputedStyle(el).backgroundColor");
            Assert.NotEqual("rgba(0, 0, 0, 0)", color);
            Assert.NotEqual("transparent", color);
            await Assertions.Expect(button).ToHaveCSSAsync("display", "inline-flex");
            Assert.False(string.IsNullOrWhiteSpace(await button.EvaluateAsync<string>("el => getComputedStyle(el).getPropertyValue('--sheen-glass-blur')")));
            Assert.NotEqual("none", await button.EvaluateAsync<string>("el => getComputedStyle(el).boxShadow"));
            Assert.Equal("none", await page.Locator("#sheen-flat").EvaluateAsync<string>("el => getComputedStyle(el).boxShadow"));
            Assert.Contains("blur", await page.Locator("#sheen-glass").EvaluateAsync<string>("el => getComputedStyle(el).backdropFilter"));

            await VerifyDialog(page);
            await VerifyDropdownMenu(page);
        }
        finally
        {
            if (!process.HasExited) process.Kill(entireProcessTree: true);
            await process.WaitForExitAsync();
            await stderr;
        }
    }

    // The ADR 013 contract: name and description, Esc / outside / close button, focus return, scroll lock.
    private static async Task VerifyDialog(IPage page)
    {
        var opener = page.Locator("#open-dialog");
        var dialog = page.GetByRole(AriaRole.Dialog, new() { Name = "Delete file?" });
        await Assertions.Expect(opener).ToBeEnabledAsync();

        await opener.ClickAsync();
        await Assertions.Expect(dialog).ToBeVisibleAsync();
        await Assertions.Expect(dialog).ToHaveAccessibleDescriptionAsync("This cannot be undone.");
        Assert.Equal("hidden", await page.EvaluateAsync<string>("() => getComputedStyle(document.documentElement).overflow"));
        await page.Keyboard.PressAsync("Escape");
        await Assertions.Expect(dialog).ToBeHiddenAsync();
        await Assertions.Expect(page.Locator("#dialog-state")).ToHaveTextAsync("False");
        await Assertions.Expect(opener).ToBeFocusedAsync();

        await opener.ClickAsync();
        await Assertions.Expect(dialog).ToBeVisibleAsync();
        await page.Mouse.ClickAsync(5, 5); // the backdrop
        await Assertions.Expect(dialog).ToBeHiddenAsync();
        await Assertions.Expect(page.Locator("#dialog-state")).ToHaveTextAsync("False");

        // Closing keeps the panel's layout while it animates out (#33).
        await opener.ClickAsync();
        await Assertions.Expect(dialog).ToBeVisibleAsync();
        var heights = await page.EvaluateAsync<double[]>("""
            () => { const d = document.querySelector('dialog.sheen-dialog'); const before = d.offsetHeight; d.close(); return [before, d.offsetHeight]; }
            """);
        Assert.Equal(heights[0], heights[1]);
        await Assertions.Expect(dialog).ToBeHiddenAsync();
        await Assertions.Expect(page.Locator("#dialog-state")).ToHaveTextAsync("False");

        await opener.ClickAsync();
        await dialog.GetByRole(AriaRole.Button, new() { Name = "Close" }).ClickAsync();
        await Assertions.Expect(dialog).ToBeHiddenAsync();
        await opener.ClickAsync();
        await dialog.GetByRole(AriaRole.Button, new() { Name = "Cancel" }).ClickAsync();
        await Assertions.Expect(dialog).ToBeHiddenAsync();
        await Assertions.Expect(page.Locator("#dialog-state")).ToHaveTextAsync("False");
    }

    // The ADR 013 contract: focus on open, arrows skip disabled items and wrap, Home/End, typeahead, select, Esc.
    private static async Task VerifyDropdownMenu(IPage page)
    {
        var trigger = page.GetByRole(AriaRole.Button, new() { Name = "Options" });
        var menu = page.GetByRole(AriaRole.Menu);
        Task Focused(string name) => Assertions.Expect(menu.GetByRole(AriaRole.Menuitem, new() { Name = name })).ToBeFocusedAsync();

        await trigger.ClickAsync();
        await Assertions.Expect(menu).ToBeVisibleAsync();
        await Assertions.Expect(trigger).ToHaveAttributeAsync("aria-expanded", "true");
        await Assertions.Expect(menu).ToBeFocusedAsync(); // a pointer open focuses the menu; arrows move in
        await page.Keyboard.PressAsync("ArrowDown");
        await Focused("Edit");
        // Read the placement the script set; the bounding box still scales during the opening animation.
        var triggerBox = (await trigger.BoundingBoxAsync())!;
        var placed = await menu.EvaluateAsync<double[]>("el => [parseFloat(el.style.left), parseFloat(el.style.top)]");
        Assert.True(Math.Abs(placed[0] - triggerBox.X) < 1, "The menu aligns to the trigger's start.");
        Assert.True(placed[1] >= triggerBox.Y + triggerBox.Height, "The menu opens below the trigger.");

        await page.Keyboard.PressAsync("ArrowDown");
        await Focused("Delete"); // Archive is disabled
        // The highlight glides to the active item, from the keyboard and the pointer.
        async Task HighlightOn(string name)
        {
            await Assertions.Expect(menu).ToHaveAttributeAsync("data-hover", "");
            var onItem = await menu.EvaluateAsync<bool>("""
                (el, name) => [...el.querySelectorAll('[role=menuitem]')].find(i => i.textContent.trim() === name)
                    .offsetTop + 'px' === el.style.getPropertyValue('--sheen-menu-hover-y')
                """, name);
            Assert.True(onItem, $"The highlight is on {name}.");
        }
        await HighlightOn("Delete");
        await menu.GetByRole(AriaRole.Menuitem, new() { Name = "Edit" }).HoverAsync();
        await Focused("Edit");
        await HighlightOn("Edit");
        await menu.GetByRole(AriaRole.Menuitem, new() { Name = "Delete" }).FocusAsync();
        await page.Keyboard.PressAsync("ArrowDown");
        await Focused("Edit");
        await page.Keyboard.PressAsync("End");
        await Focused("Delete");
        await page.Keyboard.PressAsync("Home");
        await Focused("Edit");
        await page.Keyboard.PressAsync("d");
        await Focused("Delete");
        await page.Keyboard.PressAsync("Enter");
        await Assertions.Expect(page.Locator("#picked")).ToHaveTextAsync("Delete");
        await Assertions.Expect(menu).ToBeHiddenAsync();
        await Assertions.Expect(trigger).ToHaveAttributeAsync("aria-expanded", "false");
        await Assertions.Expect(trigger).ToBeFocusedAsync();

        await page.Keyboard.PressAsync("ArrowDown");
        await Focused("Edit");
        await page.Keyboard.PressAsync("Escape");
        await Assertions.Expect(menu).ToBeHiddenAsync();
        await Assertions.Expect(trigger).ToBeFocusedAsync();

        await trigger.ClickAsync();
        await menu.GetByRole(AriaRole.Menuitem, new() { Name = "Edit" }).ClickAsync();
        await Assertions.Expect(page.Locator("#picked")).ToHaveTextAsync("Edit");
        await Assertions.Expect(menu).ToBeHiddenAsync();
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
