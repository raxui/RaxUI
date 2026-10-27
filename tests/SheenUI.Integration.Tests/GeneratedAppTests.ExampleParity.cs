using Microsoft.Playwright;
using Program = SheenUI.Cli.Program;

namespace SheenUI.Integration.Tests;

public partial class GeneratedAppTests
{
    [Theory]
    [InlineData("net8.0")]
    [InlineData("net9.0")]
    [InlineData("net10.0")]
    public async Task Upload_badge_avatar_examples_and_sortable_overlay_match_react(string targetFramework)
    {
        var app = Path.Combine(_root, "SampleApp");
        Dotnet(_root, "new", "blazor", "-f", targetFramework, "--interactivity", "Server", "-n", "SampleApp", "-o", app);
        var output = new StringWriter(); var error = new StringWriter();
        Assert.Equal(0, Program.Run(["init"], app, output, error));
        foreach (var name in new[] { "sortable", "file-upload", "badge", "avatar", "button", "timeline", "accordion", "pagination", "stepper", "switch", "input" })
            Assert.True(Program.Run(["add", name], app, output, error) == 0, error.ToString());
        var target = Path.Combine(app, "Components", "Pages", "ParitySamples"); Directory.CreateDirectory(target);
        foreach (var file in Directory.GetFiles(Path.Combine(AppContext.BaseDirectory, "Fixtures", "ParityExamples"), "*.razor"))
            File.Copy(file, Path.Combine(target, Path.GetFileName(file)));
        File.Copy(Path.Combine(AppContext.BaseDirectory, "Fixtures", "DataExamples", "SortableExamples.razor"), Path.Combine(target, "SortableExamples.razor"));
        File.AppendAllText(Path.Combine(app, "Components", "_Imports.razor"), "\n@using SampleApp.Components.Pages.ParitySamples\n");
        var markup = File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Fixtures", "ExampleParity.razor"));
        File.WriteAllText(Path.Combine(app, "Components", "Pages", "ExampleParity.razor"), markup);
        File.WriteAllText(Path.Combine(app, "Components", "Pages", "StaticExampleParity.razor"), markup.Replace("/example-parity", "/static-example-parity").Replace("@rendermode InteractiveServer", ""));
        var assets = Path.Combine(app, "wwwroot", "avatars"); Directory.CreateDirectory(assets);
        var pixel = Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jVJkAAAAASUVORK5CYII=");
        foreach (var name in new[] { "coffee.jpg", "astronaut.jpg", "chelsea.jpg" }) File.WriteAllBytes(Path.Combine(assets, name), pixel);
        var program = Path.Combine(app, "Program.cs");
        File.WriteAllText(program, "using Microsoft.AspNetCore.DataProtection;\n" + File.ReadAllText(program).Replace("var app = builder.Build();", "builder.Services.AddDataProtection().UseEphemeralDataProtectionProvider(); var app = builder.Build();"));
        Dotnet(app, "build", "-warnaserror:RZ10012");
        var before = InstallationWorkflowTests.SnapshotFiles(app);
        foreach (var name in new[] { "sortable", "file-upload", "badge", "avatar" }) Assert.Equal(0, Program.Run(["add", name], app, output, error));
        Assert.Equal(before, InstallationWorkflowTests.SnapshotFiles(app));
        await VerifyInBrowser(app, VerifyExampleParity);
    }

    private static async Task VerifyExampleParity(IPage page, string url)
    {
        var errors = new List<string>(); page.PageError += (_, message) => errors.Add(message);
        await page.SetViewportSizeAsync(1440, 1100);
        await page.GotoAsync(url + "/example-parity");
        var list = page.Locator("#parity-sortable .sheen-sortable").First;
        var rows = list.Locator("[data-sortable-content] > [data-sortable-id]");
        var grip = rows.First.Locator("button"); await Assertions.Expect(grip).ToBeEnabledAsync(); await grip.ScrollIntoViewIfNeededAsync();
        var from = (await grip.BoundingBoxAsync())!; var to = (await rows.Nth(2).BoundingBoxAsync())!;
        await page.Mouse.MoveAsync(from.X + from.Width / 2, from.Y + from.Height / 2); await page.Mouse.DownAsync();
        await page.Mouse.MoveAsync(to.X + 70, to.Y + to.Height / 2, new() { Steps = 12 });
        var overlay = page.Locator("body > [data-overlay]"); await Assertions.Expect(overlay).ToBeVisibleAsync();
        Assert.NotEqual("rgba(0, 0, 0, 0)", await overlay.EvaluateAsync<string>("e=>getComputedStyle(e).color"));
        Assert.True(await overlay.Locator(".text-truncate").EvaluateAsync<bool>("e=>getComputedStyle(e).visibility==='visible'"));
        var cloneBox = (await overlay.BoundingBoxAsync())!; Assert.InRange(cloneBox.Y, to.Y - 30, to.Y + 30);
        var placeholder = list.Locator("[data-placeholder]");
        Assert.Equal("dashed", await placeholder.EvaluateAsync<string>("e=>getComputedStyle(e,'::after').borderTopStyle"));
        Assert.Contains("matrix", await placeholder.EvaluateAsync<string>("e=>getComputedStyle(e).transform"));
        await page.Mouse.UpAsync(); await Assertions.Expect(rows.Nth(2)).ToHaveAttributeAsync("data-sortable-id", "t1");
        await Assertions.Expect(overlay).ToHaveCountAsync(0);
        await rows.Nth(2).Locator("button").FocusAsync(); await page.Keyboard.PressAsync("Space"); await page.Keyboard.PressAsync("ArrowUp"); await page.Keyboard.PressAsync("Escape");
        await Assertions.Expect(rows.Nth(2)).ToHaveAttributeAsync("data-sortable-id", "t1");

        await grip.ScrollIntoViewIfNeededAsync(); from = (await grip.BoundingBoxAsync())!;
        await page.Mouse.MoveAsync(from.X + from.Width / 2, from.Y + from.Height / 2); await page.Mouse.DownAsync();
        await page.Mouse.MoveAsync(from.X + 40, from.Y + 35, new() { Steps = 8 });
        await Assertions.Expect(overlay).ToBeVisibleAsync();
        await page.GetByRole(AriaRole.Button, new() { Name = "Hide sortable", Exact = true }).EvaluateAsync("e=>e.click()");
        await Assertions.Expect(overlay).ToHaveCountAsync(0); await page.Mouse.UpAsync();
        await page.GetByRole(AriaRole.Button, new() { Name = "Show sortable", Exact = true }).ClickAsync();
        await page.EvaluateAsync("()=>{window.revokedUploads=[];const revoke=URL.revokeObjectURL;URL.revokeObjectURL=url=>{window.revokedUploads.push(url);revoke.call(URL,url)}}");
        var uploads = page.Locator("#parity-upload .sheen-queue-upload"); await Assertions.Expect(uploads).ToHaveCountAsync(4);
        var documents = uploads.Nth(0);
        static FilePayload File(string name) => new() { Name = name, MimeType = "application/pdf", Buffer = System.Text.Encoding.UTF8.GetBytes(name) };
        await documents.Locator("input").Last.SetInputFilesAsync(new[] { File("a.pdf"), File("fail.pdf"), File("b.pdf"), File("c.pdf") });
        await Assertions.Expect(documents.Locator("[data-status=uploading]")).ToHaveCountAsync(3);
        await Assertions.Expect(documents.Locator("[data-status=queued]")).ToHaveCountAsync(1);
        await documents.GetByRole(AriaRole.Button, new() { Name = "Cancel upload a.pdf", Exact = true }).ClickAsync();
        await Assertions.Expect(documents.Locator("[data-status=cancelled]")).ToHaveCountAsync(1);
        await documents.Locator("input").Last.SetInputFilesAsync(File("later.pdf"));
        await Assertions.Expect(documents.Locator("[data-status=error]")).ToHaveCountAsync(1);
        await documents.GetByRole(AriaRole.Button, new() { Name = "Retry fail.pdf", Exact = true }).ClickAsync();
        await documents.GetByRole(AriaRole.Button, new() { Name = "Retry a.pdf", Exact = true }).ClickAsync();
        await Assertions.Expect(documents.Locator("[data-status=success]")).ToHaveCountAsync(5);
        await documents.Locator("input").Last.SetInputFilesAsync(new FilePayload { Name = "bad.exe", MimeType = "application/octet-stream", Buffer = new byte[1] });
        await Assertions.Expect(documents.GetByRole(AriaRole.Alert)).ToContainTextAsync("not allowed");
        await Assertions.Expect(documents.Locator(".sheen-queue-upload-item")).ToHaveCountAsync(5);
        await documents.GetByRole(AriaRole.Button, new() { Name = "Remove all", Exact = true }).ClickAsync();
        await Assertions.Expect(documents.Locator(".sheen-queue-upload-item")).ToHaveCountAsync(0);
        var form = page.Locator("#parity-upload form");
        await form.GetByRole(AriaRole.Button, new() { Name = "Send application", Exact = true }).ClickAsync();
        await Assertions.Expect(form).ToContainTextAsync("Attach your CV.");
        await form.Locator("input[type=file]").Last.SetInputFilesAsync(File("cv.pdf"));
        await form.GetByRole(AriaRole.Button, new() { Name = "Send application", Exact = true }).ClickAsync();
        await Assertions.Expect(form.Locator("output")).ToHaveTextAsync("Sent with cv.pdf");
        await form.Locator("input[type=file]").Last.SetInputFilesAsync(new FilePayload { Name = "invalid.exe", MimeType = "application/octet-stream", Buffer = new byte[1] });
        await Assertions.Expect(form.GetByRole(AriaRole.Alert)).ToContainTextAsync("not allowed");
        await Assertions.Expect(form.Locator(".sheen-queue-upload-name")).ToHaveTextAsync("cv.pdf");
        await form.Locator("input[type=file]").Last.SetInputFilesAsync(File("replacement.pdf"));
        await Assertions.Expect(form.Locator(".sheen-queue-upload-item")).ToHaveCountAsync(1);
        await Assertions.Expect(form.Locator(".sheen-queue-upload-name")).ToHaveTextAsync("replacement.pdf");
        await form.GetByRole(AriaRole.Button, new() { Name = "Reset", Exact = true }).ClickAsync();
        await Assertions.Expect(form.Locator(".sheen-queue-upload-item")).ToHaveCountAsync(0);
        var photos = uploads.Nth(1);
        await photos.Locator("input").Last.SetInputFilesAsync(new FilePayload { Name = "portrait.png", MimeType = "image/png", Buffer = Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jVJkAAAAASUVORK5CYII=") });
        await Assertions.Expect(photos.Locator("img")).ToBeVisibleAsync();
        Assert.True(await photos.Locator("img").EvaluateAsync<bool>("e=>e.src.startsWith('blob:')"));
        var tile = (await photos.Locator(".sheen-queue-upload-tile").BoundingBoxAsync())!; Assert.InRange(tile.Width / tile.Height, .99f, 1.01f);
        var previewUrl = await photos.Locator("img").GetAttributeAsync("src");
        await page.GetByRole(AriaRole.Button, new() { Name = "Hide uploads", Exact = true }).ClickAsync();
        await page.WaitForFunctionAsync("url=>window.revokedUploads.includes(url)", previewUrl);
        await page.GetByRole(AriaRole.Button, new() { Name = "Show uploads", Exact = true }).ClickAsync();
        var badges = page.Locator("#parity-badge");
        await badges.GetByRole(AriaRole.Button, new() { Name = "Remove React", Exact = true }).ClickAsync();
        await Assertions.Expect(badges.GetByRole(AriaRole.Button, new() { Name = "Remove React", Exact = true })).ToHaveCountAsync(0);
        await badges.GetByRole(AriaRole.Button, new() { Name = "+1 message", Exact = true }).ClickAsync();
        await Assertions.Expect(badges.GetByRole(AriaRole.Status, new() { Name = "4 unread messages", Exact = true })).ToHaveTextAsync("4");
        await badges.GetByRole(AriaRole.Button, new() { Name = "Mark read", Exact = true }).ClickAsync();
        await Assertions.Expect(badges.GetByRole(AriaRole.Status, new() { Name = "0 unread messages", Exact = true })).ToHaveCountAsync(0);
        await Assertions.Expect(badges.Locator(".sheen-badge-count").Filter(new() { HasText = "99+" })).ToHaveCountAsync(1);
        var avatars = page.Locator("#parity-avatar");
        await Assertions.Expect(avatars.Locator(".sheen-avatar-fallback[aria-label='Saad Alsaree']").First).ToBeVisibleAsync();
        await Assertions.Expect(avatars.GetByRole(AriaRole.Group, new() { Name = "Project members", Exact = true }).Locator(".sheen-avatar-more")).ToContainTextAsync("+3");
        var accordion = page.Locator("#parity-accordion");
        var cards = accordion.Locator(".sheen-accordion[data-variant=cards]");
        await accordion.GetByRole(AriaRole.Button, new() { Name = "Expand all", Exact = true }).ClickAsync();
        await Assertions.Expect(cards.Locator("details[open]")).ToHaveCountAsync(3);
        await accordion.GetByRole(AriaRole.Button, new() { Name = "Collapse all", Exact = true }).ClickAsync();
        await Assertions.Expect(cards.Locator("details[open]")).ToHaveCountAsync(0);
        await cards.Locator("summary").Nth(1).ClickAsync();
        await Assertions.Expect(cards.Locator("details[open]")).ToHaveCountAsync(1);
        await accordion.Locator(".sheen-accordion").First.Locator("summary").First.FocusAsync();
        await page.Keyboard.PressAsync("ArrowDown");
        await Assertions.Expect(accordion.Locator(".sheen-accordion").First.Locator("summary").Nth(1)).ToBeFocusedAsync();
        Assert.Equal("true", await accordion.Locator("summary[data-disabled]").GetAttributeAsync("aria-disabled"));
        var timeline = page.Locator("#parity-timeline");
        await Assertions.Expect(timeline.Locator(".sheen-timeline")).ToHaveCountAsync(5);
        await Assertions.Expect(timeline.Locator("[data-layout=alternate] > [data-side=start]")).ToHaveCountAsync(2);
        await Assertions.Expect(timeline.Locator(".sheen-timeline-wrap[data-layout=horizontal]")).ToHaveAttributeAsync("tabindex", "0");
        var pagination = page.Locator("#parity-pagination");
        await pagination.GetByRole(AriaRole.Navigation, new() { Name = "Results pagination", Exact = true }).GetByRole(AriaRole.Link, new() { Name = "Next", Exact = true }).ClickAsync();
        await Assertions.Expect(pagination.GetByRole(AriaRole.Status).First).ToHaveTextAsync("Showing 81–100 of 386 results");
        Assert.EndsWith("/example-parity", page.Url);
        await pagination.GetByRole(AriaRole.Navigation, new() { Name = "ترقيم الصفحات", Exact = true }).GetByRole(AriaRole.Link, new() { Name = "الصفحة ٤", Exact = true }).ClickAsync();
        await Assertions.Expect(pagination.GetByRole(AriaRole.Navigation, new() { Name = "ترقيم الصفحات", Exact = true }).Locator("[aria-current=page]")).ToHaveTextAsync("٤");
        var checkout = page.Locator("#parity-stepper .sheen-stepper").First;
        await checkout.GetByRole(AriaRole.Button, new() { Name = "Continue", Exact = true }).ClickAsync();
        await Assertions.Expect(checkout.Locator("input[name='model.Name']")).ToBeVisibleAsync();
        await checkout.GetByRole(AriaRole.Button, new() { Name = "Continue", Exact = true }).ClickAsync();
        await Assertions.Expect(checkout.Locator("[data-state=error]")).ToHaveCountAsync(1);
        foreach (var (field, value) in new[] { ("Name", "Saad Alsaree"), ("Email", "saad@example.com"), ("Address", "Baghdad street 12"), ("City", "Baghdad") })
            await checkout.Locator($"input[name='model.{field}']").FillAsync(value);
        await checkout.GetByRole(AriaRole.Button, new() { Name = "Continue", Exact = true }).ClickAsync();
        await checkout.Locator("input[name='model.Card']").FillAsync("4242 4242 4242 4242");
        await checkout.Locator("input[name='model.Expiry']").FillAsync("12/28");
        await checkout.GetByRole(AriaRole.Button, new() { Name = "Continue", Exact = true }).ClickAsync();
        await Assertions.Expect(checkout).ToContainTextAsync("Card ending 4242");
        await checkout.GetByRole(AriaRole.Button, new() { Name = "Place order · $177", Exact = true }).ClickAsync();
        await Assertions.Expect(checkout).ToContainTextAsync("Thanks, Saad!");
        await checkout.GetByRole(AriaRole.Button, new() { Name = "Start over", Exact = true }).ClickAsync();
        await Assertions.Expect(checkout.GetByRole(AriaRole.Button, new() { Name = "Continue", Exact = true })).ToBeVisibleAsync();
        var deploy = page.Locator("#parity-stepper .sheen-stepper[data-orientation=vertical]");
        await deploy.GetByRole(AriaRole.Button, new() { Name = "Add variables", Exact = true }).ClickAsync();
        await Assertions.Expect(deploy.GetByRole(AriaRole.Button, new() { Name = "Deploy now", Exact = true })).ToBeVisibleAsync();
        await page.ReloadAsync();
        await Assertions.Expect(page.Locator("#parity-sortable .sheen-sortable-handle").First).ToBeEnabledAsync();
        foreach (var width in new[] { 1440, 390 })
        {
            await page.SetViewportSizeAsync(width, 1100);
            foreach (var appearance in new[] { "default", "flat", "glass" })
                foreach (var mode in new[] { "light", "dark" })
                    foreach (var direction in new[] { "ltr", "rtl" })
                    {
                        await page.Locator("#parity-appearance").SelectOptionAsync(appearance); await page.Locator("#parity-mode").SelectOptionAsync(mode); await page.Locator("#parity-direction").SelectOptionAsync(direction);
                        Assert.True(await page.EvaluateAsync<bool>("()=>document.documentElement.scrollWidth<=innerWidth+1"), await page.EvaluateAsync<string>("()=>JSON.stringify({width:innerWidth,scroll:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('section *')].filter(e=>{const b=e.getBoundingClientRect();return b.width>0&&(b.right>innerWidth+1||b.left< -1)}).filter(e=>{let p=e.parentElement;while(p){if(['auto','scroll','hidden','clip'].includes(getComputedStyle(p).overflowX))return false;p=p.parentElement}return true}).slice(0,12).map(e=>({html:e.outerHTML.slice(0,200),box:e.getBoundingClientRect().toJSON()}))})"));
                    }
        }
        var response = await page.APIRequest.GetAsync(url + "/static-example-parity"); var html = await response.TextAsync();
        Assert.True(response.Ok); Assert.Contains("sheen-queue-upload-zone", html); Assert.Contains("sheen-avatar-group", html); Assert.Contains("99+", System.Net.WebUtility.HtmlDecode(html));
        Assert.Empty(errors);
    }
}
