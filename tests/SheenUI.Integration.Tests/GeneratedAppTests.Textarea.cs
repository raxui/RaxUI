using Microsoft.Playwright;
using Program = SheenUI.Cli.Program;

namespace SheenUI.Integration.Tests;

public partial class GeneratedAppTests
{
    [Theory]
    [InlineData("net8.0")]
    [InlineData("net9.0")]
    [InlineData("net10.0")]
    public async Task Textarea_react_examples_and_form_mapping_work(string targetFramework)
    {
        var app = Path.Combine(_root, "SampleApp");
        Dotnet(_root, "new", "blazor", "-f", targetFramework, "--interactivity", "Server", "-n", "SampleApp", "-o", app);
        var output = new StringWriter(); var error = new StringWriter();
        Assert.Equal(0, Program.Run(["init"], app, output, error));
        foreach (var name in new[] { "textarea", "input", "button" })
            Assert.True(Program.Run(["add", name], app, output, error) == 0, error.ToString());
        var components = Path.Combine(app, "Components");
        var target = Path.Combine(components, "Pages", "TextareaSamples");
        Directory.CreateDirectory(target);
        foreach (var file in Directory.GetFiles(Path.Combine(AppContext.BaseDirectory, "Fixtures", "TextareaExamples")))
            File.WriteAllText(Path.Combine(target, Path.GetFileName(file)), File.ReadAllText(file));
        File.AppendAllText(Path.Combine(components, "_Imports.razor"), "\n@using SampleApp.Components.Pages.TextareaSamples\n");
        var markup = File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Fixtures", "TextareaExamples.razor"));
        File.WriteAllText(Path.Combine(components, "Pages", "TextareaExamplesPage.razor"), markup);
        File.WriteAllText(Path.Combine(components, "Pages", "StaticTextareaExamplesPage.razor"), markup.Replace("/textarea-examples", "/static-textarea-examples").Replace("@rendermode InteractiveServer", ""));
        var program = Path.Combine(app, "Program.cs");
        File.WriteAllText(program, "using Microsoft.AspNetCore.DataProtection;\n" + File.ReadAllText(program).Replace("var app = builder.Build();", "builder.Services.AddDataProtection().UseEphemeralDataProtectionProvider(); builder.Logging.ClearProviders(); builder.Logging.AddConsole(); var app = builder.Build();"));
        Dotnet(app, "build", "-warnaserror:RZ10012");
        await VerifyInBrowser(app, VerifyTextareaExamples);
    }

    private static async Task VerifyTextareaExamples(IPage page, string url)
    {
        var errors = new List<string>();
        void Error(object? sender, string message) => errors.Add(message);
        page.PageError += Error;
        await page.SetViewportSizeAsync(1122, 1122);
        await page.GotoAsync(url + "/textarea-examples");
        var composer = page.GetByRole(AriaRole.Textbox, new() { Name = "New post", Exact = true });
        await Assertions.Expect(composer).ToHaveValueAsync("Loving the frosted inputs in SheenUI ✨ The ring fills as you type and turns amber near the limit.");
        var group = composer.Locator("xpath=..");
        await Assertions.Expect(group).ToHaveClassAsync(new System.Text.RegularExpressions.Regex("sheen-textarea-group"));
        await page.WaitForFunctionAsync("() => document.querySelector('textarea[aria-label=\"New post\"]').style.height !== ''");
        var initial = (await composer.BoundingBoxAsync())!.Height;
        await composer.FillAsync(string.Join("\n", Enumerable.Repeat("A line", 15)));
        await page.WaitForFunctionAsync("() => document.querySelector('textarea[aria-label=\"New post\"]').style.overflowY === 'auto'");
        Assert.True((await composer.BoundingBoxAsync())!.Height > initial);
        await composer.FillAsync(new string('x', 260));
        await Assertions.Expect(group.Locator(".sheen-textarea-count")).ToHaveAttributeAsync("data-state", "warn");
        await Assertions.Expect(group.Locator(".sheen-textarea-count-text")).ToHaveTextAsync("20");
        await composer.FillAsync(new string('x', 280));
        await Assertions.Expect(group.Locator(".sheen-textarea-count")).ToHaveAttributeAsync("data-state", "limit");
        await Assertions.Expect(group.GetByRole(AriaRole.Status)).ToHaveTextAsync("Character limit reached");
        Assert.Equal("0", await group.Locator(".sheen-textarea-count-bar").EvaluateAsync<string>("el => el.style.strokeDashoffset"));
        for (var i = 0; i < 4; i++)
        {
            await composer.FillAsync("  Post " + i + "  ");
            await composer.PressAsync(i == 0 ? "Control+Enter" : "Meta+Enter");
            await Assertions.Expect(composer).ToHaveValueAsync("");
        }
        var posts = page.Locator("[data-textarea-posts] p");
        await Assertions.Expect(posts).ToHaveCountAsync(3);
        await Assertions.Expect(posts.First).ToHaveTextAsync("Post 3");
        await Assertions.Expect(posts.Last).ToHaveTextAsync("Post 1");
        await Assertions.Expect(page.GetByRole(AriaRole.Button, new() { Name = "Post", Exact = true })).ToBeDisabledAsync();
        await composer.FillAsync("Click to publish");
        await page.GetByRole(AriaRole.Button, new() { Name = "Post", Exact = true }).ClickAsync();
        await Assertions.Expect(posts.First).ToHaveTextAsync("Click to publish");
        await Assertions.Expect(group.Locator(".sheen-textarea-count-text")).ToHaveTextAsync("0 / 280");
        await group.Locator(".sheen-textarea-count-text").ClickAsync();
        await Assertions.Expect(composer).ToBeFocusedAsync();
        var bio = page.Locator("#ta-bio");
        await Assertions.Expect(bio).ToHaveAttributeAsync("aria-invalid", "true");
        await bio.FillAsync("Frontend developer building accessible products.");
        await Assertions.Expect(page.Locator("#ta-bio-help")).ToHaveTextAsync("Looks good.");
        await Assertions.Expect(bio).Not.ToHaveAttributeAsync("aria-invalid", "true");
        await Assertions.Expect(page.GetByRole(AriaRole.Textbox, new() { Name = "Disabled", Exact = true })).ToBeDisabledAsync();
        var release = page.GetByRole(AriaRole.Textbox, new() { Name = "Release notes", Exact = true });
        await Assertions.Expect(release).ToHaveAttributeAsync("data-variant", "filled");
        await release.FillAsync("Release content stays editable");
        await Assertions.Expect(release.Locator("xpath=..").Locator(".sheen-textarea-count-text")).ToHaveTextAsync("30 / 120");
        var feedback = page.Locator("#ta-feedback");
        await Assertions.Expect(feedback).ToHaveCSSAsync("resize", "vertical");
        var arabic = page.GetByRole(AriaRole.Textbox, new() { Name = "ملاحظات", Exact = true });
        await Assertions.Expect(arabic).ToHaveAttributeAsync("dir", "rtl");
        await Assertions.Expect(arabic.Locator("xpath=..")).ToHaveAttributeAsync("dir", "rtl");
        await arabic.FillAsync("ملاحظات بالعربية");
        Assert.Equal("rtl", await arabic.EvaluateAsync<string>("el => getComputedStyle(el).direction"));
        await page.Locator("#mapped-textarea").FillAsync("Live form mapping");
        await page.GetByRole(AriaRole.Button, new() { Name = "Submit notes", Exact = true }).ClickAsync();
        await Assertions.Expect(page.Locator("#textarea-form-result")).ToHaveTextAsync("Live form mapping");
        foreach (var width in new[] { 1122, 390 })
        {
            await page.SetViewportSizeAsync(width, width == 1122 ? 1122 : 844);
            foreach (var appearance in new[] { "default", "flat", "glass" })
            {
                await page.Locator("#textarea-appearance").SelectOptionAsync(appearance);
                foreach (var mode in new[] { "light", "dark" })
                {
                    await page.Locator("#textarea-mode").SelectOptionAsync(mode);
                    foreach (var direction in new[] { "ltr", "rtl" })
                    {
                        await page.Locator("#textarea-direction").SelectOptionAsync(direction);
                        var input = page.GetByRole(AriaRole.Textbox, new() { Name = direction == "rtl" ? "منشور جديد" : "New post", Exact = true });
                        await input.FillAsync("Typing updates the count immediately");
                        var wrapper = input.Locator("xpath=..");
                        await Assertions.Expect(wrapper.Locator(".sheen-textarea-count-text")).ToHaveTextAsync("36 / 280");
                        var box = (await wrapper.BoundingBoxAsync())!;
                        Assert.InRange(box.Width, 0, width);
                        Assert.Equal(direction, await wrapper.EvaluateAsync<string>("el => getComputedStyle(el).direction"));
                    }
                }
            }
        }
        await page.SetViewportSizeAsync(1280, 720);
        page.PageError -= Error;
        Assert.Empty(errors);
        var context = await page.Context.Browser!.NewContextAsync(new() { JavaScriptEnabled = false, ReducedMotion = ReducedMotion.Reduce });
        try
        {
            var ssr = await context.NewPageAsync();
            await ssr.GotoAsync(url + "/static-textarea-examples");
            await Assertions.Expect(ssr.Locator("#ta-bio")).ToHaveValueAsync("Frontend");
            await Assertions.Expect(ssr.GetByRole(AriaRole.Textbox, new() { Name = "New post", Exact = true })).ToHaveValueAsync("Loving the frosted inputs in SheenUI ✨ The ring fills as you type and turns amber near the limit.");
            await Assertions.Expect(ssr.Locator("#mapped-textarea")).ToHaveAttributeAsync("name", "Model.Notes");
            await ssr.Locator("#mapped-textarea").FillAsync("Notes from native SSR post");
            await ssr.GetByRole(AriaRole.Button, new() { Name = "Submit notes", Exact = true }).ClickAsync();
            await Assertions.Expect(ssr.Locator("#textarea-form-result")).ToHaveTextAsync("Notes from native SSR post");
        }
        finally { await context.CloseAsync(); }
    }
}
