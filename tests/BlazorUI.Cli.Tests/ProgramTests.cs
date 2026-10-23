namespace BlazorUI.Cli.Tests;

public class ProgramTests
{
    [Theory]
    [InlineData()]
    [InlineData("unknown")]
    public void Unknown_or_missing_command_prints_usage_and_returns_1(params string[] args)
    {
        var output = new StringWriter();
        var error = new StringWriter();

        var exitCode = Program.Run(args, Directory.GetCurrentDirectory(), output, error);

        Assert.Equal(1, exitCode);
        Assert.Contains("blazorui init", error.ToString());
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
