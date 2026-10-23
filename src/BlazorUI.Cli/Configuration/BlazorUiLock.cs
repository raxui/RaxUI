using System.Text.Json;
using System.Text.Json.Serialization;
using BlazorUI.Cli.Project;
using BlazorUI.Cli.Registry;

namespace BlazorUI.Cli.Configuration;

public class BlazorUiLock
{
    public const string DefaultFileName = "blazorui.lock.json";
    public const int CurrentSchemaVersion = 1;

    [JsonPropertyName("schemaVersion")]
    public int SchemaVersion { get; set; } = CurrentSchemaVersion;

    [JsonPropertyName("registryVersion")]
    public string RegistryVersion { get; set; } = ReleaseIdentity.Version;

    [JsonPropertyName("components")]
    public Dictionary<string, LockedComponent> Components { get; set; } = new(StringComparer.OrdinalIgnoreCase);

    [JsonPropertyName("assets")]
    public Dictionary<string, LockedFile> Assets { get; set; } = new(StringComparer.OrdinalIgnoreCase);

    public static BlazorUiLock LoadOrCreate(string directory)
    {
        var path = Path.Combine(directory, DefaultFileName);
        ProjectPath.Validate(directory, path);
        if (!File.Exists(path))
            return new BlazorUiLock();

        var json = File.ReadAllText(path);
        var result = JsonSerializer.Deserialize<BlazorUiLock>(json, BlazorUiConfig.JsonOptions)
            ?? throw new InvalidOperationException("Lock file must be a JSON object.");
        if (result.SchemaVersion != CurrentSchemaVersion || result.RegistryVersion != ReleaseIdentity.Version)
            throw new InvalidOperationException("Lock file schema or registry version is incompatible with this CLI. Use the matching CLI version.");
        if (result.Components == null || result.Assets == null)
            throw new InvalidOperationException("Lock file components and assets must be objects.");
        return result;
    }

    public void Save(string directory)
    {
        var path = Path.Combine(directory, DefaultFileName);
        var json = JsonSerializer.Serialize(this, BlazorUiConfig.JsonOptions);
        File.WriteAllText(path, json + Environment.NewLine);
    }

    public LockedFile? FindTrackedFile(string relativePath)
    {
        var normalized = relativePath.Replace('\\', '/');

        if (Assets.TryGetValue(normalized, out var assetFile))
            return assetFile;

        foreach (var comp in Components.Values)
        {
            foreach (var file in comp.Files)
            {
                if (string.Equals(file.Target.Replace('\\', '/'), normalized, StringComparison.OrdinalIgnoreCase))
                    return file;
            }
        }

        return null;
    }
}

public class LockedComponent
{
    [JsonPropertyName("version")]
    public string Version { get; set; } = "";

    [JsonPropertyName("manifestSha256")]
    public string ManifestSha256 { get; set; } = "";

    [JsonPropertyName("files")]
    public List<LockedFile> Files { get; set; } = [];
}

public class LockedFile
{
    [JsonPropertyName("target")]
    public string Target { get; set; } = "";

    [JsonPropertyName("sourceHash")]
    public string SourceHash { get; set; } = "";

    [JsonPropertyName("installedHash")]
    public string InstalledHash { get; set; } = "";
}
