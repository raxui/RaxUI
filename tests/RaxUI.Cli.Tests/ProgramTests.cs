namespace RaxUI.Cli.Tests;

public class ProgramTests
{
    [Theory]
    [InlineData("init", "blazorui.json")]
    [InlineData("init", "blazorui.lock.json")]
    [InlineData("add", "blazorui.json")]
    [InlineData("add", "blazorui.lock.json")]
    [InlineData("update", "blazorui.json")]
    [InlineData("update", "blazorui.lock.json")]
    [InlineData("init", "sheenui.json")]
    [InlineData("add", "sheenui.lock.json")]
    public void Former_identity_is_rejected_without_writing(string command, string legacyFile)
    {
        var root = Path.Combine(Path.GetTempPath(), "RaxUI_legacy_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(root);
        try
        {
            var file = Path.Combine(root, legacyFile);
            File.WriteAllText(file, "original state");
            var error = new StringWriter();
            Assert.Equal(1, Program.Run([command, "button"], root, new StringWriter(), error));
            Assert.Contains("former BlazorUI or SheenUI registry", error.ToString());
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
        Assert.Contains("raxui init", error.ToString());
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

    [Theory]
    [InlineData("button", "dialog")]
    [InlineData("--force")]
    [InlineData("--dry-run", "--dry-run")]
    public void Unsupported_update_arguments_fail_before_accessing_the_project(params string[] args)
    {
        var error = new StringWriter();
        Assert.Equal(1, Program.Run(["update", .. args], Directory.GetCurrentDirectory(), new StringWriter(), error));
        Assert.Contains("Usage: raxui update", error.ToString());
    }
}
