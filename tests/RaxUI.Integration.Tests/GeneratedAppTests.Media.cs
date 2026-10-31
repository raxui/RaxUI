using Microsoft.Playwright;
using ZXing;
using Program = RaxUI.Cli.Program;
namespace RaxUI.Integration.Tests;

public partial class GeneratedAppTests
{
    [Theory]
    [InlineData("net8.0")]
    [InlineData("net9.0")]
    [InlineData("net10.0")]
    public async Task Qr_and_carousel_install_render_decode_and_move(string targetFramework)
    {
        var app = Path.Combine(_root, "SampleApp"); Dotnet(_root, "new", "blazor", "-f", targetFramework, "--interactivity", "Server", "-n", "SampleApp", "-o", app);
        var output = new StringWriter(); var error = new StringWriter(); Assert.Equal(0, Program.Run(["init"], app, output, error));
        foreach (var name in new[] { "qr-code", "carousel", "rating", "input", "switch", "toggle" }) Assert.True(Program.Run(["add", name], app, output, error) == 0, error.ToString());
        var target = Path.Combine(app, "Components", "Pages", "MediaExamples"); Directory.CreateDirectory(target);
        foreach (var file in Directory.GetFiles(Path.Combine(AppContext.BaseDirectory, "Fixtures", "MediaExamples"), "*.razor")) File.Copy(file, Path.Combine(target, Path.GetFileName(file)));
        File.Copy(Path.Combine(AppContext.BaseDirectory, "Fixtures", "MediaExamples", "CarouselExamples.css"), Path.Combine(app, "wwwroot", "media-examples.css"));
        File.AppendAllText(Path.Combine(app, "Components", "_Imports.razor"), "\n@using SampleApp.Components.Pages.MediaExamples\n");
        var markup = File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Fixtures", "MediaComponents.razor")); File.WriteAllText(Path.Combine(app, "Components", "Pages", "MediaComponents.razor"), markup); File.WriteAllText(Path.Combine(app, "Components", "Pages", "StaticMediaComponents.razor"), markup.Replace("/media-demo", "/static-media-demo").Replace("@rendermode InteractiveServer", ""));
        var assets = Path.Combine(app, "wwwroot", "avatars"); Directory.CreateDirectory(assets); foreach (var name in new[] { "coffee", "astronaut", "chelsea" }) File.WriteAllBytes(Path.Combine(assets, name + ".jpg"), Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jVJkAAAAASUVORK5CYII="));
        var program = Path.Combine(app, "Program.cs"); File.WriteAllText(program, "using Microsoft.AspNetCore.DataProtection;\n" + File.ReadAllText(program).Replace("var app = builder.Build();", "builder.Services.AddDataProtection().UseEphemeralDataProtectionProvider(); var app = builder.Build();"));
        Dotnet(app, "build", "-warnaserror:RZ10012");
        Assert.True(File.Exists(Path.Combine(app, "Components/UI/QRCode/QrCodeEncoder.cs"))); Assert.True(File.Exists(Path.Combine(app, "Components/UI/Carousel/CarouselContent.razor.js")));
        var before = InstallationWorkflowTests.SnapshotFiles(app); foreach (var name in new[] { "qr-code", "carousel" }) Assert.Equal(0, Program.Run(["add", name], app, output, error)); Assert.Equal(before, InstallationWorkflowTests.SnapshotFiles(app));
        // Plain C# follows the same ownership/conflict protection as Razor files.
        var encoder = Path.Combine(app, "Components/UI/QRCode/QrCodeEncoder.cs"); var original = File.ReadAllText(encoder); File.AppendAllText(encoder, "// consumer edit\n"); Assert.NotEqual(0, Program.Run(["add", "qr-code"], app, output, error)); Assert.EndsWith("// consumer edit\n", File.ReadAllText(encoder)); File.WriteAllText(encoder, original);
        await VerifyInBrowser(app, VerifyMedia);
    }
    private static async Task VerifyMedia(IPage page, string url)
    {
        var errors = new List<string>(); page.PageError += (_, message) => errors.Add(message);
        await page.SetViewportSizeAsync(1440, 1100); await page.EmulateMediaAsync(new() { ReducedMotion = ReducedMotion.Reduce }); await page.GotoAsync(url + "/media-demo");
        var qr = page.Locator("#qr-probe .rax-qr-code"); var frame = qr.Locator("[data-qr-frame]"); await Assertions.Expect(qr.GetByRole(AriaRole.Button, new() { Name = "Download PNG", Exact = true })).ToBeEnabledAsync();
        // The screenshot includes the actual browser-rendered shapes, quiet zone and overlaid logo.
        foreach (var text in new[] { "", "123456789012345", "HELLO WORLD", "https://github.com/raxui/RaxUI", "مرحباً من بغداد", "العراق 😀 QR 123" })
            foreach (var shape in new[] { "square", "rounded", "dots" })
            {
                await page.Locator("#qr-value").FillAsync(text); await page.Locator("#qr-shape").SelectOptionAsync(shape);
                await Assertions.Expect(qr.Locator("svg[role=img]")).ToHaveAttributeAsync("aria-label", "QR " + text);
                var decoded = await DecodeQrScreenshot(page, frame); Assert.Equal(text.Length == 0 ? " " : text, decoded);
            }
        await page.Locator("#qr-value").FillAsync("https://github.com/raxui/RaxUI"); await page.Locator("#qr-logo").CheckAsync();
        foreach (var shape in new[] { "square", "rounded", "dots" }) { await page.Locator("#qr-shape").SelectOptionAsync(shape); Assert.Equal("https://github.com/raxui/RaxUI", await DecodeQrScreenshot(page, frame)); }
        await page.Locator("#qr-level").SelectOptionAsync("M"); var mOverlay = await DecodeQrScreenshot(page, frame); Console.WriteLine("Overlay at M: " + (mOverlay is null ? "NOT DECODABLE" : "decoded"));
        await page.Locator("#qr-level").SelectOptionAsync("H");
        foreach (var format in new[] { "PNG", "SVG" })
        {
            var download = await page.RunAndWaitForDownloadAsync(() => qr.GetByRole(AriaRole.Button, new() { Name = "Download " + format, Exact = true }).ClickAsync()); var path = await download.PathAsync(); var bytes = File.ReadAllBytes(path!); Assert.EndsWith("." + format.ToLowerInvariant(), download.SuggestedFilename); if (format == "PNG") Assert.Equal(new byte[] { 137, 80, 78, 71 }, bytes.Take(4)); else Assert.Contains("<svg", System.Text.Encoding.UTF8.GetString(bytes));
        }
        await Assertions.Expect(page.Locator("#qr-example [data-qr-canvas]")).ToBeVisibleAsync(); await Assertions.Expect(page.Locator("#qr-example [data-qr-image]")).ToBeVisibleAsync();
        await page.Locator("#qr-value").FillAsync(new string('x', 4000)); await Assertions.Expect(qr.GetByRole(AriaRole.Alert)).ToBeVisibleAsync(); await Assertions.Expect(page.Locator("#qr-error")).ToContainTextAsync("Data too long"); await page.Locator("#qr-value").FillAsync("restored"); await Assertions.Expect(frame).ToBeVisibleAsync();
        var dynamic = page.Locator("#dynamic-carousel .rax-carousel"); var next = dynamic.Locator("[data-carousel-next]"); await Assertions.Expect(next).ToBeEnabledAsync(); await next.ClickAsync(); await Assertions.Expect(dynamic).ToHaveAttributeAsync("data-selected", "1"); await Assertions.Expect(page.Locator("#settled-index")).ToHaveTextAsync("1");
        await next.PressAsync("ArrowLeft"); await Assertions.Expect(dynamic).ToHaveAttributeAsync("data-selected", "0");
        await page.GetByRole(AriaRole.Button, new() { Name = "Add slide", Exact = true }).ClickAsync(); await Assertions.Expect(dynamic.Locator(".rax-carousel-dot")).ToHaveCountAsync(4); await dynamic.Locator(".rax-carousel-dot").Nth(3).ClickAsync(); await Assertions.Expect(dynamic).ToHaveAttributeAsync("data-selected", "3"); await page.GetByRole(AriaRole.Button, new() { Name = "Remove slide", Exact = true }).ClickAsync(); await Assertions.Expect(dynamic.Locator(".rax-carousel-dot")).ToHaveCountAsync(3);
        var gallery = page.Locator("[data-demo-gallery]"); await gallery.Locator(".rax-carousel-thumb").Nth(2).ClickAsync(); await Assertions.Expect(gallery).ToHaveAttributeAsync("data-selected", "2"); await Assertions.Expect(gallery.Locator(".rax-carousel-counter")).ToHaveTextAsync("3 / 6");
        var arabic = page.Locator("[data-demo-arabic]"); await arabic.GetByRole(AriaRole.Button, new() { Name = "الشريحة التالية", Exact = true }).ClickAsync(); await Assertions.Expect(arabic).ToHaveAttributeAsync("data-selected", "1"); await arabic.Locator("[data-carousel-next]").PressAsync("ArrowRight"); await Assertions.Expect(arabic).ToHaveAttributeAsync("data-selected", "0");
        var vertical = page.Locator("[data-demo-vertical]"); await vertical.PressAsync("ArrowDown"); await Assertions.Expect(vertical).ToHaveAttributeAsync("data-selected", "1");
        await page.EmulateMediaAsync(new() { ReducedMotion = ReducedMotion.NoPreference });
        var auto = page.Locator("#autoplay-probe .rax-carousel"); await auto.ScrollIntoViewIfNeededAsync(); await page.Mouse.MoveAsync(0, 0); await page.Locator("h1").FocusAsync(); await Assertions.Expect(auto).ToHaveAttributeAsync("data-playing", "true"); var initial = await auto.GetAttributeAsync("data-selected"); await page.WaitForFunctionAsync("v=>document.querySelector('#autoplay-probe .rax-carousel').dataset.selected!==v", initial);
        await auto.Locator(".rax-carousel-playpause").ClickAsync(); var paused = await auto.GetAttributeAsync("data-selected"); await page.Mouse.MoveAsync(0, 0); await page.Locator("h1").FocusAsync(); await page.WaitForTimeoutAsync(900); Assert.Equal(paused, await auto.GetAttributeAsync("data-selected")); await Assertions.Expect(auto).ToHaveAttributeAsync("data-playing", "false");
        await auto.Locator(".rax-carousel-playpause").ClickAsync(); await page.Locator("h1").FocusAsync(); await page.Mouse.MoveAsync(0, 0); await Assertions.Expect(auto).ToHaveAttributeAsync("data-playing", "true");
        // Verify motion runs in the browser rather than jumping directly to its final position.
        await dynamic.ScrollIntoViewIfNeededAsync();
        var positions = await dynamic.EvaluateAsync<string[]>("""
 async root=>{const track=root.querySelector('.rax-carousel-container');root.querySelector('[data-carousel-next]').click();const positions=[];for(let i=0;i<16;i++){await new Promise(requestAnimationFrame);positions.push(getComputedStyle(track).transform)}return positions}
 """); Assert.True(positions.Distinct().Count() > 3, "Slide transition must include intermediate animation frames.");
        await page.WaitForTimeoutAsync(600); var beforeDrag = await dynamic.GetAttributeAsync("data-selected"); var bounds = (await dynamic.Locator(".rax-carousel-viewport").BoundingBoxAsync())!;
        await page.Mouse.MoveAsync(bounds.X + bounds.Width * .8f, bounds.Y + bounds.Height / 2); await page.Mouse.DownAsync(); await page.Mouse.MoveAsync(bounds.X + bounds.Width * .2f, bounds.Y + bounds.Height / 2, new() { Steps = 12 }); await page.Mouse.UpAsync();
        await page.WaitForFunctionAsync("v=>document.querySelector('#dynamic-carousel .rax-carousel').dataset.selected!==v", beforeDrag);
        var scale = page.Locator("[data-demo-scale]"); await Assertions.Expect(scale.Locator(".rax-carousel-item:not([data-active])").First).ToHaveCountAsync(1); Assert.Contains("0.9", await scale.Locator(".rax-carousel-item:not([data-active]) > *").First.EvaluateAsync<string>("e=>e.style.transform"));
        foreach (var width in new[] { 1440, 390 }) foreach (var appearance in new[] { "default", "flat", "glass" }) foreach (var mode in new[] { "light", "dark" }) foreach (var direction in new[] { "ltr", "rtl" })
        {
            await page.SetViewportSizeAsync(width, 1100); await page.Locator("#media-appearance").SelectOptionAsync(appearance); await page.Locator("#media-mode").SelectOptionAsync(mode); await page.Locator("#media-direction").SelectOptionAsync(direction); await page.Locator("#media-accent").SelectOptionAsync(mode == "dark" ? "emerald" : "blue"); await page.Locator("#media-density").SelectOptionAsync(width == 390 ? "compact" : "default"); await Assertions.Expect(page.Locator("#media-theme")).ToHaveAttributeAsync("dir", direction); Assert.True(await page.EvaluateAsync<bool>("()=>document.documentElement.scrollWidth<=innerWidth+1"), $"Overflow {width} {appearance} {mode} {direction}");
        }
        await page.EmulateMediaAsync(new() { ReducedMotion = ReducedMotion.Reduce }); await Assertions.Expect(auto).ToHaveAttributeAsync("data-playing", "false");
        await page.GetByRole(AriaRole.Button, new() { Name = "Toggle media", Exact = true }).ClickAsync(); await Assertions.Expect(page.Locator("#carousel-example")).ToHaveCountAsync(0); await page.GetByRole(AriaRole.Button, new() { Name = "Toggle media", Exact = true }).ClickAsync(); await Assertions.Expect(page.Locator("[data-demo-gallery] [data-carousel-next]")).ToBeEnabledAsync();
        await page.ReloadAsync(); await Assertions.Expect(page.Locator("[data-demo-gallery] [data-carousel-next]")).ToBeEnabledAsync();
        var response = await page.APIRequest.GetAsync(url + "/static-media-demo"); Assert.True(response.Ok); var html = await response.TextAsync(); Assert.Contains("<svg", html); Assert.Contains("shape-rendering", html); Assert.Contains("rax-carousel-item", html); await page.GotoAsync(url + "/static-media-demo"); await Assertions.Expect(page.Locator("#qr-probe [data-qr-frame]")).ToBeVisibleAsync(); await Assertions.Expect(page.Locator("[data-demo-gallery] [data-carousel-next]")).ToBeDisabledAsync(); Assert.Empty(errors);
    }
    private static async Task<string?> DecodeQrScreenshot(IPage page, ILocator frame)
    {
        var png = await frame.ScreenshotAsync(new() { Animations = ScreenshotAnimations.Disabled });
        var pixels = await page.EvaluateAsync<QrPixels>("""
 async b64=>{const image=new Image();image.src='data:image/png;base64,'+b64;await image.decode();const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const x=c.getContext('2d');x.drawImage(image,0,0);const bytes=x.getImageData(0,0,c.width,c.height).data;let raw='';for(let i=0;i<bytes.length;i+=8192)raw+=String.fromCharCode(...bytes.subarray(i,i+8192));return {Width:c.width,Height:c.height,Base64:btoa(raw)}}
 """, Convert.ToBase64String(png));
        var reader = new BarcodeReaderGeneric { Options = new() { CharacterSet = "UTF-8", TryHarder = true, PossibleFormats = [BarcodeFormat.QR_CODE] } }; return reader.Decode(Convert.FromBase64String(pixels.Base64), pixels.Width, pixels.Height, RGBLuminanceSource.BitmapFormat.RGBA32)?.Text;
    }
    private sealed class QrPixels { public QrPixels() { } public int Width { get; set; } public int Height { get; set; } public string Base64 { get; set; } = ""; }
}
