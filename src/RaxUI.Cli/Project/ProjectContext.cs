using System.Diagnostics;
using System.Text.Json;

namespace RaxUI.Cli.Project;

public class ProjectContext
{
    /// <summary>Supported Blazor Web App targets (ADR 009).</summary>
    public static readonly string[] SupportedTargetFrameworks = ["net8.0", "net9.0", "net10.0"];

    // .NET 9+ templates ship Bootstrap under lib/; .NET 8 under bootstrap/.
    private static readonly string[] BootstrapFolders = ["wwwroot/lib/bootstrap", "wwwroot/bootstrap"];

    public required string RootDirectory { get; init; }
    public required string TargetFramework { get; init; }

    /// <summary>.NET 9+ apps reference static assets through @Assets (MapStaticAssets); .NET 8 apps use plain URLs.</summary>
    public bool UsesAssetsDirective => TargetFramework != "net8.0";

    /// <summary>Full path of the Bootstrap CSS the template ships.</summary>
    public required string BootstrapCssPath { get; init; }
    public required string ProjectFilePath { get; init; }
    public required string ProjectName { get; init; }
    public required string RootNamespace { get; init; }
    public required string AssemblyName { get; init; }
    public required string AppRazorPath { get; init; }

    /// <summary>
    /// The Blazor WebAssembly project a Web App with WebAssembly or Auto interactivity references; null for
    /// Server and static SSR apps. Components go there so both the server and the browser can run them.
    /// </summary>
    public string? ClientDirectory { get; init; }
    public required string ClientNamespace { get; init; }

    /// <summary>Holds Components/UI: the client project when there is one, otherwise this project.</summary>
    public string ComponentsRoot => ClientDirectory ?? RootDirectory;
    public string ComponentsNamespace => ClientDirectory == null ? RootNamespace : ClientNamespace;

    /// <summary>Recovery journal root: the folder holding both projects when components go to the client.</summary>
    public string WorkspaceRoot => ClientDirectory == null ? RootDirectory : Path.GetDirectoryName(RootDirectory)!;

    /// <summary>_Imports.razor files that receive component usings: this project's, then the client's.</summary>
    public required IReadOnlyList<string> ImportsRazorPaths { get; init; }

    /// <summary>The project root a lock target resolves against; only Components/UI files live in the client.</summary>
    public string RootFor(string target, string componentsPath) =>
        target.StartsWith(componentsPath + "/", StringComparison.Ordinal) ? ComponentsRoot : RootDirectory;

    public static ProjectContext Detect(string workingDirectory)
    {
        workingDirectory = Path.TrimEndingDirectorySeparator(Path.GetFullPath(workingDirectory));
        var csprojFiles = Directory.GetFiles(workingDirectory, "*.csproj");
        if (csprojFiles.Length == 0)
        {
            throw new InvalidOperationException(
                $"No .csproj file found in '{workingDirectory}'. Please navigate to your Blazor project directory.");
        }

        if (csprojFiles.Length > 1)
        {
            throw new InvalidOperationException(
                $"Multiple .csproj files found in '{workingDirectory}'. Specify target project explicitly.");
        }

        var csprojPath = csprojFiles[0];
        var projectName = Path.GetFileNameWithoutExtension(csprojPath);

        if (IsWebAssemblyProject(csprojPath))
        {
            throw new InvalidOperationException(
                $"'{projectName}' is a Blazor WebAssembly project. Run RaxUI in the server project of the Blazor Web App " +
                "(the one with Components/App.razor); it installs components into this client project. Standalone Blazor WebAssembly apps are not supported.");
        }

        var (rootNamespace, assemblyName, targetFramework, references) = EvaluateMsBuildProperties(csprojPath);
        if (string.IsNullOrEmpty(targetFramework))
            throw new InvalidOperationException($"'{projectName}' targets several frameworks. Only single-target Blazor Web Apps are supported.");
        if (!SupportedTargetFrameworks.Contains(targetFramework))
        {
            throw new InvalidOperationException(
                $"'{projectName}' targets {targetFramework}. Supported: {string.Join(", ", SupportedTargetFrameworks)}.");
        }

        // Verify the template Bootstrap exists (ADR 004)
        var bootstrapDir = BootstrapFolders
            .Select(folder => Path.Combine(workingDirectory, folder))
            .FirstOrDefault(Directory.Exists);
        if (bootstrapDir == null)
        {
            // Visual Studio's "Blazor Web App" without sample pages has no Bootstrap, so say how to add it (#156).
            throw new InvalidOperationException(
                $"Bootstrap was not found in '{string.Join("' or '", BootstrapFolders)}'. RaxUI builds on the Bootstrap 5.3 that " +
                "'dotnet new blazor' ships; some templates (such as Visual Studio's Blazor Web App without sample pages) leave it out. " +
                "To add it: copy 'wwwroot/lib/bootstrap' from a new 'dotnet new blazor' app, add " +
                "<link rel=\"stylesheet\" href=\"@Assets[\"lib/bootstrap/dist/css/bootstrap.min.css\"]\" /> before app.css in " +
                "Components/App.razor, then run init again.");
        }

        var bootstrapCss = FindBootstrapCss(bootstrapDir)
                           ?? throw new InvalidOperationException($"No Bootstrap CSS file found under '{Path.GetRelativePath(workingDirectory, bootstrapDir)}'.");

        // Host App.razor
        var appRazor = Path.Combine(workingDirectory, "Components", "App.razor");
        if (!File.Exists(appRazor))
        {
            appRazor = Path.Combine(workingDirectory, "App.razor");
            if (!File.Exists(appRazor))
            {
                throw new InvalidOperationException(
                    "Could not locate 'Components/App.razor' or 'App.razor' in the project.");
            }
        }

        // The WebAssembly client of a WebAssembly or Auto Web App, as the template lays it out: a sibling folder.
        var clients = references.Where(IsWebAssemblyProject).ToList();
        if (clients.Count > 1)
            throw new InvalidOperationException($"'{projectName}' references several Blazor WebAssembly projects. Only one client project is supported.");
        string? clientDirectory = null;
        var clientNamespace = "";
        if (clients.Count == 1)
        {
            clientDirectory = Path.GetDirectoryName(clients[0])!;
            if (!string.Equals(Path.GetDirectoryName(clientDirectory), Path.GetDirectoryName(workingDirectory),
                    OperatingSystem.IsWindows() ? StringComparison.OrdinalIgnoreCase : StringComparison.Ordinal))
            {
                throw new InvalidOperationException(
                    $"The client project '{clients[0]}' must be in a folder next to '{projectName}', as 'dotnet new blazor --interactivity Auto' creates it.");
            }
            clientNamespace = EvaluateMsBuildProperties(clients[0]).RootNamespace;
        }

        List<string> imports = [FindImports(workingDirectory)];
        if (clientDirectory != null)
            imports.Add(FindImports(clientDirectory));

        return new ProjectContext
        {
            RootDirectory = workingDirectory,
            TargetFramework = targetFramework,
            ProjectFilePath = csprojPath,
            ProjectName = projectName,
            RootNamespace = rootNamespace,
            AssemblyName = assemblyName,
            AppRazorPath = appRazor,
            ClientDirectory = clientDirectory,
            ClientNamespace = clientNamespace,
            ImportsRazorPaths = imports,
            BootstrapCssPath = bootstrapCss
        };
    }

    private static string FindImports(string projectDirectory)
    {
        var importsRazor = Path.Combine(projectDirectory, "Components", "_Imports.razor");
        if (File.Exists(importsRazor))
            return importsRazor;
        var rootImports = Path.Combine(projectDirectory, "_Imports.razor");
        // Otherwise created on first 'add'
        return File.Exists(rootImports) ? rootImports : importsRazor;
    }

    // The SDK is named in the project file itself; it cannot come from imported props.
    private static bool IsWebAssemblyProject(string csprojPath) =>
        File.Exists(csprojPath) && File.ReadAllText(csprojPath).Contains("Microsoft.NET.Sdk.BlazorWebAssembly", StringComparison.OrdinalIgnoreCase);

    /// <summary>
    /// Reads the evaluated RootNamespace and AssemblyName, so values from Directory.Build.props
    /// and SDK defaults are honored (ADR 003), instead of parsing the .csproj XML.
    /// </summary>
    private static (string RootNamespace, string AssemblyName, string TargetFramework, string[] References) EvaluateMsBuildProperties(string csprojPath)
    {
        var startInfo = new ProcessStartInfo("dotnet")
        {
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            WorkingDirectory = Path.GetDirectoryName(csprojPath)!,
        };
        foreach (var arg in new[] { "msbuild", csprojPath, "-getProperty:RootNamespace", "-getProperty:AssemblyName", "-getProperty:TargetFramework", "-getItem:ProjectReference" })
            startInfo.ArgumentList.Add(arg);

        using var process = Process.Start(startInfo)
                            ?? throw new InvalidOperationException("Could not start 'dotnet msbuild'.");
        var stdoutTask = process.StandardOutput.ReadToEndAsync();
        var stderrTask = process.StandardError.ReadToEndAsync();

        if (!process.WaitForExit(TimeSpan.FromMinutes(2)))
        {
            process.Kill(entireProcessTree: true);
            throw new InvalidOperationException($"Timed out evaluating '{csprojPath}' with 'dotnet msbuild'.");
        }

        var stdout = stdoutTask.Result;
        if (process.ExitCode != 0)
        {
            throw new InvalidOperationException(
                $"'dotnet msbuild' failed to evaluate '{csprojPath}': {(stdout + stderrTask.Result).Trim()}");
        }

        using var json = JsonDocument.Parse(stdout);
        var properties = json.RootElement.GetProperty("Properties");
        var rootNamespace = properties.GetProperty("RootNamespace").GetString();
        var assemblyName = properties.GetProperty("AssemblyName").GetString();
        var targetFramework = properties.GetProperty("TargetFramework").GetString() ?? "";
        var references = json.RootElement.TryGetProperty("Items", out var items) && items.TryGetProperty("ProjectReference", out var list)
            ? list.EnumerateArray().Select(item => item.GetProperty("FullPath").GetString()!).ToArray()
            : [];

        if (string.IsNullOrWhiteSpace(rootNamespace) || string.IsNullOrWhiteSpace(assemblyName))
            throw new InvalidOperationException($"Project '{csprojPath}' has no RootNamespace or AssemblyName.");

        return (rootNamespace, assemblyName, targetFramework, references);
    }

    private static string? FindBootstrapCss(string bootstrapDir) =>
        Directory.GetFiles(bootstrapDir, "*.css", SearchOption.AllDirectories)
            .OrderBy(f => f.EndsWith("bootstrap.min.css", StringComparison.OrdinalIgnoreCase) ? 0 : 1)
            .FirstOrDefault();
}
