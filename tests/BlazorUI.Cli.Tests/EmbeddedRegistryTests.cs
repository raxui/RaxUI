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
        Assert.Contains(index.Components, c => c.Name == "button");
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

    [Theory]
    [InlineData("../escape.css")]
    [InlineData("foo/../../bar")]
    [InlineData("/absolute/path")]
    public void ValidatePathSafety_throws_on_invalid_paths(string path)
    {
        Assert.Throws<ArgumentException>(() => EmbeddedRegistry.ValidatePathSafety(path));
    }
}
