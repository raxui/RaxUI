using Microsoft.Playwright;
using Program = SheenUI.Cli.Program;

namespace SheenUI.Integration.Tests;

public partial class GeneratedAppTests
{
    [Theory]
    [InlineData("net8.0")]
    [InlineData("net9.0")]
    [InlineData("net10.0")]
    public async Task Data_components_install_and_match_React_behavior(string targetFramework)
    {
        var app = Path.Combine(_root, "SampleApp");
        Dotnet(_root, "new", "blazor", "-f", targetFramework, "--interactivity", "Server", "-n", "SampleApp", "-o", app);
        var output = new StringWriter(); var error = new StringWriter();
        Assert.Equal(0, Program.Run(["init"], app, output, error));
        foreach (var name in new[] { "data-table", "sortable", "resizable", "data-grid", "switch", "avatar", "progress", "textarea" })
            Assert.True(Program.Run(["add", name], app, output, error) == 0, error.ToString());
        var target = Path.Combine(app, "Components", "Pages", "DataSamples");
        Directory.CreateDirectory(target);
        foreach (var file in Directory.GetFiles(Path.Combine(AppContext.BaseDirectory, "Fixtures", "DataExamples")))
            File.WriteAllText(Path.Combine(target, Path.GetFileName(file)), File.ReadAllText(file));
        File.AppendAllText(Path.Combine(app, "Components", "_Imports.razor"), "\n@using SampleApp.Components.Pages.DataSamples\n");
        var markup = File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Fixtures", "DataComponents.razor"));
        File.WriteAllText(Path.Combine(app, "Components", "Pages", "DataComponents.razor"), markup);
        File.WriteAllText(Path.Combine(app, "Components", "Pages", "StaticDataComponents.razor"), markup.Replace("/data-components", "/static-data-components").Replace("@rendermode InteractiveServer", ""));
        foreach (var name in new[] { "VirtualizationProbe.razor", "VirtualizationProbe.razor.js" })
            File.Copy(Path.Combine(AppContext.BaseDirectory, "Fixtures", name), Path.Combine(app, "Components", "Pages", name));
        var program = Path.Combine(app, "Program.cs");
        File.WriteAllText(program, "using Microsoft.AspNetCore.DataProtection;\n" + File.ReadAllText(program).Replace("var app = builder.Build();", "builder.Services.AddDataProtection().UseEphemeralDataProtectionProvider(); builder.Logging.ClearProviders(); builder.Logging.AddConsole(); var app = builder.Build();"));
        Dotnet(app, "build", "-warnaserror:RZ10012");
        var before = InstallationWorkflowTests.SnapshotFiles(app);
        foreach (var name in new[] { "data-table", "sortable", "resizable", "data-grid" })
            Assert.Equal(0, Program.Run(["add", name], app, output, error));
        Assert.Equal(before, InstallationWorkflowTests.SnapshotFiles(app));
        await VerifyInBrowser(app, VerifyDataComponents);
    }

    private static async Task VerifyDataComponents(IPage page, string url)
    {
        var errors = new List<string>();
        page.PageError += (_, message) => errors.Add(message);
        await page.SetViewportSizeAsync(1440, 1100);
        await page.EmulateMediaAsync(new() { ReducedMotion = ReducedMotion.Reduce });
        await page.GotoAsync(url + "/data-components");
        await Assertions.Expect(page.Locator("#model-checks")).ToHaveTextAsync("Passed");
        await page.WaitForFunctionAsync("() => !document.querySelector('.sheen-data-table [inert]')");
        var table = page.GetByRole(AriaRole.Table, new() { Name = "Orders", Exact = true });
        await Assertions.Expect(table.Locator("tbody tr")).ToHaveCountAsync(10);
        await page.GetByRole(AriaRole.Link, new() { Name = "Next", Exact = true }).ClickAsync();
        await Assertions.Expect(page.Locator(".sheen-pagination [aria-current=page]")).ToHaveTextAsync("2");
        Assert.EndsWith("/data-components", page.Url);
        await page.GetByRole(AriaRole.Searchbox, new() { Name = "Search orders or customers…", Exact = true }).FillAsync("Saad");
        await Assertions.Expect(table.Locator("tbody tr")).ToHaveCountAsync(3);
        await page.GetByRole(AriaRole.Checkbox, new() { Name = "Select all rows on this page", Exact = true }).CheckAsync();
        await Assertions.Expect(page.GetByRole(AriaRole.Region, new() { Name = "Bulk actions" })).ToBeVisibleAsync();
        await page.GetByRole(AriaRole.Button, new() { Name = "Clear selection", Exact = true }).ClickAsync();
        await page.GetByRole(AriaRole.Button, new() { Name = "Reset filters", Exact = true }).ClickAsync();
        await Assertions.Expect(table.Locator("tbody tr")).ToHaveCountAsync(10);
        await table.GetByRole(AriaRole.Button, new() { Name = "Amount", Exact = true }).ClickAsync();
        await Assertions.Expect(table.Locator("th[aria-sort=ascending]")).ToContainTextAsync("Amount");
        var toolbar = page.Locator(".sheen-data-table-toolbar");
        await toolbar.GetByRole(AriaRole.Button, new() { Name = "Status", Exact = true }).ClickAsync();
        var paid = page.GetByRole(AriaRole.Menuitemcheckbox, new() { Name = "Paid", Exact = true });
        await paid.ClickAsync();
        await Assertions.Expect(table.Locator("tbody")).Not.ToContainTextAsync("Pending");
        await toolbar.GetByRole(AriaRole.Button, new() { Name = "Reset filters", Exact = true }).ClickAsync();
        await toolbar.GetByRole(AriaRole.Button, new() { Name = "View", Exact = true }).ClickAsync();
        await page.GetByRole(AriaRole.Menuitemcheckbox, new() { Name = "Date", Exact = false }).ClickAsync();
        await Assertions.Expect(table.GetByRole(AriaRole.Columnheader, new() { Name = "Date", Exact = true })).ToHaveCountAsync(0);

        var sortable = page.Locator("#sortable-example .sheen-sortable").First;
        var grip = sortable.GetByRole(AriaRole.Button, new() { Name = "Reorder Write the release notes", Exact = true });
        await grip.FocusAsync(); await grip.PressAsync("Space"); await grip.PressAsync("ArrowDown"); await grip.PressAsync("Space");
        await Assertions.Expect(sortable.Locator("[data-sortable-content] > [data-sortable-id]").First).ToHaveAttributeAsync("data-sortable-id", "t2");
        await Assertions.Expect(sortable.Locator("[aria-live]")).ToContainTextAsync("Dropped");
        var nodes = sortable.Locator("[data-sortable-content] > [data-sortable-id]");
        await nodes.First.ScrollIntoViewIfNeededAsync();
        var from = (await nodes.First.Locator("button").BoundingBoxAsync())!;
        var to = (await nodes.Nth(2).BoundingBoxAsync())!;
        await page.Mouse.MoveAsync(from.X + from.Width / 2, from.Y + from.Height / 2); await page.Mouse.DownAsync();
        await page.Mouse.MoveAsync(to.X + to.Width / 2, to.Y + to.Height / 2, new() { Steps = 12 }); await page.Mouse.UpAsync();
        await Assertions.Expect(nodes.Nth(2)).ToHaveAttributeAsync("data-sortable-id", "t2");
        var folders = page.GetByRole(AriaRole.Separator, new() { Name = "Resize folders", Exact = true });
        await folders.FocusAsync(); await folders.PressAsync("ArrowRight");
        await Assertions.Expect(folders).ToHaveAttributeAsync("aria-valuenow", "22");
        await page.ReloadAsync();
        await Assertions.Expect(folders).ToHaveAttributeAsync("aria-valuenow", "22");
        var rtlHandle = page.GetByRole(AriaRole.Separator, new() { Name = "تغيير حجم اللوحتين", Exact = true });
        await rtlHandle.FocusAsync(); await rtlHandle.PressAsync("ArrowLeft");
        await Assertions.Expect(rtlHandle).ToHaveAttributeAsync("aria-valuenow", "32");

        var grid = page.GetByRole(AriaRole.Grid, new() { Name = "Employees", Exact = true });
        await page.WaitForFunctionAsync("() => Number(document.querySelector('[aria-label=Employees]').dataset.rangeEnd) > 20");
        await grid.ScrollIntoViewIfNeededAsync();
        await Assertions.Expect(grid).ToHaveAttributeAsync("aria-rowcount", "10002");
        Assert.InRange(await grid.Locator(".sheen-grid-body > [role=row]").CountAsync(), 1, 100);
        await grid.Locator("[data-row-id='1'] [data-col=name]").DblClickAsync();
        var editor = grid.GetByRole(AriaRole.Textbox, new() { Name = "Name, row 1", Exact = true });
        await editor.FillAsync("A"); await editor.PressAsync("Enter");
        await Assertions.Expect(grid.GetByRole(AriaRole.Alert)).ToBeVisibleAsync();
        await grid.EvaluateAsync("el => el.scrollTop = 200000");
        await page.WaitForFunctionAsync("() => Number(document.querySelector('[aria-label=Employees]').dataset.rangeStart) > 4000");
        await Assertions.Expect(editor).ToBeFocusedAsync(); await Assertions.Expect(editor).ToHaveValueAsync("A");
        await grid.EvaluateAsync("el => el.scrollTop = 0");
        await page.WaitForFunctionAsync("() => !!document.querySelector('[aria-label=Employees] [data-row-id=\"2\"]')");
        await editor.FillAsync("Edited employee"); await editor.PressAsync("Enter");
        await Assertions.Expect(grid.Locator("[data-row-id='1'] [data-col=name]")).ToContainTextAsync("Edited employee");
        await Assertions.Expect(grid.Locator(".sheen-grid-cell[data-editing]")).ToHaveCountAsync(0);
        await grid.FocusAsync(); await grid.PressAsync("Control+End");
        await Assertions.Expect(grid.Locator("[data-row-id='10000']")).ToHaveCountAsync(1);
        Assert.Contains("r9999", await grid.GetAttributeAsync("aria-activedescendant"));
        await grid.PressAsync("Control+Home");
        var salary = grid.Locator("[data-row-id='1'] [data-col=salary]");
        await salary.ClickAsync();
        await salary.EvaluateAsync("el => { const data = new DataTransfer(); data.setData('text/plain', 'bad number'); el.dispatchEvent(new ClipboardEvent('paste', {clipboardData:data,bubbles:true,cancelable:true})); }");
        editor = grid.GetByRole(AriaRole.Textbox, new() { Name = "Salary, row 1", Exact = true });
        await Assertions.Expect(editor).ToHaveValueAsync("bad number");
        await editor.FillAsync("25000"); await editor.PressAsync("Tab");
        await Assertions.Expect(salary).ToContainTextAsync("25,000");
        await Assertions.Expect(grid.Locator(".sheen-grid-cell[data-editing]")).ToHaveCountAsync(0);
        await grid.PressAsync("F2");
        var date = grid.Locator(".sheen-grid-cell[data-editing] input[type=date]");
        await date.FillAsync("2020-05-20"); await date.PressAsync("Enter");
        await Assertions.Expect(grid.Locator("[data-row-id='1'] [data-col=startDate]")).ToContainTextAsync("2020-05-20");
        await Assertions.Expect(grid.Locator(".sheen-grid-cell[data-editing]")).ToHaveCountAsync(0);

        await page.Context.GrantPermissionsAsync(["clipboard-read", "clipboard-write"], new() { Origin = url });
        await salary.ClickAsync();
        await Assertions.Expect(salary).ToHaveAttributeAsync("data-active", "");
        await grid.PressAsync("Control+c");
        await page.WaitForFunctionAsync("async () => await navigator.clipboard.readText() === '25000'");
        var department = grid.Locator("[data-row-id='1'] [data-col=department]");
        await department.ClickAsync();
        await department.EvaluateAsync("el => { const data=new DataTransfer();data.setData('text/plain','unknown option');el.dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true})); }");
        await Assertions.Expect(grid.GetByRole(AriaRole.Alert)).ToBeVisibleAsync();
        await grid.Locator(".sheen-grid-cell[data-editing]").GetByRole(AriaRole.Combobox).ClickAsync();
        await page.GetByRole(AriaRole.Option, new() { Name = "Engineering", Exact = true }).ClickAsync();
        await Assertions.Expect(department).ToContainTextAsync("Engineering");
        await Assertions.Expect(grid.Locator(".sheen-grid-cell[data-editing]")).ToHaveCountAsync(0);


        await grid.EvaluateAsync("el => el.scrollTop = 210000");
        await Assertions.Expect(grid.Locator("[data-row-id='5001']")).ToHaveCountAsync(1);
        await grid.Locator("[data-row-id='5001'] [data-col=name]").DblClickAsync();
        var farEditor = grid.GetByRole(AriaRole.Textbox, new() { Name = "Name, row 5001", Exact = true });
        await farEditor.FillAsync("Far draft retained");
        await grid.EvaluateAsync("el => el.scrollTop = 0");
        await page.WaitForFunctionAsync("() => Number(document.querySelector('[aria-label=Employees]').dataset.rangeStart) === 0");
        await Assertions.Expect(farEditor).ToBeFocusedAsync();
        await Assertions.Expect(farEditor).ToHaveValueAsync("Far draft retained");
        await farEditor.PressAsync("Escape");
        await Assertions.Expect(grid.Locator(".sheen-grid-cell[data-editing]")).ToHaveCountAsync(0);

        var products = page.GetByRole(AriaRole.Grid, new() { Name = "المنتجات", Exact = true });
        await products.Locator("[data-row-id=SKU-101] [data-col=stock]").DblClickAsync();
        editor = products.GetByRole(AriaRole.Textbox, new() { Name = "المخزون، صف 1", Exact = true });
        await editor.FillAsync("77"); await editor.PressAsync("Enter");
        await Assertions.Expect(products.Locator("[data-row-id=SKU-101] [data-col=stock]")).ToHaveTextAsync("77");

        foreach (var width in new[] { 1440, 390 })
        {
            await page.SetViewportSizeAsync(width, width == 390 ? 844 : 1100);
            foreach (var appearance in new[] { "default", "flat", "glass" })
            {
                await page.Locator("#data-appearance").SelectOptionAsync(appearance);
                foreach (var mode in new[] { "light", "dark" })
                {
                    await page.Locator("#data-mode").SelectOptionAsync(mode);
                    foreach (var direction in new[] { "ltr", "rtl" })
                    {
                        await page.Locator("#data-direction").SelectOptionAsync(direction);
                        var localized = page.GetByRole(AriaRole.Grid, new() { Name = direction == "rtl" ? "الموظفون" : "Employees", Exact = true });
                        await Assertions.Expect(localized).ToHaveCSSAsync("direction", direction);

                        if (width == 390)
                        {
                            await Assertions.Expect(localized.Locator("[role=columnheader][data-col=name]")).Not.ToHaveAttributeAsync("data-pinned", "start");
                            await Assertions.Expect(localized.Locator("[role=columnheader][data-col=status]")).Not.ToHaveAttributeAsync("data-pinned", "end");
                        }
                        else
                        {
                            await Assertions.Expect(localized.Locator("[role=columnheader][data-col=name]")).ToHaveAttributeAsync("data-pinned", "start");
                        }

                        var box = (await localized.BoundingBoxAsync())!;
                        Assert.InRange(box.Width, 1, width);
                        var indexes = await localized.Locator("[role=row]").EvaluateAllAsync<int[]>("rows => rows.map(r => Number(r.getAttribute('aria-rowindex')))");
                        Assert.True(indexes.Zip(indexes.Skip(1), (a, b) => b > a).All(value => value));
                        var active = await localized.GetAttributeAsync("aria-activedescendant");
                        if (active is not null) Assert.True(await page.EvaluateAsync<bool>("id => !!document.getElementById(id)", active));
                    }
                }
            }
        }

        var touchContext = await page.Context.Browser!.NewContextAsync(new() { HasTouch = true, IsMobile = true, ViewportSize = new() { Width = 390, Height = 844 }, ReducedMotion = ReducedMotion.Reduce });
        try
        {
            var touchPage = await touchContext.NewPageAsync();
            touchPage.PageError += (_, message) => errors.Add(message);
            await touchPage.GotoAsync(url + "/data-components");
            await touchPage.WaitForFunctionAsync("() => Number(document.querySelector('[aria-label=Employees]').dataset.rangeEnd) > 20");
            var touchList = touchPage.Locator("#sortable-example .sheen-sortable").First;
            var touchRows = touchList.Locator("[data-sortable-content] > [data-sortable-id]");
            await touchRows.First.ScrollIntoViewIfNeededAsync();
            var gripBox = (await touchRows.First.Locator("button").BoundingBoxAsync())!;
            var targetBox = (await touchRows.Nth(2).BoundingBoxAsync())!;
            var cdp = await touchContext.NewCDPSessionAsync(touchPage);
            await cdp.SendAsync("Input.dispatchTouchEvent", new Dictionary<string, object> { ["type"] = "touchStart", ["touchPoints"] = new[] { new { x = gripBox.X + gripBox.Width / 2, y = gripBox.Y + gripBox.Height / 2, id = 1 } } });
            // Hold the touch gesture past the sensor's activation delay.
            await Task.Delay(220);
            await cdp.SendAsync("Input.dispatchTouchEvent", new Dictionary<string, object> { ["type"] = "touchMove", ["touchPoints"] = new[] { new { x = targetBox.X + targetBox.Width / 2, y = targetBox.Y + targetBox.Height / 2, id = 1 } } });
            await cdp.SendAsync("Input.dispatchTouchEvent", new Dictionary<string, object> { ["type"] = "touchEnd", ["touchPoints"] = Array.Empty<object>() });
            await Assertions.Expect(touchRows.Nth(2)).ToHaveAttributeAsync("data-sortable-id", "t1");
            await Assertions.Expect(touchList.Locator("[data-overlay]")).ToHaveCountAsync(0);
        }
        finally { await touchContext.CloseAsync(); }
        Assert.Empty(errors);
        var context = await page.Context.Browser!.NewContextAsync(new() { JavaScriptEnabled = false });

        try
        {
            var ssr = await context.NewPageAsync(); await ssr.GotoAsync(url + "/static-data-components");
            await Assertions.Expect(ssr.Locator("#model-checks")).ToHaveTextAsync("Passed");
            await Assertions.Expect(ssr.GetByRole(AriaRole.Table, new() { Name = "Orders", Exact = true }).Locator("tbody tr")).ToHaveCountAsync(10);
            var staticGrid = ssr.GetByRole(AriaRole.Grid, new() { Name = "Employees", Exact = true });
            await Assertions.Expect(staticGrid.Locator(".sheen-grid-body > [role=row]")).ToHaveCountAsync(20);
            Assert.Null(await staticGrid.GetAttributeAsync("aria-activedescendant"));
            await Assertions.Expect(staticGrid).ToHaveAttributeAsync("aria-readonly", "true");
            await Assertions.Expect(staticGrid).ToHaveAttributeAsync("tabindex", "-1");
            Assert.False(await ssr.GetByRole(AriaRole.Table, new() { Name = "Orders", Exact = true }).EvaluateAsync<bool>("el => !!el.closest('[inert]')"));
            await Assertions.Expect(ssr.GetByRole(AriaRole.Separator, new() { Name = "Resize folders", Exact = true })).ToHaveAttributeAsync("aria-orientation", "vertical");
            await Assertions.Expect(ssr.GetByRole(AriaRole.Separator, new() { Name = "Resize terminal", Exact = true })).ToHaveAttributeAsync("aria-orientation", "horizontal");
        }
        finally { await context.CloseAsync(); }
    }
}
