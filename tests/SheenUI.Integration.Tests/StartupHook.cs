using System.Diagnostics;
using System.Reflection;

/// <summary>
/// Test-only: CrashRecoveryTests loads this assembly into a real CLI process through DOTNET_STARTUP_HOOKS.
/// It kills that process right after the named filesystem operation; the CLI itself has no crash switch.
/// </summary>
internal static class StartupHook
{
    public static void Initialize()
    {
        var at = Environment.GetEnvironmentVariable("SHEENUI_TEST_CRASH_AT");
        var marker = Environment.GetEnvironmentVariable("SHEENUI_TEST_CRASH_MARKER");
        // Child processes such as 'dotnet msbuild' inherit the hook; only the CLI has a transaction to instrument.
        var transaction = Type.GetType("SheenUI.Cli.Commands.FileTransaction, SheenUI.Cli", throwOnError: false);
        if (at == null || marker == null || transaction == null)
            return;
        var separator = at.IndexOf(':');
        var (kind, target) = (at[..separator], at[(separator + 1)..]);
        Action<string, string> hook = (operation, path) =>
        {
            if (operation != kind || (target != "*" && !path.StartsWith(target, StringComparison.Ordinal)))
                return;
            File.WriteAllText(marker, $"{operation}:{path}");
            Process.GetCurrentProcess().Kill();
            Thread.Sleep(Timeout.Infinite);
        };
        transaction.GetField("s_afterOperation", BindingFlags.NonPublic | BindingFlags.Static)!.SetValue(null, hook);
    }
}
