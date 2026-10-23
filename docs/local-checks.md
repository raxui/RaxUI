# Local verification / الفحص المحلي

[الدليل العربي الكامل](local-checks.ar.md) | English

During the current solo development phase, local verification is the default.
GitHub Actions is optional and manual; existing hosted-runner failures do not
represent the outcome of these local commands.

## Prerequisites

- Node.js 22+ and npm.
- .NET 10 SDK, plus the .NET 8/9 runtimes/SDKs for full Blazor application tests.
- PowerShell 7 (`pwsh`) for the full suite's Blazor browser installer.
- Run `npm ci` once from the repository root, and again after dependency changes.
- Internet access for initial restore and for the full suite, which creates real
  Vite/Next.js applications and downloads their dependencies and Chromium.
- A Git checkout. Paths are resolved from the script, so spaces in the checkout
  path are supported.

## Commands

```powershell
cd C:\Users\saada\source\repos\SheenUI
npm ci

# During development
npm run check

# Before merging a PR
npm run check:full
```

If the checkout directory is still called `BlazorUI`, use its actual path.
Neither command publishes packages or changes consumer applications. Both stop
on the first failed command and return a nonzero exit code. A successful run ends
with `[check] PASS`; do not treat partial output as a pass.

| Coverage | `check` | `check:full` |
| --- | --- | --- |
| Generated shared CSS freshness | Yes | Yes |
| TypeScript types | Yes | Yes |
| React, Node CLI, theme, registry tests and hashes | Yes | Yes |
| .NET 8/9/10 CLI build and C# formatting | Yes | Yes |
| .NET unit and integration tests without browser E2E | Yes | Yes |
| Real Blazor application/browser tests on .NET 8, 9, 10 | No | Yes |
| Local NuGet package creation | No | Yes |
| Real Vite applications: create-vite 6.5.0, 7.1.3, 9.3.1 | No | Yes |
| Real Next.js applications: 15.5.28, 16.4.3 | No | Yes |
| Diff whitespace check | Yes | Yes |

Acceptance suites run sequentially because each packs the same React CLI. The
full command sets the tested scaffolder versions explicitly, without changing
your parent terminal's environment. Packages and build outputs stay local; test
applications are temporary. Browser downloads remain in the normal Playwright
cache. On Linux, install the required browser system dependencies separately.

## Before merging

Run `npm run check:full` on the exact source you intend to merge. Resolve failures
and rerun affected checks. Include the local result and any skipped tests in the
PR description. A Windows pass verifies Windows behavior; use the manual GitHub
matrix later to verify Linux before a public release. Local checks are a developer
procedure, not an enforced server-side merge gate.

Once the workflow change is merged, pushes, pull requests, and version tags do
not trigger hosted jobs. You may run **Actions → CI → Run workflow** when desired;
normal GitHub Actions quotas still apply. Old failed checks remain visible on
earlier commits. If required checks are configured in future, review that policy
before relying on manual/local verification.

Release is also manual. Its `publish` input defaults to false. Explicitly enabling
it requires selecting an existing `v*` tag; it does not publish from branches.
There is no publication step in `check` or `check:full`.

## بالعربية

- أثناء التطوير: شغّل `npm run check`.
- قبل دمج أي PR: شغّل `npm run check:full`.
- نفّذ `npm ci` أول مرة وبعد تغيّر الاعتماديات، وتأكد من وجود الأدوات المذكورة أعلاه.
- الأمر السريع يستثني اختبارات المتصفح الخاصة بتطبيقات Blazor؛ الأمر الكامل
  يشملها، ويختبر إصدارات Vite وNext.js المدعومة واحداً تلو الآخر.
- عند الفشل يتوقف الأمر ويعيد رمز خروج غير صفري. انتظر ظهور `[check] PASS`
  قبل اعتبار الفحص ناجحاً.
- لا يتم نشر أي حزمة. الأمر الكامل ينشئ الحزم والتطبيقات التجريبية محلياً فقط.
- بعد دمج تعديل ملفات workflow، تصبح فحوصات GitHub يدوية من **Actions → CI → Run workflow**.
  قد تبقى الفحوصات القديمة حمراء؛ لا تعني أن الفحص المحلي الجديد فشل.
- هذه آلية عمل للمطور وليست شرط دمج مفروضاً من الخادم. قبل النشر العام نعيد
  التحقق على Linux أيضاً، لأن نجاح Windows وحده لا يثبت التوافق معه.
