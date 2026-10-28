using Microsoft.Playwright;
using Program = SheenUI.Cli.Program;

namespace SheenUI.Integration.Tests;

public partial class GeneratedAppTests
{
    [Theory]
    [InlineData("net8.0")]
    [InlineData("net9.0")]
    [InlineData("net10.0")]
    public async Task App_shell_installs_builds_and_behaves_in_a_clean_app(string targetFramework)
    {
        var app = Path.Combine(_root, "SampleApp");
        Dotnet(_root, "new", "blazor", "-f", targetFramework, "--interactivity", "Server", "-n", "SampleApp", "-o", app);
        var output = new StringWriter(); var error = new StringWriter();
        Assert.Equal(0, Program.Run(["init"], app, output, error));
        foreach (var name in new[] { "navbar", "sidebar", "navigation-menu", "menubar", "footer", "banner", "avatar", "accordion", "toggle", "menu-toggle" })
            Assert.True(Program.Run(["add", name], app, output, error) == 0, error.ToString());
        WriteAppShellPages(Path.Combine(app, "Components"));
        var program = Path.Combine(app, "Program.cs");
        File.WriteAllText(program, "using Microsoft.AspNetCore.DataProtection;\n" + File.ReadAllText(program).Replace("var app = builder.Build();", "builder.Services.AddDataProtection().UseEphemeralDataProtectionProvider(); builder.Logging.ClearProviders(); builder.Logging.AddConsole(); var app = builder.Build();"));
        Dotnet(app, "build", "-warnaserror:RZ10012");
        var before = InstallationWorkflowTests.SnapshotFiles(app);
        foreach (var name in new[] { "navbar", "sidebar", "navigation-menu", "menubar", "footer", "banner", "avatar", "accordion", "toggle", "menu-toggle" })
            Assert.Equal(0, Program.Run(["add", name], app, output, error));
        Assert.Equal(before, InstallationWorkflowTests.SnapshotFiles(app));
        await VerifyInBrowser(app, VerifyAppShell);
    }

    private static void WriteAppShellPages(string components)
    {
        var target = Path.Combine(components, "Pages", "AppShellExamples");
        Directory.CreateDirectory(target);
        foreach (var file in Directory.GetFiles(Path.Combine(AppContext.BaseDirectory, "Fixtures", "AppShellExamples")))
            File.WriteAllText(Path.Combine(target, Path.GetFileName(file)), File.ReadAllText(file));
        File.AppendAllText(Path.Combine(components, "_Imports.razor"), "\n@using SampleApp.Components.Pages.AppShellExamples\n");
        var markup = File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Fixtures", "AppShell.razor"));
        File.WriteAllText(Path.Combine(components, "Pages", "AppShell.razor"), markup);
        File.WriteAllText(Path.Combine(components, "Pages", "StaticAppShell.razor"), markup.Replace("/shell-demo", "/static-shell-demo").Replace("@rendermode InteractiveServer", ""));
    }

    private static async Task VerifyAppShell(IPage page, string url)
    {
        var errors = new List<string>();
        void Error(object? sender, string message) => errors.Add(message);
        page.PageError += Error;
        await page.SetViewportSizeAsync(1122, 1122);
        await page.EmulateMediaAsync(new() { ReducedMotion = ReducedMotion.Reduce });
        await page.GotoAsync(url + "/shell-demo");
        await Assertions.Expect(page.Locator("#shell-navbar [data-navbar-site] .sheen-navbar-toggle")).ToBeEnabledAsync();
        await page.EvaluateAsync("() => { localStorage.removeItem('sheen-demo-sidebar');localStorage.removeItem('sheen-banner:sheen-demo-shell-tip') }");
        await page.ReloadAsync();
        var navbar = page.Locator("#shell-navbar [data-navbar-site]");
        var sidebar = page.Locator("#shell-sidebar [data-sidebar-main]");
        var navigation = page.Locator("#shell-navigation");
        var menubar = page.Locator("#shell-menubar");
        var footer = page.Locator("#shell-footer");
        var banner = page.Locator("#shell-banner");
        await Assertions.Expect(navbar.Locator(".sheen-navbar-toggle")).ToBeEnabledAsync();
        await Assertions.Expect(navbar.GetByRole(AriaRole.Link, new() { Name = "Docs", Exact = true })).ToBeVisibleAsync();
        await navbar.GetByRole(AriaRole.Link, new() { Name = "Docs", Exact = true }).ClickAsync();
        await Assertions.Expect(navbar.Locator("[data-navbar-page]")).ToHaveTextAsync("docs");
        Assert.EndsWith("/shell-demo", page.Url);
        await Assertions.Expect(navbar.GetByRole(AriaRole.Link, new() { Name = "Docs", Exact = true })).ToHaveAttributeAsync("aria-current", "page");
        await navbar.GetByRole(AriaRole.Link, new() { Name = "Pricing", Exact = true }).HoverAsync();
        await Assertions.Expect(navbar.Locator(".sheen-navbar-links")).ToHaveAttributeAsync("data-hover", "");
        Assert.True(await navbar.Locator(".sheen-navbar-links").EvaluateAsync<bool>("el => parseFloat(el.style.getPropertyValue('--sheen-navbar-hover-w')) > 0"));
        await page.SetViewportSizeAsync(390, 844);
        var toggle = navbar.Locator(".sheen-navbar-toggle");
        await toggle.ClickAsync();
        await navbar.GetByRole(AriaRole.Link, new() { Name = "Blog", Exact = true }).ClickAsync();
        await Assertions.Expect(navbar.Locator("[data-navbar-page]")).ToHaveTextAsync("blog");
        await Assertions.Expect(navbar.Locator(".sheen-navbar")).Not.ToHaveAttributeAsync("data-open", "");
        await toggle.ClickAsync();
        await Assertions.Expect(toggle).ToHaveAttributeAsync("aria-expanded", "true");
        await page.Keyboard.PressAsync("Escape");
        await Assertions.Expect(toggle).ToBeFocusedAsync();
        await toggle.ClickAsync();
        await page.SetViewportSizeAsync(1122, 1122);
        await Assertions.Expect(navbar.Locator(".sheen-navbar")).Not.ToHaveAttributeAsync("data-open", "");
        await navbar.Locator(".sheen-navbar").EvaluateAsync("el => el.parentElement.scrollTop=240");
        await Assertions.Expect(navbar.Locator(".sheen-navbar")).ToHaveAttributeAsync("data-scrolled", "");
        await Assertions.Expect(navbar.Locator(".sheen-navbar")).ToHaveAttributeAsync("data-hidden", "");
        await navbar.Locator(".sheen-navbar").EvaluateAsync("el => el.parentElement.scrollTop=100");
        await Assertions.Expect(navbar.Locator(".sheen-navbar")).Not.ToHaveAttributeAsync("data-hidden", "");
        var phone = page.Locator("#shell-navbar [data-navbar-phone]");
        await phone.GetByRole(AriaRole.Button, new() { Name = "Open phone menu", Exact = true }).ClickAsync();
        await phone.GetByRole(AriaRole.Link, new() { Name = "Product", Exact = true }).ClickAsync();
        await Assertions.Expect(phone.Locator("[data-navbar-phone-page]")).ToHaveTextAsync("product");
        await sidebar.GetByRole(AriaRole.Button, new() { Name = "Add project", Exact = true }).ClickAsync();
        await Assertions.Expect(sidebar.GetByRole(AriaRole.Link, new() { Name = "Project 4", Exact = true })).ToBeVisibleAsync();
        await sidebar.GetByRole(AriaRole.Button, new() { Name = "Project 4 options", Exact = true }).ClickAsync();
        await page.GetByRole(AriaRole.Menuitem, new() { Name = "Delete", Exact = true }).ClickAsync();
        await Assertions.Expect(sidebar.GetByRole(AriaRole.Link, new() { Name = "Project 4", Exact = true })).ToHaveCountAsync(0);
        await sidebar.GetByRole(AriaRole.Link, new() { Name = "Today", Exact = true }).ClickAsync();
        await Assertions.Expect(sidebar.Locator("[data-sidebar-page]")).ToHaveTextAsync("today");
        await Assertions.Expect(sidebar.Locator(".sheen-sidebar-content")).ToHaveAttributeAsync("data-highlight", "");
        await sidebar.GetByRole(AriaRole.Link, new() { Name = "Calendar", Exact = true }).HoverAsync();
        await Assertions.Expect(sidebar.Locator(".sheen-sidebar-content")).ToHaveAttributeAsync("data-hover", "");
        var sidebarToggle = sidebar.GetByRole(AriaRole.Button, new() { Name = "Toggle sidebar", Exact = true });
        await sidebarToggle.ClickAsync();
        await Assertions.Expect(sidebar.Locator(".sheen-sidebar")).ToHaveAttributeAsync("data-collapsible", "icon");
        await sidebar.GetByRole(AriaRole.Textbox, new() { Name = "Editor", Exact = true }).FocusAsync();
        await page.Keyboard.PressAsync("Control+b");
        await Assertions.Expect(sidebar.Locator(".sheen-sidebar")).ToHaveAttributeAsync("data-collapsible", "icon");
        await sidebarToggle.FocusAsync();
        await page.Keyboard.PressAsync("Control+b");
        await Assertions.Expect(sidebar.Locator(".sheen-sidebar")).ToHaveAttributeAsync("data-collapsible", "none");
        await page.GetByRole(AriaRole.Textbox, new() { Name = "Routing editor", Exact = true }).FocusAsync();
        await page.Keyboard.PressAsync("Control+b");
        await Assertions.Expect(page.Locator("#routing-sidebar .sheen-sidebar")).ToHaveAttributeAsync("data-collapsible", "offcanvas");
        await page.GetByRole(AriaRole.Button, new() { Name = "Toggle routing sidebar", Exact = true }).FocusAsync();
        await page.Keyboard.PressAsync("Control+b");
        await Assertions.Expect(page.Locator("#routing-sidebar .sheen-sidebar")).ToHaveAttributeAsync("data-collapsible", "none");
        await Assertions.Expect(sidebar.Locator(".sheen-sidebar")).ToHaveAttributeAsync("data-collapsible", "none");
        await sidebarToggle.ClickAsync();
        await Assertions.Expect(sidebar.Locator(".sheen-sidebar")).ToHaveAttributeAsync("data-collapsible", "icon");
        await page.ReloadAsync();
        await Assertions.Expect(sidebar.Locator(".sheen-sidebar")).ToHaveAttributeAsync("data-collapsible", "icon");
        await sidebar.GetByRole(AriaRole.Button, new() { Name = "Reports", Exact = true }).ClickAsync();
        await sidebar.GetByRole(AriaRole.Link, new() { Name = "Revenue", Exact = true }).ClickAsync();
        await Assertions.Expect(sidebar.Locator("[data-sidebar-page]")).ToHaveTextAsync("Revenue");
        await page.SetViewportSizeAsync(390, 844);
        await sidebarToggle.ClickAsync();
        var mobileSheet = sidebar.Locator("dialog[open]");
        await Assertions.Expect(mobileSheet).ToBeVisibleAsync();
        var box = (await mobileSheet.BoundingBoxAsync())!;
        Assert.InRange(box.Height, 827, 829);
        Assert.InRange(box.Width, 287, 289);
        await mobileSheet.GetByRole(AriaRole.Link, new() { Name = "Today", Exact = true }).ClickAsync();
        await Assertions.Expect(mobileSheet).ToHaveCountAsync(0);
        await sidebarToggle.ClickAsync();
        await Assertions.Expect(mobileSheet).ToBeVisibleAsync();
        await page.Keyboard.PressAsync("Escape");
        await Assertions.Expect(mobileSheet).ToHaveCountAsync(0);
        await Assertions.Expect(sidebarToggle).ToBeFocusedAsync();
        await sidebarToggle.ClickAsync();
        await Assertions.Expect(mobileSheet).ToBeVisibleAsync();
        await page.SetViewportSizeAsync(1122, 1122);
        await page.WaitForFunctionAsync("() => !document.querySelector('#shell-sidebar dialog[open]') && document.documentElement.style.overflow === ''");
        var site = navigation.GetByRole(AriaRole.Navigation, new() { Name = "Site navigation", Exact = true });
        var components = site.GetByRole(AriaRole.Button, new() { Name = "Components", Exact = true });
        await components.ClickAsync();
        await Assertions.Expect(site.Locator("[data-nav-content]:popover-open")).ToBeVisibleAsync();
        await AssertShellPanelPlacement(components, site.Locator("[data-nav-content]:popover-open"), false);
        await site.GetByRole(AriaRole.Button, new() { Name = "Solutions", Exact = true }).HoverAsync();
        await Assertions.Expect(site.GetByRole(AriaRole.Link, new() { Name = "Dashboards Ready to compose", Exact = true })).ToBeVisibleAsync();
        await page.Keyboard.PressAsync("Escape");
        await components.FocusAsync();
        await page.Keyboard.PressAsync("ArrowDown");
        await Assertions.Expect(site.GetByRole(AriaRole.Link, new() { Name = "Get started Copy a component, keep the code. Bootstrap underneath.", Exact = true })).ToBeFocusedAsync();
        await page.Keyboard.PressAsync("Escape");
        await Assertions.Expect(components).ToBeFocusedAsync();
        var bar = menubar.GetByRole(AriaRole.Menubar);
        var file = bar.GetByRole(AriaRole.Menuitem, new() { Name = "File", Exact = true });
        await file.FocusAsync();
        await page.Keyboard.PressAsync("ArrowDown");
        await Assertions.Expect(bar.GetByRole(AriaRole.Menuitem, new() { Name = "New ⌘N", Exact = true })).ToBeFocusedAsync();
        await page.Keyboard.PressAsync("ArrowDown");
        await page.Keyboard.PressAsync("ArrowRight");
        await Assertions.Expect(bar.GetByRole(AriaRole.Menuitem, new() { Name = "Roadmap 2027.md", Exact = true })).ToBeFocusedAsync();
        await page.Keyboard.PressAsync("ArrowDown");
        await page.Keyboard.PressAsync("Enter");
        await Assertions.Expect(menubar.Locator("[data-editor-status]")).ToContainTextAsync("Opened Release notes.md");
        await bar.GetByRole(AriaRole.Menuitem, new() { Name = "View", Exact = true }).ClickAsync();
        await bar.GetByRole(AriaRole.Menuitemcheckbox, new() { Name = "Word wrap", Exact = true }).ClickAsync();
        await Assertions.Expect(menubar.Locator("[data-editor-status]")).ToContainTextAsync("False");
        await bar.GetByRole(AriaRole.Menuitem, new() { Name = "View", Exact = true }).ClickAsync();
        await bar.GetByRole(AriaRole.Menuitemradio, new() { Name = "Large", Exact = true }).ClickAsync();
        await Assertions.Expect(menubar.Locator("[data-editor-status]")).ToContainTextAsync("lg");
        await file.ClickAsync();
        await page.Keyboard.PressAsync("Escape");
        await Assertions.Expect(bar.Locator("[data-menubar-content]:popover-open")).ToHaveCountAsync(0);
        await file.ClickAsync();
        await page.Keyboard.PressAsync("ArrowDown");
        await page.Keyboard.PressAsync("End");
        await Assertions.Expect(bar.GetByRole(AriaRole.Menuitem, new() { Name = "Save ⌘S", Exact = true })).ToBeFocusedAsync();
        await page.Keyboard.PressAsync("Escape");
        await Assertions.Expect(file).ToBeFocusedAsync();
        await footer.GetByRole(AriaRole.Button, new() { Name = "Subscribe", Exact = true }).ClickAsync();
        await Assertions.Expect(footer.GetByRole(AriaRole.Alert)).ToHaveTextAsync("Enter a valid email address.");
        var email = footer.Locator("input[type=email]");
        await email.FillAsync("fail@example.com");
        await footer.GetByRole(AriaRole.Button, new() { Name = "Subscribe", Exact = true }).ClickAsync();
        await Assertions.Expect(footer.GetByRole(AriaRole.Alert)).ToHaveTextAsync("Something went wrong. Try again.");
        await email.FillAsync(" saad@example.com ");
        await footer.GetByRole(AriaRole.Button, new() { Name = "Subscribe", Exact = true }).ClickAsync();
        await Assertions.Expect(footer.Locator("[data-subscription]")).ToHaveTextAsync("saad@example.com");
        await Assertions.Expect(footer.Locator(".sheen-footer-newsletter-done")).ToContainTextAsync("Thanks!");
        await page.SetViewportSizeAsync(390, 844);
        var column = footer.Locator(".sheen-footer-column").First;
        await column.GetByRole(AriaRole.Button, new() { Name = "Product", Exact = true }).ClickAsync();
        await Assertions.Expect(column.GetByRole(AriaRole.Link, new() { Name = "Changelog", Exact = true })).ToBeVisibleAsync();
        await banner.GetByRole(AriaRole.Button, new() { Name = "Dismiss announcement", Exact = true }).ClickAsync();
        await Assertions.Expect(banner.GetByText("New components", new() { Exact = true })).ToHaveCountAsync(0);
        await banner.GetByRole(AriaRole.Button, new() { Name = "Floating banner", Exact = true }).ClickAsync();
        var floating = banner.Locator(".sheen-banner[data-position=bottom]:popover-open");
        await Assertions.Expect(floating).ToBeVisibleAsync();
        box = (await floating.BoundingBoxAsync())!;
        Assert.InRange(box.X, 0, 390);
        Assert.InRange(box.Y + box.Height, 0, 844);
        await floating.GetByRole(AriaRole.Button, new() { Name = "Got it", Exact = true }).ClickAsync();
        await Assertions.Expect(floating).ToHaveCountAsync(0);
        await banner.GetByRole(AriaRole.Button, new() { Name = "Reset remembered tip", Exact = true }).ClickAsync();
        await banner.GetByRole(AriaRole.Button, new() { Name = "Dismiss remembered tip", Exact = true }).ClickAsync();
        await Assertions.Expect(banner.GetByText("Remember dismissal", new() { Exact = true })).ToHaveCountAsync(0);
        await page.ReloadAsync();
        await Assertions.Expect(banner.GetByText("Remember dismissal", new() { Exact = true })).ToHaveCountAsync(0);
        await banner.GetByRole(AriaRole.Button, new() { Name = "Reset remembered tip", Exact = true }).ClickAsync();
        await Assertions.Expect(banner.GetByText("Remember dismissal", new() { Exact = true })).ToBeVisibleAsync();

        await page.SetViewportSizeAsync(1122, 1122);
        await banner.GetByRole(AriaRole.Button, new() { Name = "Floating banner", Exact = true }).ClickAsync();
        await Assertions.Expect(floating).ToBeVisibleAsync();
        Assert.InRange((await floating.BoundingBoxAsync())!.Width, 703, 705);
        await floating.GetByRole(AriaRole.Button, new() { Name = "Got it", Exact = true }).ClickAsync();
        await Assertions.Expect(floating).ToHaveCountAsync(0);

        // The shared tokens and physical placement must survive responsive direction changes.
        foreach (var width in new[] { 1122, 390 })
        {
            await page.SetViewportSizeAsync(width, width == 1122 ? 1122 : 844);
            foreach (var appearance in new[] { "default", "flat", "glass" })
            {
                await page.Locator("#shell-appearance").SelectOptionAsync(appearance);
                foreach (var mode in new[] { "light", "dark" })
                {
                    await page.Locator("#shell-mode").SelectOptionAsync(mode);
                    foreach (var direction in new[] { "ltr", "rtl" })
                    {
                        await page.Locator("#shell-direction").SelectOptionAsync(direction);
                        await page.Locator("#shell-accent").SelectOptionAsync(appearance == "glass" ? "emerald" : appearance == "flat" ? "rose" : "blue");
                        await page.Locator("#shell-density").SelectOptionAsync(appearance == "flat" ? "compact" : "default");
                        if (width == 1122)
                        {
                            await components.ClickAsync();
                            await AssertShellPanelPlacement(components, site.Locator("[data-nav-content]:popover-open"), direction == "rtl");
                            await page.Keyboard.PressAsync("Escape");
                        }
                        else
                        {
                            await navigation.GetByRole(AriaRole.Button, new() { Name = "Open site navigation", Exact = true }).ClickAsync();
                            var disclosure = navigation.Locator("summary").First;
                            if (await disclosure.Locator("..").GetAttributeAsync("open") is null) await disclosure.ClickAsync();
                            await navigation.GetByRole(AriaRole.Button, new() { Name = "Forms", Exact = true }).ClickAsync();
                            await Assertions.Expect(navigation.Locator("[data-navigation-selection]")).ToHaveTextAsync("Forms");
                            await Assertions.Expect(navigation.GetByRole(AriaRole.Button, new() { Name = "Open site navigation", Exact = true })).ToHaveAttributeAsync("aria-expanded", "false");
                        }
                        await file.ClickAsync();
                        var menu = bar.Locator("[data-menubar-content]:popover-open");
                        await Assertions.Expect(menu).ToBeVisibleAsync();
                        box = (await menu.BoundingBoxAsync())!;
                        Assert.InRange(box.X, 7, width - box.Width - 7);
                        await page.Keyboard.PressAsync("ArrowDown");
                        await page.Keyboard.PressAsync("ArrowDown");
                        await page.Keyboard.PressAsync(direction == "rtl" ? "ArrowLeft" : "ArrowRight");
                        var submenu = bar.Locator("[data-submenu]:popover-open");
                        await Assertions.Expect(submenu).ToBeVisibleAsync();
                        box = (await submenu.BoundingBoxAsync())!;
                        Assert.InRange(box.X, 7, width - box.Width - 7);
                        await page.Keyboard.PressAsync("Escape");
                        await page.Keyboard.PressAsync("Escape");
                        Assert.Equal(direction, await footer.Locator(".sheen-footer").EvaluateAsync<string>("el => getComputedStyle(el).direction"));
                    }
                }
            }
        }
        await page.Locator("#shell-arabic").CheckAsync();
        await Assertions.Expect(navbar.GetByRole(AriaRole.Button, new() { Name = "فتح القائمة", Exact = true })).ToBeVisibleAsync();
        await Assertions.Expect(banner.GetByRole(AriaRole.Button, new() { Name = "إعادة ضبط النصيحة", Exact = true })).ToBeVisibleAsync();
        await page.SetViewportSizeAsync(1280, 720);
        await page.EmulateMediaAsync(new() { ReducedMotion = ReducedMotion.NoPreference });
        page.PageError -= Error;
        Assert.Empty(errors);
        var context = await page.Context.Browser!.NewContextAsync(new() { JavaScriptEnabled = false, ViewportSize = new() { Width = 390, Height = 844 } });
        try
        {
            var ssr = await context.NewPageAsync();
            await ssr.GotoAsync(url + "/static-shell-demo/docs");
            await Assertions.Expect(ssr.Locator("#routing-navbar").GetByRole(AriaRole.Link, new() { Name = "Docs route", Exact = true })).ToHaveAttributeAsync("aria-current", "page");
            await Assertions.Expect(ssr.Locator("#routing-sidebar").GetByRole(AriaRole.Link, new() { Name = "Sidebar docs route", Exact = true })).ToBeVisibleAsync();
            await Assertions.Expect(ssr.Locator("#routing-sidebar").GetByRole(AriaRole.Link)).ToHaveAttributeAsync("aria-current", "page");
            await Assertions.Expect(ssr.Locator("#routing-footer").GetByRole(AriaRole.Link)).ToHaveAttributeAsync("aria-current", "page");
            await Assertions.Expect(ssr.Locator("#routing-footer").GetByRole(AriaRole.Link)).ToBeVisibleAsync();
            await Assertions.Expect(ssr.Locator("#shell-navbar [data-navbar-site]").GetByRole(AriaRole.Link, new() { Name = "Docs", Exact = true })).ToBeVisibleAsync();
            await Assertions.Expect(ssr.Locator("#shell-navigation").GetByRole(AriaRole.Link, new() { Name = "Forms Fields, selection and validation.", Exact = true })).ToBeVisibleAsync();
        }
        finally { await context.CloseAsync(); }
    }

    private static async Task AssertShellPanelPlacement(ILocator trigger, ILocator panel, bool rtl)
    {
        await Assertions.Expect(panel).ToBeVisibleAsync();
        var anchor = (await trigger.BoundingBoxAsync())!;
        var box = (await panel.BoundingBoxAsync())!;
        var width = await trigger.EvaluateAsync<int>("() => innerWidth");
        var desired = Math.Max(8, Math.Min(rtl ? anchor.X + anchor.Width - box.Width : anchor.X, width - box.Width - 8));
        Assert.InRange(Math.Abs(box.X - desired), 0, 1);
        Assert.InRange(box.X, 7, width - box.Width - 7);
        var indicator = trigger.Locator("xpath=ancestor::nav[1]").Locator("[data-nav-indicator]");
        if (await indicator.CountAsync() > 0)
        {
            await Assertions.Expect(indicator).ToBeVisibleAsync();
            var caret = (await indicator.BoundingBoxAsync())!;
            Assert.InRange(Math.Abs(caret.Y - anchor.Y - anchor.Height), 0, 1);
        }
    }
}
