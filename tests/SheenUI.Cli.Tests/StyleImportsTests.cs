using System.Text;
using SheenUI.Cli.Commands;
using SheenUI.Cli.Configuration;
using SheenUI.Cli.Registry;

namespace SheenUI.Cli.Tests;

public class StyleImportsTests
{
    private static byte[] Core => Encoding.UTF8.GetBytes(StyleImports.Start + StyleImports.End + ":root { --token: 1; }\n");

    [Fact]
    public void Appends_once_in_dependency_order_before_core_and_is_idempotent()
    {
        var result = StyleImports.Append(Core, ["components/input.css", "components/field.css", "components/input.css"]);
        Assert.Equal(StyleImports.Start + "@import url(\"components/input.css\");\n@import url(\"components/field.css\");\n" +
            StyleImports.End + ":root { --token: 1; }\n", Encoding.UTF8.GetString(result));
        Assert.Equal(result, StyleImports.Append(result, ["components/input.css", "components/field.css"]));
        Assert.Equal(Core, StyleImports.Append(Core, []));
    }

    [Fact]
    public void Verifies_the_installed_hash_and_unchanged_core()
    {
        var installed = StyleImports.Append(Core, ["starter.css"]);
        var tracked = new LockedFile { InstalledHash = EmbeddedRegistry.ComputeSha256(installed) };
        StyleImports.Verify(installed, tracked, Core);
        Assert.Throws<InvalidOperationException>(() => StyleImports.Verify(Core, tracked, Core));
        Assert.Throws<InvalidOperationException>(() => StyleImports.Verify(installed, null, Core));
        Assert.Throws<InvalidOperationException>(() => StyleImports.Verify(installed, tracked, Encoding.UTF8.GetBytes("other core")));
    }

    [Fact]
    public void Updates_core_retaining_unrelated_imports_and_adding_and_removing_component_assets()
    {
        var installed = StyleImports.Append(Core, ["starter.css", "components/old.css", "components/other.css"]);
        var tracked = new LockedFile { InstalledHash = EmbeddedRegistry.ComputeSha256(installed) };
        var next = Encoding.UTF8.GetBytes(StyleImports.Start + StyleImports.End + ":root { --token: 2; }\n");
        var result = StyleImports.UpdateCore(installed, tracked, next, ["components/new.css"], ["components/old.css"]);
        Assert.Equal(StyleImports.Append(next, ["starter.css", "components/other.css", "components/new.css"]), result);
        Assert.Throws<InvalidOperationException>(() => StyleImports.UpdateCore(Core, tracked, next, [], []));
        Assert.Throws<InvalidOperationException>(() => StyleImports.UpdateCore(installed, null, next, [], []));
    }
}
