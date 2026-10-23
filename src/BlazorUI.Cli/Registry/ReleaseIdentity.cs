using System.Reflection;

namespace BlazorUI.Cli.Registry;

public static class ReleaseIdentity
{
    public static string Version { get; } = typeof(ReleaseIdentity).Assembly
        .GetCustomAttributes<AssemblyMetadataAttribute>()
        .Single(a => a.Key == "RegistryVersion").Value!;
}
