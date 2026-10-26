using Microsoft.Playwright;

namespace SheenUI.Integration.Tests;

public partial class GeneratedAppTests
{
    private static async Task VerifyTimePickers(IPage page, string url)
    {
        var errors = new List<string>();
        void Error(object? sender, string message) => errors.Add(message);
        page.PageError += Error;
        await page.GotoAsync(url + "/time-demo");
        var time = page.Locator("#time-ar");
        var result = page.Locator("#time-values");
        await Assertions.Expect(time.GetByRole(AriaRole.Listbox)).ToHaveCountAsync(3);
        await Assertions.Expect(time.GetByRole(AriaRole.Option, new() { Selected = true })).ToHaveCountAsync(0);
        await page.Locator("#time-save").ClickAsync();
        await Assertions.Expect(page.GetByText("اختر الوقت.", new() { Exact = true })).ToBeVisibleAsync();
        await Assertions.Expect(page.GetByText("Choose an appointment.", new() { Exact = true })).ToBeVisibleAsync();
        await Assertions.Expect(time).ToHaveAttributeAsync("aria-invalid", "true");
        var minute = time.GetByRole(AriaRole.Listbox, new() { Name = "الدقيقة", Exact = true });
        await minute.FocusAsync();
        await page.Keyboard.PressAsync("End");
        await Assertions.Expect(result).ToContainTextAsync("12:59|");
        await page.Keyboard.PressAsync("ArrowUp");
        await Assertions.Expect(result).ToContainTextAsync("12:58|");
        await minute.HoverAsync();
        await page.Mouse.WheelAsync(0, -36);
        await Assertions.Expect(result).ToContainTextAsync("12:57|");
        await page.Mouse.WheelAsync(0, 1000);
        await Assertions.Expect(result).ToContainTextAsync("12:59|");
        var band = time.Locator(".sheen-wheel-band");
        var chosen = minute.GetByRole(AriaRole.Option, new() { Selected = true });
        var bandBounds = (await band.BoundingBoxAsync())!;
        var optionBounds = (await chosen.BoundingBoxAsync())!;
        Assert.True(Math.Abs(bandBounds.Y + bandBounds.Height / 2 - optionBounds.Y - optionBounds.Height / 2) < 2);
        await time.GetByRole(AriaRole.Listbox, new() { Name = "صباحاً/مساءً", Exact = true }).PressAsync("Home");
        await Assertions.Expect(result).ToContainTextAsync("00:59|");
        await page.Locator("#time-en").GetByRole(AriaRole.Listbox, new() { Name = "Minute", Exact = true }).PressAsync("Home");
        await Assertions.Expect(result).ToContainTextAsync("|23:00");

        ILocator Segment(string id, string name) => page.Locator($"#{id} [data-segment='{name}']");
        await Segment("date-time-en", "month").PressAsync("ArrowUp");
        await Assertions.Expect(result).ToContainTextAsync("2024-03-29T23:57:00.0000000Z");
        await Segment("date-time-en", "year").FocusAsync();
        await page.Keyboard.TypeAsync("2025");
        await Assertions.Expect(Segment("date-time-en", "year")).ToHaveAttributeAsync("aria-valuenow", "2025");
        await Segment("date-time-en", "month").FocusAsync();
        await page.Keyboard.TypeAsync("02");
        await Assertions.Expect(result).ToContainTextAsync("2025-02-28T23:57:00.0000000Z");
        await Segment("date-time-ar", "hour").PressAsync("ArrowRight");
        await Assertions.Expect(Segment("date-time-ar", "minute")).ToBeFocusedAsync();
        await Segment("date-time-ar", "minute").PressAsync("ArrowUp");
        await Assertions.Expect(result).ToContainTextAsync("2026-10-26T23:50:00.0000000+03:00");
        await Segment("date-time-ar", "day").FocusAsync();
        await page.Keyboard.InsertTextAsync("٢٧");
        await Assertions.Expect(result).ToContainTextAsync("2026-10-27T23:50:00.0000000+03:00");
        await page.Locator("#date-time-ar .sheen-input-action").ClickAsync();
        var popup = page.Locator("#date-time-ar-popup");
        await popup.GetByRole(AriaRole.Listbox, new() { Name = "الدقيقة", Exact = true }).PressAsync("End");
        await Assertions.Expect(result).ToContainTextAsync("2026-10-27T23:55:00.0000000+03:00");
        await popup.Locator("button[data-date='2026-10-28']").ClickAsync();
        await Assertions.Expect(result).ToContainTextAsync("2026-10-28T23:55:00.0000000+03:00");
        await popup.GetByRole(AriaRole.Button, new() { Name = "تم", Exact = true }).ClickAsync();
        await Assertions.Expect(popup).ToBeHiddenAsync();
        await Assertions.Expect(page.Locator("#date-time-ar")).ToBeFocusedAsync();

        await Segment("date-time-empty", "month").FocusAsync();
        foreach (var pair in new[] { ("month", "10"), ("day", "26"), ("year", "2026"), ("hour", "12"), ("minute", "58") })
        {
            await Segment("date-time-empty", pair.Item1).FocusAsync();
            await page.Keyboard.TypeAsync(pair.Item2);
        }
        await Segment("date-time-empty", "period").PressAsync("a");
        await Assertions.Expect(result).ToContainTextAsync("2026-10-26T00:58:00.0000000");
        await page.Locator("#time-save").ClickAsync();
        await Assertions.Expect(page.Locator("#time-saved")).ToHaveTextAsync("Saved");
        var posted = await page.Locator("form").EvaluateAsync<string[]>("form => ['model.Time', 'model.Date', 'model.Offset'].map(name => new FormData(form).get(name))");
        Assert.Equal("00:59:00.0000000", posted[0]);
        Assert.Equal("2025-02-28T23:57:00.0000000Z", posted[1]);
        Assert.Equal("2026-10-28T23:55:00.0000000+03:00", posted[2]);
        await Segment("date-time-en", "year").PressAsync("Home");
        await Assertions.Expect(page.Locator("#date-time-en")).ToHaveAttributeAsync("aria-invalid", "true");
        await Assertions.Expect(page.Locator("input[name='model.Date']")).ToHaveValueAsync("");
        await Segment("date-time-en", "year").FocusAsync();
        await page.Keyboard.TypeAsync("2025");
        await Assertions.Expect(page.Locator("input[name='model.Date']")).ToHaveValueAsync("2025-02-28T23:57:00.0000000Z");
        await Assertions.Expect(page.Locator("#step-value")).ToBeEmptyAsync();
        await page.Locator("#time-step-empty [role=listbox]").First.PressAsync("End");
        await Assertions.Expect(page.Locator("#step-value")).ToHaveTextAsync("23:45");
        await Segment("date-time-empty", "minute").PressAsync("Backspace");
        await Assertions.Expect(page.Locator("input[name='model.Empty']")).ToHaveValueAsync("");
        await page.Locator("#time-save").ClickAsync();
        await Assertions.Expect(page.GetByText("Choose an appointment.", new() { Exact = true })).ToBeVisibleAsync();
        await page.Locator("#date-time-empty .sheen-input-action").ClickAsync();
        await page.Locator("#date-time-empty-popup").GetByRole(AriaRole.Button, new() { Name = "Now", Exact = true }).ClickAsync();
        await Assertions.Expect(page.Locator("input[name='model.Empty']")).ToHaveValueAsync("2026-10-26T13:25:00.0000000");
        await page.Keyboard.PressAsync("Escape");
        await Assertions.Expect(page.Locator("#date-time-empty-popup")).ToBeHiddenAsync();
        await page.Locator("#date-time-empty .sheen-input-clear").ClickAsync();
        await Assertions.Expect(page.Locator("input[name='model.Empty']")).ToHaveValueAsync("");

        await page.Locator("#time-readonly [role=listbox]").First.DispatchEventAsync("keydown", new { key = "End" });
        await Assertions.Expect(page.Locator("#time-readonly [aria-selected='true']").First).ToHaveTextAsync("8");
        await Assertions.Expect(page.Locator("#time-disabled [role=listbox]").First).ToHaveAttributeAsync("tabindex", "-1");
        await Assertions.Expect(page.Locator("#datetime-disabled [role=spinbutton]").First).ToHaveAttributeAsync("tabindex", "-1");
        await Assertions.Expect(page.Locator("#datetime-readonly .sheen-input-action")).ToBeDisabledAsync();

        await page.GetByRole(AriaRole.Button, new() { Name = "مسح الوقت", Exact = true }).ClickAsync();
        await Assertions.Expect(time.GetByRole(AriaRole.Option, new() { Selected = true })).ToHaveCountAsync(0);
        await Assertions.Expect(page.Locator("input[name='model.Time']")).ToHaveValueAsync("");
        await page.Locator("#time-save").ClickAsync();
        await Assertions.Expect(page.GetByText("اختر الوقت.", new() { Exact = true })).ToBeVisibleAsync();

        await page.GotoAsync(url + "/time-fluent");
        await Assertions.Expect(page.Locator("#fluent-time-save")).ToBeEnabledAsync();
        await page.Locator("#fluent-time-save").ClickAsync();
        await Assertions.Expect(page.GetByText("Choose a time with FluentValidation", new() { Exact = true })).ToBeVisibleAsync();
        await Assertions.Expect(page.GetByText("Choose an appointment with FluentValidation", new() { Exact = true })).ToBeVisibleAsync();
        await page.Locator("#fluent-time [role=listbox]").First.PressAsync("End");
        await page.Locator("#fluent-datetime .sheen-input-action").ClickAsync();
        await page.Locator("#fluent-datetime-popup").GetByRole(AriaRole.Button, new() { Name = "Now", Exact = true }).ClickAsync();
        await page.Keyboard.PressAsync("Escape");
        await page.Locator("#fluent-time-save").ClickAsync();
        await Assertions.Expect(page.Locator("#fluent-time-saved")).ToHaveTextAsync("Saved");

        await page.GotoAsync(url + "/static-time-demo");
        await Assertions.Expect(page.Locator("#time-ar")).ToHaveAttributeAsync("type", "time");
        await Assertions.Expect(page.Locator("#date-time-en")).ToHaveAttributeAsync("type", "datetime-local");
        await Assertions.Expect(page.Locator("#time-ar")).ToHaveAttributeAsync("name", "model.Time");
        await Assertions.Expect(page.Locator("#blazor-error-ui")).ToBeHiddenAsync();
        Assert.Empty(errors);
        page.PageError -= Error;
    }
}
