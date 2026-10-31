using RaxUI.Cli.Project;
using RaxUI.Cli.Registry;

namespace RaxUI.Cli.Tests;

public class ReleaseIdentityTests
{
    [Theory]
    [InlineData("0.1.0", "0.1.0", 0)]
    [InlineData("0.1.0-preview.1", "0.1.0-preview.2", -1)]
    [InlineData("0.1.0-preview.10", "0.1.0-preview.2", 1)]
    [InlineData("0.1.0-preview.2", "0.1.0", -1)]
    [InlineData("0.1.0", "0.2.0-preview.1", -1)]
    [InlineData("1.0.0-alpha", "1.0.0-alpha.1", -1)]
    [InlineData("1.0.0-1", "1.0.0-alpha", -1)]
    [InlineData("1.0.0+abc", "1.0.0+def", 0)]
    [InlineData("1.10.0", "1.9.0", 1)]
    public void Compare_follows_semver_precedence(string a, string b, int expected)
    {
        Assert.Equal(expected, Math.Sign(ReleaseIdentity.Compare(a, b)));
    }

    [Theory]
    [InlineData("not-a-version")]
    [InlineData("1.0")]
    [InlineData("1.0.0.0")]
    public void Compare_rejects_invalid_versions(string version)
    {
        Assert.Throws<InvalidOperationException>(() => ReleaseIdentity.Compare(version, "1.0.0"));
    }

    [Fact]
    public void EnsureSupported_accepts_older_and_rejects_newer_versions()
    {
        ReleaseIdentity.EnsureSupported("0.0.1", "raxui.json");
        ReleaseIdentity.EnsureSupported(ReleaseIdentity.Version, "raxui.json");

        var ex = Assert.Throws<InvalidOperationException>(() => ReleaseIdentity.EnsureSupported("99.0.0", "raxui.json"));
        Assert.Contains("newer than this CLI", ex.Message);
    }

    [Fact]
    public void ProjectPath_accepts_deep_paths_without_links()
    {
        var root = Path.Combine(Path.GetTempPath(), "RaxUI_Deep_" + Guid.NewGuid().ToString("N"));
        var deep = Path.Combine([root, .. Enumerable.Repeat("a", 70), "file.txt"]);

        ProjectPath.Validate(root, deep);
    }
}
