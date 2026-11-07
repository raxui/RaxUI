using Microsoft.Playwright;
using RaxUI.Cli.Registry;

namespace RaxUI.Integration.Tests;

[Trait("Category", "E2E")]
public class DropdownMenuPositionTests
{
    [Theory]
    [InlineData(false, "right", 390)]
    [InlineData(true, "left", 390)]
    [InlineData(false, "left", 390)]
    [InlineData(true, "right", 390)]
    [InlineData(false, "center", 1024)]
    [InlineData(true, "center", 1024)]
    public async Task Menu_stays_aligned_to_trigger_when_avoiding_viewport_edges(bool rtl, string edge, int viewportWidth)
    {
        var registry = new EmbeddedRegistry();
        var source = registry.ReadResourceAsString("components/dropdown-menu/DropdownMenu.razor.js");
        var css = registry.ReadResourceAsString("styles/components/dropdown-menu.css");
        using var playwright = await Playwright.CreateAsync();
        await using var browser = await playwright.Chromium.LaunchAsync(new() { Headless = true });
        var page = await browser.NewPageAsync(new()
        {
            ViewportSize = new() { Width = viewportWidth, Height = 600 },
            ReducedMotion = ReducedMotion.Reduce,
        });
        await page.SetContentAsync($$"""
            <style>{{css}}</style>
            <button id="trigger" popovertarget="menu" aria-haspopup="menu" aria-controls="menu">Options</button>
            <div id="menu" class="rax-dropdown-menu" popover role="menu" tabindex="-1">
                <span class="rax-dropdown-highlight" aria-hidden="true"></span>
                <button class="rax-dropdown-item" role="menuitem">View</button>
                <button class="rax-dropdown-item" role="menuitem">Edit</button>
            </div>
            """);
        var trigger = page.Locator("#trigger");
        var menu = page.Locator("#menu");
        await trigger.EvaluateAsync("""
            (el, args) => {
                el.style.position = 'fixed';
                el.style.top = '80px';
                el.style.direction = args.rtl ? 'rtl' : 'ltr';
                if (args.edge === 'right') el.style.right = '16px';
                else el.style.left = args.edge === 'left' ? '16px' : '50%';
            }
            """, new { rtl, edge });
        await page.EvaluateAsync("""
            async source => {
                const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
                const module = await import(url);
                module.init(document.querySelector('#trigger'), document.querySelector('#menu'));
                URL.revokeObjectURL(url);
            }
            """, source);

        await trigger.ClickAsync();
        await Assertions.Expect(menu).ToBeVisibleAsync();
        await Assertions.Expect(trigger).ToHaveAttributeAsync("aria-expanded", "true");
        var geometry = await menu.EvaluateAsync<double[]>("""
            el => {
                const anchor = document.querySelector('#trigger').getBoundingClientRect();
                return [parseFloat(el.style.left), el.offsetWidth, anchor.left, anchor.right,
                    document.documentElement.clientWidth, parseFloat(el.style.top), anchor.bottom];
            }
            """);
        var expected = edge == "right" || (edge == "center" && rtl) ? geometry[3] - geometry[1] : geometry[2];
        Assert.InRange(Math.Abs(geometry[0] - expected), 0, 1);
        Assert.InRange(geometry[0], 8, geometry[4] - geometry[1] - 8);
        Assert.InRange(Math.Abs(geometry[5] - geometry[6] - 4), 0, 1);
        var origin = await menu.EvaluateAsync<string>("el => el.style.transformOrigin");
        Assert.Contains(edge == "right" || (edge == "center" && rtl) ? "right" : "left", origin);

        // Positioning must retain the menu's existing keyboard and dismissal behavior.
        await page.Keyboard.PressAsync("ArrowDown");
        await Assertions.Expect(menu.GetByRole(AriaRole.Menuitem, new() { Name = "View" })).ToBeFocusedAsync();
        await page.Keyboard.PressAsync("Escape");
        await Assertions.Expect(menu).ToBeHiddenAsync();
        await Assertions.Expect(trigger).ToBeFocusedAsync();
    }
}
