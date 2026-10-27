using Microsoft.Playwright;

namespace SheenUI.Integration.Tests;

public partial class GeneratedAppTests
{
    private static void WriteChoicePages(string components)
    {
        var markup = File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Fixtures", "ChoiceParity.razor"));
        File.WriteAllText(Path.Combine(components, "Pages", "ChoiceParity.razor"), markup);
        File.WriteAllText(Path.Combine(components, "Pages", "StaticChoiceParity.razor"), markup.Replace("@page \"/choice-parity\"", "@page \"/static-choice-parity\"").Replace("@rendermode InteractiveServer", ""));
    }

    private static async Task VerifyChoiceParity(IPage page, string url)
    {
        var errors = new List<string>();
        void Error(object? sender, string message) => errors.Add(message);
        page.PageError += Error;
        await page.GotoAsync(url + "/choice-parity");
        await Assertions.Expect(page.Locator("#choice-save")).ToBeEnabledAsync();
        await page.Locator("#choice-save").ClickAsync();
        await Assertions.Expect(page.Locator("button#parity-select")).ToHaveAttributeAsync("aria-invalid", "true");
        await Assertions.Expect(page.Locator("#parity-auto")).ToHaveAttributeAsync("aria-invalid", "true");

        var trigger = page.Locator("button#parity-select");
        await trigger.PressAsync("ArrowDown");
        var select = page.Locator(".sheen-blazor-select-content:popover-open");
        await Assertions.Expect(select.GetByRole(AriaRole.Group)).ToHaveCountAsync(2);
        await Assertions.Expect(select.GetByRole(AriaRole.Separator)).ToHaveCountAsync(1);
        await select.GetByRole(AriaRole.Option, new() { Name = "Blocked", Exact = true }).DispatchEventAsync("click");
        await Assertions.Expect(page.Locator("#choice-values")).Not.ToContainTextAsync("blocked");
        await select.GetByRole(AriaRole.Listbox).PressAsync("End");
        await select.GetByRole(AriaRole.Listbox).PressAsync("Enter");
        await Assertions.Expect(trigger).ToHaveTextAsync("Amman");
        await Assertions.Expect(trigger).ToBeFocusedAsync();
        await trigger.PressAsync("c");
        await select.GetByRole(AriaRole.Listbox).PressAsync("Enter");
        await Assertions.Expect(trigger).ToHaveTextAsync("Cairo");

        await page.Locator("button#parity-number").PressAsync("ArrowDown");
        await page.Locator("#parity-number-list").PressAsync("End");
        await page.Locator("#parity-number-list").PressAsync("Space");
        await Assertions.Expect(page.Locator("#choice-values")).ToHaveTextAsync(new System.Text.RegularExpressions.Regex("\\|3$"));
        await page.Locator("button#parity-long").ClickAsync();
        var longList = page.Locator("#parity-long-popup");
        await Assertions.Expect(longList.GetByRole(AriaRole.Button, new() { Name = "Scroll down", Exact = true })).ToBeVisibleAsync();
        await longList.GetByRole(AriaRole.Listbox).PressAsync("End");
        await Assertions.Expect(longList.GetByRole(AriaRole.Button, new() { Name = "Scroll up", Exact = true })).ToBeVisibleAsync();
        await longList.GetByRole(AriaRole.Listbox).PressAsync("Enter");
        await Assertions.Expect(page.Locator("button#parity-long")).ToHaveTextAsync("40");
        await page.Locator("button#parity-multi").ClickAsync();
        var combo = page.Locator(".sheen-rich-combobox-content:popover-open");
        var search = combo.GetByRole(AriaRole.Combobox);
        var controlledList = await page.Locator("button#parity-multi").GetAttributeAsync("aria-controls");
        await Assertions.Expect(page.Locator("#" + controlledList)).ToHaveAttributeAsync("role", "listbox");
        await search.FillAsync("jsx");
        await Assertions.Expect(combo.GetByRole(AriaRole.Option, new() { Name = "React Frontend library", Exact = true })).ToBeVisibleAsync();
        await search.PressAsync("Home");
        await search.PressAsync("Enter");
        await Assertions.Expect(combo).ToBeVisibleAsync();
        await Assertions.Expect(page.Locator("#choice-values")).ToContainTextAsync("|react|");
        await search.FillAsync("Rust");
        await combo.GetByRole(AriaRole.Option, new() { Name = "Create", Exact = false }).ClickAsync();
        await Assertions.Expect(page.Locator("#choice-values")).ToContainTextAsync("|react,rust|");
        await Assertions.Expect(combo).ToBeVisibleAsync();
        await search.PressAsync("Escape");
        await page.GetByRole(AriaRole.Button, new() { Name = "Remove Rust", Exact = true }).ClickAsync();
        await Assertions.Expect(page.Locator("#choice-values")).ToContainTextAsync("|react|");

        await page.Locator("#parity-auto").FillAsync("سعد");
        var auto = page.Locator(".sheen-autocomplete-content:popover-open");
        await Assertions.Expect(auto.Locator("mark")).ToHaveTextAsync("سعد");
        await auto.GetByRole(AriaRole.Option).ClickAsync();
        await Assertions.Expect(page.Locator("#parity-auto")).ToHaveValueAsync("سعد السراي");
        await Assertions.Expect(page.Locator("#choice-values")).ToContainTextAsync("|saad|سعد السراي|");
        await page.Locator("#choice-save").ClickAsync();
        await Assertions.Expect(page.Locator("#choice-saved")).ToHaveTextAsync("saved");
        var posted = await page.Locator("form").EvaluateAsync<string[]>("el => [...new FormData(el).values()].filter(v => typeof v === 'string')");
        Assert.Contains("cairo", posted);
        Assert.Contains("react", posted);
        Assert.Contains("saad", posted);
        // Clearing a rich selected value must not erase the new query during parent binding renders.
        await page.Locator("#parity-auto").FillAsync("أحمد");
        await Assertions.Expect(auto.GetByRole(AriaRole.Option)).ToHaveCountAsync(1);
        await Assertions.Expect(page.Locator("#parity-auto")).ToHaveValueAsync("أحمد");
        await auto.GetByRole(AriaRole.Option).ClickAsync();
        await Assertions.Expect(page.Locator("#choice-values")).ToContainTextAsync("|ahmed|أحمد|");


        await page.Locator("button#parity-remote").ClickAsync();
        await page.Locator(".sheen-rich-combobox-content:popover-open input").FillAsync("missing");
        await Assertions.Expect(page.GetByRole(AriaRole.Option, new() { Name = "Remote result", Exact = true })).ToBeVisibleAsync();
        await page.Keyboard.PressAsync("Escape");
        await Assertions.Expect(page.Locator("button#parity-remote")).ToContainTextAsync("React");

        var asyncInput = page.Locator("#parity-rich-async");
        await asyncInput.FillAsync("s");
        await asyncInput.PressAsync("ArrowDown");
        await Assertions.Expect(asyncInput).ToHaveAttributeAsync("aria-expanded", "false");
        await asyncInput.FillAsync("slow");
        await asyncInput.FillAsync("fast");
        await Assertions.Expect(page.GetByRole(AriaRole.Option, new() { Name = "fast result Remote profile", Exact = true })).ToBeVisibleAsync();
        await page.WaitForTimeoutAsync(350);
        await Assertions.Expect(page.GetByRole(AriaRole.Option, new() { Name = "slow result Remote profile", Exact = true })).ToHaveCountAsync(0);
        await asyncInput.PressAsync("Enter");
        await Assertions.Expect(asyncInput).ToHaveValueAsync("fast result");
        await asyncInput.FillAsync("error");
        await Assertions.Expect(page.GetByText("Unable to load suggestions.", new() { Exact = true })).ToBeVisibleAsync();
        await asyncInput.FillAsync("recover");
        await page.GetByRole(AriaRole.Option, new() { Name = "recover result Remote profile", Exact = true }).ClickAsync();

        await page.Locator("#parity-uncontrolled").FillAsync("أحمد");
        await Assertions.Expect(auto.GetByRole(AriaRole.Option)).ToHaveCountAsync(1);
        await Assertions.Expect(page.Locator("#parity-uncontrolled")).ToHaveValueAsync("أحمد");
        await auto.GetByRole(AriaRole.Option).ClickAsync();
        await Assertions.Expect(page.Locator("#uncontrolled-person")).ToHaveTextAsync("ahmed");

        var inline = page.Locator("#choices > .sheen-command");
        var commandInput = inline.GetByRole(AriaRole.Combobox);
        foreach (var query in new[] { "الاعدادات", "stg", "preferences settings" })
        {
            await commandInput.FillAsync(query);
            await Assertions.Expect(inline.GetByRole(AriaRole.Option)).ToHaveCountAsync(2); // result plus force-mounted Help
            await Assertions.Expect(inline.GetByRole(AriaRole.Option).First).ToContainTextAsync("الإعدادات");
        }
        await commandInput.FillAsync("مكتبه الاستاذ يحيي");
        await Assertions.Expect(inline.GetByRole(AriaRole.Option).First).ToContainTextAsync("مكتبة الأُستاذ يحيى");
        await commandInput.FillAsync("CAFE");
        await commandInput.PressAsync("Home");
        await commandInput.PressAsync("Enter");
        await Assertions.Expect(page.Locator("#choice-values")).ToContainTextAsync("|cafe|");
        await commandInput.FillAsync("123");
        await Assertions.Expect(inline.GetByRole(AriaRole.Option).First).ToHaveTextAsync("أحمد علي");
        await commandInput.FillAsync("");
        await page.Locator("#command-loading").ClickAsync();
        await commandInput.PressAsync("Home");
        await commandInput.PressAsync("Enter");
        await Assertions.Expect(page.Locator("#choice-values")).ToContainTextAsync("|cafe|");
        await page.Locator("#command-loading").ClickAsync();
        await commandInput.FillAsync("not-found");
        await Assertions.Expect(inline.GetByRole(AriaRole.Option)).ToHaveCountAsync(1);
        await commandInput.PressAsync("End");
        await commandInput.PressAsync("ArrowDown");
        await commandInput.PressAsync("Enter");
        await Assertions.Expect(page.Locator("#choice-values")).ToContainTextAsync("|help|");
        await page.Keyboard.PressAsync("Control+k");
        var palette = page.Locator("dialog[open].sheen-command-dialog");
        await Assertions.Expect(palette).ToBeVisibleAsync();
        await palette.GetByRole(AriaRole.Combobox).PressAsync("Escape");
        await Assertions.Expect(palette).ToBeHiddenAsync();
        await Assertions.Expect(page.Locator("button#parity-disabled")).ToBeDisabledAsync();
        await page.Locator("#parity-readonly").ClickAsync();
        await page.Locator("#parity-readonly").PressAsync("ArrowDown");
        await Assertions.Expect(page.Locator("#parity-readonly")).ToHaveAttributeAsync("aria-expanded", "false");

        foreach (var _ in new[] { 0, 1, 2 })
        {
            await page.Locator("#choice-theme").ClickAsync();
            await trigger.ClickAsync();
            var option = select.GetByRole(AriaRole.Option, new() { Name = "بغداد", Exact = true });
            await option.HoverAsync();
            await page.WaitForTimeoutAsync(220);
            await Assertions.Expect(select.Locator("[data-choice-highlight]:not([hidden])")).ToHaveCountAsync(1);
            var geometry = await select.EvaluateAsync<double[]>("el => { const a=el.querySelector('[data-active]').getBoundingClientRect(), b=el.querySelector('[data-choice-highlight]').getBoundingClientRect();return [a.y-b.y,a.height-b.height] }");
            Assert.All(geometry, delta => Assert.InRange(Math.Abs(delta), 0, 1));
            await option.ClickAsync();
        }
        await page.SetViewportSizeAsync(390, 844);
        await trigger.ClickAsync();
        await page.WaitForFunctionAsync("() => { const r=document.querySelector('.sheen-blazor-select-content:popover-open')?.getBoundingClientRect(); return r && r.x >= 0 && r.right <= innerWidth + 1 }");
        var bounds = await select.BoundingBoxAsync();
        Assert.NotNull(bounds);
        Assert.InRange(bounds.X, 0, 390 - bounds.Width + 1);
        await page.Keyboard.PressAsync("Escape");
        await page.Locator("#choice-reset").ClickAsync();
        await Assertions.Expect(trigger).ToHaveTextAsync("بغداد");
        await Assertions.Expect(page.Locator("#parity-auto")).ToHaveValueAsync("سعد السراي");
        await page.SetViewportSizeAsync(1280, 720);
        page.PageError -= Error;
        Assert.Empty(errors);

        var context = await page.Context.Browser!.NewContextAsync(new() { JavaScriptEnabled = false });
        try
        {
            var ssr = await context.NewPageAsync();
            await ssr.GotoAsync(url + "/static-choice-parity");
            await Assertions.Expect(ssr.Locator("select#parity-select")).ToBeVisibleAsync();
            await ssr.Locator("select#parity-select").SelectOptionAsync("baghdad");
            await ssr.Locator("select#parity-multi").SelectOptionAsync(["react", "blazor"]);
            await ssr.Locator("select#parity-auto").SelectOptionAsync("saad");
        }
        finally { await context.CloseAsync(); }
    }
}
