using BlazorUI.Cli.Registry;

namespace BlazorUI.Cli.Tests;

public class EmbeddedRegistryTests
{
    private readonly EmbeddedRegistry _registry = new();

    [Fact]
    public void GetIndex_returns_valid_registry_index()
    {
        var index = _registry.GetIndex();

        Assert.Equal(1, index.SchemaVersion);
        Assert.Equal("BlazorUI", index.Name);
        var version = new StringWriter();
        Program.Run(["--version"], Directory.GetCurrentDirectory(), version, TextWriter.Null);
        Assert.Equal(version.ToString().Trim().Split('+')[0], index.Version);
        Assert.Contains(index.Components, c => c.Name == "button");
    }

    [Fact]
    public void React_registry_is_not_embedded()
    {
        var names = typeof(EmbeddedRegistry).Assembly.GetManifestResourceNames();

        Assert.DoesNotContain(names, n => n.StartsWith("BlazorUI.Cli.registry.react.", StringComparison.OrdinalIgnoreCase));
        Assert.Contains(names, n => n.StartsWith("BlazorUI.Cli.registry.components.button.", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void Bundled_Bootstrap_is_5_3_and_matches_its_recorded_hash()
    {
        var bytes = _registry.GetResourceBytes(BlazorUI.Cli.Commands.InitCommand.BundledBootstrapSource);

        Assert.Equal(BlazorUI.Cli.Commands.InitCommand.BundledBootstrapSha256, EmbeddedRegistry.ComputeSha256(bytes));
        Assert.Matches(@"Bootstrap\s+v5\.3\.", System.Text.Encoding.UTF8.GetString(bytes, 0, 200));
    }

    [Fact]
    public void GetComponentManifest_returns_valid_button_manifest()
    {
        var manifest = _registry.GetComponentManifest("button");

        Assert.Equal(1, manifest.SchemaVersion);
        Assert.Equal("button", manifest.Name);
        Assert.NotEmpty(manifest.Files);
        Assert.NotEmpty(manifest.Assets);
    }

    [Fact]
    public void All_manifest_files_match_their_sha256_checksums()
    {
        var manifest = _registry.GetComponentManifest("button");

        foreach (var file in manifest.Files)
        {
            var bytes = _registry.GetResourceBytes($"components/button/{file.Source}");
            var hash = EmbeddedRegistry.ComputeSha256(bytes);
            Assert.Equal(file.Sha256, hash);
        }

        foreach (var asset in manifest.Assets)
        {
            var bytes = _registry.GetResourceBytes(asset.Source);
            var hash = EmbeddedRegistry.ComputeSha256(bytes);
            Assert.Equal(asset.Sha256, hash);
        }
    }

    [Fact]
    public void ComputeSha256_is_plain_sha256_of_the_bytes()
    {
        Assert.Equal(
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
            EmbeddedRegistry.ComputeSha256("abc"u8.ToArray()));

        // Line endings are part of the content, not normalized away
        Assert.NotEqual(
            EmbeddedRegistry.ComputeSha256("a\r\n"u8.ToArray()),
            EmbeddedRegistry.ComputeSha256("a\n"u8.ToArray()));
    }

    [Fact]
    public void ValidateManifest_rejects_unsupported_schema_version()
    {
        var manifest = _registry.GetComponentManifest("button");
        manifest.SchemaVersion = 2;

        var ex = Assert.Throws<InvalidOperationException>(() => _registry.ValidateManifest(manifest));
        Assert.Contains("schema version", ex.Message);
    }

    [Fact]
    public void ValidateManifest_rejects_unknown_file_type()
    {
        var manifest = _registry.GetComponentManifest("button");
        manifest.Files[0].Type = "script";

        var ex = Assert.Throws<InvalidOperationException>(() => _registry.ValidateManifest(manifest));
        Assert.Contains("Unsupported file type", ex.Message);
    }

    [Fact]
    public void ValidateManifest_rejects_unknown_destination()
    {
        var manifest = _registry.GetComponentManifest("button");
        manifest.Files[0].Destination = "wwwroot";

        var ex = Assert.Throws<InvalidOperationException>(() => _registry.ValidateManifest(manifest));
        Assert.Contains("Unsupported destination", ex.Message);
    }

    [Theory]
    [InlineData("../Button.razor")]
    [InlineData("/Button/Button.razor")]
    public void ValidateManifest_rejects_unsafe_target(string target)
    {
        var manifest = _registry.GetComponentManifest("button");
        manifest.Files[0].Target = target;

        Assert.Throws<ArgumentException>(() => _registry.ValidateManifest(manifest));
    }

    [Fact]
    public void ValidateManifest_rejects_hash_mismatch()
    {
        var manifest = _registry.GetComponentManifest("button");
        manifest.Files[0].Sha256 = new string('0', 64);

        var ex = Assert.Throws<InvalidOperationException>(() => _registry.ValidateManifest(manifest));
        Assert.Contains("integrity check failed", ex.Message);
    }

    [Fact]
    public void GetComponentManifest_records_manifest_digest()
    {
        var manifest = _registry.GetComponentManifest("button");

        Assert.Equal(
            EmbeddedRegistry.ComputeSha256(_registry.GetResourceBytes("components/button/manifest.json")),
            manifest.ManifestSha256);
    }

    [Theory]
    [InlineData("../escape.css")]
    [InlineData("foo/../../bar")]
    [InlineData("/absolute/path")]
    public void ValidatePathSafety_throws_on_invalid_paths(string path)
    {
        Assert.Throws<ArgumentException>(() => EmbeddedRegistry.ValidatePathSafety(path));
    }
}
