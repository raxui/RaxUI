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
        Assert.True(Program.Run(["add", "confirm-dialog"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "form"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "field"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "form-section"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "input"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "input-group"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "textarea"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "checkbox"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "radio-group"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "switch"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "select"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "slider"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "rating"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "autocomplete"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "combobox"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "popover"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "file-upload"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "date-range-input"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "date-time-input"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "time-picker"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "date-input"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "alert"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "badge"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "avatar"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "card"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "skeleton"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "spinner"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "progress"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "table"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "timeline"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "tabs"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "accordion"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "breadcrumb"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "pagination"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "stepper"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "toggle"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "menu-toggle"], app, output, error) == 0, error.ToString());
        Assert.True(File.Exists(Path.Combine(app, "Components", "UI", "Dialog", "Dialog.razor.js")));

        // Exactly the installed styled components, each imported once; the starter is separate.
        var registry = new SheenUI.Cli.Registry.EmbeddedRegistry();
        var installed = SheenUI.Cli.Configuration.SheenUiLock.LoadOrCreate(app).Components.Keys;
        var expectedStyles = installed.Where(name => name != "starter")
            .SelectMany(name => registry.GetComponentManifest(name).Assets).Select(a => a.Target).Order().ToArray();
        var stylesDir = Path.Combine(app, "wwwroot/css/sheenui");
        var imports = File.ReadLines(Path.Combine(stylesDir, "sheenui.css"))
            .Where(line => line.StartsWith("@import url(\"components/", StringComparison.Ordinal)).ToArray();
        Assert.Equal(expectedStyles.Select(target => $"@import url(\"{target}\");"), imports.Order());
        Assert.Equal(expectedStyles, Directory.GetFiles(Path.Combine(stylesDir, "components"))
            .Select(file => "components/" + Path.GetFileName(file)).Order());
        foreach (var displayItem in new[] { "alert", "badge", "avatar", "card", "skeleton", "spinner", "progress", "table", "timeline", "tabs", "accordion", "breadcrumb", "pagination", "stepper", "toggle", "menu-toggle" })
            Assert.Contains($"@import url(\"components/{displayItem}.css\");", imports);

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
            <Button id="open-confirm" Disabled="@(!ready)" OnClick="@(() => confirmOpen = true)">Delete project</Button>
            <p id="confirm-result">@confirmResult</p>
            <ConfirmDialog @bind-Open="confirmOpen" Title="Delete project?" Description="This removes my-app for everyone."
                           Tone="destructive" ConfirmText="Delete" ConfirmationText="my-app"
                           OnConfirm="DeleteProject" OnCancel="@(() => confirmResult = "Cancelled")" />
            @code {
                private bool confirmOpen;
                private string confirmResult = "";
                private int attempts;
                private async Task DeleteProject()
                {
                    await Task.Delay(300);
                    if (++attempts == 1) throw new InvalidOperationException("Network error");
                    confirmResult = "Deleted";
                }
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

        WriteFormPages(components);
        WriteBasicControlPages(components);
        WriteAdvancedControlPages(components);
        WriteDisplayPages(components);
        WriteNavigationPages(components);
        WriteFluentForm(components);
        // Optional FluentValidation through Blazilla (#37): SheenUI controls must show its messages too.
        Dotnet(app, "add", "package", "Blazilla", "--version", "2.4.2");
        // Test-only services: antiforgery keys live for this process, not in the user's profile.
        // Keep diagnostics on stdout instead of requiring access to the Windows event log.
        var programPath = Path.Combine(app, "Program.cs");
        File.WriteAllText(programPath, "using Microsoft.AspNetCore.DataProtection;\n" + File.ReadAllText(programPath)
            .Replace("var app = builder.Build();", """
                builder.Services.AddDataProtection().UseEphemeralDataProtectionProvider();
                builder.Logging.ClearProviders();
                builder.Logging.AddConsole();
                var app = builder.Build();
                """));
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
        Assert.True(Program.Run(["add", "confirm-dialog"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "form"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "form-section"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "input"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "input-group"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "textarea"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "checkbox"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "radio-group"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "switch"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "select"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "slider"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "rating"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "autocomplete"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "combobox"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "popover"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "file-upload"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "date-range-input"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "date-time-input"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "time-picker"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "date-input"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "alert"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "badge"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "avatar"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "card"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "skeleton"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "spinner"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "progress"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "table"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "timeline"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "tabs"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "accordion"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "breadcrumb"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "pagination"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "stepper"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "toggle"], app, output, error) == 0, error.ToString());
        Assert.True(Program.Run(["add", "menu-toggle"], app, output, error) == 0, error.ToString());
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
            // This property comes from button.css, proving the @import loaded in the browser.
            Assert.Equal("600", await button.EvaluateAsync<string>("el => getComputedStyle(el).fontWeight"));
            Assert.True(await page.EvaluateAsync<bool>("""
                () => [...document.styleSheets].some(sheet => sheet.href?.includes('/css/sheenui/sheenui') &&
                    [...sheet.cssRules].some(rule => rule.type === CSSRule.IMPORT_RULE &&
                        rule.href === 'components/button.css' && rule.styleSheet?.cssRules.length > 0))
                """));
            Assert.False(string.IsNullOrWhiteSpace(await button.EvaluateAsync<string>("el => getComputedStyle(el).getPropertyValue('--sheen-glass-blur')")));
            Assert.NotEqual("none", await button.EvaluateAsync<string>("el => getComputedStyle(el).boxShadow"));
            Assert.Equal("none", await page.Locator("#sheen-flat").EvaluateAsync<string>("el => getComputedStyle(el).boxShadow"));
            Assert.Contains("blur", await page.Locator("#sheen-glass").EvaluateAsync<string>("el => getComputedStyle(el).backdropFilter"));

            await VerifyDialog(page);
            await VerifyDropdownMenu(page);
            await VerifyConfirmDialog(page);
            await VerifyForms(page, url);
            await VerifyBasicControls(page, url);
            await VerifyAdvancedControls(page, url);
            await VerifyDisplayBasics(page, url);
            await VerifyNavigation(page, url);
            await VerifyFluentForm(page, url);
        }
        catch (Exception exception)
        {
            throw new InvalidOperationException($"Generated app browser verification failed. Server output:\n{stdout}", exception);
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

    // boot-ui's AlertDialog behavior: a click outside nudges instead of closing, Esc cancels, type-to-confirm,
    // and a failed async confirm keeps the dialog open with its message.
    private static async Task VerifyConfirmDialog(IPage page)
    {
        var opener = page.Locator("#open-confirm");
        var dialog = page.GetByRole(AriaRole.Alertdialog, new() { Name = "Delete project?" });
        var field = dialog.GetByLabel("Type my-app to confirm");
        var delete = dialog.GetByRole(AriaRole.Button, new() { Name = "Delete" });
        var result = page.Locator("#confirm-result");

        await opener.ClickAsync();
        await Assertions.Expect(dialog).ToBeVisibleAsync();
        await Assertions.Expect(dialog).ToHaveAttributeAsync("data-tone", "destructive");
        await Assertions.Expect(dialog).ToHaveAccessibleDescriptionAsync("This removes my-app for everyone.");
        await Assertions.Expect(field).ToBeFocusedAsync();
        await page.Mouse.ClickAsync(5, 5); // the backdrop
        await Assertions.Expect(dialog).ToBeVisibleAsync();
        await page.Keyboard.PressAsync("Escape");
        await Assertions.Expect(dialog).ToBeHiddenAsync();
        await Assertions.Expect(result).ToHaveTextAsync("Cancelled");
        await Assertions.Expect(opener).ToBeFocusedAsync();

        await opener.ClickAsync();
        await Assertions.Expect(delete).ToBeDisabledAsync();
        await field.FillAsync("my-app");
        await Assertions.Expect(delete).ToBeEnabledAsync();
        await delete.ClickAsync();
        await Assertions.Expect(dialog).ToHaveAttributeAsync("aria-busy", "true");
        await Assertions.Expect(dialog.GetByRole(AriaRole.Alert)).ToHaveTextAsync("Network error");
        await Assertions.Expect(dialog).ToBeVisibleAsync();
        await delete.ClickAsync();
        await Assertions.Expect(dialog).ToBeHiddenAsync();
        await Assertions.Expect(result).ToHaveTextAsync("Deleted");

        // Reopening starts clean.
        await opener.ClickAsync();
        await Assertions.Expect(field).ToHaveValueAsync("");
        await Assertions.Expect(dialog.GetByRole(AriaRole.Alert)).ToHaveCountAsync(0);
        await dialog.GetByRole(AriaRole.Button, new() { Name = "Cancel" }).ClickAsync();
        await Assertions.Expect(dialog).ToBeHiddenAsync();
        await Assertions.Expect(result).ToHaveTextAsync("Cancelled");
    }

    private static void WriteFormPages(string components)
    {
        const string formPage = """
            @page "/forms"
            @rendermode InteractiveServer
            @using System.ComponentModel.DataAnnotations

            <EditForm Model="Model" FormName="profile" OnValidSubmit="Saved" Context="edit">
                <Form>
                    <DataAnnotationsValidator />
                    <Field Id="name" For="@(() => Model!.Name)" Context="field">
                        <ChildContent>
                            <FieldLabel>Name</FieldLabel>
                            <InputText @attributes="field.ControlAttributes" class="form-control" @bind-Value="Model!.Name" />
                            <FieldError />
                        </ChildContent>
                        <Description>Your full name</Description>
                    </Field>
                    <Field Id="volume" For="@(() => Model!.Volume)" Context="volumeField">
                        <FieldLabel>Volume</FieldLabel>
                        <Slider @bind-Value="Model!.Volume" />
                        <FieldError />
                    </Field>
                    <Field Id="score" For="@(() => Model!.Score)" Context="scoreField">
                        <FieldLabel>Score</FieldLabel>
                        <Rating @bind-Value="Model!.Score" />
                        <FieldError />
                    </Field>
                    <Field Id="price" For="@(() => Model!.Start)" Context="priceField">
                        <FieldLabel>Price range</FieldLabel>
                        <Slider Range @bind-Value="Model!.Start" @bind-EndValue="Model!.End" />
                        <FieldError />
                    </Field>
                    <FormSection Title="Account">
                        <ChildContent>
                            <FormRow Id="nickname" Label="Nickname" For="@(() => Model!.Nickname)" Optional Context="row">
                                <InputText @attributes="row.ControlAttributes" class="form-control" @bind-Value="Model!.Nickname" />
                            </FormRow>
                            <FormRowLink Label="Language" Value="English" Href="/forms" />
                            <FormRowLink id="sign-out" Label="Sign out" Destructive OnClick="@(() => signedOut++)" />
                            <FormRowLink id="locked" Label="Locked" Disabled />
                        </ChildContent>
                        <Footer>Account preferences</Footer>
                    </FormSection>
                    <FieldSet Id="preferences" Optional Context="group">
                        <FieldLegend OptionalText="Not mandatory">Preferences</FieldLegend>
                        <label><input type="checkbox" /> Updates</label>
                    </FieldSet>
                    <button id="save" type="submit" disabled="@(!ready)">Save</button>
                </Form>
            </EditForm>
            <p id="saved">@saved</p>
            <p id="signed-out">@signedOut</p>
            <p id="range-values">@RangeValues</p>

            @code {
                [SupplyParameterFromForm] private ProfileModel? Model { get; set; }
                protected override void OnInitialized() => Model ??= new();
                private bool ready;
                private string saved = "";
                private int signedOut;
                private void Saved() => saved = "Saved";
                private string RangeValues => $"{Model!.Volume}:{Model.Score}:{Model.Start}:{Model.End}";
                protected override void OnAfterRender(bool firstRender)
                {
                    if (firstRender) { ready = true; StateHasChanged(); }
                }
                public class ProfileModel
                {
                    [Required(ErrorMessage = "Name is required")]
                    public string Name { get; set; } = "";
                    public string Nickname { get; set; } = "";
                    [Range(1, 100)] public double Volume { get; set; }
                    [Range(1, 5)] public int Score { get; set; }
                    public double Start { get; set; } = 20;
                    public double End { get; set; } = 80;
                }
            }
            """;
        File.WriteAllText(Path.Combine(components, "Pages", "Forms.razor"), formPage);
        File.WriteAllText(Path.Combine(components, "Pages", "StaticForm.razor"), formPage
            .Replace("@page \"/forms\"", "@page \"/static-form\"")
            .Replace("@rendermode InteractiveServer", "")
            .Replace("private bool ready;", "private bool ready = true;"));
    }

    private static void WriteFluentForm(string components) =>
        File.WriteAllText(Path.Combine(components, "Pages", "FluentForm.razor"), """
            @page "/fluent-form"
            @rendermode InteractiveServer
            @using Blazilla
            @using FluentValidation

            <EditForm Model="model" OnValidSubmit="@(() => saved = "Saved")" Context="edit">
                <Form>
                    <FluentValidator Validator="@(new SignUpValidator())" />
                    <Field Id="email" For="@(() => model.Email)" Required="true" Context="field">
                        <FieldLabel>Email</FieldLabel>
                        <InputText @attributes="field.ControlAttributes" class="form-control" @bind-Value="model.Email" />
                        <FieldError />
                    </Field>
                    <button id="fluent-save" type="submit" disabled="@(!ready)">Save</button>
                </Form>
            </EditForm>
            <p id="fluent-saved">@saved</p>

            @code {
                private readonly SignUp model = new();
                private string saved = "";
                private bool ready;
                protected override void OnAfterRender(bool firstRender)
                {
                    if (firstRender) { ready = true; StateHasChanged(); }
                }
                public class SignUp
                {
                    public string Email { get; set; } = "";
                }
                public class SignUpValidator : AbstractValidator<SignUp>
                {
                    public SignUpValidator() => RuleFor(x => x.Email)
                        .Cascade(CascadeMode.Stop)
                        .NotEmpty().WithMessage("Email is required")
                        .EmailAddress().WithMessage("Enter a valid email");
                }
            }
            """);

    // FluentValidation (Blazilla) messages reach Field, FieldError, and Form like DataAnnotations ones.
    private static async Task VerifyFluentForm(IPage page, string url)
    {
        await page.GotoAsync(url.TrimEnd('/') + "/fluent-form");
        var email = page.Locator("#email");
        var save = page.Locator("#fluent-save");
        await Assertions.Expect(save).ToBeEnabledAsync();
        await Assertions.Expect(page.Locator("#email-label .sheen-field-required")).ToHaveTextAsync("*");

        await save.ClickAsync();
        await Assertions.Expect(page.Locator("#email-error")).ToHaveTextAsync("Email is required");
        await Assertions.Expect(email).ToHaveClassAsync(new System.Text.RegularExpressions.Regex("\\bis-invalid\\b"));
        await Assertions.Expect(email).ToHaveAttributeAsync("aria-invalid", "true");
        await Assertions.Expect(email).ToBeFocusedAsync();
        await Assertions.Expect(page.Locator("#fluent-saved")).ToHaveTextAsync("");

        await email.FillAsync("not-an-email");
        await save.ClickAsync();
        await Assertions.Expect(page.Locator("#email-error")).ToHaveTextAsync("Enter a valid email");

        await email.FillAsync("ada@example.com");
        await save.ClickAsync();
        await Assertions.Expect(page.Locator("#fluent-saved")).ToHaveTextAsync("Saved");
        await Assertions.Expect(page.Locator("#email-error")).ToHaveCountAsync(0);
        await Assertions.Expect(email).ToHaveClassAsync(new System.Text.RegularExpressions.Regex("\\bis-valid\\b"));
    }

    private static async Task VerifyForms(IPage page, string url)
    {
        await page.GotoAsync(url.TrimEnd('/') + "/forms");
        var name = page.Locator("#name");
        await Assertions.Expect(page.Locator("#save")).ToBeEnabledAsync();
        await Assertions.Expect(name).ToHaveAttributeAsync("aria-labelledby", "name-label");
        await Assertions.Expect(name).ToHaveAttributeAsync("aria-describedby", "name-description");
        await Assertions.Expect(name).ToHaveAttributeAsync("aria-required", "true");
        await Assertions.Expect(page.Locator("#name-label .sheen-field-required")).ToHaveTextAsync("*");
        await Assertions.Expect(page.Locator("#nickname-label .sheen-field-optional")).ToHaveTextAsync("(Optional)");
        await Assertions.Expect(page.GetByRole(AriaRole.Region, new() { Name = "Account" })).ToHaveClassAsync("sheen-form-section");
        await Assertions.Expect(page.GetByRole(AriaRole.Group, new() { Name = "Preferences Not mandatory" })).ToHaveClassAsync("sheen-fieldset");
        // FormRowLink without Href is an action button: enabled unless Disabled.
        var signOut = page.Locator("#sign-out");
        await Assertions.Expect(signOut).ToBeEnabledAsync();
        await signOut.ClickAsync();
        await Assertions.Expect(page.Locator("#signed-out")).ToHaveTextAsync("1");
        await Assertions.Expect(page.Locator("#locked")).ToBeDisabledAsync();
        await page.Locator("#save").ClickAsync();
        await Assertions.Expect(page.Locator("#name-error")).ToHaveTextAsync("Name is required");
        await Assertions.Expect(name).ToHaveClassAsync(new System.Text.RegularExpressions.Regex("\\bis-invalid\\b"));
        await Assertions.Expect(name).ToHaveAttributeAsync("aria-invalid", "true");
        await Assertions.Expect(name).ToHaveAccessibleDescriptionAsync("Your full name Name is required");
        await Assertions.Expect(name).ToBeFocusedAsync();
        await Assertions.Expect(page.Locator("#volume")).ToHaveAttributeAsync("aria-invalid", "true");
        await Assertions.Expect(page.Locator("#volume")).ToHaveClassAsync(new System.Text.RegularExpressions.Regex("\\bis-invalid\\b"));
        await Assertions.Expect(page.Locator("#score")).ToHaveAttributeAsync("aria-invalid", "true");
        await Assertions.Expect(page.Locator("#score input").First).ToHaveClassAsync(new System.Text.RegularExpressions.Regex("\\bis-invalid\\b"));
        await page.Locator("#volume").FocusAsync();
        await page.Locator("#volume").PressAsync("ArrowRight");
        await page.Locator("#score input").First.FocusAsync();
        await page.Locator("#score input").First.PressAsync("ArrowRight");
        await Assertions.Expect(page.Locator("#range-values")).ToHaveTextAsync("1:1:20:80");
        await page.Locator("#price").PressAsync("End");
        await Assertions.Expect(page.Locator("#price")).ToHaveValueAsync("80");
        await page.Locator("#price-end").PressAsync("Home");
        await Assertions.Expect(page.Locator("#price-end")).ToHaveValueAsync("80");
        await name.FillAsync("Ada");
        await page.Locator("#save").ClickAsync();
        await Assertions.Expect(page.Locator("#saved")).ToHaveTextAsync("Saved");
        await Assertions.Expect(name).ToHaveClassAsync(new System.Text.RegularExpressions.Regex("\\bis-valid\\b"));
        await Assertions.Expect(page.Locator("#name-error")).ToHaveCountAsync(0);
        await Assertions.Expect(page.Locator("#volume")).ToHaveClassAsync(new System.Text.RegularExpressions.Regex("\\bis-valid\\b"));
        await Assertions.Expect(page.Locator("#score input").First).ToHaveClassAsync(new System.Text.RegularExpressions.Regex("\\bis-valid\\b"));
        await Assertions.Expect(page.Locator("#volume[aria-invalid='true'], #score[aria-invalid='true']")).ToHaveCountAsync(0);

        // Disable JavaScript: this is a real server POST with FormName and SupplyParameterFromForm.
        // Reduced motion turns off Bootstrap's smooth scrolling, so long pages stay still while Playwright clicks.
        await using var context = await page.Context.Browser!.NewContextAsync(new() { JavaScriptEnabled = false, ReducedMotion = ReducedMotion.Reduce });
        var staticPage = await context.NewPageAsync();
        await staticPage.GotoAsync(url.TrimEnd('/') + "/static-form");
        await staticPage.Locator("#save").ClickAsync();
        await Assertions.Expect(staticPage.Locator("#name-error")).ToHaveTextAsync("Name is required");
        await Assertions.Expect(staticPage.Locator("#name")).ToHaveAttributeAsync("aria-invalid", "true");
        await Assertions.Expect(staticPage.Locator("#name")).ToHaveClassAsync(new System.Text.RegularExpressions.Regex("\\bis-invalid\\b"));
        await staticPage.Locator("#name").FillAsync("Grace");
        await staticPage.Locator("#volume").PressAsync("ArrowRight");
        await staticPage.GetByRole(AriaRole.Radio, new() { Name = "2 stars", Exact = true }).CheckAsync();
        await staticPage.Locator("#price").PressAsync("ArrowRight");
        await staticPage.Locator("#price-end").PressAsync("ArrowLeft");
        await staticPage.Locator("#save").ClickAsync();
        await Assertions.Expect(staticPage.Locator("#saved")).ToHaveTextAsync("Saved");
        await Assertions.Expect(staticPage.Locator("#range-values")).ToHaveTextAsync("1:2:21:79");
    }


    private static void WriteBasicControlPages(string components)
    {
        const string page = """
            @page "/controls"
            @rendermode InteractiveServer
            @using System.ComponentModel.DataAnnotations

            @* Unbound controls (no @bind-Value, outside any EditForm) must render without ValueExpression. *@
            <div id="unbound">
                <Switch id="unbound-switch" Value="true" disabled />
                <Switch id="press-switch" Value="false" />
                <Checkbox id="unbound-check" Value="true" />
                <Input id="unbound-input" Value="Read only" readonly />
                <Slider id="unbound-slider" Value="30" />
                <Rating Value="3" ReadOnly />
            </div>

            <EditForm Model="Model" FormName="controls" OnValidSubmit="Saved" Context="edit">
                <Form>
                    <DataAnnotationsValidator />
                    <Field Id="text" For="@(() => Model!.Text)">
                        <ChildContent>
                            <FieldLabel>Name</FieldLabel>
                            <Input @bind-Value="Model!.Text" Clearable>
                                <StartIcon><svg blazicon="" viewBox="0 0 24 24"><path d="M1 1h2" /></svg></StartIcon>
                            </Input>
                            <FieldError />
                        </ChildContent>
                        <Description>Your name</Description>
                    </Field>
                    <Field Id="email" For="@(() => Model!.Email)"><FieldLabel>Email</FieldLabel><Input Type="email" @bind-Value="Model!.Email" /><FieldError /></Field>
                    <Field Id="password" For="@(() => Model!.Password)"><FieldLabel>Password</FieldLabel><Input Type="password" @bind-Value="Model!.Password" /><FieldError /></Field>
                    <Field Id="number" For="@(() => Model!.Number)"><FieldLabel>Number</FieldLabel><NumberInput @bind-Value="Model!.Number" /><FieldError /></Field>
                    <Field Id="search" For="@(() => Model!.Search)"><FieldLabel>Search</FieldLabel><Input Type="search" @bind-Value="Model!.Search" /><FieldError /></Field>
                    <Field Id="joined" For="@(() => Model!.Part1)">
                        <FieldLabel>Card</FieldLabel>
                        <InputGroup AutoAdvance><InputGroupItem id="part1" aria-label="First part" maxlength="2" @bind-Value="Model!.Part1" /><InputGroupItem id="part2" aria-label="Second part" maxlength="2" @bind-Value="Model!.Part2" /></InputGroup>
                        <FieldError />
                    </Field>
                    <Field Id="notes" For="@(() => Model!.Notes)"><FieldLabel>Notes</FieldLabel><Textarea @bind-Value="Model!.Notes" AutoResize /><FieldError /></Field>
                    <Field Id="accepted" For="@(() => Model!.Accepted)" Orientation="inline"><Checkbox @bind-Value="Model!.Accepted" /><FieldLabel>Accept</FieldLabel><FieldError /></Field>
                    <Field Id="mixed" Optional Orientation="inline"><Checkbox @bind-Value="Model!.Mixed" @bind-Indeterminate="mixed" /><FieldLabel>Select all</FieldLabel></Field>
                    <Field Id="updates" For="@(() => Model!.Updates)" Orientation="inline"><Switch @bind-Value="Model!.Updates" /><FieldLabel>Updates</FieldLabel><FieldError /></Field>
                    <Field Id="choice" For="@(() => Model!.Choice)">
                        <FieldLabel>Plan</FieldLabel>
                        <RadioGroup @bind-Value="Model!.Choice"><label><RadioGroupItem TValue="string" Value="@("a")" />Alpha</label><label><RadioGroupItem TValue="string" Value="@("b")" />Beta</label></RadioGroup>
                        <FieldError />
                    </Field>
                    <Field Id="country" For="@(() => Model!.Country)"><FieldLabel>Country</FieldLabel><Select @bind-Value="Model!.Country"><option value="">Choose</option><option value="iq">Iraq</option><option value="gb">United Kingdom</option></Select><FieldError /></Field>
                    <button id="controls-save" type="submit" disabled="@(!ready)">Save controls</button>
                </Form>
            </EditForm>
            <p id="controls-result">@result</p>
            <p id="controls-values">@($"{Model!.Accepted}|{Model.Updates}|{Model.Choice}|{Model.Country}|{Model.Part1}|{Model.Part2}|{Model.Number}")</p>
            @code {
                [SupplyParameterFromForm] private ControlsModel? Model { get; set; }
                private bool ready;
                private bool mixed = true;
                private string result = "";
                protected override void OnInitialized() => Model ??= new();
                protected override void OnAfterRender(bool firstRender) { if (firstRender) { ready = true; StateHasChanged(); } }
                private void Saved() => result = "Saved " + Model!.Text;
                public class ControlsModel
                {
                    [Required] public string Text { get; set; } = "";
                    [Required, EmailAddress] public string Email { get; set; } = "";
                    [Required] public string Password { get; set; } = "";
                    [Range(1, 99)] public int Number { get; set; }
                    public string Search { get; set; } = "";
                    [Required] public string Part1 { get; set; } = "";
                    public string Part2 { get; set; } = "";
                    [Required] public string Notes { get; set; } = "";
                    [Range(typeof(bool), "true", "true")] public bool Accepted { get; set; }
                    public bool Mixed { get; set; }
                    [Range(typeof(bool), "true", "true")] public bool Updates { get; set; }
                    [Required] public string Choice { get; set; } = "";
                    [Required] public string Country { get; set; } = "";
                }
            }
            """;
        File.WriteAllText(Path.Combine(components, "Pages", "Controls.razor"), page);
        File.WriteAllText(Path.Combine(components, "Pages", "StaticControls.razor"), page
            .Replace("@page \"/controls\"", "@page \"/static-controls\"")
            .Replace("@rendermode InteractiveServer", "")
            .Replace("private bool ready;", "private bool ready = true;"));
    }

    private static async Task VerifyBasicControls(IPage page, string url)
    {
        await page.GotoAsync(url.TrimEnd('/') + "/controls");
        await Assertions.Expect(page.Locator("#controls-save")).ToBeEnabledAsync();
        await Assertions.Expect(page.Locator("#mixed")).ToHaveAttributeAsync("aria-checked", "mixed");
        await page.Locator("#controls-save").ClickAsync();
        foreach (var id in new[] { "text", "email", "password", "number", "notes", "accepted", "updates", "country" })
        {
            await Assertions.Expect(page.Locator("#" + id)).ToHaveAttributeAsync("aria-invalid", "true");
            await Assertions.Expect(page.Locator("#" + id)).ToHaveClassAsync(new System.Text.RegularExpressions.Regex(@"\bis-invalid\b"));
            await Assertions.Expect(page.Locator("#" + id)).ToHaveAttributeAsync("aria-describedby", new System.Text.RegularExpressions.Regex(id + "-error"));
        }
        foreach (var id in new[] { "choice", "joined" })
            await Assertions.Expect(page.Locator("#" + id)).ToHaveAttributeAsync("aria-invalid", "true");
        await Assertions.Expect(page.Locator("#choice input").First).ToHaveClassAsync(new System.Text.RegularExpressions.Regex(@"\bis-invalid\b"));
        await Assertions.Expect(page.Locator("#part1")).ToHaveClassAsync(new System.Text.RegularExpressions.Regex(@"\bis-invalid\b"));
        await Assertions.Expect(page.Locator("#text")).ToBeFocusedAsync();
        await page.AddStyleTagAsync(new() { Content = "svg[blazicon] { width: 1em; height: 1em; }" });
        Assert.Equal("18px", await page.Locator(".sheen-input-slot svg[blazicon]").EvaluateAsync<string>("el => getComputedStyle(el).width"));
        await page.Locator(".sheen-input-slot svg[blazicon]").ClickAsync();
        await Assertions.Expect(page.Locator("#text")).ToBeFocusedAsync();
        await page.Locator("#text").FillAsync("Ada");
        await page.GetByRole(AriaRole.Button, new() { Name = "Clear", Exact = true }).ClickAsync();
        await Assertions.Expect(page.Locator("#text")).ToHaveValueAsync("");
        await Assertions.Expect(page.Locator("#text")).ToBeFocusedAsync();
        await page.Locator("#text").FillAsync("Ada");
        await page.GetByRole(AriaRole.Button, new() { Name = "Show password" }).ClickAsync();
        await Assertions.Expect(page.Locator("#password")).ToHaveAttributeAsync("type", "text");
        await page.GetByRole(AriaRole.Button, new() { Name = "Hide password" }).ClickAsync();
        await Assertions.Expect(page.Locator("#password")).ToHaveAttributeAsync("type", "password");
        await page.Locator("#part1").PressSequentiallyAsync("12");
        await Assertions.Expect(page.Locator("#part2")).ToBeFocusedAsync();
        await page.Locator("#part2").PressAsync("Backspace");
        await Assertions.Expect(page.Locator("#part1")).ToBeFocusedAsync();
        await page.Locator("#part2").FillAsync("34");
        await FillBasicControls(page);
        await page.Locator("#controls-save").ClickAsync();
        await Assertions.Expect(page.Locator("#controls-result")).ToHaveTextAsync("Saved Ada");
        await Assertions.Expect(page.Locator("#text")).ToHaveClassAsync(new System.Text.RegularExpressions.Regex(@"\bis-valid\b"));
        await Assertions.Expect(page.Locator("#controls-values")).ToHaveTextAsync("True|True|b|iq|12|34|7");

        // A real native form POST with JavaScript disabled, exercising every bound input type.
        await using var context = await page.Context.Browser!.NewContextAsync(new() { JavaScriptEnabled = false, ReducedMotion = ReducedMotion.Reduce });
        var ssr = await context.NewPageAsync();
        await ssr.GotoAsync(url.TrimEnd('/') + "/static-controls");
        await ssr.Locator("#controls-save").ClickAsync();
        await Assertions.Expect(ssr.Locator("#text")).ToHaveAttributeAsync("aria-invalid", "true");
        await Assertions.Expect(ssr.Locator("#text")).ToHaveClassAsync(new System.Text.RegularExpressions.Regex(@"\bis-invalid\b"));
        await ssr.Locator("#text").FillAsync("Grace");
        await ssr.Locator("#part1").FillAsync("12");
        await ssr.Locator("#part2").FillAsync("34");
        await FillBasicControls(ssr);
        await ssr.Locator("#controls-save").ClickAsync();
        await Assertions.Expect(ssr.Locator("#controls-result")).ToHaveTextAsync("Saved Grace");
        await Assertions.Expect(ssr.Locator("#controls-values")).ToHaveTextAsync("True|True|b|iq|12|34|7");
    }

    private static async Task FillBasicControls(IPage page)
    {
        await page.Locator("#email").FillAsync("ada@example.com");
        await page.Locator("#password").FillAsync("secret");
        await page.Locator("#number").FillAsync("7");
        await page.Locator("#search").FillAsync("query");
        await page.Locator("#notes").FillAsync("Notes");
        await page.Locator("#accepted").FocusAsync();
        await page.Locator("#accepted").PressAsync("Space");
        await page.Locator("#updates").FocusAsync();
        await page.Locator("#updates").PressAsync("Space");
        await page.Locator("#choice input").First.FocusAsync();
        await page.Locator("#choice input").First.PressAsync("ArrowRight");
        await page.Locator("#country").SelectOptionAsync("iq");

        // Unbound controls render with their own values (no ValueExpression from @bind-Value).
        await Assertions.Expect(page.Locator("#unbound-switch")).ToBeCheckedAsync();
        await Assertions.Expect(page.Locator("#unbound-switch")).ToBeDisabledAsync();
        await Assertions.Expect(page.Locator("#unbound-check")).ToBeCheckedAsync();
        await Assertions.Expect(page.Locator("#unbound-input")).ToHaveValueAsync("Read only");
        await Assertions.Expect(page.Locator("#unbound-slider")).ToHaveValueAsync("30");

        // Like boot-ui, the switch thumb stretches while pressed and returns on release.
        var thumb = page.Locator("#press-switch + .sheen-switch-thumb");
        var restWidth = (await thumb.BoundingBoxAsync())!.Width;
        await page.Locator("#press-switch").HoverAsync();
        await page.Mouse.DownAsync();
        await page.WaitForTimeoutAsync(400);
        Assert.True((await thumb.BoundingBoxAsync())!.Width > restWidth * 1.15, "The thumb stretches while pressed.");
        await page.Mouse.UpAsync();
        await Assertions.Expect(page.Locator("#press-switch")).ToBeCheckedAsync();

        // The React indicators around the native inputs: the check is drawn, the selected radio grows its dot.
        await Assertions.Expect(page.Locator("#unbound-check ~ .sheen-checkbox-indicator .sheen-checkbox-check")).ToHaveCSSAsync("stroke-dashoffset", "0px");
        await Assertions.Expect(page.Locator("#choice .sheen-radio-input:checked + .sheen-radio-indicator")).ToHaveCSSAsync("transform", "matrix(1, 0, 0, 1, 0, 0)");
    }

    private static void WriteAdvancedControlPages(string components)
    {
        const string markup = """
            @page "/dates"
            @rendermode InteractiveServer
            <EditForm Model="Model" FormName="dates" OnValidSubmit="@(() => saved = true)" Context="edit">
                <Form>
                    <Field Id="date" For="@(() => Model!.Date)"><FieldLabel>Date</FieldLabel><DateInput @bind-Value="Model!.Date" /><FieldError /></Field>
                    <Field Id="date-time" For="@(() => Model!.DateTime)"><FieldLabel>Date time</FieldLabel><DateInput @bind-Value="Model!.DateTime" /><FieldError /></Field>
                    <Field Id="offset" For="@(() => Model!.Offset)"><FieldLabel>Offset</FieldLabel><DateInput @bind-Value="Model!.Offset" /><FieldError /></Field>
                    <Field Id="time" For="@(() => Model!.Time)"><FieldLabel>Time</FieldLabel><TimePicker @bind-Value="Model!.Time" /><FieldError /></Field>
                    <Field Id="local" For="@(() => Model!.Local)"><FieldLabel>Local</FieldLabel><DateTimeInput @bind-Value="Model!.Local" /><FieldError /></Field>
                    <Field Id="local-offset" For="@(() => Model!.LocalOffset)"><FieldLabel>Local offset</FieldLabel><DateTimeInput @bind-Value="Model!.LocalOffset" /><FieldError /></Field>
                    <Field Id="dates-range" For="@(() => Model!.Start)"><FieldLabel>Range</FieldLabel><DateRangeInput @bind-Value="Model!.Start" @bind-EndValue="Model!.End" /><FieldError /></Field>
                    <Field Id="files" For="@(() => files)"><FieldLabel>Files</FieldLabel><FileUpload @bind-Value="files" MaxFiles="2" MaxSize="4" Accept=".txt" Progress="@(_ => 50)" /><FieldError /></Field>
                    <p id="file-count">@files.Count</p>
                    <Field Id="combo" For="@(() => Model!.Choice)"><FieldLabel>Choice</FieldLabel><Combobox Options="options" @bind-Value="Model!.Choice" /><FieldError /></Field>
                    <Field Id="auto" For="@(() => Model!.Suggestion)"><FieldLabel>Suggestion</FieldLabel><Autocomplete Suggestions="suggestions" @bind-Value="Model!.Suggestion" /><FieldError /></Field>
                    <Field Id="async-auto" For="@(() => Model!.AsyncSuggestion)"><FieldLabel>Async suggestion</FieldLabel><Autocomplete LoadSuggestions="LoadSuggestions" @bind-Value="Model!.AsyncSuggestion" /><FieldError /></Field>
                    <Popover Label="Details"><Trigger>Details</Trigger><ChildContent><button type="button">Inside popover</button></ChildContent></Popover>
                    <p id="choice-values">@($"{Model!.Choice}|{Model.Suggestion}")</p>
                    <button id="dates-save" type="submit" disabled="@(!ready)">Save</button>
                </Form>
            </EditForm>
            <p id="dates-result">@(saved ? $"{Model!.Date:yyyy-MM-dd}|{Model.Time:HH:mm}|{Model.Local:yyyy-MM-ddTHH:mm}|{Model.Start:yyyy-MM-dd}|{Model.End:yyyy-MM-dd}" : "")</p>
            @code {
                [SupplyParameterFromForm] private DateModel? Model { get; set; }
                private bool saved;
                private bool ready; // set once interactive, so the test never types into the prerendered page
                protected override void OnAfterRender(bool firstRender) { if (firstRender) { ready = true; StateHasChanged(); } }
                private IReadOnlyList<IBrowserFile> files = Array.Empty<IBrowserFile>();
                private IReadOnlyList<Combobox.Option> options = new[] { new Combobox.Option("a", "Alpha"), new Combobox.Option("b", "Beta", true), new Combobox.Option("g", "Gamma") };
                private IReadOnlyList<string> suggestions = new[] { "Alpha", "Gamma" };
                protected override void OnInitialized() => Model ??= new();
                private static async Task<IReadOnlyList<string>> LoadSuggestions(string query, CancellationToken token)
                {
                    await Task.Delay(query == "slow" ? 500 : 200, token);
                    return query == "none" ? Array.Empty<string>() : new[] { query + " result" };
                }
                public class DateModel
                {
                    public string AsyncSuggestion { get; set; } = "";
                    public string Choice { get; set; } = "";
                    public string Suggestion { get; set; } = "";
                    public DateOnly Date { get; set; } = new(2026, 1, 1);
                    public DateTime DateTime { get; set; } = new(2026, 1, 1);
                    public DateTimeOffset Offset { get; set; } = new(new DateTime(2026, 1, 1));
                    public TimeOnly Time { get; set; } = new(9, 0);
                    public DateTime Local { get; set; } = new(2026, 1, 1, 9, 0, 0);
                    public DateTimeOffset LocalOffset { get; set; } = new(new DateTime(2026, 1, 1, 9, 0, 0));
                    public DateOnly? Start { get; set; } = new(2026, 1, 1);
                    public DateOnly? End { get; set; } = new(2026, 2, 1);
                }
            }
            """;
        File.WriteAllText(Path.Combine(components, "Pages", "StaticUpload.razor"), """
            @page "/static-upload"
            @using Microsoft.AspNetCore.Http
            <EditForm Model="model" FormName="upload" enctype="multipart/form-data" OnSubmit="Save" Context="edit">
                <Field Id="attachment"><FieldLabel>Attachment</FieldLabel><FileUpload Value="files" name="attachment" Accept=".txt" MaxSize="4" /><FieldError /></Field>
                <button id="upload-save" type="submit">Save</button>
            </EditForm>
            <p id="upload-result">@result</p>
            @code {
                private object model = new();
                private IReadOnlyList<IBrowserFile> files = Array.Empty<IBrowserFile>();
                private string result = "";
                [CascadingParameter] private HttpContext? HttpContext { get; set; }
                private async Task Save()
                {
                    var posted = (await HttpContext!.Request.ReadFormAsync()).Files;
                    result = posted.Count == 1 && posted[0].Length <= 4 && posted[0].FileName.EndsWith(".txt", StringComparison.OrdinalIgnoreCase)
                        ? posted[0].FileName : "Invalid files";
                }
            }
            """);
        File.WriteAllText(Path.Combine(components, "Pages", "Dates.razor"), markup);
        File.WriteAllText(Path.Combine(components, "Pages", "StaticDates.razor"), markup.Replace("@page \"/dates\"", "@page \"/static-dates\"").Replace("@rendermode InteractiveServer", "").Replace("private bool ready;", "private bool ready = true;"));
    }

    private static async Task VerifyAdvancedControls(IPage page, string url)
    {
        await Check(page, "/dates");
        // Combobox swaps its static-SSR <select> for the button once it is interactive; press the button.
        await Assertions.Expect(page.Locator("button#combo")).ToBeVisibleAsync();
        await page.Locator("#combo").PressAsync("ArrowDown");
        var search = page.GetByRole(AriaRole.Combobox, new() { Name = "Search options" });
        await Assertions.Expect(search).ToBeFocusedAsync();
        await search.PressAsync("Home");
        await search.PressAsync("ArrowDown");
        await Assertions.Expect(search).ToHaveAttributeAsync("aria-activedescendant", new System.Text.RegularExpressions.Regex("-option-2$"));
        await search.PressAsync("Enter");
        await Assertions.Expect(page.Locator("#combo")).ToBeFocusedAsync();
        await page.Locator("#auto").FillAsync("a");
        await page.Locator("#auto").PressAsync("End");
        await page.Locator("#auto").PressAsync("Enter");
        await Assertions.Expect(page.Locator("#choice-values")).ToHaveTextAsync("g|Gamma");
        await page.Locator("#async-auto").FillAsync("slow");
        await Assertions.Expect(page.GetByRole(AriaRole.Status)).ToHaveTextAsync("Loading suggestions");
        await page.Locator("#async-auto").FillAsync("fast");
        await Assertions.Expect(page.GetByRole(AriaRole.Option, new() { Name = "fast result" })).ToBeVisibleAsync();
        await page.Locator("#async-auto").PressAsync("ArrowDown");
        await page.Locator("#async-auto").PressAsync("Enter");
        await Assertions.Expect(page.Locator("#async-auto")).ToHaveValueAsync("fast result");
        await page.Locator("#dates-range").FillAsync("2026-03-01");
        await page.Locator("#dates-range-end").FocusAsync();
        await Assertions.Expect(page.Locator("#dates-range-range-error")).ToHaveTextAsync("Start date must be on or before end date.");
        await Assertions.Expect(page.Locator("#dates-range")).ToHaveAttributeAsync("aria-invalid", "true");
        await page.Locator("#dates-range").FillAsync("2026-01-01");
        await page.Locator("#dates-range-end").FocusAsync();
        await Assertions.Expect(page.Locator("#dates-range-range-error")).ToHaveCountAsync(0);
        await page.GetByRole(AriaRole.Button, new() { Name = "Details", Exact = true }).ClickAsync();
        await Assertions.Expect(page.GetByRole(AriaRole.Dialog, new() { Name = "Details" })).ToBeVisibleAsync();
        await page.Keyboard.PressAsync("Escape");
        await Assertions.Expect(page.GetByRole(AriaRole.Dialog, new() { Name = "Details" })).ToBeHiddenAsync();
        var input = page.Locator("#files");
        await input.SetInputFilesAsync(new[] { new FilePayload { Name = "notes.txt", MimeType = "text/plain", Buffer = "abc"u8.ToArray() } });
        await Assertions.Expect(page.Locator("#file-count")).ToHaveTextAsync("1");
        await Assertions.Expect(page.GetByRole(AriaRole.Progressbar)).ToHaveAttributeAsync("aria-valuenow", "50");
        await page.GetByRole(AriaRole.Button, new() { Name = "Remove notes.txt" }).ClickAsync();
        await Assertions.Expect(page.Locator("#file-count")).ToHaveTextAsync("0");
        await input.SetInputFilesAsync(new[] { new FilePayload { Name = "large.txt", MimeType = "text/plain", Buffer = "12345"u8.ToArray() } });
        await Assertions.Expect(page.Locator("#files-upload-error")).ToHaveTextAsync("This file is too large.");
        await Assertions.Expect(input).ToHaveAttributeAsync("aria-invalid", "true");
        await input.SetInputFilesAsync(new[] { new FilePayload { Name = "wrong.png", MimeType = "image/png", Buffer = "abc"u8.ToArray() } });
        await Assertions.Expect(page.Locator("#files-upload-error")).ToHaveTextAsync("This file type is not allowed.");
        await input.SetInputFilesAsync(Enumerable.Range(0, 3).Select(i => new FilePayload { Name = $"file{i}.txt", MimeType = "text/plain", Buffer = "abc"u8.ToArray() }));
        await Assertions.Expect(page.Locator("#files-upload-error")).ToHaveTextAsync("Too many files selected.");
        await using var context = await page.Context.Browser!.NewContextAsync(new() { JavaScriptEnabled = false, ReducedMotion = ReducedMotion.Reduce });
        await Check(await context.NewPageAsync(), "/static-dates");
        var upload = await context.NewPageAsync();
        await upload.GotoAsync(url.TrimEnd('/') + "/static-upload");
        await upload.Locator("#attachment").SetInputFilesAsync(new[] { new FilePayload { Name = "notes.txt", MimeType = "text/plain", Buffer = "abc"u8.ToArray() } });
        await upload.Locator("#upload-save").ClickAsync();
        await Assertions.Expect(upload.Locator("#upload-result")).ToHaveTextAsync("notes.txt");

        async Task Check(IPage target, string path)
        {
            await target.GotoAsync(url.TrimEnd('/') + path);
            await Assertions.Expect(target.Locator("#dates-save")).ToBeEnabledAsync();
            await Assertions.Expect(target.Locator("#date")).ToHaveAttributeAsync("aria-labelledby", "date-label");
            await Assertions.Expect(target.Locator("#date")).ToHaveValueAsync("2026-01-01");
            await target.Locator("#date").FillAsync("2026-10-24");
            await target.Locator("#time").FillAsync("13:45");
            await target.Locator("#local").FillAsync("2026-10-24T13:45");
            await Assertions.Expect(target.Locator("#dates-range")).ToHaveAttributeAsync("max", "2026-02-01");
            await Assertions.Expect(target.Locator("#dates-range-end")).ToHaveAttributeAsync("min", "2026-01-01");
            if (path == "/static-dates")
            {
                await target.Locator("#combo").SelectOptionAsync("g");
                await target.Locator("#auto").FillAsync("Gamma");
                await Assertions.Expect(target.Locator("#auto")).ToHaveAttributeAsync("list", new System.Text.RegularExpressions.Regex("-datalist$"));
            }
            await target.Locator("#dates-save").ClickAsync();
            await Assertions.Expect(target.Locator("#dates-result")).ToHaveTextAsync("2026-10-24|13:45|2026-10-24T13:45|2026-01-01|2026-02-01");
            if (path == "/static-dates") await Assertions.Expect(target.Locator("#choice-values")).ToHaveTextAsync("g|Gamma");
        }
    }


    private static void WriteNavigationPages(string components)
    {
        const string content = """
            <Tabs id="navigation-tabs" Items="tabs" @bind-Value="tab"><Panel Context="value"><p>@value panel</p></Panel></Tabs>
            <Accordion><AccordionItem Title="Delivery">Delivery details</AccordionItem><AccordionItem Title="Returns">Returns details</AccordionItem></Accordion>
            <Breadcrumb Items="crumbs" MaxItems="2" />
            <Pagination Page="@(PageNumber ?? 1)" PageCount="20" />
            <Stepper Items="steps" Value="1" />
            <Toggle id="nav-toggle" @bind-Pressed="pressed">Bold</Toggle>
            <ToggleGroup @bind-Value="selected" Label="Formatting" Multiple><ToggleGroupItem Value="bold">Strong</ToggleGroupItem><ToggleGroupItem Value="italic">Italic</ToggleGroupItem></ToggleGroup>
            <MenuToggle aria-controls="site-nav" />
            <p id="navigation-ready">@ready</p>
            @code {
                [SupplyParameterFromQuery(Name = "page")] public int? PageNumber { get; set; }
                private readonly Tabs.Item[] tabs = [new("one", "One"), new("two", "Two"), new("three", "Three")];
                private readonly Breadcrumb.Item[] crumbs = [new("Home", "/"), new("Parent", "/static-navigation?page=2"), new("Current", "/static-navigation")];
                private readonly Stepper.Item[] steps = [new("Cart"), new("Payment"), new("Done")];
                private string tab = "one";
                private bool pressed;
                private IReadOnlyList<string> selected = Array.Empty<string>();
                private bool ready;
                protected override void OnAfterRender(bool firstRender) { if (firstRender) { ready = true; StateHasChanged(); } }
            }
            """;
        File.WriteAllText(Path.Combine(components, "Pages", "NavigationPage.razor"), "@page \"/navigation\"\n@rendermode InteractiveServer\n" + content);
        File.WriteAllText(Path.Combine(components, "Pages", "StaticNavigationPage.razor"), "@page \"/static-navigation\"\n" + content);
    }

    private static async Task VerifyNavigation(IPage page, string url)
    {
        await page.GotoAsync(url + "/navigation");
        await Assertions.Expect(page.Locator("#navigation-ready")).ToHaveTextAsync("True");
        var tabs = page.Locator("#navigation-tabs");
        var one = tabs.GetByRole(AriaRole.Tab, new() { Name = "One" });
        await one.FocusAsync();
        await one.PressAsync("ArrowRight");
        await Assertions.Expect(tabs.GetByRole(AriaRole.Tab, new() { Name = "Two" })).ToHaveAttributeAsync("aria-selected", "true");
        await CheckIndicator(page, ".sheen-tabs-list", "[aria-selected=true]", "--sheen-tabs-indicator-x", "--sheen-tabs-indicator-width");
        await page.Keyboard.PressAsync("End");
        await Assertions.Expect(tabs.GetByRole(AriaRole.Tab, new() { Name = "Three" })).ToHaveAttributeAsync("aria-selected", "true");
        await page.Keyboard.PressAsync("Home");
        await Assertions.Expect(one).ToHaveAttributeAsync("aria-selected", "true");
        await page.GetByText("Delivery", new() { Exact = true }).ClickAsync();
        await Assertions.Expect(page.GetByText("Delivery details", new() { Exact = true })).ToBeVisibleAsync();
        await page.GetByText("Returns", new() { Exact = true }).ClickAsync();
        await Assertions.Expect(page.GetByText("Delivery details", new() { Exact = true })).Not.ToBeVisibleAsync();
        await page.GetByText("Returns", new() { Exact = true }).ClickAsync();
        await Assertions.Expect(page.GetByText("Returns details", new() { Exact = true })).Not.ToBeVisibleAsync();
        await page.Locator("#nav-toggle").ClickAsync();
        await Assertions.Expect(page.Locator("#nav-toggle")).ToHaveAttributeAsync("aria-pressed", "true");
        await page.GetByRole(AriaRole.Button, new() { Name = "Strong", Exact = true }).ClickAsync();
        await page.GetByRole(AriaRole.Button, new() { Name = "Italic", Exact = true }).ClickAsync();
        await Assertions.Expect(page.GetByRole(AriaRole.Button, new() { Name = "Strong", Exact = true })).ToHaveAttributeAsync("aria-pressed", "true");
        await Assertions.Expect(page.GetByRole(AriaRole.Button, new() { Name = "Italic", Exact = true })).ToHaveAttributeAsync("aria-pressed", "true");
        await page.GetByRole(AriaRole.Button, new() { Name = "Open menu" }).ClickAsync();
        await Assertions.Expect(page.GetByRole(AriaRole.Button, new() { Name = "Close menu" })).ToHaveAttributeAsync("aria-expanded", "true");
        await CheckIndicator(page, ".sheen-pagination-content", "[aria-current=page]", "--sheen-pagination-x", "--sheen-pagination-w");
        await page.GetByRole(AriaRole.Link, new() { Name = "Page 2", Exact = true }).ClickAsync();
        await Assertions.Expect(page.GetByRole(AriaRole.Link, new() { Name = "Page 2", Exact = true })).ToHaveAttributeAsync("aria-current", "page");
        await CheckIndicator(page, ".sheen-pagination-content", "[aria-current=page]", "--sheen-pagination-x", "--sheen-pagination-w");

        await using var context = await page.Context.Browser!.NewContextAsync(new() { JavaScriptEnabled = false, ReducedMotion = ReducedMotion.Reduce });
        var staticPage = await context.NewPageAsync();
        await staticPage.GotoAsync(url + "/static-navigation");
        await Assertions.Expect(staticPage.GetByRole(AriaRole.Tabpanel)).ToHaveTextAsync("one panel");
        await staticPage.GetByText("Delivery", new() { Exact = true }).ClickAsync();
        await Assertions.Expect(staticPage.GetByText("Delivery details", new() { Exact = true })).ToBeVisibleAsync();
        await staticPage.GetByRole(AriaRole.Link, new() { Name = "Page 2", Exact = true }).ClickAsync();
        await Assertions.Expect(staticPage.GetByRole(AriaRole.Link, new() { Name = "Page 2", Exact = true })).ToHaveAttributeAsync("aria-current", "page");
        await staticPage.Locator(".sheen-breadcrumb-collapse summary").ClickAsync();
        await staticPage.GetByRole(AriaRole.Link, new() { Name = "Parent", Exact = true }).ClickAsync();
        await Assertions.Expect(staticPage).ToHaveURLAsync(url + "/static-navigation?page=2");
    }

    private static async Task CheckIndicator(IPage page, string selector, string active, string x, string width)
    {
        await page.WaitForFunctionAsync("""
            ({ selector, active, x, width }) => {
                const root = document.querySelector(selector), item = root?.querySelector(active);
                return item && root.hasAttribute('data-ready') &&
                    root.style.getPropertyValue(x) === `${item.offsetLeft}px` &&
                    root.style.getPropertyValue(width) === `${item.offsetWidth}px`;
            }
            """, new { selector, active, x, width });
    }

    private static void WriteDisplayPages(string components)
    {
        const string content = """
            <div data-bs-theme="dark" data-sheen-appearance="glass" dir="rtl" data-sheen-density="compact" style="background:var(--bs-body-bg);color:var(--bs-body-color);padding:1rem">
                <Alert id="display-alert" Tone="warning" Title="Heads up" Description="Check your details" Dismissible @bind-Open="alertOpen" DismissLabel="Close message" />
                <Badge id="display-badge" Color="success" Variant="solid" Ping>Live</Badge>
                <Avatar id="display-avatar" Name="Saad Alsaree" Size="lg" Status="online" StatusLabel="Available" />
                <Avatar id="display-broken-avatar" Src="/missing-avatar.png" Name="Saad Alsaree" />
                <Card id="display-card" Appearance="flat"><CardHeader><CardTitle>Account</CardTitle><CardDescription>Details</CardDescription></CardHeader><CardContent>Profile</CardContent><CardFooter>Updated</CardFooter></Card>
                <Skeleton id="display-skeleton" Shape="circle" Width="40px" />
                <SkeletonText Lines="2" />
                <Spinner id="display-spinner" Label="Working" Size="lg" Color="success" />
                <Progress id="display-progress" Label="Upload" Value="25" Max="50" ShowValue />
                <Progress id="display-pending" AccessibleLabel="Pending" />
                <Table id="display-table" Density="compact" Striped><TableCaption>People</TableCaption><TableHeader><TableRow><TableHead>Name</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell>Saad</TableCell></TableRow></TableBody><TableFooter><TableRow><TableCell>One person</TableCell></TableRow></TableFooter></Table>
                <Timeline id="display-timeline" CurrentLabel="Active"><TimelineGroup>Today</TimelineGroup><TimelineItem Title="Placed" Time="09:00" DateTime="2026-10-24T09:00" /><TimelineItem Title="Delivery" Status="current" Description="On the way"><Marker><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /></svg></Marker></TimelineItem></Timeline>
            </div>
            <p id="display-ready">@ready</p>
            <p id="display-alert-state">@alertOpen</p>
            @code {
                private bool alertOpen = true;
                private bool ready;
                protected override void OnAfterRender(bool firstRender)
                {
                    if (firstRender) { ready = true; StateHasChanged(); }
                }
            }
            """;
        File.WriteAllText(Path.Combine(components, "Pages", "DisplayPage.razor"), "@page \"/display\"\n@rendermode InteractiveServer\n" + content);
        File.WriteAllText(Path.Combine(components, "Pages", "StaticDisplayPage.razor"), "@page \"/static-display\"\n" + content);
    }

    private static async Task VerifyDisplayBasics(IPage page, string url)
    {
        await Check(page, "/display");
        await Assertions.Expect(page.Locator("#display-ready")).ToHaveTextAsync("True");
        await Assertions.Expect(page.Locator("#display-broken-avatar .sheen-avatar-fallback")).ToBeVisibleAsync();
        await page.GetByRole(AriaRole.Button, new() { Name = "Close message" }).ClickAsync();
        await Assertions.Expect(page.Locator("#display-alert")).ToHaveCountAsync(0);
        await Assertions.Expect(page.Locator("#display-alert-state")).ToHaveTextAsync("False");
        await using var context = await page.Context.Browser!.NewContextAsync(new() { JavaScriptEnabled = false, ReducedMotion = ReducedMotion.Reduce });
        var staticPage = await context.NewPageAsync();
        await Check(staticPage, "/static-display");
        await Assertions.Expect(staticPage.GetByRole(AriaRole.Button, new() { Name = "Close message" })).ToHaveCountAsync(0);
        await Assertions.Expect(staticPage.Locator("#display-broken-avatar img")).ToBeVisibleAsync();
        await Assertions.Expect(staticPage.Locator("#display-broken-avatar .sheen-avatar-fallback")).ToBeHiddenAsync();
        // The interactive route's prerendered response is useful without JS as well.
        await Check(staticPage, "/display");
        await Assertions.Expect(staticPage.GetByRole(AriaRole.Button, new() { Name = "Close message" })).ToHaveCountAsync(0);

        async Task Check(IPage target, string path)
        {
            await target.GotoAsync(url.TrimEnd('/') + path);
            await Assertions.Expect(target.Locator("#display-alert")).ToHaveAttributeAsync("role", "alert");
            await Assertions.Expect(target.Locator("#display-alert")).ToContainTextAsync("Heads up");
            await Assertions.Expect(target.Locator("#display-alert")).ToHaveCSSAsync("display", "grid");
            await Assertions.Expect(target.Locator("#display-badge")).ToHaveCSSAsync("display", "inline-flex");
            await Assertions.Expect(target.Locator("#display-avatar")).ToHaveCSSAsync("width", "56px");
            await Assertions.Expect(target.Locator("#display-avatar .sheen-avatar-fallback")).ToHaveTextAsync("SA");
            await Assertions.Expect(target.GetByRole(AriaRole.Img, new() { Name = "Available" })).ToBeVisibleAsync();
            await Assertions.Expect(target.Locator("#display-card")).ToHaveAttributeAsync("data-sheen-appearance", "flat");
            await Assertions.Expect(target.Locator("#display-card")).ToHaveCSSAsync("backdrop-filter", "none");
            await Assertions.Expect(target.Locator("#display-skeleton")).ToHaveAttributeAsync("aria-hidden", "true");
            await Assertions.Expect(target.Locator("#display-skeleton")).ToHaveCSSAsync("border-radius", "50%");
            await Assertions.Expect(target.GetByRole(AriaRole.Status, new() { Name = "Working" })).ToHaveCSSAsync("width", "24px");
            var progress = target.GetByRole(AriaRole.Progressbar, new() { Name = "Upload" });
            await Assertions.Expect(progress).ToHaveAttributeAsync("aria-valuenow", "25");
            await Assertions.Expect(progress).ToHaveAttributeAsync("aria-valuemax", "50");
            await Assertions.Expect(progress).ToHaveCSSAsync("height", "8px");
            await Assertions.Expect(target.GetByRole(AriaRole.Progressbar, new() { Name = "Pending" })).Not.ToHaveAttributeAsync("aria-valuenow", new System.Text.RegularExpressions.Regex(".+"));
            await Assertions.Expect(target.GetByRole(AriaRole.Table, new() { Name = "People" })).ToHaveCSSAsync("font-size", "14px");
            await Assertions.Expect(target.GetByRole(AriaRole.Columnheader, new() { Name = "Name" })).ToHaveAttributeAsync("scope", "col");
            await Assertions.Expect(target.Locator("#display-timeline")).ToHaveCSSAsync("list-style-type", "none");
            await Assertions.Expect(target.Locator("#display-timeline [aria-current=step]")).ToContainTextAsync("Active");
            await Assertions.Expect(target.Locator("#display-timeline time").First).ToHaveAttributeAsync("datetime", "2026-10-24T09:00");
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
