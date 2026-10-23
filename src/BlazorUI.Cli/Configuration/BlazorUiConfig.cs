using System.Text.Json;
using System.Text.Json.Serialization;

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
    public string RegistryVersion { get; set; } = "0.1.0";

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
        if (!File.Exists(path))
            return null;

        var json = File.ReadAllText(path);
        return JsonSerializer.Deserialize<BlazorUiConfig>(json, JsonOptions);
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
