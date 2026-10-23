using System.Diagnostics;
using System.Text.Json;

namespace BlazorUI.Cli.Project;

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
    public required string ImportsRazorPath { get; init; }

    public static ProjectContext Detect(string workingDirectory)
    {
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

        var (rootNamespace, assemblyName, targetFramework) = EvaluateMsBuildProperties(csprojPath);
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
            throw new InvalidOperationException(
                $"Bootstrap was not found in '{string.Join("' or '", BootstrapFolders)}'. BlazorUI requires template Bootstrap to initialize. " +
                "Ensure your project was created with 'dotnet new blazor'.");
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

        // Imports _Imports.razor
        var importsRazor = Path.Combine(workingDirectory, "Components", "_Imports.razor");
        if (!File.Exists(importsRazor))
        {
            importsRazor = Path.Combine(workingDirectory, "_Imports.razor");
            if (!File.Exists(importsRazor))
            {
                // Created on first 'add'
                importsRazor = Path.Combine(workingDirectory, "Components", "_Imports.razor");
            }
        }

        return new ProjectContext
        {
            RootDirectory = workingDirectory,
            TargetFramework = targetFramework,
            ProjectFilePath = csprojPath,
            ProjectName = projectName,
            RootNamespace = rootNamespace,
            AssemblyName = assemblyName,
            AppRazorPath = appRazor,
            ImportsRazorPath = importsRazor,
            BootstrapCssPath = bootstrapCss
        };
    }

    /// <summary>
    /// Reads the evaluated RootNamespace and AssemblyName, so values from Directory.Build.props
    /// and SDK defaults are honored (ADR 003), instead of parsing the .csproj XML.
    /// </summary>
    private static (string RootNamespace, string AssemblyName, string TargetFramework) EvaluateMsBuildProperties(string csprojPath)
    {
        var startInfo = new ProcessStartInfo("dotnet")
        {
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            WorkingDirectory = Path.GetDirectoryName(csprojPath)!,
        };
        foreach (var arg in new[] { "msbuild", csprojPath, "-getProperty:RootNamespace", "-getProperty:AssemblyName", "-getProperty:TargetFramework" })
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

        if (string.IsNullOrWhiteSpace(rootNamespace) || string.IsNullOrWhiteSpace(assemblyName))
            throw new InvalidOperationException($"Project '{csprojPath}' has no RootNamespace or AssemblyName.");

        return (rootNamespace, assemblyName, targetFramework);
    }

    private static string? FindBootstrapCss(string bootstrapDir) =>
        Directory.GetFiles(bootstrapDir, "*.css", SearchOption.AllDirectories)
            .OrderBy(f => f.EndsWith("bootstrap.min.css", StringComparison.OrdinalIgnoreCase) ? 0 : 1)
            .FirstOrDefault();
}
