using System.Xml.Linq;

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

        var xml = XDocument.Load(csprojPath);
        var rootNamespace = xml.Descendants("RootNamespace").FirstOrDefault()?.Value?.Trim();
        if (string.IsNullOrEmpty(rootNamespace))
            rootNamespace = projectName;

        var assemblyName = xml.Descendants("AssemblyName").FirstOrDefault()?.Value?.Trim();
        if (string.IsNullOrEmpty(assemblyName))
            assemblyName = rootNamespace;

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
                // Create if missing or throw
                var componentsDir = Path.Combine(workingDirectory, "Components");
                Directory.CreateDirectory(componentsDir);
                importsRazor = Path.Combine(componentsDir, "_Imports.razor");
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
