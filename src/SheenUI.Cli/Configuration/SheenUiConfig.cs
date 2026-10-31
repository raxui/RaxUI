using System.Text.Json;
using System.Text.Json.Serialization;
using SheenUI.Cli.Project;
using SheenUI.Cli.Registry;

namespace SheenUI.Cli.Configuration;

public class SheenUiConfig
{
    public const string DefaultFileName = "sheenui.json";
    public const int CurrentSchemaVersion = 1;

    [JsonPropertyName("schemaVersion")]
    public int SchemaVersion { get; set; } = CurrentSchemaVersion;

    [JsonPropertyName("framework")]
    public string Framework { get; set; } = "blazor";

    [JsonPropertyName("targetFramework")]
    public string TargetFramework { get; set; } = "net10.0";

    [JsonPropertyName("registryVersion")]
    public string RegistryVersion { get; set; } = ReleaseIdentity.Version;

    [JsonPropertyName("componentsPath")]
    public string ComponentsPath { get; set; } = "Components/UI";

    [JsonPropertyName("stylesPath")]
    public string StylesPath { get; set; } = "wwwroot/css/sheenui";

    [JsonPropertyName("bootstrap")]
    public BootstrapConfig Bootstrap { get; set; } = new();

    [JsonPropertyName("theme")]
    public ThemeConfig Theme { get; set; } = new();

    public static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public static SheenUiConfig? Load(string directory)
    {
        var path = Path.Combine(directory, DefaultFileName);
        ProjectPath.Validate(directory, path);
        if (!File.Exists(path))
            return null;

        var json = File.ReadAllText(path);
        var config = JsonSerializer.Deserialize<SheenUiConfig>(json, JsonOptions)
            ?? throw new InvalidOperationException("Configuration must be a JSON object.");
        if (config.SchemaVersion != CurrentSchemaVersion)
            throw new InvalidOperationException($"Unsupported configuration schema version {config.SchemaVersion}.");
        ReleaseIdentity.EnsureSupported(config.RegistryVersion, DefaultFileName);
        if (config.ComponentsPath != "Components/UI" || config.StylesPath != "wwwroot/css/sheenui")
            throw new InvalidOperationException("Custom paths are unsupported. Use componentsPath 'Components/UI' and stylesPath 'wwwroot/css/sheenui'.");
        if (config.Framework != "blazor" || !ProjectContext.SupportedTargetFrameworks.Contains(config.TargetFramework) ||
            config.Bootstrap == null || config.Bootstrap.Managed)
        {
            throw new InvalidOperationException(
                $"Only Blazor on {string.Join(", ", ProjectContext.SupportedTargetFrameworks)} with template Bootstrap is supported.");
        }
        return config;
    }

    public string ToJson() => JsonSerializer.Serialize(this, JsonOptions) + Environment.NewLine;

    public void Save(string directory) => File.WriteAllText(Path.Combine(directory, DefaultFileName), ToJson());
}

public class BootstrapConfig
{
    [JsonPropertyName("managed")]
    public bool Managed { get; set; } = false;

    [JsonPropertyName("version")]
    public string? Version { get; set; }
}

public class ThemeConfig
{
    [JsonPropertyName("default")]
    public string Default { get; set; } = "light";

    [JsonPropertyName("darkMode")]
    public bool DarkMode { get; set; } = true;

    [JsonPropertyName("rtl")]
    public bool Rtl { get; set; } = false;

    // data-sheen-appearance on <html>: default | flat | glass.
    [JsonPropertyName("appearance")]
    public string Appearance { get; set; } = "default";

    // data-sheen-accent on <html>: emerald | indigo | amber; null is the default Bootstrap blue.
    [JsonPropertyName("accent")]
    public string? Accent { get; set; }
}
