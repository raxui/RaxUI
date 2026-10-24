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
            await VerifyConfirmDialog(page);
            await VerifyForms(page, url);
            await VerifyBasicControls(page, url);
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
        await using var context = await page.Context.Browser!.NewContextAsync(new() { JavaScriptEnabled = false });
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
        await using var context = await page.Context.Browser!.NewContextAsync(new() { JavaScriptEnabled = false });
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
