using RaxUI.Cli.Registry;

namespace RaxUI.Cli.Tests;

public class EmbeddedRegistryTests
{
    private readonly EmbeddedRegistry _registry = new();

    private static Func<string, ComponentManifest> Loader(params (string Name, string[] Dependencies)[] components) => name =>
    {
        var match = components.FirstOrDefault(c => string.Equals(c.Name, name, StringComparison.OrdinalIgnoreCase));
        if (match.Name is null)
            throw new KeyNotFoundException($"Component '{name}' was not found in registry.");
        return new ComponentManifest { Name = match.Name, Dependencies = [.. match.Dependencies] };
    };

    [Fact]
    public void ResolveOrder_puts_dependencies_first_and_each_component_once()
    {
        // form -> (input, field); input -> field: a diamond on field.
        var order = EmbeddedRegistry.ResolveOrder("form", Loader(("form", ["input", "field"]), ("input", ["field"]), ("field", [])));

        Assert.Equal(["field", "input", "form"], order.Select(m => m.Name));
    }

    [Fact]
    public void ResolveOrder_rejects_a_cycle()
    {
        var ex = Assert.Throws<InvalidOperationException>(() =>
            EmbeddedRegistry.ResolveOrder("a", Loader(("a", ["b"]), ("b", ["c"]), ("c", ["a"]))));

        Assert.Contains("Circular component dependency through 'a'", ex.Message);
    }

    [Fact]
    public void ResolveOrder_names_the_component_with_an_unknown_dependency()
    {
        var ex = Assert.Throws<InvalidOperationException>(() => EmbeddedRegistry.ResolveOrder("input", Loader(("input", ["field"]))));

        Assert.Equal("Component 'input' depends on unknown component 'field'.", ex.Message);
    }

    [Fact]
    public void ResolveOrder_keeps_the_unknown_component_error_for_the_requested_name()
    {
        Assert.Throws<KeyNotFoundException>(() => EmbeddedRegistry.ResolveOrder("nope", Loader(("input", []))));
    }

    [Fact]
    public void Every_shipped_component_resolves_with_itself_last()
    {
        foreach (var component in _registry.GetIndex().Components)
            Assert.Equal(component.Name, _registry.ResolveComponents(component.Name)[^1].Name);
    }

    [Fact]
    public void GetIndex_returns_valid_registry_index()
    {
        var index = _registry.GetIndex();

        Assert.Equal(1, index.SchemaVersion);
        Assert.Equal("RaxUI", index.Name);
        var version = new StringWriter();
        Program.Run(["--version"], Directory.GetCurrentDirectory(), version, TextWriter.Null);
        Assert.Equal(version.ToString().Trim().Split('+')[0], index.Version);
        Assert.Contains(index.Components, c => c.Name == "button");
    }

    [Fact]
    public void React_registry_is_not_embedded()
    {
        var names = typeof(EmbeddedRegistry).Assembly.GetManifestResourceNames();

        Assert.DoesNotContain(names, n => n.StartsWith("RaxUI.Cli.registry.react.", StringComparison.OrdinalIgnoreCase));
        Assert.Contains(names, n => n.StartsWith("RaxUI.Cli.registry.components.button.", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void Bundled_Bootstrap_is_5_3_and_matches_its_recorded_hash()
    {
        var bytes = _registry.GetResourceBytes(RaxUI.Cli.Commands.InitCommand.BundledBootstrapSource);

        Assert.Equal(RaxUI.Cli.Commands.InitCommand.BundledBootstrapSha256, EmbeddedRegistry.ComputeSha256(bytes));
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

    // Overlays ship a collocated JavaScript module (ADR 013); "dropdown-menu" also checks MSBuild's '-' to '_'
    // resource naming for folders.
    [Theory]
    [InlineData("tabs", "Tabs/Tabs.razor.js")]
    [InlineData("pagination", "Pagination/Pagination.razor.js")]
    [InlineData("form", "Form/Form.razor.js")]
    [InlineData("dialog", "Dialog/Dialog.razor.js")]
    [InlineData("confirm-dialog", "ConfirmDialog/ConfirmDialog.razor.js")]
    [InlineData("dropdown-menu", "DropdownMenu/DropdownMenu.razor.js")]
    [InlineData("popover", "Popover/Popover.razor.js")]
    [InlineData("calendar", "Calendar/Calendar.razor.js")]
    [InlineData("time-picker", "TimePicker/TimeWheel.razor.js")]
    [InlineData("date-time-input", "DateTimeInput/DateTimeInput.razor.js")]
    [InlineData("file-upload", "FileUpload/FileUpload.razor.js")]
    public void Overlay_manifests_load_with_their_javascript_module(string name, string module)
    {
        var manifest = _registry.GetComponentManifest(name);

        Assert.Contains(manifest.Files, f => f.Type == "js" && f.Target == module);
        if (name == "form") Assert.Empty(manifest.Assets);
        else
        {
            var asset = Assert.Single(manifest.Assets);
            Assert.Equal($"components/{name}.css", asset.Target);
            Assert.Equal(EmbeddedRegistry.ComputeSha256(_registry.GetResourceBytes(asset.Source)), asset.Sha256);
        }
    }

    [Theory]
    [InlineData("button")]
    [InlineData("field")]
    [InlineData("form")]
    [InlineData("form-section")]
    [InlineData("input")]
    [InlineData("input-group")]
    [InlineData("textarea")]
    [InlineData("checkbox")]
    [InlineData("radio-group")]
    [InlineData("switch")]
    [InlineData("select")]
    [InlineData("slider")]
    [InlineData("rating")]
    [InlineData("alert")]
    [InlineData("badge")]
    [InlineData("avatar")]
    [InlineData("card")]
    [InlineData("skeleton")]
    [InlineData("spinner")]
    [InlineData("progress")]
    [InlineData("table")]
    [InlineData("timeline")]
    [InlineData("tabs")]
    [InlineData("accordion")]
    [InlineData("breadcrumb")]
    [InlineData("pagination")]
    [InlineData("stepper")]
    [InlineData("toggle")]
    [InlineData("menu-toggle")]
    [InlineData("tooltip")]
    [InlineData("hover-card")]
    [InlineData("toast")]
    [InlineData("sheet")]
    [InlineData("drawer")]
    [InlineData("context-menu")]
    [InlineData("command")]
    [InlineData("date-input")]
    [InlineData("time-picker")]
    [InlineData("date-time-input")]
    [InlineData("date-range-input")]
    [InlineData("file-upload")]
    [InlineData("popover")]
    [InlineData("combobox")]
    [InlineData("autocomplete")]
    [InlineData("calendar")]
    [InlineData("date-picker")]
    [InlineData("date-range-picker")]
    [InlineData("qr-code")]
    [InlineData("carousel")]
    [InlineData("sortable")]
    [InlineData("kanban")]
    [InlineData("ai")]
    [InlineData("text-editor")]
    public void All_manifest_files_match_their_sha256_checksums(string name)
    {
        var manifest = _registry.GetComponentManifest(name);

        foreach (var file in manifest.Files)
        {
            var bytes = _registry.GetResourceBytes($"components/{name}/{file.Source}");
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
    public void Plain_CSharp_sources_are_hash_checked_and_accepted_in_components()
    {
        var manifest = _registry.GetComponentManifest("qr-code");
        Assert.Equal(2, manifest.Files.Count(file => file.Type == "cs"));
        Assert.All(manifest.Files.Where(file => file.Type == "cs"), file => Assert.EndsWith(".cs", file.Target));
        _registry.ValidateManifest(manifest);
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

    [Theory]
    [InlineData("styles/raxui.css", "raxui.css")]
    [InlineData("styles/components/dialog.css", "components/dialog.css")]
    [InlineData("styles/components/button.css", "button.css")]
    public void ValidateManifest_rejects_assets_outside_the_components_own_css(string source, string target)
    {
        var manifest = _registry.GetComponentManifest("button");
        manifest.Assets[0].Source = source;
        manifest.Assets[0].Target = target;
        var ex = Assert.Throws<InvalidOperationException>(() => _registry.ValidateManifest(manifest));
        Assert.Contains("Unsupported CSS asset path", ex.Message);
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
