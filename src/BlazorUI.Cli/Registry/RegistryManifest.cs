using System.Text.Json.Serialization;

namespace BlazorUI.Cli.Registry;

public class RegistryIndex
{
    [JsonPropertyName("schemaVersion")]
    public int SchemaVersion { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = "";

    [JsonPropertyName("version")]
    public string Version { get; set; } = "";

    [JsonPropertyName("components")]
    public List<RegistryComponentRef> Components { get; set; } = [];
}

public class RegistryComponentRef
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = "";

    [JsonPropertyName("manifest")]
    public string Manifest { get; set; } = "";
}

public class ComponentManifest
{
    [JsonPropertyName("schemaVersion")]
    public int SchemaVersion { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = "";

    [JsonPropertyName("version")]
    public string Version { get; set; } = "";

    [JsonPropertyName("description")]
    public string Description { get; set; } = "";

    [JsonPropertyName("dependencies")]
    public List<string> Dependencies { get; set; } = [];

    [JsonPropertyName("assets")]
    public List<ManifestAsset> Assets { get; set; } = [];

    [JsonPropertyName("files")]
    public List<ManifestFile> Files { get; set; } = [];

    /// <summary>SHA-256 of the manifest resource itself; recorded in the lock file.</summary>
    [JsonIgnore]
    public string ManifestSha256 { get; set; } = "";
}

public class ManifestAsset
{
    [JsonPropertyName("source")]
    public string Source { get; set; } = "";

    [JsonPropertyName("destination")]
    public string Destination { get; set; } = "";

    [JsonPropertyName("target")]
    public string Target { get; set; } = "";

    [JsonPropertyName("type")]
    public string Type { get; set; } = "";

    [JsonPropertyName("sha256")]
    public string Sha256 { get; set; } = "";
}

public class ManifestFile
{
    [JsonPropertyName("source")]
    public string Source { get; set; } = "";

    [JsonPropertyName("destination")]
    public string Destination { get; set; } = "";

    [JsonPropertyName("target")]
    public string Target { get; set; } = "";

    [JsonPropertyName("type")]
    public string Type { get; set; } = "";

    [JsonPropertyName("sha256")]
    public string Sha256 { get; set; } = "";
}
