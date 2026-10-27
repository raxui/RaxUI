using Microsoft.Playwright;
using Program = SheenUI.Cli.Program;

namespace SheenUI.Integration.Tests;

public partial class GeneratedAppTests
{
    [Theory]
    [InlineData("net8.0")]
    [InlineData("net9.0")]
    [InlineData("net10.0")]
    public async Task Kanban_installs_and_moves_cards_and_columns(string targetFramework)
    {
        var app = Path.Combine(_root, "SampleApp");
        Dotnet(_root, "new", "blazor", "-f", targetFramework, "--interactivity", "Server", "-n", "SampleApp", "-o", app);
        var output = new StringWriter(); var error = new StringWriter();
        Assert.Equal(0, Program.Run(["init"], app, output, error));
        Assert.True(Program.Run(["add", "kanban"], app, output, error) == 0, error.ToString());
        Assert.True(File.Exists(Path.Combine(app, "Components/UI/Sortable/Sortable.razor.js")));
        var markup = File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Fixtures", "KanbanComponents.razor"));
        File.WriteAllText(Path.Combine(app, "Components", "Pages", "KanbanComponents.razor"), markup);
        File.WriteAllText(Path.Combine(app, "Components", "Pages", "StaticKanbanComponents.razor"), markup.Replace("/kanban-demo", "/static-kanban-demo").Replace("@rendermode InteractiveServer", ""));
        var program = Path.Combine(app, "Program.cs");
        File.WriteAllText(program, "using Microsoft.AspNetCore.DataProtection;\n" + File.ReadAllText(program).Replace("var app = builder.Build();", "builder.Services.AddDataProtection().UseEphemeralDataProtectionProvider(); var app = builder.Build();"));
        Dotnet(app, "build", "-warnaserror:RZ10012");
        var before = InstallationWorkflowTests.SnapshotFiles(app);
        Assert.Equal(0, Program.Run(["add", "kanban"], app, output, error));
        Assert.Equal(before, InstallationWorkflowTests.SnapshotFiles(app));
        await VerifyInBrowser(app, VerifyKanban);
    }

    private static async Task VerifyKanban(IPage page, string url)
    {
        var errors = new List<string>(); page.PageError += (_, message) => errors.Add(message);
        await page.SetViewportSizeAsync(1440, 1000); await page.EmulateMediaAsync(new() { ReducedMotion = ReducedMotion.Reduce });
        await page.GotoAsync(url + "/kanban-demo");
        var board = page.Locator("#tasks-example"); var state = page.Locator("#tasks-state"); var live = board.Locator("[aria-live]");
        var card = board.GetByRole(AriaRole.Button, new() { Name = "Write docs", Exact = true });
        await Assertions.Expect(card).ToHaveAttributeAsync("tabindex", "0");
        await Assertions.Expect(board.Locator(".sheen-kanban-column-count").Nth(1)).ToHaveTextAsync("1/1");

        // Keyboard: down within the column, then across to the next one, keeping the position.
        await card.FocusAsync(); await card.PressAsync("Space"); await Assertions.Expect(live).ToContainTextAsync("Picked up Write docs in To do");
        await card.PressAsync("ArrowDown"); await card.PressAsync("Space");
        await Assertions.Expect(state).ToHaveTextAsync("todo:t2,t1,t3 | doing:t4 | done: | archive:");
        await Assertions.Expect(page.Locator("#tasks-commit")).ToHaveTextAsync("card:t1:todo>todo@1");
        await Assertions.Expect(card).ToBeFocusedAsync();
        await card.PressAsync("Space"); await card.PressAsync("ArrowRight"); await Assertions.Expect(live).ToContainTextAsync("moved to In progress");
        await card.PressAsync("Space");
        await Assertions.Expect(state).ToHaveTextAsync("todo:t2,t3 | doing:t4,t1 | done: | archive:");
        await Assertions.Expect(live).ToContainTextAsync("dropped in In progress at position 2 of 2");
        await Assertions.Expect(board.Locator(".sheen-kanban-column-count[data-over-limit]")).ToHaveTextAsync("2/1");
        // Escape restores; the disabled Archive column is skipped.
        await card.PressAsync("Space"); await card.PressAsync("ArrowRight"); await card.PressAsync("ArrowRight"); await card.PressAsync("Escape");
        await Assertions.Expect(live).ToContainTextAsync("Cancelled. Write docs is back where it was.");
        await Assertions.Expect(state).ToHaveTextAsync("todo:t2,t3 | doing:t4,t1 | done: | archive:");
        await Assertions.Expect(board.Locator("[style*=transform]")).ToHaveCountAsync(0);
        await Assertions.Expect(board.GetByRole(AriaRole.Button, new() { Name = "Legal review", Exact = true })).ToHaveAttributeAsync("aria-disabled", "true");

        // Pointer: drag a card into the empty Done column; the inert copy is removed afterwards.
        var from = (await board.GetByRole(AriaRole.Button, new() { Name = "Design tokens", Exact = true }).BoundingBoxAsync())!;
        var done = (await board.Locator(".sheen-kanban-column").Nth(2).BoundingBoxAsync())!;
        await page.Mouse.MoveAsync(from.X + from.Width / 2, from.Y + from.Height / 2); await page.Mouse.DownAsync();
        await page.Mouse.MoveAsync(done.X + done.Width / 2, done.Y + 80, new() { Steps = 12 });
        await Assertions.Expect(board.Locator(".sheen-kanban-column").Nth(2)).ToHaveAttributeAsync("data-over", "");
        await Assertions.Expect(page.Locator("body > [data-overlay]")).ToHaveCountAsync(1);
        await page.Mouse.UpAsync();
        await Assertions.Expect(state).ToHaveTextAsync("todo:t3 | doing:t4,t1 | done:t2 | archive:");
        await Assertions.Expect(page.Locator("[data-overlay]")).ToHaveCountAsync(0);
        // Pointer: drop between two cards of another column.
        var source = (await board.GetByRole(AriaRole.Button, new() { Name = "Design tokens", Exact = true }).BoundingBoxAsync())!;
        var second = (await board.GetByRole(AriaRole.Button, new() { Name = "Kanban port", Exact = true }).BoundingBoxAsync())!;
        await page.Mouse.MoveAsync(source.X + source.Width / 2, source.Y + source.Height / 2); await page.Mouse.DownAsync();
        await page.Mouse.MoveAsync(second.X + second.Width / 2, second.Y + 4, new() { Steps = 12 }); await page.Mouse.UpAsync();
        await Assertions.Expect(state).ToHaveTextAsync("todo:t3 | doing:t2,t4,t1 | done: | archive:");

        // Columns reorder by their handle.
        var columnHandle = board.GetByRole(AriaRole.Button, new() { Name = "Drag column Done", Exact = true });
        await columnHandle.FocusAsync(); await columnHandle.PressAsync("Space"); await columnHandle.PressAsync("ArrowLeft"); await columnHandle.PressAsync("Space");
        await Assertions.Expect(state).ToHaveTextAsync("todo:t3 | done: | doing:t2,t4,t1 | archive:");
        await Assertions.Expect(page.Locator("#tasks-commit")).ToHaveTextAsync("column:done:done>done@1");

        // RTL: ArrowLeft goes to the visually left column, the next one in reading order.
        var arabic = page.Locator("#arabic-example");
        var grip = arabic.GetByRole(AriaRole.Button, new() { Name = "اسحب البطاقة تصميم الشعار", Exact = true });
        await grip.FocusAsync(); await grip.PressAsync("Space"); await grip.PressAsync("ArrowLeft"); await grip.PressAsync("Space");
        await Assertions.Expect(page.Locator("#arabic-state")).ToHaveTextAsync("new:مراجعة النص | review:تصميم الشعار");
        await Assertions.Expect(arabic.Locator("[aria-live]")).ToContainTextAsync("أُفلتت تصميم الشعار في قيد المراجعة");
        await Assertions.Expect(arabic.GetByRole(AriaRole.Button, new() { Name = "Drag column", Exact = false })).ToHaveCountAsync(0);

        foreach (var appearance in new[] { "flat", "glass" }) { await page.Locator("#kanban-appearance").SelectOptionAsync(appearance); await Assertions.Expect(board.Locator(".sheen-kanban")).ToBeVisibleAsync(); }
        await page.Locator("#kanban-mode").SelectOptionAsync("dark");

        var touchContext = await page.Context.Browser!.NewContextAsync(new() { HasTouch = true, IsMobile = true, ViewportSize = new() { Width = 390, Height = 844 }, ReducedMotion = ReducedMotion.Reduce });
        try
        {
            var touchPage = await touchContext.NewPageAsync(); touchPage.PageError += (_, message) => errors.Add(message);
            await touchPage.GotoAsync(url + "/kanban-demo");
            var touchBoard = touchPage.Locator("#tasks-example");
            await Assertions.Expect(touchBoard.GetByRole(AriaRole.Button, new() { Name = "Design tokens", Exact = true })).ToHaveAttributeAsync("tabindex", "0");
            var cardBox = (await touchBoard.GetByRole(AriaRole.Button, new() { Name = "Design tokens", Exact = true }).BoundingBoxAsync())!;
            var above = (await touchBoard.GetByRole(AriaRole.Button, new() { Name = "Write docs", Exact = true }).BoundingBoxAsync())!;
            var cdp = await touchContext.NewCDPSessionAsync(touchPage);
            await cdp.SendAsync("Input.dispatchTouchEvent", new Dictionary<string, object> { ["type"] = "touchStart", ["touchPoints"] = new[] { new { x = cardBox.X + cardBox.Width / 2, y = cardBox.Y + cardBox.Height / 2, id = 1 } } });
            // Hold past the touch activation delay.
            await Task.Delay(220);
            await cdp.SendAsync("Input.dispatchTouchEvent", new Dictionary<string, object> { ["type"] = "touchMove", ["touchPoints"] = new[] { new { x = above.X + above.Width / 2, y = above.Y + 4, id = 1 } } });
            await cdp.SendAsync("Input.dispatchTouchEvent", new Dictionary<string, object> { ["type"] = "touchEnd", ["touchPoints"] = Array.Empty<object>() });
            await Assertions.Expect(touchPage.Locator("#tasks-state")).ToHaveTextAsync("todo:t2,t1,t3 | doing:t4 | done: | archive:");
        }
        finally { await touchContext.CloseAsync(); }
        Assert.Empty(errors);

        var context = await page.Context.Browser!.NewContextAsync(new() { JavaScriptEnabled = false });
        try
        {
            var ssr = await context.NewPageAsync(); await ssr.GotoAsync(url + "/static-kanban-demo");
            await Assertions.Expect(ssr.Locator("#tasks-example .sheen-kanban-item")).ToHaveCountAsync(4);
            await Assertions.Expect(ssr.Locator("#tasks-example .sheen-kanban-item[tabindex]")).ToHaveCountAsync(0);
            await Assertions.Expect(ssr.Locator("#tasks-example .sheen-kanban-handle:not([disabled])")).ToHaveCountAsync(0);
            await Assertions.Expect(ssr.Locator("#tasks-example .sheen-kanban-empty")).ToHaveCountAsync(2);
        }
        finally { await context.CloseAsync(); }
    }
}
