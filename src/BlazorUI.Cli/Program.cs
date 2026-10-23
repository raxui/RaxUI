namespace BlazorUI.Cli;

public static class Program
{
    public const string Usage = """
        Usage:
          blazorui init
          blazorui add <component>
        """;

    public static int Main(string[] args)
    {
        switch (args.FirstOrDefault())
        {
            case "init":
            case "add":
                Console.Error.WriteLine($"'{args[0]}' is not implemented yet.");
                return 1;
            default:
                Console.Error.WriteLine(Usage);
                return 1;
        }
    }
}
