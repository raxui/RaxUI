using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using BlazorUI.Cli.Configuration;

namespace BlazorUI.Cli.Registry;

public class EmbeddedRegistry
{
    public const int SupportedSchemaVersion = 1;

    /// <summary>Destination of component files: <c>Components/UI/&lt;Folder&gt;/</c>.</summary>
    public const string ComponentsDestination = "components";

    /// <summary>Destination of starter files: the app's <c>Components/</c> folder (ADR 008).</summary>
    public const string AppDestination = "app";

    private const string ResourcePrefix = "BlazorUI.Cli.registry.";
    private static readonly HashSet<string> FileTypes = ["razor", "isolated-css"];

    private readonly Assembly _assembly = typeof(EmbeddedRegistry).Assembly;

    public RegistryIndex GetIndex()
    {
        var json = ReadResourceAsString("registry.json");
        var index = JsonSerializer.Deserialize<RegistryIndex>(json, BlazorUiConfig.JsonOptions)
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

    /// <summary>The starter layout and welcome page that <c>init</c> installs (ADR 008).</summary>
    public ComponentManifest GetStarterManifest() => LoadManifest("starter/manifest.json", AppDestination);

    private ComponentManifest LoadManifest(string manifestPath, string destination)
    {
        var bytes = GetResourceBytes(manifestPath);
        var manifest = JsonSerializer.Deserialize<ComponentManifest>(bytes, BlazorUiConfig.JsonOptions)
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

        foreach (var file in manifest.Files)
        {
            ValidatePathSafety(file.Source);
            ValidatePathSafety(file.Target);

            if (!FileTypes.Contains(file.Type))
                throw new InvalidOperationException($"Unsupported file type '{file.Type}' for '{file.Source}'.");

            if (file.Destination != destination)
                throw new InvalidOperationException($"Unsupported destination '{file.Destination}' for '{file.Source}'.");

            var segments = file.Target.Split('/');
            if (segments.Length != 2)
                throw new InvalidOperationException($"Target '{file.Target}' must have the form '<Folder>/<file>'.");

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

    public static string ComputeSha256(byte[] bytes) => Convert.ToHexStringLower(SHA256.HashData(bytes));

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
        var candidate = ResourcePrefix + normalized.Replace('/', '.');

        var existingNames = _assembly.GetManifestResourceNames();
        var match = existingNames.FirstOrDefault(n => string.Equals(n, candidate, StringComparison.OrdinalIgnoreCase));

        return match ?? candidate;
    }
}
