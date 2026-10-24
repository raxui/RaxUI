using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using SheenUI.Cli.Configuration;

namespace SheenUI.Cli.Registry;

public class EmbeddedRegistry
{
    public const int SupportedSchemaVersion = 1;

    /// <summary>Destination of component files: <c>Components/UI/&lt;Folder&gt;/</c>.</summary>
    public const string ComponentsDestination = "components";

    /// <summary>Destination of starter files: the app's <c>Components/</c> folder (ADR 008).</summary>
    public const string AppDestination = "app";

    private const string DefaultResourcePrefix = "SheenUI.Cli.registry.";

    // Allowed file types and target depth per destination: components go to Components/UI/<Folder>/, with
    // collocated .razor.js modules for overlays (ADR 013); the starter writes Components/<Folder>/ pages and
    // the app's wwwroot/app.css (ADR 008).
    private static readonly Dictionary<string, (string[] Types, int Segments)> ComponentRules = new()
    {
        [ComponentsDestination] = (["razor", "isolated-css", "js"], 2),
    };
    private static readonly Dictionary<string, (string[] Types, int Segments)> StarterRules = new()
    {
        [AppDestination] = (["razor"], 2),
        ["wwwroot"] = (["css"], 1),
    };

    private readonly Assembly _assembly;
    private readonly string _resourcePrefix;

    public EmbeddedRegistry() : this(typeof(EmbeddedRegistry).Assembly, DefaultResourcePrefix)
    {
    }

    /// <summary>A registry embedded in another assembly, for example a test registry.</summary>
    public EmbeddedRegistry(Assembly assembly, string resourcePrefix)
    {
        _assembly = assembly;
        _resourcePrefix = resourcePrefix;
    }

    public RegistryIndex GetIndex()
    {
        var json = ReadResourceAsString("registry.json");
        var index = JsonSerializer.Deserialize<RegistryIndex>(json, SheenUiConfig.JsonOptions)
                    ?? throw new InvalidOperationException("Failed to deserialize registry index.");

        if (index.SchemaVersion != SupportedSchemaVersion)
        {
            throw new InvalidOperationException(
                $"Unsupported registry schema version {index.SchemaVersion}. This CLI supports version {SupportedSchemaVersion}.");
        }

        // The package is the immutable registry release (ADR 004).
        index.Version = ReleaseIdentity.Version;
        return index;
    }

    public ComponentManifest GetComponentManifest(string componentName)
    {
        var index = GetIndex();
        var item = index.Components.FirstOrDefault(c => string.Equals(c.Name, componentName, StringComparison.OrdinalIgnoreCase))
                   ?? throw new KeyNotFoundException(
                       $"Component '{componentName}' was not found in registry. Available: {string.Join(", ", index.Components.Select(c => c.Name))}.");

        return LoadManifest(item.Manifest, ComponentsDestination);
    }

    /// <summary>
    /// The component and everything it depends on, dependencies first, each once; the same order as the
    /// React CLI's <c>resolveItems</c>.
    /// </summary>
    public List<ComponentManifest> ResolveComponents(string componentName) => ResolveOrder(componentName, GetComponentManifest);

    public static List<ComponentManifest> ResolveOrder(string componentName, Func<string, ComponentManifest> load)
    {
        var resolved = new List<ComponentManifest>();
        Resolve(componentName, requiredBy: null, new HashSet<string>(StringComparer.OrdinalIgnoreCase), resolved, load);
        return resolved;
    }

    private static void Resolve(string name, string? requiredBy, HashSet<string> visiting, List<ComponentManifest> resolved,
        Func<string, ComponentManifest> load)
    {
        if (resolved.Any(m => string.Equals(m.Name, name, StringComparison.OrdinalIgnoreCase)))
            return;
        if (!visiting.Add(name))
            throw new InvalidOperationException($"Circular component dependency through '{name}'.");

        ComponentManifest manifest;
        try
        {
            manifest = load(name);
        }
        catch (KeyNotFoundException) when (requiredBy is not null)
        {
            throw new InvalidOperationException($"Component '{requiredBy}' depends on unknown component '{name}'.");
        }

        foreach (var dependency in manifest.Dependencies)
            Resolve(dependency, manifest.Name, visiting, resolved, load);

        visiting.Remove(name);
        resolved.Add(manifest);
    }

    /// <summary>The starter layout and welcome page that <c>init</c> installs (ADR 008).</summary>
    public ComponentManifest GetStarterManifest() => LoadManifest("starter/manifest.json", AppDestination);

    private ComponentManifest LoadManifest(string manifestPath, string destination)
    {
        var bytes = GetResourceBytes(manifestPath);
        var manifest = JsonSerializer.Deserialize<ComponentManifest>(bytes, SheenUiConfig.JsonOptions)
                       ?? throw new InvalidOperationException($"Failed to deserialize manifest '{manifestPath}'.");

        manifest.ManifestSha256 = ComputeSha256(bytes);
        manifest.SourceDirectory = manifestPath[..manifestPath.LastIndexOf('/')];
        ValidateManifest(manifest, destination);
        return manifest;
    }

    /// <summary>
    /// Rejects unsupported schema versions, file types, destinations, unsafe paths, and hash mismatches
    /// before any file is written.
    /// </summary>
    public void ValidateManifest(ComponentManifest manifest, string destination = ComponentsDestination)
    {
        if (manifest.SchemaVersion != SupportedSchemaVersion)
        {
            throw new InvalidOperationException(
                $"Unsupported manifest schema version {manifest.SchemaVersion} for '{manifest.Name}'. This CLI supports version {SupportedSchemaVersion}.");
        }

        if (manifest.Files.Count == 0)
            throw new InvalidOperationException($"Manifest for '{manifest.Name}' declares no files.");

        var folders = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var rules = destination == ComponentsDestination ? ComponentRules : StarterRules;

        foreach (var file in manifest.Files)
        {
            ValidatePathSafety(file.Source);
            ValidatePathSafety(file.Target);

            if (!rules.TryGetValue(file.Destination, out var rule))
                throw new InvalidOperationException($"Unsupported destination '{file.Destination}' for '{file.Source}'.");

            if (!rule.Types.Contains(file.Type))
                throw new InvalidOperationException($"Unsupported file type '{file.Type}' for '{file.Source}'.");

            var segments = file.Target.Split('/');
            if (segments.Length != rule.Segments)
            {
                throw new InvalidOperationException(rule.Segments == 2
                    ? $"Target '{file.Target}' must have the form '<Folder>/<file>'."
                    : $"Target '{file.Target}' must be a file name.");
            }

            folders.Add(segments[0]);
            VerifyHash($"{manifest.SourceDirectory}/{file.Source}", file.Sha256);
        }

        // A component lives in one folder; the starter spans Layout/ and Pages/.
        if (destination == ComponentsDestination && folders.Count != 1)
            throw new InvalidOperationException($"All files of '{manifest.Name}' must target one component folder.");

        foreach (var asset in manifest.Assets)
        {
            ValidatePathSafety(asset.Source);
            ValidatePathSafety(asset.Target);

            if (asset.Type != "css" || asset.Destination != "styles")
                throw new InvalidOperationException($"Unsupported asset '{asset.Source}' (type '{asset.Type}', destination '{asset.Destination}').");

            VerifyHash(asset.Source, asset.Sha256);
        }
    }

    public byte[] GetResourceBytes(string relativePath)
    {
        ValidatePathSafety(relativePath);
        var resourceName = ResolveResourceName(relativePath);

        using var stream = _assembly.GetManifestResourceStream(resourceName)
                           ?? throw new FileNotFoundException($"Embedded resource '{resourceName}' not found.");

        using var ms = new MemoryStream();
        stream.CopyTo(ms);
        return ms.ToArray();
    }

    public string ReadResourceAsString(string relativePath)
    {
        var bytes = GetResourceBytes(relativePath);
        return Encoding.UTF8.GetString(bytes);
    }

    public static string ComputeSha256(byte[] bytes) => Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant();

    public static void ValidatePathSafety(string path)
    {
        if (string.IsNullOrWhiteSpace(path))
            throw new ArgumentException("Path cannot be empty.", nameof(path));

        if (Path.IsPathRooted(path) || path.StartsWith('/') || path.StartsWith('\\'))
            throw new ArgumentException($"Rooted paths are not allowed: '{path}'", nameof(path));

        var segments = path.Split('/', '\\');
        if (segments.Any(s => s == ".."))
            throw new ArgumentException($"Directory traversal is not allowed: '{path}'", nameof(path));
    }

    private void VerifyHash(string resourcePath, string expected)
    {
        var actual = ComputeSha256(GetResourceBytes(resourcePath));
        if (!string.Equals(expected, actual, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                $"Manifest integrity check failed for '{resourcePath}'. Expected hash '{expected}', but got '{actual}'.");
        }
    }

    private string ResolveResourceName(string relativePath)
    {
        var normalized = relativePath.Replace('\\', '/').TrimStart('/');
        // MSBuild names embedded resources with '-' in folder names as '_' (components/dropdown-menu/ -> dropdown_menu).
        var slash = normalized.LastIndexOf('/');
        if (slash >= 0)
            normalized = normalized[..slash].Replace('-', '_') + normalized[slash..];
        var candidate = _resourcePrefix + normalized.Replace('/', '.');

        var existingNames = _assembly.GetManifestResourceNames();
        var match = existingNames.FirstOrDefault(n => string.Equals(n, candidate, StringComparison.OrdinalIgnoreCase));

        return match ?? candidate;
    }
}
