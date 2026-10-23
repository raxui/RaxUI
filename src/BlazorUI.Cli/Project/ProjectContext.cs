using System.Diagnostics;
using System.Text.Json;

namespace BlazorUI.Cli.Project;

public class ProjectContext
{
    public required string RootDirectory { get; init; }
    public required string ProjectFilePath { get; init; }
    public required string ProjectName { get; init; }
    public required string RootNamespace { get; init; }
    public required string AssemblyName { get; init; }
    public required string AppRazorPath { get; init; }
    public required string ImportsRazorPath { get; init; }
    public required string BootstrapCssRelativePath { get; init; }

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

        var (rootNamespace, assemblyName) = EvaluateMsBuildProperties(csprojPath);

        // Verify Bootstrap existence per ADR 004
        var bootstrapDir = Path.Combine(workingDirectory, "wwwroot", "lib", "bootstrap");
        if (!Directory.Exists(bootstrapDir))
        {
            throw new InvalidOperationException(
                $"Bootstrap was not found in 'wwwroot/lib/bootstrap/'. BlazorUI requires template Bootstrap to initialize. " +
                "Ensure your project was created with 'dotnet new blazor'.");
        }

        var bootstrapCss = FindBootstrapCssRelative(workingDirectory, bootstrapDir);
        if (bootstrapCss == null)
        {
            throw new InvalidOperationException(
                $"No Bootstrap CSS file found under 'wwwroot/lib/bootstrap/'.");
        }

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
            ProjectFilePath = csprojPath,
            ProjectName = projectName,
            RootNamespace = rootNamespace,
            AssemblyName = assemblyName,
            AppRazorPath = appRazor,
            ImportsRazorPath = importsRazor,
            BootstrapCssRelativePath = bootstrapCss
        };
    }

    /// <summary>
    /// Reads the evaluated RootNamespace and AssemblyName, so values from Directory.Build.props
    /// and SDK defaults are honored (ADR 003), instead of parsing the .csproj XML.
    /// </summary>
    private static (string RootNamespace, string AssemblyName) EvaluateMsBuildProperties(string csprojPath)
    {
        var startInfo = new ProcessStartInfo("dotnet")
        {
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            WorkingDirectory = Path.GetDirectoryName(csprojPath)!,
        };
        foreach (var arg in new[] { "msbuild", csprojPath, "-getProperty:RootNamespace", "-getProperty:AssemblyName" })
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

        if (string.IsNullOrWhiteSpace(rootNamespace) || string.IsNullOrWhiteSpace(assemblyName))
            throw new InvalidOperationException($"Project '{csprojPath}' has no RootNamespace or AssemblyName.");

        return (rootNamespace, assemblyName);
    }

    private static string? FindBootstrapCssRelative(string root, string bootstrapDir)
    {
        var candidates = Directory.GetFiles(bootstrapDir, "*.css", SearchOption.AllDirectories)
            .OrderBy(f => f.Contains("bootstrap.min.css", StringComparison.OrdinalIgnoreCase) ? 0 : 1)
            .ToList();

        if (candidates.Count == 0)
            return null;

        var fullPath = candidates[0];
        var wwwrootDir = Path.Combine(root, "wwwroot");
        if (fullPath.StartsWith(wwwrootDir, StringComparison.OrdinalIgnoreCase))
        {
            return Path.GetRelativePath(wwwrootDir, fullPath).Replace('\\', '/');
        }

        return Path.GetRelativePath(root, fullPath).Replace('\\', '/');
    }
}
