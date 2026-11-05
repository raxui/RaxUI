using Microsoft.Playwright;
using Program = RaxUI.Cli.Program;

namespace RaxUI.Integration.Tests;

public partial class GeneratedAppTests
{
    [Theory]
    [InlineData("net8.0")]
    [InlineData("net9.0")]
    [InlineData("net10.0")]
    public async Task Chart_installs_paints_and_follows_the_theme(string targetFramework)
    {
        var app = Path.Combine(_root, "SampleApp");
        Dotnet(_root, "new", "blazor", "-f", targetFramework, "--interactivity", "Server", "-n", "SampleApp", "-o", app);
        var output = new StringWriter(); var error = new StringWriter();
        Assert.Equal(0, Program.Run(["init"], app, output, error));
        Assert.True(Program.Run(["add", "chart"], app, output, error) == 0, error.ToString());
        Assert.True(File.Exists(Path.Combine(app, "Components/UI/Chart/ChartTypes.razor.js")));
        var markup = File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Fixtures", "ChartComponents.razor"));
        File.WriteAllText(Path.Combine(app, "Components", "Pages", "ChartComponents.razor"), markup);
        File.WriteAllText(Path.Combine(app, "Components", "Pages", "StaticChartComponents.razor"), markup.Replace("/chart-demo", "/static-chart-demo").Replace("@rendermode InteractiveServer", ""));
        Dotnet(app, "build", "-warnaserror:RZ10012");
        await VerifyInBrowser(app, VerifyChart);
    }

    private static async Task VerifyChart(IPage page, string url)
    {
        var errors = new List<string>(); page.PageError += (_, message) => errors.Add(message);
        await page.EmulateMediaAsync(new() { ReducedMotion = ReducedMotion.Reduce });

        // Static SSR: the sized placeholder and the accessible table, no engine.
        await page.GotoAsync(url + "/static-chart-demo");
        var staticSales = page.GetByRole(AriaRole.Figure, new() { Name = "Sales" });
        await Assertions.Expect(staticSales).Not.ToHaveAttributeAsync("data-state", "ready");
        await Assertions.Expect(staticSales.GetByRole(AriaRole.Table, new() { IncludeHidden = true })).ToContainTextAsync("Revenue");

        await page.GotoAsync(url + "/chart-demo");
        var sales = page.GetByRole(AriaRole.Figure, new() { Name = "Sales" });
        await Assertions.Expect(sales).ToHaveAttributeAsync("data-state", "ready");
        foreach (var name in new[] { "Share", "Trend", "المبيعات" })
            await Assertions.Expect(page.GetByRole(AriaRole.Figure, new() { Name = name })).ToHaveAttributeAsync("data-state", "ready");
        const string read = """
            (figure) => {
              const chart = Chart.getChart(figure.querySelector('canvas')), style = getComputedStyle(figure)
              return {
                type: chart.config.type, width: chart.width, height: chart.height,
                data: chart.data.datasets.map(d => d.data.join(',')),
                colors: chart.data.datasets.map(d => d.borderColor), slices: [].concat(chart.data.datasets[0].backgroundColor),
                primary: style.getPropertyValue('--rax-chart-1').trim(), danger: style.getPropertyValue('--rax-chart-5').trim(),
                info: style.getPropertyValue('--rax-chart-2').trim(),
                grid: chart.options.scales?.y?.grid?.color, xReverse: chart.options.scales?.x?.reverse,
                yPosition: chart.options.scales?.y?.position, indexAxis: chart.options.indexAxis,
                legend: chart.options.plugins.legend.display, id: chart.id
              }
            }
            """;
        var first = await sales.EvaluateAsync<ChartState>(read);
        Assert.Equal("bar", first.Type);
        Assert.True(first.Width > 0 && first.Height == 300, $"{first.Width}x{first.Height}");
        Assert.Equal(new[] { first.Primary, first.Danger }, first.Colors);

        // New data updates the same instance; a new type replaces it.
        await page.ClickAsync("#more");
        await Assertions.Expect(sales.GetByRole(AriaRole.Table, new() { IncludeHidden = true })).ToContainTextAsync("35");
        var updated = await sales.EvaluateAsync<ChartState>(read);
        Assert.Equal(first.Id, updated.Id);
        Assert.Equal("20,25,30,35", updated.Data[0]);
        await page.ClickAsync("#as-line");
        await Assertions.Expect(sales).ToHaveAttributeAsync("data-type", "line");
        Assert.Equal("line", (await Settle(sales, read, s => s.Type == "line")).Type);

        // Theme attributes restyle without a round trip: accent recolours, dark mode changes the grid.
        await page.SelectOptionAsync("#chart-accent", "emerald");
        var light = await Settle(sales, read, s => s.Colors[0] != first.Primary);
        Assert.NotEqual(first.Primary, light.Colors[0]);
        Assert.Equal(light.Primary, light.Colors[0]);
        await page.SelectOptionAsync("#chart-mode", "dark");
        Assert.NotEqual(light.Grid, (await Settle(sales, read, s => s.Grid != light.Grid)).Grid);

        var share = await page.GetByRole(AriaRole.Figure, new() { Name = "Share" }).EvaluateAsync<ChartState>(read);
        Assert.Equal("doughnut", share.Type);
        Assert.Equal(3, share.Slices!.Length);
        Assert.Equal(share.Info, share.Slices[0]); // palette slot "2"
        Assert.Equal(share.Info, share.Slices[1]); // second slice takes the second slot
        var trend = await page.GetByRole(AriaRole.Figure, new() { Name = "Trend" }).EvaluateAsync<ChartState>(read);
        Assert.Equal(48, trend.Height);
        Assert.False(trend.Legend);
        var arabic = await page.GetByRole(AriaRole.Figure, new() { Name = "المبيعات" }).EvaluateAsync<ChartState>(read);
        Assert.Equal("y", arabic.IndexAxis);
        Assert.True(arabic.XReverse);
        Assert.Equal("right", arabic.YPosition);
        Assert.Empty(errors);
    }

    // Theme changes repaint on the next animation frame; type changes need a .NET render first.
    private static async Task<ChartState> Settle(ILocator figure, string read, Func<ChartState, bool> done)
    {
        for (var i = 0; i < 50; i++)
        {
            var state = await figure.EvaluateAsync<ChartState>(read);
            if (done(state)) return state;
            await Task.Delay(100);
        }
        return await figure.EvaluateAsync<ChartState>(read);
    }

    // Playwright fills evaluate results through a parameterless constructor and setters.
    private sealed class ChartState
    {
        public string Type { get; set; } = "";
        public double Width { get; set; }
        public double Height { get; set; }
        public string[] Data { get; set; } = [];
        public string[] Colors { get; set; } = [];
        public string[]? Slices { get; set; }
        public string Primary { get; set; } = "";
        public string Danger { get; set; } = "";
        public string Info { get; set; } = "";
        public string? Grid { get; set; }
        public bool? XReverse { get; set; }
        public string? YPosition { get; set; }
        public string IndexAxis { get; set; } = "";
        public bool Legend { get; set; }
        public int Id { get; set; }
    }
}
