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
    public async Task Text_editor_installs_edits_and_round_trips_safely(string targetFramework)
    {
        var app = Path.Combine(_root, "SampleApp");
        Dotnet(_root, "new", "blazor", "-f", targetFramework, "--interactivity", "Server", "-n", "SampleApp", "-o", app);
        var output = new StringWriter(); var error = new StringWriter();
        Assert.Equal(0, Program.Run(["init"], app, output, error));
        foreach (var name in new[] { "text-editor", "switch", "avatar", "field" })
            Assert.True(Program.Run(["add", name], app, output, error) == 0, error.ToString());
        Assert.True(File.Exists(Path.Combine(app, "Components/UI/TextEditor/TextEditorContent.razor.js")));
        var samples = Path.Combine(app, "Components", "Pages", "EditorSamples"); Directory.CreateDirectory(samples);
        foreach (var file in Directory.GetFiles(Path.Combine(AppContext.BaseDirectory, "Fixtures", "TextEditorExamples"))) File.Copy(file, Path.Combine(samples, Path.GetFileName(file)));
        File.AppendAllText(Path.Combine(app, "Components", "_Imports.razor"), "\n@using SampleApp.Components.Pages.EditorSamples\n");
        var markup = File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Fixtures", "TextEditorComponents.razor"));
        File.WriteAllText(Path.Combine(app, "Components", "Pages", "TextEditorComponents.razor"), markup);
        File.WriteAllText(Path.Combine(app, "Components", "Pages", "StaticTextEditorComponents.razor"), markup.Replace("/editor-demo", "/static-editor-demo").Replace("@rendermode InteractiveServer", ""));
        var program = Path.Combine(app, "Program.cs");
        File.WriteAllText(program, "using Microsoft.AspNetCore.DataProtection;\n" + File.ReadAllText(program).Replace("var app = builder.Build();", "builder.Services.AddDataProtection().UseEphemeralDataProtectionProvider(); var app = builder.Build();"));
        Dotnet(app, "build", "-warnaserror:RZ10012");
        var before = InstallationWorkflowTests.SnapshotFiles(app);
        Assert.Equal(0, Program.Run(["add", "text-editor"], app, output, error));
        Assert.Equal(before, InstallationWorkflowTests.SnapshotFiles(app));
        await VerifyInBrowser(app, VerifyTextEditor);
    }

    private static async Task VerifyTextEditor(IPage page, string url)
    {
        var errors = new List<string>(); page.PageError += (_, message) => errors.Add(message);
        await page.SetViewportSizeAsync(1440, 1000); await page.EmulateMediaAsync(new() { ReducedMotion = ReducedMotion.Reduce });
        await page.GotoAsync(url + "/editor-demo");
        var document = page.Locator("[data-example=document]");
        var text = document.Locator(".ProseMirror");
        await Assertions.Expect(text).ToBeVisibleAsync();
        await Assertions.Expect(document).Not.ToHaveAttributeAsync("aria-busy", "true");
        await Assertions.Expect(text).ToHaveAttributeAsync("aria-label", "Release notes");
        await Assertions.Expect(document.GetByRole(AriaRole.Button, new() { Name = "Bold", Exact = true })).ToHaveAttributeAsync("title", "Bold (Ctrl+B)");

        // Selecting a word shows the bubble centered over it, on the first selection too.
        var word = text.Locator("p strong").First;
        await word.DblClickAsync();
        var bubble = page.Locator("body > .rax-editor-bubble[style*='visibility: visible']");
        await Assertions.Expect(bubble).ToHaveCountAsync(1);
        var wordBox = (await word.BoundingBoxAsync())!; var bubbleBox = (await bubble.BoundingBoxAsync())!;
        Assert.InRange(bubbleBox.X + bubbleBox.Width / 2 - (wordBox.X + wordBox.Width / 2), -2, 2);
        Assert.True(bubbleBox.Y + bubbleBox.Height <= wordBox.Y, "The bubble sits above the selection.");
        await Assertions.Expect(bubble.GetByRole(AriaRole.Button, new() { Name = "Bold", Exact = true })).ToHaveAttributeAsync("aria-pressed", "true");
        await bubble.GetByRole(AriaRole.Button, new() { Name = "Italic", Exact = true }).ClickAsync();
        await Assertions.Expect(text.Locator("p em strong, p strong em").First).ToHaveTextAsync("forms");

        // Toolbar: heading menu, link popover, undo; C# receives the HTML.
        await text.Locator("p").First.ClickAsync();
        await document.GetByRole(AriaRole.Button, new() { Name = "Text style: Normal text", Exact = true }).ClickAsync();
        await page.GetByRole(AriaRole.Menuitemradio, new() { Name = "Heading 3" }).ClickAsync();
        await Assertions.Expect(text.Locator("h3").First).ToContainTextAsync("This release brings");
        await Assertions.Expect(document.GetByRole(AriaRole.Button, new() { Name = "Text style: Heading 3", Exact = true })).ToBeVisibleAsync();
        await Assertions.Expect(text).ToBeFocusedAsync();
        await text.Locator("mark").DblClickAsync();
        await page.Keyboard.PressAsync("Escape");
        await document.GetByRole(AriaRole.Button, new() { Name = "Link", Exact = true }).ClickAsync();
        var linkInput = document.Locator("[data-editor-link-popover] [data-editor-link-input]");
        await Assertions.Expect(linkInput).ToBeFocusedAsync();
        await linkInput.FillAsync("example.org/grid"); await linkInput.PressAsync("Enter");
        await Assertions.Expect(text.Locator("a[href='https://example.org/grid']")).ToHaveAttributeAsync("rel", "noopener noreferrer nofollow");
        await page.Locator("#show-html").ClickAsync();
        await Assertions.Expect(page.Locator("[data-example=html]")).ToContainTextAsync("<h3 dir=\"auto\">This release brings");
        await Assertions.Expect(page.Locator("[data-example=html]")).ToContainTextAsync("https://example.org/grid");
        await text.ClickAsync(); await page.Keyboard.PressAsync("Control+z");
        await Assertions.Expect(text.Locator("a[href='https://example.org/grid']")).ToHaveCountAsync(0);

        // Comment composer: counter, Ctrl+Enter sends the pending HTML and clears the draft.
        var comments = page.Locator("[data-example=comments]");
        var composer = comments.Locator(".ProseMirror");
        await composer.ClickAsync(); await page.Keyboard.TypeAsync("Great work");
        await Assertions.Expect(comments.Locator(".rax-textarea-count-text")).ToHaveTextAsync("10 / 280");
        await page.Keyboard.PressAsync("Control+Enter");
        await Assertions.Expect(comments.Locator(".rax-prose.small")).ToHaveCountAsync(2);
        await Assertions.Expect(comments.Locator(".rax-prose.small").Last).ToContainTextAsync("Great work");
        await Assertions.Expect(composer).ToHaveClassAsync(new System.Text.RegularExpressions.Regex("ProseMirror"));
        await Assertions.Expect(comments.Locator(".rax-textarea-count-text")).ToHaveTextAsync("0 / 280");

        // EditForm: DataAnnotations reach the editable element, then a valid value saves.
        var form = page.Locator("[data-example=form]");
        await form.GetByRole(AriaRole.Button, new() { Name = "Save role", Exact = true }).ClickAsync();
        var description = form.Locator(".ProseMirror");
        await Assertions.Expect(description).ToHaveAttributeAsync("aria-invalid", "true");
        await Assertions.Expect(form).ToContainTextAsync("Describe the role.");
        await description.ClickAsync(); await page.Keyboard.TypeAsync("Build accessible Blazor components with the RaxUI team.");
        await form.GetByRole(AriaRole.Button, new() { Name = "Save role", Exact = true }).ClickAsync();
        await Assertions.Expect(form.Locator("output")).ToHaveTextAsync("Saved · 55 characters");
        await Assertions.Expect(description).Not.ToHaveAttributeAsync("aria-invalid", "true");

        // Arabic: labels, RTL keyboard order in the toolbar.
        var arabic = page.Locator("[data-example=arabic]");
        await Assertions.Expect(arabic.GetByRole(AriaRole.Toolbar, new() { Name = "التنسيق" })).ToBeVisibleAsync();
        var undo = arabic.GetByRole(AriaRole.Button, new() { Name = "تراجع", Exact = true });
        await undo.FocusAsync(); await page.Keyboard.PressAsync("ArrowLeft");
        await Assertions.Expect(arabic.GetByRole(AriaRole.Button, new() { Name = "إعادة", Exact = true })).ToBeFocusedAsync();

        // Security and transport probes.
        var probes = page.Locator("#editor-probes");
        Assert.Null(await page.EvaluateAsync<int?>("() => window.__xss"));
        await Assertions.Expect(probes.Locator("[data-probe=unsafe] .ProseMirror script, [data-probe=unsafe] .ProseMirror img")).ToHaveCountAsync(0);
        await Assertions.Expect(probes.Locator("[data-probe=unsafe] .ProseMirror")).ToContainTextAsync("Safe text");
        await Assertions.Expect(page.Locator("#view-probe script, #view-probe img")).ToHaveCountAsync(0);
        await Assertions.Expect(page.Locator("#view-probe a")).Not.ToHaveAttributeAsync("href", new System.Text.RegularExpressions.Regex("."));
        // More than SignalR's 32 KB message limit crosses as a stream.
        await probes.Locator("[data-probe=large] .ProseMirror").ClickAsync();
        await page.Keyboard.InsertTextAsync(new string('x', 40000));
        await probes.Locator("[data-probe=locked] .ProseMirror").ClickAsync();
        await Assertions.Expect(page.Locator("#large-length")).ToHaveTextAsync("40018"); // <p dir="auto"> + 40000 + </p>
        var locked = probes.Locator("[data-probe=locked] .ProseMirror");
        await Assertions.Expect(locked).ToHaveAttributeAsync("contenteditable", "false");
        await Assertions.Expect(locked).ToHaveAttributeAsync("aria-readonly", "true");
        await probes.GetByRole(AriaRole.Button, new() { Name = "Toggle read-only", Exact = true }).ClickAsync();
        await Assertions.Expect(locked).ToHaveAttributeAsync("contenteditable", "true");
        await Assertions.Expect(page.Locator("#post-probe input[name=body]")).ToHaveValueAsync("<p>Posted <strong>body</strong></p>");

        foreach (var appearance in new[] { "flat", "glass" }) await page.Locator("#editor-appearance").SelectOptionAsync(appearance);
        await page.Locator("#editor-mode").SelectOptionAsync("dark");
        Assert.Empty(errors);

        var context = await page.Context.Browser!.NewContextAsync(new() { JavaScriptEnabled = false, ReducedMotion = ReducedMotion.Reduce });
        try
        {
            var ssr = await context.NewPageAsync(); await ssr.GotoAsync(url + "/static-editor-demo");
            var staticDocument = ssr.Locator("[data-example=document]");
            await Assertions.Expect(staticDocument.Locator("[data-editor-static] h2")).ToHaveTextAsync("RaxUI 3.0");
            await Assertions.Expect(staticDocument.Locator("[data-editor-static]")).ToHaveAttributeAsync("aria-readonly", "true");
            await Assertions.Expect(ssr.Locator("[data-probe=unsafe] [data-editor-static] script, [data-probe=unsafe] [data-editor-static] img")).ToHaveCountAsync(0);
            await Assertions.Expect(ssr.Locator("[data-probe=unsafe] [data-editor-static] a")).Not.ToHaveAttributeAsync("href", new System.Text.RegularExpressions.Regex("."));
            await Assertions.Expect(ssr.Locator("#post-probe input[name=body]")).ToHaveValueAsync("<p>Posted <strong>body</strong></p>");
        }
        finally { await context.CloseAsync(); }
    }
}
