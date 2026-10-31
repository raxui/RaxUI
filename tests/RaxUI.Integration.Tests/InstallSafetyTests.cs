using System.Text.Json.Nodes;
using RaxUI.Cli;

namespace RaxUI.Integration.Tests;

public class InstallSafetyTests : IDisposable
{
    private readonly string _root = Path.Combine(Path.GetTempPath(), "RaxUI_Safety_" + Guid.NewGuid().ToString("N"));
    private string App => Path.Combine(_root, "App");

    public InstallSafetyTests()
    {
        Directory.CreateDirectory(Path.Combine(App, "Components"));
        Directory.CreateDirectory(Path.Combine(App, "wwwroot/lib/bootstrap"));
        File.WriteAllText(Path.Combine(App, "Sample.csproj"), "<Project Sdk=\"Microsoft.NET.Sdk.Web\"><PropertyGroup><TargetFramework>net10.0</TargetFramework></PropertyGroup></Project>");
        File.WriteAllText(Path.Combine(App, "Components/App.razor"), "<link rel=\"stylesheet\" href=\"lib/bootstrap/bootstrap.min.css\" />\n");
        File.WriteAllText(Path.Combine(App, "Components/_Imports.razor"), "@using Microsoft.AspNetCore.Components.Web\n");
        File.WriteAllText(Path.Combine(App, "wwwroot/lib/bootstrap/bootstrap.min.css"), "/* fixture */");
    }

    private (int Code, string Error) Run(params string[] args)
    {
        var error = new StringWriter();
        return (Program.Run(args, App, new StringWriter(), error), error.ToString());
    }

    [Theory]
    [InlineData("componentsPath", "../Outside")]
    [InlineData("componentsPath", "Components/Custom")]
    [InlineData("stylesPath", "../Outside")]
    [InlineData("registryVersion", "99.0.0")]
    [InlineData("registryVersion", "not-a-version")]
    [InlineData("schemaVersion", "999")]
    public void Invalid_configuration_is_rejected_without_writes(string field, string value)
    {
        Assert.Equal(0, Run("init").Code);
        var path = Path.Combine(App, "raxui.json");
        var config = JsonNode.Parse(File.ReadAllText(path))!;
        config[field] = field == "schemaVersion" ? JsonValue.Create(int.Parse(value)) : JsonValue.Create(value);
        File.WriteAllText(path, config.ToJsonString());
        var before = InstallationWorkflowTests.SnapshotFiles(_root);
        Assert.Equal(1, Run("init").Code);
        Assert.Equal(1, Run("add", "button").Code);
        Assert.Equal(before, InstallationWorkflowTests.SnapshotFiles(_root));
        Assert.False(Directory.Exists(Path.Combine(_root, "Outside")));
    }

    [Theory]
    [InlineData("schemaVersion", "999")]
    [InlineData("registryVersion", "99.0.0")]
    public void Incompatible_lock_is_rejected_without_writes(string field, string value)
    {
        Assert.Equal(0, Run("init").Code);
        var path = Path.Combine(App, "raxui.lock.json");
        var data = JsonNode.Parse(File.ReadAllText(path))!;
        data[field] = field == "schemaVersion" ? JsonValue.Create(int.Parse(value)) : JsonValue.Create(value);
        File.WriteAllText(path, data.ToJsonString());
        var before = InstallationWorkflowTests.SnapshotFiles(App);
        Assert.Equal(1, Run("init").Code);
        Assert.Equal(1, Run("add", "button").Code);
        Assert.Equal(before, InstallationWorkflowTests.SnapshotFiles(App));
    }

    [Fact]
    public void Project_from_an_older_cli_accepts_new_components_and_records_this_version()
    {
        Assert.Equal(0, Run("init").Code);
        foreach (var name in new[] { "raxui.json", "raxui.lock.json" })
        {
            var path = Path.Combine(App, name);
            var data = JsonNode.Parse(File.ReadAllText(path))!;
            data["registryVersion"] = "0.0.1";
            File.WriteAllText(path, data.ToJsonString());
        }

        var result = Run("add", "button");

        Assert.True(result.Code == 0, result.Error);
        var version = RaxUI.Cli.Registry.ReleaseIdentity.Version;
        Assert.Equal(version, JsonNode.Parse(File.ReadAllText(Path.Combine(App, "raxui.json")))!["registryVersion"]!.GetValue<string>());
        var lockData = JsonNode.Parse(File.ReadAllText(Path.Combine(App, "raxui.lock.json")))!;
        Assert.Equal(version, lockData["registryVersion"]!.GetValue<string>());
        Assert.Equal(version, lockData["components"]!["button"]!["registryVersion"]!.GetValue<string>());
    }

    [Theory]
    [InlineData("init")]
    [InlineData("add")]
    public void Tracked_file_from_another_release_is_not_silently_updated(string command)
    {
        Assert.Equal(0, Run("init").Code);
        Assert.Equal(0, Run("add", "button").Code);

        // Simulate files installed from an older release whose registry content differed.
        var lockPath = Path.Combine(App, "raxui.lock.json");
        var data = JsonNode.Parse(File.ReadAllText(lockPath))!;
        var file = command == "init"
            ? data["assets"]!["wwwroot/css/raxui/raxui.css"]!
            : data["components"]!["button"]!["files"]![0]!;
        file["sourceHash"] = new string('0', 64);
        File.WriteAllText(lockPath, data.ToJsonString());
        var before = InstallationWorkflowTests.SnapshotFiles(App);

        var result = command == "init" ? Run("init") : Run("add", "button");

        Assert.Equal(1, result.Code);
        Assert.Contains("raxui update --dry-run", result.Error);
        Assert.Equal(before, InstallationWorkflowTests.SnapshotFiles(App));
    }

    [Theory]
    [InlineData("Components/UI", "add")]
    [InlineData("wwwroot/css/raxui", "init")]
    public void Directory_link_escape_is_rejected_before_writes(string relative, string command)
    {
        if (command == "add") Assert.Equal(0, Run("init").Code);
        var outside = Path.Combine(_root, "Outside");
        Directory.CreateDirectory(outside);
        var link = Path.Combine(App, relative);
        Directory.CreateDirectory(Path.GetDirectoryName(link)!);
        if (OperatingSystem.IsWindows())
        {
            // Junctions require no symlink privilege on Windows.
            using var process = System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo("cmd.exe")
            {
                Arguments = $"/c mklink /J \"{link}\" \"{outside}\"",
                UseShellExecute = false,
                RedirectStandardOutput = true,
                CreateNoWindow = true,
            })!;
            process.WaitForExit();
            Assert.Equal(0, process.ExitCode);
        }
        else Directory.CreateSymbolicLink(link, outside);
        try
        {
            var result = command == "add" ? Run("add", "button") : Run("init");
            Assert.Equal(1, result.Code);
            Assert.Contains("escapes", result.Error);
            Assert.Empty(Directory.GetFileSystemEntries(outside));
        }
        finally { Directory.Delete(link); }
    }

    [Fact]
    public void Failed_add_restores_files_and_removes_only_new_directories()
    {
        Assert.Equal(0, Run("init").Code);
        Directory.CreateDirectory(Path.Combine(App, "Components/UI"));
        // A directory at the imports path forces failure after component writes on every OS.
        File.Delete(Path.Combine(App, "Components/_Imports.razor"));
        Directory.CreateDirectory(Path.Combine(App, "Components/_Imports.razor"));
        var before = InstallationWorkflowTests.SnapshotFiles(App);
        Assert.Equal(1, Run("add", "button").Code);
        Assert.Equal(before, InstallationWorkflowTests.SnapshotFiles(App));
        Assert.False(Directory.Exists(Path.Combine(App, "Components/UI/Button")));
        Assert.True(Directory.Exists(Path.Combine(App, "Components/UI")));
    }

    [UnixTheory]
    [InlineData("Components/App.razor", "init")]
    [InlineData("Components/_Imports.razor", "add")]
    [InlineData("raxui.json", "init")]
    [InlineData("raxui.lock.json", "add")]
    public void File_link_escape_leaves_external_file_unchanged(string relative, string command)
    {
        Assert.Equal(0, Run("init").Code);
        var path = Path.Combine(App, relative);
        var outside = Path.Combine(_root, "outside-file");
        File.Move(path, outside);
        var original = File.ReadAllBytes(outside);
        File.CreateSymbolicLink(path, outside);
        try
        {
            var result = command == "add" ? Run("add", "button") : Run("init");
            Assert.Equal(1, result.Code);
            Assert.Contains("escapes", result.Error);
            Assert.Equal(original, File.ReadAllBytes(outside));
            Assert.False(Directory.Exists(Path.Combine(App, "Components/UI")));
        }
        finally { File.Delete(path); }
    }

    public void Dispose() => Directory.Delete(_root, recursive: true);
}

public sealed class UnixTheoryAttribute : TheoryAttribute
{
    public UnixTheoryAttribute()
    {
        if (OperatingSystem.IsWindows())
            Skip = "File symlinks require Windows privileges; directory escapes are tested with junctions on Windows.";
    }
}
