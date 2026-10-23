using System.Text.Json;
using System.Text.Json.Serialization;
using BlazorUI.Cli.Project;
using BlazorUI.Cli.Registry;

namespace BlazorUI.Cli.Configuration;

public class BlazorUiConfig
{
    public const string DefaultFileName = "blazorui.json";
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
    public string StylesPath { get; set; } = "wwwroot/css/blazorui";

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

    public static BlazorUiConfig? Load(string directory)
    {
        var path = Path.Combine(directory, DefaultFileName);
        ProjectPath.Validate(directory, path);
        if (!File.Exists(path))
            return null;

        var json = File.ReadAllText(path);
        var config = JsonSerializer.Deserialize<BlazorUiConfig>(json, JsonOptions)
            ?? throw new InvalidOperationException("Configuration must be a JSON object.");
        if (config.SchemaVersion != CurrentSchemaVersion)
            throw new InvalidOperationException($"Unsupported configuration schema version {config.SchemaVersion}.");
        ReleaseIdentity.EnsureSupported(config.RegistryVersion, DefaultFileName);
        if (config.ComponentsPath != "Components/UI" || config.StylesPath != "wwwroot/css/blazorui")
            throw new InvalidOperationException("Custom paths are unsupported. Use componentsPath 'Components/UI' and stylesPath 'wwwroot/css/blazorui'.");
        if (config.Framework != "blazor" || config.TargetFramework != "net10.0" || config.Bootstrap == null || config.Bootstrap.Managed)
            throw new InvalidOperationException("Only net10.0 Blazor with template Bootstrap is supported.");
        return config;
    }

    public void Save(string directory)
    {
        var path = Path.Combine(directory, DefaultFileName);
        var json = JsonSerializer.Serialize(this, JsonOptions);
        File.WriteAllText(path, json + Environment.NewLine);
    }
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
}
