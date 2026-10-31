using Microsoft.Playwright;

namespace RaxUI.Integration.Tests;

public partial class GeneratedAppTests
{
    private static void WritePanelPages(string components)
    {
        var target = Path.Combine(components, "Pages", "PanelExamples");
        Directory.CreateDirectory(target);
        foreach (var file in Directory.GetFiles(Path.Combine(AppContext.BaseDirectory, "Fixtures", "PanelExamples")))
            File.WriteAllText(Path.Combine(target, Path.GetFileName(file)), File.ReadAllText(file).Replace("./Components/Examples/Panels/", "./Components/Pages/PanelExamples/"));
        File.AppendAllText(Path.Combine(components, "_Imports.razor"), "\n@using SampleApp.Components.Pages.PanelExamples\n");
        var markup = File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Fixtures", "Panels.razor"));
        File.WriteAllText(Path.Combine(components, "Pages", "Panels.razor"), markup);
        File.WriteAllText(Path.Combine(components, "Pages", "StaticPanels.razor"), markup.Replace("@page \"/panel-demo\"", "@page \"/static-panel-demo\"").Replace("@rendermode InteractiveServer", ""));
    }

    private static async Task VerifyPanels(IPage page, string url)
    {
        var errors = new List<string>();
        void Error(object? sender, string message) => errors.Add(message);
        page.PageError += Error;
        await page.SetViewportSizeAsync(1122, 1122);
        await page.EmulateMediaAsync(new() { ReducedMotion = ReducedMotion.Reduce });
        await page.GotoAsync(url + "/panel-demo");
        await Assertions.Expect(page.Locator("#open-sheet-probe")).ToBeEnabledAsync();
        var parsed = await page.EvaluateAsync<double[]>("async () => { const {parseSnap}=await import('/Components/UI/Sheet/Sheet.razor.js');return [parseSnap('148px',1122),parseSnap('55%',1122),parseSnap('0.96',1122)] }");
        Assert.Equal(148, parsed[0]);
        Assert.InRange(Math.Abs(parsed[1] - 617.1), 0, .001);
        Assert.InRange(Math.Abs(parsed[2] - 1077.12), 0, .001);
        Assert.True(await page.EvaluateAsync<bool>("async () => { const {parseSnap}=await import('/Components/UI/Sheet/Sheet.razor.js');return ['0','2','-1','bad','148px;display:none'].every(value => {try{parseSnap(value,1122);return false}catch{return true}}) }"));

        foreach (var width in new[] { 1122, 390 })
        {
            var height = width == 1122 ? 1122 : 844;
            await page.SetViewportSizeAsync(width, height);
            foreach (var direction in new[] { "ltr", "rtl" })
            {
                await page.Locator("#panel-direction").SelectOptionAsync(direction);
                foreach (var side in new[] { "start", "end", "top", "bottom" })
                {
                    await page.Locator("#panel-side").SelectOptionAsync(side);
                    foreach (var kind in new[] { "sheet", "drawer" })
                    {
                        await page.Locator("#open-" + kind + "-probe").ClickAsync();
                        var panel = page.Locator("dialog[open]");
                        await Assertions.Expect(panel).ToBeVisibleAsync();
                        await page.WaitForFunctionAsync("() => { const p=document.querySelector('dialog[open]');return p?.dataset.physicalSide && !p.hasAttribute('data-panel-entering') }");
                        var box = (await panel.BoundingBoxAsync())!;
                        Assert.InRange(box.X, -1, width - box.Width + 1);
                        Assert.InRange(box.Y, -1, height - box.Height + 1);
                        if (side is "start" or "end")
                        {
                            Assert.InRange(Math.Abs(box.Height - (height - 16)), 0, 1);
                            var right = side == "start" ? direction == "rtl" : direction == "ltr";
                            Assert.InRange(Math.Abs(box.X - (right ? width - box.Width - 8 : 8)), 0, 1);
                            await Assertions.Expect(panel.Locator("[data-panel-handle]")).ToHaveCountAsync(0);
                        }
                        if (side == "top" && kind == "sheet") Assert.InRange(Math.Abs(box.Width - (width - 16)), 0, 1);
                        if (side == "bottom" && kind == "sheet" && width == 390) Assert.InRange(Math.Abs(box.Width - width), 0, 1);
                        var body = panel.Locator(".rax-" + kind + "-body");
                        Assert.True(await body.EvaluateAsync<bool>("el => el.scrollHeight > el.clientHeight"));
                        var footer = (await panel.Locator(".rax-" + kind + "-footer").BoundingBoxAsync())!;
                        Assert.InRange(footer.Y + footer.Height, 0, height + 1);
                        await page.Keyboard.PressAsync("Escape");
                        await Assertions.Expect(panel).ToHaveCountAsync(0);
                    }
                }
            }
        }
        await page.SetViewportSizeAsync(1122, 1122);
        await page.Locator("#panel-direction").SelectOptionAsync("ltr");
        await page.Locator("#panel-side").SelectOptionAsync("start");
        foreach (var appearance in new[] { "default", "flat", "glass" })
        {
            await page.Locator("#panel-appearance").SelectOptionAsync(appearance);
            foreach (var mode in new[] { "light", "dark" })
            {
                await page.Locator("#panel-mode").SelectOptionAsync(mode);
                foreach (var kind in new[] { "sheet", "drawer" })
                {
                    await page.Locator("#open-" + kind + "-probe").ClickAsync();
                    var panel = page.Locator("dialog[open]");
                    await Assertions.Expect(panel).ToBeVisibleAsync();
                    var blur = await panel.EvaluateAsync<string>("el => getComputedStyle(el, '::backdrop').backdropFilter");
                    Assert.Contains("4px", blur);
                    var surface = await panel.EvaluateAsync<string>("el => getComputedStyle(el).backdropFilter");
                    Assert.Equal(appearance == "glass", surface.Contains("32px", StringComparison.Ordinal));
                    foreach (var value in new[] { 0, 12 })
                    {
                        await panel.EvaluateAsync("(el, setting) => el.style.setProperty(setting.name, setting.value)", new { name = "--rax-" + kind + "-overlay-blur", value = value + "px" });
                        Assert.Contains(value + "px", await panel.EvaluateAsync<string>("el => getComputedStyle(el, '::backdrop').backdropFilter"));
                    }
                    await panel.EvaluateAsync("(el, name) => el.style.removeProperty(name)", "--rax-" + kind + "-overlay-blur");
                    await page.Keyboard.PressAsync("Escape");
                }
            }
        }
        await page.Locator("#panel-appearance").SelectOptionAsync("default");
        await page.Locator("#panel-mode").SelectOptionAsync("light");
        await page.Locator("#open-sheet-probe").ClickAsync();
        await page.Locator("#panel-text").FillAsync("Editing stays safe");
        await page.Locator("#panel-action").ClickAsync();
        await Assertions.Expect(page.Locator("#panel-values")).ToContainTextAsync("Editing stays safe|1|True");
        await DragPanel(page, "sheet", -230, false);
        await Assertions.Expect(page.Locator("dialog[open]")).ToHaveCountAsync(0);
        await Assertions.Expect(page.Locator("#open-sheet-probe")).ToBeFocusedAsync();
        await page.Locator("#open-sheet-probe").ClickAsync();
        var cancelPanel = page.Locator("dialog[open]");
        var cancelHeader = (await cancelPanel.Locator(".rax-sheet-header").BoundingBoxAsync())!;
        await page.Mouse.MoveAsync(cancelHeader.X + 100, cancelHeader.Y + 20);
        await page.Mouse.DownAsync();
        await page.Mouse.MoveAsync(cancelHeader.X + 60, cancelHeader.Y + 20, new() { Steps = 8 });
        await cancelPanel.DispatchEventAsync("pointercancel");
        await page.Mouse.UpAsync();
        await Assertions.Expect(cancelPanel).ToBeVisibleAsync();
        Assert.InRange(Math.Abs((await cancelPanel.BoundingBoxAsync())!.X - 8), 0, 1);
        await page.Keyboard.PressAsync("Escape");
        await page.Locator("#open-sheet-probe").ClickAsync();
        // A short, fast flick closes even though it is below the distance threshold.
        var flick = (await page.Locator("dialog[open] .rax-sheet-header").BoundingBoxAsync())!;
        await page.Mouse.MoveAsync(flick.X + 150, flick.Y + 20);
        await page.Mouse.DownAsync();
        await page.Mouse.MoveAsync(flick.X + 80, flick.Y + 20);
        await page.Mouse.UpAsync();
        await Assertions.Expect(page.Locator("dialog[open]")).ToHaveCountAsync(0);
        await page.Locator("#panel-draggable").UncheckAsync();
        await page.Locator("#open-sheet-probe").ClickAsync();
        await DragPanel(page, "sheet", -230, false);
        await Assertions.Expect(page.Locator("dialog[open]")).ToHaveCountAsync(1);
        await page.Keyboard.PressAsync("Escape");
        await page.Locator("#panel-draggable").CheckAsync();
        await page.Locator("#open-drawer-probe").ClickAsync();
        await DragPanel(page, "drawer", -230, false);
        await Assertions.Expect(page.Locator("dialog[open]")).ToHaveCountAsync(0);

        await page.SetViewportSizeAsync(390, 844);
        await page.Locator("#panel-side").SelectOptionAsync("bottom");
        await page.Locator("#open-sheet-probe").ClickAsync();
        await TouchPanel(page, ".rax-sheet-header", 300);
        await Assertions.Expect(page.Locator("dialog[open]")).ToHaveCountAsync(0);
        await page.SetViewportSizeAsync(1122, 1122);
        await page.GetByRole(AriaRole.Button, new() { Name = "Nearby places", Exact = true }).ClickAsync();
        var snap = page.Locator("dialog[open]");
        await Assertions.Expect(snap).ToBeVisibleAsync();
        await page.WaitForFunctionAsync("() => Math.abs(document.querySelector('dialog[open]').getBoundingClientRect().y - (innerHeight-148))<1");
        foreach (var pair in new[] { ("Half", .45), ("Full", .04) })
        {
            await snap.GetByRole(AriaRole.Button, new() { Name = pair.Item1, Exact = true }).ClickAsync();
            await page.WaitForFunctionAsync("fraction => Math.abs(document.querySelector('dialog[open]').getBoundingClientRect().y - innerHeight*fraction)<1", pair.Item2);
        }
        var handle = snap.GetByRole(AriaRole.Button, new() { Name = "Resize drawer", Exact = true });
        Assert.False(await handle.EvaluateAsync<bool>("el => el === document.activeElement"));
        var handleColor = await handle.EvaluateAsync<string>("el => getComputedStyle(el).backgroundColor");
        await handle.HoverAsync();
        Assert.Equal(handleColor, await handle.EvaluateAsync<string>("el => getComputedStyle(el).backgroundColor"));
        Assert.Equal("none", await handle.EvaluateAsync<string>("el => getComputedStyle(el).boxShadow"));
        await handle.PressAsync("Home");
        await page.WaitForFunctionAsync("() => Math.abs(document.querySelector('dialog[open]').getBoundingClientRect().y - (innerHeight-148))<1");
        await handle.PressAsync("Enter");
        await page.WaitForFunctionAsync("() => Math.abs(document.querySelector('dialog[open]').getBoundingClientRect().y - innerHeight*.45)<1");
        await TouchPanel(page, ".rax-drawer-handle", -400);
        await page.WaitForFunctionAsync("() => Math.abs(document.querySelector('dialog[open]').getBoundingClientRect().y - innerHeight*.04)<1");
        await page.Keyboard.PressAsync("Escape");
        await page.GetByRole(AriaRole.Button, new() { Name = "Share", Exact = true }).ClickAsync();
        await page.GetByRole(AriaRole.Button, new() { Name = "Invite people…", Exact = true }).ClickAsync();
        await Assertions.Expect(page.Locator("dialog[open]")).ToHaveCountAsync(2);
        await Assertions.Expect(page.Locator("dialog[data-panel-nested]")).ToHaveCountAsync(1);
        Assert.InRange((await page.Locator("dialog[open]").Last.BoundingBoxAsync())!.Width, 639, 641);
        var child = page.Locator("dialog[open]").Last;
        Assert.Equal("none", await child.EvaluateAsync<string>("el => getComputedStyle(el, '::backdrop').backdropFilter"));
        Assert.Equal("rgba(0, 0, 0, 0)", await child.EvaluateAsync<string>("el => getComputedStyle(el, '::backdrop').backgroundColor"));
        Assert.Contains("4px", await page.Locator("dialog[open]").First.EvaluateAsync<string>("el => getComputedStyle(el, '::backdrop').backdropFilter"));
        await page.Keyboard.PressAsync("Escape");
        await Assertions.Expect(page.Locator("dialog[open]")).ToHaveCountAsync(1);
        await Assertions.Expect(page.GetByRole(AriaRole.Button, new() { Name = "Invite people…", Exact = true })).ToBeFocusedAsync();
        await page.Keyboard.PressAsync("Escape");
        await page.WaitForFunctionAsync("() => !document.querySelector('dialog[open]') && document.documentElement.style.overflow === ''");
        await page.GetByRole(AriaRole.Button, new() { Name = "Comments", Exact = true }).ClickAsync();
        var comments = page.Locator("dialog[open]");
        await comments.Locator(".rax-sheet-body").EvaluateAsync("el => el.scrollTop=300");
        await DragPanel(page, "sheet", 200, true);
        await Assertions.Expect(comments).ToHaveCountAsync(1);
        await page.Keyboard.PressAsync("Escape");
        await page.GetByRole(AriaRole.Button, new() { Name = "Edit profile", Exact = true }).ClickAsync();
        await Assertions.Expect(page.Locator("dialog[open].rax-dialog")).ToHaveCountAsync(1);
        await page.Keyboard.PressAsync("Escape");
        await page.SetViewportSizeAsync(390, 844);
        await page.GetByRole(AriaRole.Button, new() { Name = "Edit profile", Exact = true }).ClickAsync();
        await Assertions.Expect(page.Locator("dialog[open].rax-drawer-content")).ToHaveCountAsync(1);
        await page.Keyboard.PressAsync("Escape");
        await page.Locator("#panel-direction").SelectOptionAsync("rtl");
        await page.GetByRole(AriaRole.Button, new() { Name = "خيارات الطلب", Exact = true }).ClickAsync();
        await Assertions.Expect(page.Locator("dialog[open]")).ToHaveAttributeAsync("dir", "rtl");
        await page.Keyboard.PressAsync("Escape");
        await page.SetViewportSizeAsync(1280, 720);
        await page.EmulateMediaAsync(new() { ReducedMotion = ReducedMotion.NoPreference });
        page.PageError -= Error;
        Assert.Empty(errors);
        var context = await page.Context.Browser!.NewContextAsync(new() { JavaScriptEnabled = false });
        try
        {
            var ssr = await context.NewPageAsync();
            await ssr.GotoAsync(url + "/static-panel-demo");
            await Assertions.Expect(ssr.Locator("dialog[open]")).ToHaveCountAsync(0);
            await Assertions.Expect(ssr.GetByText("Open probe sheet", new() { Exact = true })).ToBeVisibleAsync();
        }
        finally { await context.CloseAsync(); }
    }

    private static async Task TouchPanel(IPage page, string target, double distance)
    {
        await page.WaitForFunctionAsync("() => { const panel=document.querySelector('dialog[open]');return panel && !panel.hasAttribute('data-panel-entering') }");
        var rect = (await page.Locator("dialog[open]").Last.Locator(target).BoundingBoxAsync())!;
        var x = rect.X + rect.Width / 2;
        var y = rect.Y + rect.Height / 2;
        var session = await page.Context.NewCDPSessionAsync(page);
        try
        {
            await session.SendAsync("Input.dispatchTouchEvent", new() { ["type"] = "touchStart", ["touchPoints"] = new[] { new { x, y, id = 1 } } });
            for (var step = 1; step <= 12; step++)
                await session.SendAsync("Input.dispatchTouchEvent", new() { ["type"] = "touchMove", ["touchPoints"] = new[] { new { x, y = y + distance * step / 12, id = 1 } } });
            await session.SendAsync("Input.dispatchTouchEvent", new() { ["type"] = "touchEnd", ["touchPoints"] = Array.Empty<object>() });
        }
        finally { await session.DetachAsync(); }
    }

    private static async Task DragPanel(IPage page, string kind, double distance, bool body)
    {
        var panel = page.Locator("dialog[open]").Last;
        await page.WaitForFunctionAsync("() => { const panel=document.querySelector('dialog[open]');return panel && !panel.hasAttribute('data-panel-entering') }");
        var rect = (await panel.Locator(".rax-" + kind + (body ? "-body" : "-header")).BoundingBoxAsync())!;
        var horizontal = await panel.EvaluateAsync<bool>("el => ['left','right'].includes(el.dataset.physicalSide)");
        var x = rect.X + rect.Width / 2;
        var y = rect.Y + Math.Min(rect.Height / 2, 80);
        await page.Mouse.MoveAsync((float)x, (float)y);
        await page.Mouse.DownAsync();
        await page.Mouse.MoveAsync((float)(x + (horizontal ? distance : 0)), (float)(y + (horizontal ? 0 : distance)), new() { Steps = 12 });
        await page.Mouse.UpAsync();
    }
}
