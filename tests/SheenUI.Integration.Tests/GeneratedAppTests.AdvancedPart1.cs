using Microsoft.Playwright;
using Program = SheenUI.Cli.Program;

namespace SheenUI.Integration.Tests;

public partial class GeneratedAppTests
{
    [Theory]
    [InlineData("net8.0")]
    [InlineData("net9.0")]
    [InlineData("net10.0")]
    public async Task Chat_and_speed_dial_install_and_match_react(string targetFramework)
    {
        var app = Path.Combine(_root, "SampleApp");
        Dotnet(_root, "new", "blazor", "-f", targetFramework, "--interactivity", "Server", "-n", "SampleApp", "-o", app);
        var output = new StringWriter(); var error = new StringWriter();
        Assert.Equal(0, Program.Run(["init"], app, output, error));
        foreach (var name in new[] { "chat", "speed-dial", "avatar", "toggle", "switch" })
            Assert.True(Program.Run(["add", name], app, output, error) == 0, error.ToString());
        var target = Path.Combine(app, "Components", "Pages", "AdvancedExamples"); Directory.CreateDirectory(target);
        foreach (var file in Directory.GetFiles(Path.Combine(AppContext.BaseDirectory, "Fixtures", "AdvancedExamples"), "*.razor")) File.Copy(file, Path.Combine(target, Path.GetFileName(file)));
        File.AppendAllText(Path.Combine(app, "Components", "_Imports.razor"), "\n@using SampleApp.Components.Pages.AdvancedExamples\n");
        var markup = File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Fixtures", "AdvancedPart1.razor"));
        File.WriteAllText(Path.Combine(app, "Components", "Pages", "AdvancedPart1.razor"), markup);
        File.WriteAllText(Path.Combine(app, "Components", "Pages", "StaticAdvancedPart1.razor"), markup.Replace("/advanced-one", "/static-advanced-one").Replace("@rendermode InteractiveServer", ""));
        var assets = Path.Combine(app, "wwwroot", "avatars"); Directory.CreateDirectory(assets);
        File.WriteAllBytes(Path.Combine(assets, "astronaut.jpg"), Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jVJkAAAAASUVORK5CYII="));
        var program = Path.Combine(app, "Program.cs");
        File.WriteAllText(program, "using Microsoft.AspNetCore.DataProtection;\n" + File.ReadAllText(program).Replace("var app = builder.Build();", "builder.Services.AddDataProtection().UseEphemeralDataProtectionProvider(); var app = builder.Build();"));
        Dotnet(app, "build", "-warnaserror:RZ10012");
        var before = InstallationWorkflowTests.SnapshotFiles(app);
        foreach (var name in new[] { "chat", "speed-dial" }) Assert.Equal(0, Program.Run(["add", name], app, output, error));
        Assert.Equal(before, InstallationWorkflowTests.SnapshotFiles(app));
        await VerifyInBrowser(app, VerifyAdvancedOne);
    }

    private static async Task VerifyAdvancedOne(IPage page, string url)
    {
        var errors = new List<string>(); page.PageError += (_, message) => errors.Add(message);
        await page.SetViewportSizeAsync(1440, 1000);
        await page.GotoAsync(url + "/advanced-one");
        var stage = page.Locator("[data-dial-labels]");
        var trigger = stage.GetByRole(AriaRole.Button, new() { Name = "Actions", Exact = true });
        await Assertions.Expect(trigger).ToBeEnabledAsync();
        await trigger.ClickAsync();
        await Assertions.Expect(trigger).ToHaveAttributeAsync("aria-expanded", "true");
        await stage.GetByRole(AriaRole.Menuitem, new() { Name = "Share", Exact = true }).ClickAsync();
        await Assertions.Expect(stage.Locator("output")).ToHaveTextAsync("Picked: Share");
        await Assertions.Expect(trigger).ToBeFocusedAsync();
        await trigger.PressAsync("ArrowUp");
        await Assertions.Expect(stage.GetByRole(AriaRole.Menuitem, new() { Name = "Share", Exact = true })).ToBeFocusedAsync();
        await page.Keyboard.PressAsync("End"); await Assertions.Expect(stage.GetByRole(AriaRole.Menuitem, new() { Name = "Download", Exact = true })).ToBeFocusedAsync();
        await page.Keyboard.PressAsync("Home"); await page.Keyboard.PressAsync("ArrowDown"); await Assertions.Expect(trigger).ToBeFocusedAsync();
        await Assertions.Expect(trigger).ToHaveAttributeAsync("aria-expanded", "false");
        foreach (var (side, arrow) in new[] { ("top", "ArrowUp"), ("bottom", "ArrowDown"), ("left", "ArrowLeft"), ("right", "ArrowRight") })
        {
            var dial = page.Locator($"[data-dial-sides] .sheen-speed-dial[data-side={side}]");
            await dial.Locator(".sheen-speed-dial-trigger").PressAsync(arrow);
            await Assertions.Expect(dial.GetByRole(AriaRole.Menuitem).First).ToBeFocusedAsync();
            await page.Keyboard.PressAsync("Escape");
            await Assertions.Expect(dial.Locator(".sheen-speed-dial-trigger")).ToBeFocusedAsync();
        }
        var probe = page.Locator("#dial-probe"); var probeTrigger = probe.GetByRole(AriaRole.Button, new() { Name = "Probe actions", Exact = true });
        await probeTrigger.PressAsync("ArrowUp");
        await page.Keyboard.PressAsync("ArrowUp");
        await Assertions.Expect(probe.GetByRole(AriaRole.Menuitem, new() { Name = "Close action", Exact = true })).ToBeFocusedAsync();
        await page.Keyboard.PressAsync("Home");
        await probe.GetByRole(AriaRole.Menuitem, new() { Name = "Keep open", Exact = true }).ClickAsync();
        await Assertions.Expect(probe.Locator("#probe-selected")).ToHaveTextAsync("1");
        await Assertions.Expect(probeTrigger).ToHaveAttributeAsync("aria-expanded", "true");
        await page.Keyboard.PressAsync("Escape");
        await probe.GetByRole(AriaRole.Button, new() { Name = "Toggle dismissal", Exact = true }).ClickAsync();
        await probeTrigger.ClickAsync(); await page.Keyboard.PressAsync("Escape");
        await Assertions.Expect(probeTrigger).ToHaveAttributeAsync("aria-expanded", "true");
        await page.Locator("h1").ClickAsync(); await Assertions.Expect(probeTrigger).ToHaveAttributeAsync("aria-expanded", "true");
        await probeTrigger.ClickAsync();
        await Assertions.Expect(probe.GetByRole(AriaRole.Button, new() { Name = "Disabled dial", Exact = true })).ToBeDisabledAsync();
        var hover = page.Locator("[data-dial-hover]");
        await hover.Locator(".sheen-speed-dial-trigger").HoverAsync();
        await Assertions.Expect(hover.Locator(".sheen-speed-dial-trigger")).ToHaveAttributeAsync("aria-expanded", "true");
        await Assertions.Expect(hover.GetByRole(AriaRole.Switch)).ToBeCheckedAsync();
        await page.Locator("h1").HoverAsync();
        await Assertions.Expect(hover.Locator(".sheen-speed-dial-trigger")).ToHaveAttributeAsync("aria-expanded", "false");
        var ar = page.Locator("[data-dial-arabic]"); await ar.Locator(".sheen-speed-dial-trigger").ClickAsync();
        await ar.GetByRole(AriaRole.Menuitem, new() { Name = "مشاركة", Exact = true }).ClickAsync();
        await Assertions.Expect(ar.Locator("output")).ToHaveTextAsync("اخترت: مشاركة");

        var conversation = page.Locator("[data-conversation=live]"); var field = conversation.Locator("textarea");
        await Assertions.Expect(field).ToBeEnabledAsync();
        await Assertions.Expect(conversation.GetByRole(AriaRole.Button, new() { Name = "Send", Exact = true })).ToBeDisabledAsync();
        await field.FillAsync("First line"); await field.PressAsync("Shift+Enter"); await field.PressSequentiallyAsync("Second line");
        await Assertions.Expect(field).ToHaveValueAsync("First line\nSecond line");
        await field.PressAsync("Enter");
        await Assertions.Expect(conversation.Locator(".sheen-chat-bubble").Filter(new() { HasText = "First line\nSecond line" })).ToHaveCountAsync(1);
        await Assertions.Expect(field).ToHaveValueAsync(""); await Assertions.Expect(field).ToBeFocusedAsync();
        await Assertions.Expect(conversation.Locator("[data-status=read]").First).ToBeVisibleAsync();
        await Assertions.Expect(conversation.Locator(".sheen-chat-bubble").Filter(new() { HasText = "Sounds good to me" })).ToBeVisibleAsync();
        await conversation.GetByRole(AriaRole.Button, new() { Name = "Simulate offline", Exact = true }).ClickAsync();
        await field.FillAsync("Retry this message"); await field.PressAsync("Enter");
        await Assertions.Expect(conversation.GetByRole(AriaRole.Button, new() { Name = "Retry", Exact = true })).ToBeVisibleAsync();
        await conversation.GetByRole(AriaRole.Button, new() { Name = "Simulate offline", Exact = true }).ClickAsync();
        await conversation.GetByRole(AriaRole.Button, new() { Name = "Retry", Exact = true }).ClickAsync();
        await Assertions.Expect(conversation.Locator(".sheen-chat-row[data-status=failed]")).ToHaveCountAsync(0);
        await Assertions.Expect(conversation.Locator(".sheen-chat-row[data-status=read]")).ToHaveCountAsync(1);
        var arabic = page.Locator("[data-conversation=arabic]"); await arabic.Locator("textarea").FillAsync("رسالة من بغداد"); await arabic.GetByRole(AriaRole.Button, new() { Name = "إرسال", Exact = true }).ClickAsync();
        await Assertions.Expect(arabic.Locator(".sheen-chat-bubble").Filter(new() { HasText = "رسالة من بغداد" })).ToBeVisibleAsync();
        await Assertions.Expect(arabic.Locator(".sheen-chat-status").Last).ToContainTextAsync("أُرسلت");

        var draft = page.GetByRole(AriaRole.Textbox, new() { Name = "Draft probe", Exact = true });
        await Assertions.Expect(draft).ToHaveValueAsync("initial draft");
        await draft.FillAsync("IME draft");
        await draft.DispatchEventAsync("compositionstart"); await draft.DispatchEventAsync("keydown", new { key = "Enter", isComposing = true });
        await Assertions.Expect(draft).ToHaveValueAsync("IME draft"); await Assertions.Expect(page.Locator("#draft-sent")).ToBeEmptyAsync();
        await draft.DispatchEventAsync("compositionend");
        await page.GetByRole(AriaRole.Button, new() { Name = "Set draft", Exact = true }).ClickAsync();
        await Assertions.Expect(draft).ToHaveValueAsync("server draft");
        await draft.EvaluateAsync("e=>{e.value='rapid one';e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));e.value='next draft';e.dispatchEvent(new Event('input',{bubbles:true}))}");
        await Assertions.Expect(page.Locator("#draft-sent")).ToHaveTextAsync("rapid one");
        await Assertions.Expect(page.Locator("#draft-value")).ToHaveTextAsync("next draft"); await Assertions.Expect(draft).ToHaveValueAsync("next draft");
        await draft.FillAsync("<img src=x onerror=alert(1)>"); await draft.PressAsync("Enter"); await Assertions.Expect(page.Locator("#draft-sent")).ToHaveTextAsync("<img src=x onerror=alert(1)>");
        await page.GetByRole(AriaRole.Button, new() { Name = "Toggle disabled", Exact = true }).ClickAsync(); await Assertions.Expect(draft).ToBeDisabledAsync();
        await page.GetByRole(AriaRole.Button, new() { Name = "Toggle disabled", Exact = true }).ClickAsync();
        await draft.FillAsync(string.Join("\n", Enumerable.Repeat("Long draft", 15)));
        Assert.True(await draft.EvaluateAsync<bool>("e=>e.scrollHeight>e.clientHeight && e.clientHeight<140"));
        var log = page.Locator("#scroll-probe [role=log]");
        await Assertions.Expect(log).ToHaveAttributeAsync("aria-live", "polite");
        await log.EvaluateAsync("e=>{e.scrollTop=0;e.dispatchEvent(new Event('scroll'))}");
        await page.GetByRole(AriaRole.Button, new() { Name = "Append message", Exact = true }).ClickAsync();
        var jump = page.Locator("#scroll-probe .sheen-chat-jump"); await Assertions.Expect(jump).ToHaveAttributeAsync("data-visible", "");
        await jump.ClickAsync(); await Assertions.Expect(jump).Not.ToHaveAttributeAsync("data-visible", "");
        await page.WaitForFunctionAsync("()=>{const e=document.querySelector('#scroll-probe [role=log]');return e.scrollHeight-e.scrollTop-e.clientHeight<48}");
        await page.GetByRole(AriaRole.Button, new() { Name = "Append message", Exact = true }).ClickAsync();
        await page.WaitForFunctionAsync("()=>{const e=document.querySelector('#scroll-probe [role=log]');return e.scrollHeight-e.scrollTop-e.clientHeight<48}");
        await page.GetByRole(AriaRole.Button, new() { Name = "Toggle examples", Exact = true }).ClickAsync();
        await Assertions.Expect(page.Locator("#advanced-speed")).ToHaveCountAsync(0);
        await page.GetByRole(AriaRole.Button, new() { Name = "Toggle examples", Exact = true }).ClickAsync();
        await Assertions.Expect(page.Locator("[data-dial-labels] .sheen-speed-dial-trigger")).ToBeEnabledAsync();
        foreach (var width in new[] { 1440, 390 })
            foreach (var appearance in new[] { "default", "flat", "glass" })
                foreach (var mode in new[] { "light", "dark" })
                    foreach (var direction in new[] { "ltr", "rtl" })
                    {
                        await page.SetViewportSizeAsync(width, 1000);
                        await page.Locator("#advanced-appearance").SelectOptionAsync(appearance); await page.Locator("#advanced-mode").SelectOptionAsync(mode); await page.Locator("#advanced-direction").SelectOptionAsync(direction);
                        await page.Locator("#advanced-accent").SelectOptionAsync(mode == "dark" ? "emerald" : "blue"); await page.Locator("#advanced-density").SelectOptionAsync(width == 390 ? "compact" : "comfortable");
                        await Assertions.Expect(page.Locator("#advanced-theme")).ToHaveAttributeAsync("dir", direction);
                        Assert.True(await page.EvaluateAsync<bool>("()=>document.documentElement.scrollWidth<=innerWidth+1"), $"Overflow {width} {appearance} {mode} {direction}");
                        var dial = page.Locator("[data-dial-labels]"); await dial.Locator(".sheen-speed-dial-trigger").ClickAsync(); await Assertions.Expect(dial.GetByRole(AriaRole.Menuitem).First).ToBeVisibleAsync(); await page.Keyboard.PressAsync("Escape");
                    }
        await page.EmulateMediaAsync(new() { ReducedMotion = ReducedMotion.Reduce });
        await trigger.ClickAsync(); Assert.Equal("none", await stage.Locator(".sheen-speed-dial-item").First.EvaluateAsync<string>("e=>getComputedStyle(e).transform")); await page.Keyboard.PressAsync("Escape");
        await page.ReloadAsync(); await Assertions.Expect(page.Locator("[data-dial-labels] .sheen-speed-dial-trigger")).ToBeEnabledAsync();
        var response = await page.APIRequest.GetAsync(url + "/static-advanced-one");
        Assert.True(response.Ok); var html = await response.TextAsync();
        Assert.Contains("role=\"log\"", html); Assert.Contains("aria-live=\"polite\"", html); Assert.Contains("initial draft", html); Assert.Contains("sheen-speed-dial-content", html);
        await page.GotoAsync(url + "/static-advanced-one");
        await Assertions.Expect(page.Locator("[data-dial-labels] .sheen-speed-dial-trigger")).ToBeDisabledAsync();
        await Assertions.Expect(page.GetByRole(AriaRole.Textbox, new() { Name = "Draft probe", Exact = true })).ToBeDisabledAsync();
        Assert.Empty(errors);
    }
}
