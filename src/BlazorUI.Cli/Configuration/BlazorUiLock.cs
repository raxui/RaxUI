using System.Text.Json;
using System.Text.Json.Serialization;

namespace BlazorUI.Cli.Configuration;

public class BlazorUiLock
{
    public const string DefaultFileName = "blazorui.lock.json";
    public const int CurrentSchemaVersion = 1;

    [JsonPropertyName("schemaVersion")]
    public int SchemaVersion { get; set; } = CurrentSchemaVersion;

    [JsonPropertyName("registryVersion")]
    public string RegistryVersion { get; set; } = "0.1.0";

    [JsonPropertyName("components")]
    public Dictionary<string, LockedComponent> Components { get; set; } = new(StringComparer.OrdinalIgnoreCase);

    [JsonPropertyName("assets")]
    public Dictionary<string, LockedFile> Assets { get; set; } = new(StringComparer.OrdinalIgnoreCase);

    public static BlazorUiLock LoadOrCreate(string directory)
    {
        var path = Path.Combine(directory, DefaultFileName);
        if (!File.Exists(path))
            return new BlazorUiLock();

        var json = File.ReadAllText(path);
        return JsonSerializer.Deserialize<BlazorUiLock>(json, BlazorUiConfig.JsonOptions) ?? new BlazorUiLock();
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
