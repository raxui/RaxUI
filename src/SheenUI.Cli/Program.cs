using System.Reflection;
using SheenUI.Cli.Commands;

namespace SheenUI.Cli;

public static class Program
{
    public const string Usage = """
        SheenUI CLI — Source-first Blazor UI components installed into your project.

        Usage:
          sheenui init [options]
          sheenui add <component> [options]
          sheenui update [component] [--dry-run] [options]
          sheenui recover [--keep-changes] [options]

        Commands:
          init              Initialize SheenUI in the current Blazor project
          add <component>   Install a component and its assets into your project
          update            Update installed Blazor components and the shared theme
          recover           Finish an interrupted init, add or update

        Options:
          -c, --cwd <dir>   Working directory (defaults to current directory)
          -v, --version     Display CLI version
          -h, --help        Show help information
          --dry-run         Preview an update without writing files
          --keep-changes    Recovery only: keep changed files and restore the rest
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

        if ((command is "init" or "add" or "update") &&
            new[] { "blazorui.json", "blazorui.lock.json" }.Any(file => File.Exists(Path.Combine(cwd, file))))
        {
            error.WriteLine("Error: This app uses the former BlazorUI registry. SheenUI uses different files and theme APIs. Test in a new app or follow docs/adr/012-sheenui-identity.md; existing files were not changed.");
            return 1;
        }

        if (command != "recover" && cleanArgs.Contains("--keep-changes"))
        {
            error.WriteLine("Error: --keep-changes is only supported by recover.");
            return 1;
        }

        // Recover before reading configuration: an interrupted config or lock write must not block it.
        if (command is "init" or "add" or "update")
        {
            try
            {
                if (cleanArgs.Contains("--dry-run") && Path.Exists(Path.Combine(cwd, FileTransaction.DirectoryName)))
                    throw new InvalidOperationException("An interrupted SheenUI installation exists; run 'sheenui recover' first.");
                FileTransaction.Recover(cwd, keepChanges: false, output);
            }
            catch (InvalidOperationException ex)
            {
                error.WriteLine($"Error: {ex.Message}");
                return 1;
            }
        }

        switch (command)
        {
            case "recover":
                if (cleanArgs.Skip(1).Any(arg => arg != "--keep-changes"))
                {
                    error.WriteLine("Usage: sheenui recover [--keep-changes] [--cwd <dir>]");
                    return 1;
                }
                try
                {
                    if (!FileTransaction.Recover(cwd, cleanArgs.Contains("--keep-changes"), output))
                        output.WriteLine("No interrupted SheenUI installation found.");
                    return 0;
                }
                catch (InvalidOperationException ex)
                {
                    error.WriteLine($"Error: {ex.Message}");
                    return 1;
                }

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
                    error.WriteLine("Usage: sheenui add <component>");
                    return 1;
                }
                return AddCommand.Execute(cwd, component, output, error);

            case "update":
                var updateArgs = cleanArgs.Skip(1).ToArray();
                var names = updateArgs.Where(arg => !arg.StartsWith('-')).ToArray();
                if (names.Length > 1 || updateArgs.Any(arg => arg.StartsWith('-') && arg != "--dry-run") ||
                    updateArgs.Count(arg => arg == "--dry-run") > 1)
                {
                    error.WriteLine("Usage: sheenui update [component] [--dry-run] [--cwd <dir>]");
                    return 1;
                }
                return UpdateCommand.Execute(cwd, names.FirstOrDefault(), updateArgs.Contains("--dry-run"), output, error);

            default:
                error.WriteLine($"Unknown command or option: '{command}'");
                error.WriteLine(Usage);
                return 1;
        }
    }
}
