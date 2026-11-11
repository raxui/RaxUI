using Microsoft.Playwright;
using Program = RaxUI.Cli.Program;

namespace RaxUI.Integration.Tests;

public partial class GeneratedAppTests
{
    [Theory]
    [InlineData("net8.0")]
    [InlineData("net9.0")]
    [InlineData("net10.0")]
    [InlineData("net11.0")]
    public async Task AI_installs_streams_markdown_safely_and_matches_React(string targetFramework)
    {
        var app = Path.Combine(_root, "SampleApp");
        Dotnet(_root, "new", "blazor", "-f", targetFramework, "--interactivity", "Server", "-n", "SampleApp", "-o", app);
        var output = new StringWriter(); var error = new StringWriter();
        Assert.Equal(0, Program.Run(["init"], app, output, error));
        Assert.True(Program.Run(["add", "ai"], app, output, error) == 0, error.ToString());
        Assert.True(File.Exists(Path.Combine(app, "Components/UI/AI/AIMarkdownParser.cs")));
        var samples = Path.Combine(app, "Components", "Pages", "AISamples"); Directory.CreateDirectory(samples);
        foreach (var file in Directory.GetFiles(Path.Combine(AppContext.BaseDirectory, "Fixtures", "AIExamples"))) File.Copy(file, Path.Combine(samples, Path.GetFileName(file)));
        File.AppendAllText(Path.Combine(app, "Components", "_Imports.razor"), "\n@using SampleApp.Components.Pages.AISamples\n");
        var markup = File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Fixtures", "AIComponents.razor"));
        File.WriteAllText(Path.Combine(app, "Components", "Pages", "AIComponents.razor"), markup);
        File.WriteAllText(Path.Combine(app, "Components", "Pages", "StaticAIComponents.razor"), markup.Replace("/ai-demo", "/static-ai-demo").Replace("@rendermode InteractiveServer", ""));
        var program = Path.Combine(app, "Program.cs");
        File.WriteAllText(program, "using Microsoft.AspNetCore.DataProtection;\n" + File.ReadAllText(program).Replace("var app = builder.Build();", "builder.Services.AddDataProtection().UseEphemeralDataProtectionProvider(); var app = builder.Build();"));
        Dotnet(app, "build", "-warnaserror:RZ10012");
        var before = InstallationWorkflowTests.SnapshotFiles(app);
        Assert.Equal(0, Program.Run(["add", "ai"], app, output, error));
        Assert.Equal(before, InstallationWorkflowTests.SnapshotFiles(app));
        await VerifyInBrowser(app, VerifyAI);
    }

    private static async Task VerifyAI(IPage page, string url)
    {
        var errors = new List<string>(); page.PageError += (_, message) => errors.Add(message);
        // Clipboard access depends on browser permissions; record writes instead, as the React tests do.
        await page.AddInitScriptAsync("Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: text => { window.__copied = text; return Promise.resolve() }, readText: () => Promise.resolve(window.__copied) } })");
        await page.SetViewportSizeAsync(1440, 1000); await page.EmulateMediaAsync(new() { ReducedMotion = ReducedMotion.Reduce });
        await page.GotoAsync(url + "/ai-demo");
        var probe = page.Locator("#ai-probe");

        // Model output never becomes markup or script.
        Assert.Null(await page.EvaluateAsync<int?>("() => window.__xss"));
        var unsafeResponse = probe.Locator(".rax-ai-response[data-markdown]").First;
        await Assertions.Expect(unsafeResponse.Locator("script, img")).ToHaveCountAsync(0);
        await Assertions.Expect(unsafeResponse).ToContainTextAsync("<script>window.__xss=1</script>");
        await Assertions.Expect(unsafeResponse.Locator("a")).ToHaveCountAsync(2);
        await Assertions.Expect(unsafeResponse.GetByRole(AriaRole.Link, new() { Name = "good" })).ToHaveAttributeAsync("href", "https://example.com");
        await Assertions.Expect(unsafeResponse.GetByRole(AriaRole.Link, new() { Name = "pixel" })).ToHaveAttributeAsync("rel", "noreferrer");
        await Assertions.Expect(page.Locator("#plain-response")).ToHaveTextAsync("**plain text stays literal**");
        await Assertions.Expect(probe.Locator(".rax-ai-source").Nth(1)).Not.ToHaveAttributeAsync("href", new System.Text.RegularExpressions.Regex("."));
        await Assertions.Expect(probe.Locator(".rax-ai-source-host").First).ToHaveTextAsync("example.com");
        await Assertions.Expect(probe.Locator(".rax-ai-reasoning-trigger")).ToHaveTextAsync("Thought for 3s");
        await Assertions.Expect(probe.Locator(".rax-ai-tool")).ToHaveAttributeAsync("data-state", "open");
        await Assertions.Expect(probe.Locator(".rax-ai-tool-error")).ToHaveTextAsync("Timed out");

        // Actions: copy, regenerate and toggled feedback.
        await Assertions.Expect(page.Locator(".rax-ai-prompt-field")).ToBeEnabledAsync();
        await probe.GetByRole(AriaRole.Button, new() { Name = "Copy", Exact = true }).ClickAsync();
        await Assertions.Expect(probe.GetByRole(AriaRole.Button, new() { Name = "Copied", Exact = true })).ToBeVisibleAsync();
        Assert.Equal("copied text", await page.EvaluateAsync<string>("() => navigator.clipboard.readText()"));
        await probe.GetByRole(AriaRole.Button, new() { Name = "Regenerate", Exact = true }).ClickAsync();
        await probe.GetByRole(AriaRole.Button, new() { Name = "Good response", Exact = true }).ClickAsync();
        await Assertions.Expect(page.Locator("#probe-state")).ToHaveTextAsync("1|up");
        await probe.GetByRole(AriaRole.Button, new() { Name = "Bad response", Exact = true }).ClickAsync();
        await Assertions.Expect(page.Locator("#probe-state")).ToHaveTextAsync("1|down");
        await probe.GetByRole(AriaRole.Button, new() { Name = "Bad response", Exact = true }).ClickAsync();
        await Assertions.Expect(page.Locator("#probe-state")).ToHaveTextAsync("1|");

        // Burst streaming is coalesced but ends on the final text.
        await probe.GetByRole(AriaRole.Button, new() { Name = "Stream probe", Exact = true }).ClickAsync();
        await Assertions.Expect(page.Locator("#stream-probe")).Not.ToHaveAttributeAsync("data-streaming", "");
        await Assertions.Expect(page.Locator("#stream-probe strong")).ToHaveCountAsync(20);

        // The example: suggestion → reasoning → tool → streamed Markdown → sources and actions.
        var example = page.Locator("[data-ai-assistant]");
        await example.GetByRole(AriaRole.Button, new() { Name = "Make the corners square", Exact = true }).ClickAsync();
        await Assertions.Expect(example.Locator(".rax-ai-shimmer")).ToHaveTextAsync("Thinking…");
        var stop = example.GetByRole(AriaRole.Button, new() { Name = "Stop", Exact = true });
        await Assertions.Expect(stop).ToBeVisibleAsync();
        await Assertions.Expect(example.Locator(".rax-ai-sources")).ToContainTextAsync("1 sources", new() { Timeout = 20000 });
        await Assertions.Expect(example.Locator(".rax-ai-response input[type=checkbox]")).ToHaveCountAsync(3);
        await Assertions.Expect(example.Locator(".rax-ai-response input[type=checkbox]:checked")).ToHaveCountAsync(2);
        await Assertions.Expect(example.Locator(".rax-ai-code")).ToContainTextAsync("<html data-rax-radius=\"none\">");
        await Assertions.Expect(example.Locator(".rax-ai-tool")).ToHaveAttributeAsync("data-status", "completed");
        await Assertions.Expect(example.Locator(".rax-ai-reasoning").First).ToHaveAttributeAsync("data-state", "closed");
        await example.Locator(".rax-ai-code button").ClickAsync();
        await Assertions.Expect(example.Locator(".rax-ai-code button")).ToHaveTextAsync("Copied");
        Assert.Equal("<html data-rax-radius=\"none\">", await page.EvaluateAsync<string>("() => navigator.clipboard.readText()"));

        // Prompt: Enter sends, Shift+Enter keeps a newline, Stop ends mid-answer.
        var field = example.GetByRole(AriaRole.Textbox, new() { Name = "Ask about RaxUI… (try Arabic too)", Exact = true });
        await Assertions.Expect(example.GetByRole(AriaRole.Button, new() { Name = "Send", Exact = true })).ToBeDisabledAsync();
        await field.FillAsync("كيف أفعّل الوضع الداكن؟"); await field.PressAsync("Shift+Enter");
        await Assertions.Expect(field).ToHaveValueAsync("كيف أفعّل الوضع الداكن؟\n");
        await field.PressAsync("Enter");
        await Assertions.Expect(field).ToHaveValueAsync("");
        await Assertions.Expect(example.Locator(".rax-ai-message[dir=rtl] .rax-ai-shimmer")).ToHaveTextAsync("يفكّر…");
        await stop.ClickAsync();
        await Assertions.Expect(example.Locator(".rax-ai-message[dir=rtl]")).ToContainTextAsync("أُوقف التوليد.");
        await Assertions.Expect(example.GetByRole(AriaRole.Button, new() { Name = "Send", Exact = true })).ToBeVisibleAsync();

        foreach (var appearance in new[] { "flat", "glass" }) await page.Locator("#ai-appearance").SelectOptionAsync(appearance);
        await page.Locator("#ai-mode").SelectOptionAsync("dark"); await page.Locator("#ai-direction").SelectOptionAsync("rtl");
        await Assertions.Expect(example).ToBeVisibleAsync();
        Assert.Empty(errors);

        var context = await page.Context.Browser!.NewContextAsync(new() { JavaScriptEnabled = false });
        try
        {
            var ssr = await context.NewPageAsync(); await ssr.GotoAsync(url + "/static-ai-demo");
            var staticProbe = ssr.Locator("#ai-probe");
            await Assertions.Expect(staticProbe.Locator(".rax-ai-response[data-markdown] a")).ToHaveCountAsync(2);
            await Assertions.Expect(staticProbe.Locator(".rax-ai-response script")).ToHaveCountAsync(0);
            await Assertions.Expect(staticProbe.Locator(".rax-ai-tool-error")).ToHaveTextAsync("Timed out");
            await Assertions.Expect(ssr.Locator(".rax-ai-prompt-field")).ToBeDisabledAsync();
        }
        finally { await context.CloseAsync(); }
    }
}
