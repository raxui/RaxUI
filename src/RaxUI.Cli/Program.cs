using System.Reflection;
using RaxUI.Cli.Commands;
using RaxUI.Cli.Registry;

namespace RaxUI.Cli;

public static class Program
{
    public const string Usage = """
        RaxUI CLI — Source-first Blazor UI components installed into your project.

        Usage:
          raxui init [--appearance <name>] [--accent <name>] [options]
          raxui add <component...> [options]
          raxui update [component] [--dry-run] [options]
          raxui recover [--keep-changes] [options]

        Commands:
          init              Initialize RaxUI in the current Blazor project
          add <component...> Install one or more components and their assets into your project
          update            Update installed Blazor components and the shared theme
          recover           Finish an interrupted init, add or update

        Options:
          -c, --cwd <dir>   Working directory (defaults to current directory)
          --appearance <a>  init only: default | flat | glass (asked when omitted)
          --accent <a>      init only: blue | emerald | indigo | amber (asked when omitted)
          -v, --version     Display CLI version
          -h, --help        Show help information
          --dry-run         Preview an update without writing files
          --keep-changes    Recovery only: keep changed files and restore the rest
        """;

    public static int Main(string[] args)
    {
        // Prompts only when a person is typing; piped input and CI use the flags or the defaults.
        return Run(args, Directory.GetCurrentDirectory(), Console.Out, Console.Error, Console.IsInputRedirected ? null : Console.In);
    }

    public static int Run(string[] args, string workingDirectory, TextWriter output, TextWriter error, TextReader? input = null)
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
            new[] { "blazorui.json", "blazorui.lock.json", "sheenui.json", "sheenui.lock.json" }.Any(file => File.Exists(Path.Combine(cwd, file))))
        {
            error.WriteLine("Error: This app uses the former BlazorUI or SheenUI registry. RaxUI uses different files and theme APIs. Test in a new app or follow docs/adr/022-raxui-identity.md; existing files were not changed.");
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
                if (cleanArgs.Contains("--dry-run") && TransactionRoots(cwd).Any(root => Path.Exists(Path.Combine(root, FileTransaction.DirectoryName))))
                    throw new InvalidOperationException("An interrupted RaxUI installation exists; run 'raxui recover' first.");
                foreach (var root in TransactionRoots(cwd))
                    FileTransaction.Recover(root, keepChanges: false, output);
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
                    error.WriteLine("Usage: raxui recover [--keep-changes] [--cwd <dir>]");
                    return 1;
                }
                try
                {
                    var recovered = false;
                    foreach (var root in TransactionRoots(cwd))
                        recovered |= FileTransaction.Recover(root, cleanArgs.Contains("--keep-changes"), output);
                    if (!recovered)
                        output.WriteLine("No interrupted RaxUI installation found.");
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
                string? appearance = null, accent = null;
                var initArgs = cleanArgs.Skip(1).ToArray();
                for (var i = 0; i < initArgs.Length; i++)
                {
                    if (initArgs[i] == "--appearance" && i + 1 < initArgs.Length && appearance == null)
                        appearance = initArgs[++i];
                    else if (initArgs[i] == "--accent" && i + 1 < initArgs.Length && accent == null)
                        accent = initArgs[++i];
                    else
                    {
                        error.WriteLine("Usage: raxui init [--appearance <default|flat|glass>] [--accent <blue|emerald|indigo|amber>] [--cwd <dir>]");
                        return 1;
                    }
                }
                try
                {
                    // Reject a bad value before init touches anything.
                    ThemeChoice.NormalizeAppearance(appearance);
                    ThemeChoice.NormalizeAccent(accent);
                }
                catch (InvalidOperationException ex)
                {
                    error.WriteLine($"Error: {ex.Message}");
                    return 1;
                }
                return InitCommand.Execute(cwd, output, error, appearance, accent, input);

            case "add":
                var addArgs = cleanArgs.Skip(1).ToArray();
                var components = addArgs.Where(arg => !string.IsNullOrWhiteSpace(arg)).Distinct(StringComparer.OrdinalIgnoreCase).ToArray();
                if (components.Length == 0 || addArgs.Any(arg => arg.StartsWith('-')))
                {
                    error.WriteLine(components.Length == 0 ? "Error: Missing component name." : "Error: add takes component names only.");
                    error.WriteLine("Usage: raxui add <component...>");
                    return 1;
                }
                // Check every name first so a typo late in the list does not leave earlier components half done.
                if (components.Length > 1)
                {
                    var registry = new EmbeddedRegistry();
                    var unknown = components.Where(name =>
                    {
                        try { registry.GetComponentManifest(name); return false; }
                        catch (KeyNotFoundException) { return true; }
                    }).ToArray();
                    if (unknown.Length > 0)
                    {
                        error.WriteLine($"Error: Unknown component(s): {string.Join(", ", unknown)}. Nothing was installed.");
                        return 1;
                    }
                }
                foreach (var component in components)
                {
                    var code = AddCommand.Execute(cwd, component, output, error);
                    if (code != 0)
                        return code;
                }
                return 0;

            case "update":
                var updateArgs = cleanArgs.Skip(1).ToArray();
                var names = updateArgs.Where(arg => !arg.StartsWith('-')).ToArray();
                if (names.Length > 1 || updateArgs.Any(arg => arg.StartsWith('-') && arg != "--dry-run") ||
                    updateArgs.Count(arg => arg == "--dry-run") > 1)
                {
                    error.WriteLine("Usage: raxui update [component] [--dry-run] [--cwd <dir>]");
                    return 1;
                }
                return UpdateCommand.Execute(cwd, names.FirstOrDefault(), updateArgs.Contains("--dry-run"), output, error);

            default:
                error.WriteLine($"Unknown command or option: '{command}'");
                error.WriteLine(Usage);
                return 1;
        }
    }

    // A WebAssembly or Auto app journals in the folder that holds its server and client projects (ProjectContext.WorkspaceRoot).
    private static IEnumerable<string> TransactionRoots(string cwd)
    {
        var project = Path.TrimEndingDirectorySeparator(Path.GetFullPath(cwd));
        yield return project;
        if (Path.GetDirectoryName(project) is { } parent)
            yield return parent;
    }
}
