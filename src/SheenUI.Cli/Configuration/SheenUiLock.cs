using System.Text.Json;
using System.Text.Json.Serialization;
using SheenUI.Cli.Project;
using SheenUI.Cli.Registry;

namespace SheenUI.Cli.Configuration;

public class SheenUiLock
{
    public const string DefaultFileName = "sheenui.lock.json";
    public const int CurrentSchemaVersion = 1;

    [JsonPropertyName("schemaVersion")]
    public int SchemaVersion { get; set; } = CurrentSchemaVersion;

    [JsonPropertyName("registryVersion")]
    public string RegistryVersion { get; set; } = ReleaseIdentity.Version;

    [JsonPropertyName("components")]
    public Dictionary<string, LockedComponent> Components { get; set; } = new(StringComparer.OrdinalIgnoreCase);

    [JsonPropertyName("assets")]
    public Dictionary<string, LockedFile> Assets { get; set; } = new(StringComparer.OrdinalIgnoreCase);

    public static SheenUiLock LoadOrCreate(string directory)
    {
        var path = Path.Combine(directory, DefaultFileName);
        ProjectPath.Validate(directory, path);
        if (!File.Exists(path))
            return new SheenUiLock();

        var json = File.ReadAllText(path);
        var result = JsonSerializer.Deserialize<SheenUiLock>(json, SheenUiConfig.JsonOptions)
            ?? throw new InvalidOperationException("Lock file must be a JSON object.");
        if (result.SchemaVersion != CurrentSchemaVersion)
            throw new InvalidOperationException($"Unsupported lock file schema version {result.SchemaVersion}.");
        ReleaseIdentity.EnsureSupported(result.RegistryVersion, DefaultFileName);
        if (result.Components == null || result.Assets == null)
            throw new InvalidOperationException("Lock file components and assets must be objects.");
        return result;
    }

    public void Save(string directory)
    {
        var path = Path.Combine(directory, DefaultFileName);
        var json = JsonSerializer.Serialize(this, SheenUiConfig.JsonOptions);
        File.WriteAllText(path, json + Environment.NewLine);
    }

    /// <summary>
    /// Refuses to replace a tracked file with different registry content: that is an update,
    /// which needs the explicit 'update' workflow, not a silent overwrite by 'init' or 'add'.
    /// </summary>
    public void EnsureSameSource(string relativePath, string newSourceHash)
    {
        var tracked = FindTrackedFile(relativePath);
        if (tracked != null && !string.Equals(tracked.SourceHash, newSourceHash, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                $"'{relativePath}' was installed from another registry release and differs from this CLI's version. " +
                "Run 'sheenui update --dry-run' to review changes, then 'sheenui update' to apply them safely.");
        }
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

    [JsonPropertyName("registryVersion")]
    public string RegistryVersion { get; set; } = "";

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
