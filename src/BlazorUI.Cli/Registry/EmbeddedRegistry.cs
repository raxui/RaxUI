using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using BlazorUI.Cli.Configuration;

namespace BlazorUI.Cli.Registry;

public class EmbeddedRegistry
{
    private const string ResourcePrefix = "BlazorUI.Cli.registry.";
    private readonly Assembly _assembly = typeof(EmbeddedRegistry).Assembly;

    public RegistryIndex GetIndex()
    {
        var json = ReadResourceAsString("registry.json");
        return JsonSerializer.Deserialize<RegistryIndex>(json, BlazorUiConfig.JsonOptions)
               ?? throw new InvalidOperationException("Failed to deserialize registry index.");
    }

    public ComponentManifest GetComponentManifest(string componentName)
    {
        var index = GetIndex();
        var item = index.Components.FirstOrDefault(c => string.Equals(c.Name, componentName, StringComparison.OrdinalIgnoreCase))
                   ?? throw new KeyNotFoundException($"Component '{componentName}' was not found in registry.");

        var json = ReadResourceAsString(item.Manifest);
        return JsonSerializer.Deserialize<ComponentManifest>(json, BlazorUiConfig.JsonOptions)
               ?? throw new InvalidOperationException($"Failed to deserialize manifest for '{componentName}'.");
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

    public static string ComputeSha256(byte[] bytes)
    {
        // Normalize CRLF to LF so checksums are deterministic across OSes and editors
        try
        {
            var text = Encoding.UTF8.GetString(bytes);
            if (text.Contains('\r'))
            {
                text = text.Replace("\r\n", "\n").Replace('\r', '\n');
                bytes = Encoding.UTF8.GetBytes(text);
            }
        }
        catch
        {
            // If binary file cannot be decoded as UTF-8, use original bytes
        }

        var hash = SHA256.HashData(bytes);
        return Convert.ToHexStringLower(hash);
    }

    public static void ValidatePathSafety(string path)
    {
        if (string.IsNullOrWhiteSpace(path))
            throw new ArgumentException("Path cannot be empty.", nameof(path));

        if (Path.IsPathRooted(path))
            throw new ArgumentException($"Rooted paths are not allowed: '{path}'", nameof(path));

        var segments = path.Split('/', '\\');
        if (segments.Any(s => s == ".."))
            throw new ArgumentException($"Directory traversal is not allowed: '{path}'", nameof(path));
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
