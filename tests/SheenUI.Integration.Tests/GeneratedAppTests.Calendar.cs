using Microsoft.Playwright;

namespace SheenUI.Integration.Tests;

public partial class GeneratedAppTests
{
    private static void WriteCalendarPages(string components)
    {
        var fixtures = Path.Combine(AppContext.BaseDirectory, "Fixtures");
        var markup = File.ReadAllText(Path.Combine(fixtures, "CalendarPickers.razor"));
        File.WriteAllText(Path.Combine(components, "Pages", "CalendarPickers.razor"), markup);
        File.WriteAllText(Path.Combine(components, "Pages", "StaticCalendarPickers.razor"), markup
            .Replace("@page \"/calendar-demo\"", "@page \"/static-calendar-demo\"")
            .Replace("@rendermode InteractiveServer", ""));
        File.Copy(Path.Combine(fixtures, "CalendarFluent.razor"), Path.Combine(components, "Pages", "CalendarFluent.razor"));
        File.Copy(Path.Combine(fixtures, "SheenDemo.razor"), Path.Combine(components, "Pages", "SheenDemo.razor"));
    }

    private static async Task VerifyCalendarPickers(IPage page, string url)
    {
        var errors = new List<string>();
        void Error(object? sender, string message) => errors.Add(message);
        page.PageError += Error;
        await page.GotoAsync(url + "/calendar-demo");
        await Assertions.Expect(page.Locator("#calendar-save")).ToBeEnabledAsync();
        await page.Locator("#calendar-save").ClickAsync();
        await Assertions.Expect(page.GetByText("اختر الموعد أولاً", new() { Exact = true })).ToBeVisibleAsync();
        await Assertions.Expect(page.Locator("#booking-day")).ToHaveAttributeAsync("aria-invalid", "true");

        var popup = page.Locator("#booking-day-popup");
        await page.Locator("#booking-day").ClickAsync();
        await Assertions.Expect(popup).ToBeVisibleAsync();
        var blocked = popup.Locator("button[data-date='2026-10-20']");
        await Assertions.Expect(blocked).ToHaveAttributeAsync("aria-disabled", "true");
        await blocked.DispatchEventAsync("click");
        await Assertions.Expect(page.Locator("#booking-values")).Not.ToContainTextAsync("2026-10-20|");
        await popup.Locator("button[data-date='2026-10-26']").ClickAsync();
        await Assertions.Expect(popup).ToBeHiddenAsync();
        await Assertions.Expect(page.Locator("#booking-day")).ToBeFocusedAsync();

        foreach (var id in new[] { "booking-time", "booking-offset" })
        {
            await page.Locator("#" + id).ClickAsync();
            await page.Locator("#" + id + "-popup button[data-date='2026-10-26']").ClickAsync();
            await Assertions.Expect(page.Locator("#" + id + "-popup")).ToBeHiddenAsync();
        }
        await Assertions.Expect(page.Locator("#booking-values")).ToContainTextAsync("2026-10-26T14:35:00.0000000Z");
        await Assertions.Expect(page.Locator("#booking-values")).ToContainTextAsync("2026-10-26T23:45:00.0000000+03:00");

        var range = page.Locator("#booking-range-popup");
        await page.Locator("#booking-range").ClickAsync();
        await range.Locator("button[data-date='2026-10-22']").ClickAsync();
        await range.Locator("button[data-date='2026-10-24']").HoverAsync();
        await Assertions.Expect(range.Locator("td[data-preview]")).ToHaveCountAsync(3);
        await range.Locator("button[data-date='2026-10-24']").ClickAsync();
        await Assertions.Expect(page.Locator("#booking-values")).ToContainTextAsync("|2026-10-12|2026-10-15");
        await range.GetByRole(AriaRole.Button, new() { Name = "تطبيق", Exact = true }).ClickAsync();
        await Assertions.Expect(range).ToBeHiddenAsync();
        await Assertions.Expect(page.Locator("#booking-values")).ToContainTextAsync("|2026-10-22|2026-10-24");
        var payload = await page.Locator("form").EvaluateAsync<string[]>("form => ['Model.From', 'Model.To'].map(name => new FormData(form).get(name))");
        Assert.Equal("2026-10-22", payload[0]);
        Assert.Equal("2026-10-24", payload[1]);

        await page.Locator("#booking-range").ClickAsync();
        await range.Locator("button[data-date='2026-10-24']").ClickAsync();
        await Assertions.Expect(range.Locator("button[data-date='2026-10-23']")).ToHaveAttributeAsync("data-out-of-span", "");
        await Assertions.Expect(range.Locator("button[data-date='2026-11-10']")).ToHaveAttributeAsync("data-out-of-span", "");
        await range.Locator("button[data-date='2026-10-27']").ClickAsync();
        await Assertions.Expect(range.GetByRole(AriaRole.Button, new() { Name = "تطبيق", Exact = true })).ToBeDisabledAsync();
        await range.GetByRole(AriaRole.Button, new() { Name = "إلغاء", Exact = true }).ClickAsync();
        await Assertions.Expect(page.Locator("#booking-values")).ToContainTextAsync("|2026-10-22|2026-10-24");

        var calendar = page.GetByRole(AriaRole.Region, new() { Name = "تقويم ميلادي", Exact = true }).Locator(".sheen-calendar");
        await calendar.Locator("button[data-date='2024-02-29']").FocusAsync();
        await page.Keyboard.PressAsync("PageDown");
        await Assertions.Expect(calendar.Locator("button[data-date='2024-03-29']")).ToBeFocusedAsync();
        await page.Keyboard.PressAsync("Home");
        await Assertions.Expect(calendar.Locator("button[data-date='2024-03-25']")).ToBeFocusedAsync();
        await page.Keyboard.PressAsync("ArrowLeft");
        await Assertions.Expect(calendar.Locator("button[data-date='2024-03-26']")).ToBeFocusedAsync();
        await page.Keyboard.PressAsync("End");
        await Assertions.Expect(calendar.Locator("button[data-date='2024-03-31']")).ToBeFocusedAsync();
        await page.Keyboard.PressAsync("Enter");
        await Assertions.Expect(page.Locator("#calendar-value")).ToHaveTextAsync("2024-03-31");
        await calendar.Locator(".sheen-calendar-caption").ClickAsync();
        await calendar.GetByRole(AriaRole.Button, new() { Name = "اختر السنة", Exact = true }).ClickAsync();
        await calendar.GetByRole(AriaRole.Button, new() { Name = "٢٠٢٤", Exact = true }).ClickAsync();
        await calendar.GetByRole(AriaRole.Button, new() { Name = "نيسان", Exact = true }).ClickAsync();
        await Assertions.Expect(calendar.Locator("button[data-date='2024-04-01']")).ToBeFocusedAsync();

        await page.Locator("#minimum-calendar button[data-date='0001-01-01']").FocusAsync();
        await page.Keyboard.PressAsync("PageUp");
        await Assertions.Expect(page.Locator("#minimum-calendar button[data-date='0001-01-01']")).ToBeFocusedAsync();
        await page.Locator("#maximum-calendar button[data-date='9999-12-31']").FocusAsync();
        await page.Keyboard.PressAsync("PageDown");
        await Assertions.Expect(page.Locator("#maximum-calendar button[data-date='9999-12-31']")).ToBeFocusedAsync();

        await page.SetViewportSizeAsync(390, 844);
        await page.Locator("#booking-range").ClickAsync();
        await Assertions.Expect(range.Locator(".sheen-calendar-month")).ToHaveCountAsync(1);
        var bounds = await range.BoundingBoxAsync();
        Assert.NotNull(bounds); Assert.True(bounds.X >= 0 && bounds.X + bounds.Width <= 391);
        await page.Keyboard.PressAsync("Escape");
        await Assertions.Expect(page.Locator("#booking-range")).ToBeFocusedAsync();
        var maximum = page.Locator("#maximum-calendar");
        await Assertions.Expect(maximum.Locator(".sheen-calendar-month")).ToHaveCountAsync(1);
        await maximum.GetByRole(AriaRole.Button, new() { Name = "Next month", Exact = true }).ClickAsync();
        await Assertions.Expect(maximum.Locator("button[data-date='9999-12-31']")).ToBeVisibleAsync();
        await page.SetViewportSizeAsync(1280, 900);
        await Assertions.Expect(maximum.Locator(".sheen-calendar-month")).ToHaveCountAsync(2);
        await Assertions.Expect(maximum.GetByRole(AriaRole.Button, new() { Name = "Next month", Exact = true })).ToBeDisabledAsync();
        await page.Locator("#calendar-save").ClickAsync();
        await Assertions.Expect(page.Locator("#booking-saved")).ToHaveTextAsync("Saved");

        await page.Locator("#invalidate-range").ClickAsync();
        await page.Locator("#calendar-save").ClickAsync();
        await Assertions.Expect(page.GetByText("اختر مدة صحيحة.", new() { Exact = true })).ToBeVisibleAsync();
        await Assertions.Expect(page.Locator("#booking-saved")).ToBeEmptyAsync();
        await page.Locator("#readonly-picker").DispatchEventAsync("click");
        await Assertions.Expect(page.Locator("#readonly-picker")).ToHaveAttributeAsync("aria-expanded", "false");
        await Assertions.Expect(page.Locator("#disabled-picker")).ToBeDisabledAsync();
        await page.Locator("#unbound-picker").ClickAsync();
        await page.Locator("#unbound-picker-popup button[data-date='2026-10-26']").ClickAsync();
        await Assertions.Expect(page.Locator("#unbound-picker-popup")).ToBeHiddenAsync();
        await page.Locator("#offset-range").ClickAsync();
        var offsetRange = page.Locator("#offset-range-popup");
        await offsetRange.GetByRole(AriaRole.Button, new() { Name = "Last 7 days", Exact = true }).ClickAsync();
        await offsetRange.GetByRole(AriaRole.Button, new() { Name = "Apply", Exact = true }).ClickAsync();
        await Assertions.Expect(page.Locator("#offset-range-values")).ToHaveTextAsync("2026-10-20T09:15:00.0000000+03:00|2026-10-26T18:30:00.0000000+02:00");
        await page.Locator("#offset-range").Locator("..").GetByRole(AriaRole.Button, new() { Name = "Clear date", Exact = true }).ClickAsync();
        await Assertions.Expect(page.Locator("#offset-range-values")).ToHaveTextAsync("|");

        await page.GotoAsync(url + "/calendar-fluent");
        await Assertions.Expect(page.Locator("#fluent-calendar-save")).ToBeEnabledAsync();
        await page.Locator("#fluent-calendar-save").ClickAsync();
        await Assertions.Expect(page.GetByText("Choose a date with FluentValidation", new() { Exact = true })).ToBeVisibleAsync();
        await page.Locator("#fluent-day").ClickAsync();
        await page.Locator("#fluent-day-popup button[data-date='2026-10-26']").ClickAsync();
        await page.Locator("#fluent-calendar-save").ClickAsync();
        await Assertions.Expect(page.Locator("#fluent-calendar-saved")).ToHaveTextAsync("Saved");

        await page.GotoAsync(url + "/static-calendar-demo");
        await Assertions.Expect(page.Locator("#booking-day")).ToBeDisabledAsync();
        await Assertions.Expect(page.Locator(".sheen-calendar-grid")).ToHaveCountAsync(4);
        await Assertions.Expect(page.Locator("#booking-offset")).ToContainTextAsync("٢٠٢٦");
        Assert.Equal("2026-10-15T23:45:00.0000000+03:00", await page.Locator("input[name='Model.Offset']").InputValueAsync());
        await Assertions.Expect(page.Locator("#blazor-error-ui")).ToBeHiddenAsync();
        Assert.Empty(errors);
        page.PageError -= Error;
    }
}
