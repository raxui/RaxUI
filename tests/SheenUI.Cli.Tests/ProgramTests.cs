namespace SheenUI.Cli.Tests;

public class ProgramTests
{
    [Theory]
    [InlineData("init", "blazorui.json")]
    [InlineData("init", "blazorui.lock.json")]
    [InlineData("add", "blazorui.json")]
    [InlineData("add", "blazorui.lock.json")]
    public void Former_identity_is_rejected_without_writing(string command, string legacyFile)
    {
        var root = Path.Combine(Path.GetTempPath(), "SheenUI_legacy_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(root);
        try
        {
            var file = Path.Combine(root, legacyFile);
            File.WriteAllText(file, "original state");
            var error = new StringWriter();
            Assert.Equal(1, Program.Run([command, "button"], root, new StringWriter(), error));
            Assert.Contains("former BlazorUI registry", error.ToString());
            Assert.Equal("original state", File.ReadAllText(file));
            Assert.Single(Directory.GetFiles(root));
        }
        finally
        {
            Directory.Delete(root, true);
        }
    }

    [Theory]
    [InlineData()]
    [InlineData("unknown")]
    public void Unknown_or_missing_command_prints_usage_and_returns_1(params string[] args)
    {
        var output = new StringWriter();
        var error = new StringWriter();

        var exitCode = Program.Run(args, Directory.GetCurrentDirectory(), output, error);

        Assert.Equal(1, exitCode);
        Assert.Contains("sheenui init", error.ToString());
    }

    [Theory]
    [InlineData("-h")]
    [InlineData("--help")]
    [InlineData("help")]
    public void Help_option_prints_usage_and_returns_0(string flag)
    {
        var output = new StringWriter();
        var error = new StringWriter();

        var exitCode = Program.Run([flag], Directory.GetCurrentDirectory(), output, error);

        Assert.Equal(0, exitCode);
        Assert.Contains("Usage:", output.ToString());
    }

    [Theory]
    [InlineData("-v")]
    [InlineData("--version")]
    public void Version_option_prints_version_and_returns_0(string flag)
    {
        var output = new StringWriter();
        var error = new StringWriter();

        var exitCode = Program.Run([flag], Directory.GetCurrentDirectory(), output, error);

        Assert.Equal(0, exitCode);
        Assert.Contains("0.1.0", output.ToString());
    }
}
