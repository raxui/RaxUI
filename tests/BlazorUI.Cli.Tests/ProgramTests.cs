namespace BlazorUI.Cli.Tests;

public class ProgramTests
{
    [Theory]
    [InlineData()]
    [InlineData("unknown")]
    public void Unknown_or_missing_command_prints_usage_and_returns_1(params string[] args)
    {
        var error = new StringWriter();
        var original = Console.Error;
        Console.SetError(error);
        try
        {
            Assert.Equal(1, Program.Main(args));
        }
        finally
        {
            Console.SetError(original);
        }

        Assert.Contains("blazorui init", error.ToString());
    }
}
