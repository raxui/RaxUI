using System.Reflection;
using BlazorUI.Cli.Commands;

namespace BlazorUI.Cli;

public static class Program
{
    public const string Usage = """
        BlazorUI CLI — Source-first Blazor UI components installed into your project.

        Usage:
          blazorui init [options]
          blazorui add <component> [options]

        Commands:
          init              Initialize BlazorUI in the current Blazor project
          add <component>   Install a component and its assets into your project

        Options:
          -c, --cwd <dir>   Working directory (defaults to current directory)
          -v, --version     Display CLI version
          -h, --help        Show help information
        """;

    public static int Main(string[] args)
    {
        return Run(args, Directory.GetCurrentDirectory(), Console.Out, Console.Error);
    }

    public static int Run(string[] args, string workingDirectory, TextWriter output, TextWriter error)
    {
        if (args.Length == 0)
        {
            error.WriteLine(Usage);
            return 1;
        }

        var cwd = workingDirectory;
        var cleanArgs = new List<string>();

        for (int i = 0; i < args.Length; i++)
        {
            if ((args[i] == "-c" || args[i] == "--cwd") && i + 1 < args.Length)
            {
                cwd = Path.GetFullPath(args[++i]);
            }
            else
            {
                cleanArgs.Add(args[i]);
            }
        }

        var command = cleanArgs.FirstOrDefault();

        switch (command)
        {
            case "-h":
            case "--help":
            case "help":
                output.WriteLine(Usage);
                return 0;

            case "-v":
            case "--version":
            case "version":
                var version = typeof(Program).Assembly
                    .GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion
                    ?? typeof(Program).Assembly.GetName().Version?.ToString()
                    ?? "0.1.0";
                output.WriteLine(version);
                return 0;

            case "init":
                return InitCommand.Execute(cwd, output, error);

            case "add":
                var component = cleanArgs.Skip(1).FirstOrDefault();
                if (string.IsNullOrWhiteSpace(component))
                {
                    error.WriteLine("Error: Missing component name.");
                    error.WriteLine("Usage: blazorui add <component>");
                    return 1;
                }
                return AddCommand.Execute(cwd, component, output, error);

            default:
                error.WriteLine($"Unknown command or option: '{command}'");
                error.WriteLine(Usage);
                return 1;
        }
    }
}
