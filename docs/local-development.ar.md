# استخدام RaxUI محلياً على Windows 11

العربية | [English](local-development.en.md)

هذا الدليل لتجربة المكتبة من المستودع على جهازك، دون نشر على npm أو NuGet.
نفّذ الأوامر في **PowerShell**. المسارات أدناه تفترض أن المستودع موجود في:

```text
C:\Users\saada\source\repos\RaxUI
```

غيّر المسارات إذا كان موقع المستودع مختلفاً. أوامر إنشاء التطبيقات مخصّصة
لمجلدات جديدة؛ إذا كان التطبيق موجوداً، انتقل إلى فقرة تثبيته مباشرة.

إذا بقي اسم مجلد نسختك المحلية `BlazorUI`، فاستخدم ذلك المسار بدلاً من
`RaxUI` في الأمثلة؛ لا يلزم نقل المجلد لاستخدام الأدوات الجديدة.

## 1. المتطلبات

- SDK الخاص بـ.NET 10 لبناء أدوات المستودع التي تستهدف .NET 8 و9 و10.
- لتشغيل تطبيق Blazor يستهدف .NET 8 أو9، ثبّت runtime/SDK المطابق أيضاً.
- Node.js 22 أو أحدث مع npm لتجربة React وNext.js.
- اتصال بالإنترنت لتنزيل الاعتماديات أول مرة. استخدام الحزمة المحلية لا يعني
  أن Bootstrap وReact وبقية الاعتماديات موجودة مسبقاً على الجهاز.

تحقق من الأدوات:

```powershell
dotnet --list-sdks
dotnet --list-runtimes
node --version
npm --version
```

المتاح حالياً: مكوّن **Button**، وثيم مشترك، وصفحة ترحيب، وأوامر `init` و`add button`.
المكتبة تنسخ ملفات المكونات إلى التطبيق، ويمكنك تعديلها بعد التثبيت.

## 2. تجهيز الحزم المحلية

نفّذ الخطوات 2 و3 في **نافذة PowerShell واحدة**، من نسخة المستودع التي تريد تجربتها.
ننشئ إصداراً محلياً مميزاً بالتاريخ والوقت لتجنب استخدام حزمة قديمة من الكاش؛
الخيار `-p:Version` لا يغيّر رقم الإصدار المحفوظ في ملف المشروع.

### إنشاء حزمة أداة Blazor

```powershell
$repo = "C:\Users\saada\source\repos\RaxUI"
$version = "0.1.0-local.$(Get-Date -Format yyyyMMddHHmmss)"
$tools = "$repo\local-tools\$version"

cd $repo

dotnet pack .\src\RaxUI.Cli\RaxUI.Cli.csproj `
  -c Release `
  -o .\nupkg `
  -p:Version=$version
```

### حزمة React وNext.js (لا تلزم لتجربة Blazor)

```powershell
cd C:\Users\saada\source\repos\RaxUI
npm ci
npm pack ./src/react-cli --pack-destination .
```

ينتج عن ذلك ملف حزمة .NET يحمل قيمة `$version` التي أنشأناها، وحزمة React
بالإصدار الحالي إذا نفّذت أوامرها:

```text
RaxUI\nupkg\RaxUI.<version>.nupkg
RaxUI\raxui-react-0.1.0-preview.1.tgz
```

هذه أوامر إنشاء حزم محلية فقط. لا تستخدم `npm publish` أو `dotnet nuget push`.
أوامر Blazor التالية تستخدم قيمة `$version` نفسها. إذا تغيّر إصدار أداة React،
استخدم اسم ملف `.tgz` الناتج فعلياً في خطوات تثبيتها.

## 3. تجربة Blazor

### تثبيت الإصدار المحلي الجديد

```powershell
cd $repo

dotnet tool install RaxUI `
  --tool-path "$tools" `
  --add-source "$repo\nupkg" `
  --version "$version"
```

تُثبّت الأداة داخل `local-tools/<version>` في المستودع، وليست أداة عامة على الجهاز.
لكل بناء جديد أعد خطوة إنشاء الحزمة ثم تثبيت إصدارها في النافذة نفسها؛ لا تحتاج
إلى إزالة إصدار سابق. يمكنك أيضاً التشغيل من المصدر كما في القسم 7.

### إنشاء تطبيق تجريبي

```powershell
cd C:\Users\saada\source\repos
dotnet new blazor -n RaxDemo --framework net10.0 --interactivity Server
cd RaxDemo
```

لتجربة .NET 8 أو9 غيّر `net10.0` إلى `net8.0` أو `net9.0`، مع توافر متطلباته.
الدعم الحالي لتطبيقات **Blazor Web App مع Interactive Server**.

### التثبيت داخل تطبيق جديد أو موجود

انتقل إلى المجلد الذي يحتوي ملف التطبيق `.csproj`، ثم نفّذ:

```powershell
& "$tools\raxui.exe" init
& "$tools\raxui.exe" add button
dotnet build
dotnet run
```

افتح رابط `localhost` الظاهر في الطرفية. ستظهر صفحة الترحيب واختيار الألوان
الدائري ومعاينة الأزرار. `init` يجهّز الثيم والليّاوت وصفحة الترحيب،
وينظّف ملفات القالب المعروفة غير المعدّلة، بما فيها `app.css` الافتراضي.
الملفات التي عدّلتها تُحفظ وتظهر ملاحظة عنها.

ستجد المكوّن في `Components/UI/Button/Button.razor`، والثيم في
`wwwroot/css/raxui/raxui.css`.

### استخدام Button

أنشئ صفحة مثل `Components/Pages/ButtonTest.razor`:

```razor
@page "/button-test"
@rendermode InteractiveServer

<Button OnClick="@(() => count++)">عدد الضغطات: @count</Button>
<Button Variant="outline" Color="success">زر إضافي</Button>

@code {
    private int count;
}
```

افتح `/button-test`. إذا ظهر تنبيه التفاعلية أثناء `init`، فتأكد من وجود:

```csharp
builder.Services.AddRazorComponents().AddInteractiveServerComponents();
app.MapRazorComponents<App>().AddInteractiveServerRenderMode();
```

في `Program.cs` أضف الاستدعاءات الناقصة إلى التسجيل والربط الموجودين؛ لا تكررهما.
الأداة تطبع التنبيه ولا تعدّل `Program.cs` بنفسها.

### WebAssembly و Auto

كل أوضاع الرندر مدعومة: Static SSR و Server و WebAssembly و Auto. في تطبيق أُنشئ
بـ `--interactivity WebAssembly` أو `Auto`، شغّل `init` و `add` داخل مشروع
السيرفر (المجلد الذي فيه `Components/App.razor`)، لا داخل مشروع `.Client`.
تُنسخ المكونات إلى `SampleApp.Client/Components/UI` ليشغّلها المتصفح، وتُضاف
`@using` إلى `_Imports.razor` في المشروعين، وتبقى الأنماط والإعدادات في مشروع السيرفر.

## 4. تجربة React مع Vite

القالب التالي يستخدم TypeScript وإصداراً مجرّباً من أداة إنشاء Vite:

```powershell
cd C:\Users\saada\source\repos
npm create vite@6.5.0 react-test -- --template react-ts
cd react-test
npm install
```

لتثبيت المكتبة، سواء في هذا التطبيق أو في تطبيق Vite 6+ موجود:

```powershell
npm install -D --save-exact --ignore-scripts "C:\Users\saada\source\repos\RaxUI\raxui-react-0.1.0-preview.1.tgz"
npx @raxui/react init
npm run dev
```

افتح الرابط الظاهر في الطرفية، وعادةً يكون `http://localhost:5173`.
`init` يثبّت Button تلقائياً؛ تشغيل `npx @raxui/react add button` بعده لا يضيف
نسخة أخرى.

الملفات الرئيسية التي تنسخها المكتبة:

```text
src/App.tsx                         صفحة الترحيب والليّاوت
src/components/ui/button.tsx         المكوّن
src/lib/theme.tsx                    مزوّد الثيم
src/styles/raxui.scss             نقطة تجميع الأنماط
src/styles/raxui/                 ملفات الثيم والمكونات
```

للتأكد من بناء التطبيق:

```powershell
npm run build
```

## 5. تجربة Next.js

المتطلبات: **Next.js 15+، وApp Router، وTypeScript، وبدون Tailwind**.
هذا مثال بإصدار مجرّب:

```powershell
cd C:\Users\saada\source\repos
npx create-next-app@15.5.28 next-test --ts --app --no-tailwind --eslint --no-src-dir --import-alias "@/*" --use-npm --yes
cd next-test
```

ثم داخل التطبيق:

```powershell
npm install -D --save-exact --ignore-scripts "C:\Users\saada\source\repos\RaxUI\raxui-react-0.1.0-preview.1.tgz"
npx @raxui/react init
npm run dev
```

افتح الرابط الظاهر، وعادةً يكون `http://localhost:3000`.
المكتبة تكتشف Next.js تلقائياً وتستخدم:

```text
app/page.tsx                       صفحة الترحيب
app/layout.tsx                     إضافة استيراد الثيم إلى الليّاوت الموجود
components/ui/button.tsx           المكوّن
lib/theme.tsx                      مزوّد الثيم
styles/raxui.scss               نقطة تجميع الأنماط
```

عند استخدام خيار `--src-dir` تكون هذه الملفات تحت `src/` بدلاً من جذر التطبيق.
لا تستورد Bootstrap CSS مرة أخرى؛ المكتبة تجمعه من SCSS.

للتحقق من نسخة الإنتاج، أوقف خادم التطوير بـ`Ctrl+C` ثم نفّذ:

```powershell
npm run build
npm run start
```

## 6. تجربة الثيم واستخدام المكوّن

صفحة الترحيب تحتوي خيارات `default` و`flat` و`glass`، والوضعين الفاتح والداكن،
وألوان الثيم، واتجاهي LTR وRTL. جرّبها قبل البدء بتعديل الصفحة.

هذا مثال React يمكن وضعه في `src/App.tsx` في Vite، أو `app/page.tsx` في Next.js
الذي أنشأناه دون `src/`:

```tsx
"use client"

// في Next.js استخدم ../components/ui/button و../lib/theme بدلاً من ./
import { Button } from "./components/ui/button"
import { RaxThemeProvider } from "./lib/theme"

export default function App() {
  return (
    <RaxThemeProvider className="rax-app" mode="dark" appearance="glass" direction="rtl">
      <Button onClick={() => alert("تم الحفظ")}>حفظ</Button>
      <Button variant="outline" appearance="flat">إلغاء</Button>
    </RaxThemeProvider>
  )
}
```

في Blazor يمكنك استخدام خصائص HTML على حاوية المكوّن:

```razor
<div data-bs-theme="dark" data-rax-appearance="glass" dir="rtl">
    <Button>حفظ</Button>
</div>
```

خلفية صفحة الترحيب الداكنة سوداء مع تدرجات الزوايا. لتثبيت إعدادات الصفحة
عدّل الحاوية `.rax-app` في الليّاوت الخاص بـBlazor، أو قيم الحالة في صفحة React.

## 7. تجربة تحديثات المكتبة أثناء التطوير

**تحديث الأداة لا يحدّث ملفات المكونات المثبّتة تلقائياً.** أصبح Blazor يدعم
الأمر `update` لتطبيق تغييرات المكتبة صراحةً. أما React وNext.js فيحتاجان إلى
تطبيق تجريبي منفصل أو دمج يدوي بعد مراجعة الفروقات.

### Blazor: تحديث تطبيق مثبّت

بعد إعادة بناء أنماط المكتبة كما هو موضح أدناه، نفّذ من مستودع RaxUI:

```powershell
cd C:\Users\saada\source\repos\RaxUI
dotnet run --project .\src\RaxUI.Cli -c Release -f net10.0 -- update --dry-run --cwd "C:\Users\saada\source\repos\RaxDemo"
dotnet run --project .\src\RaxUI.Cli -c Release -f net10.0 -- update --cwd "C:\Users\saada\source\repos\RaxDemo"
dotnet build ..\RaxDemo\RaxDemo.csproj
```

استخدم `update button` لتحديث مكوّن واحد مع اعتمادياته. يتحدّث الثيم المشترك
في الحالتين. يجب أن تكون نسخة الأداة مساوية أو أحدث من النسخة المسجلة في ملف
القفل؛ استخدم رقم إصدار جديدًا عند إصدار نسخة جديدة من المكتبة.

يحافظ الأمر على صفحات الديمو والتخطيط و`app.css` وBootstrap. يحتفظ بالتعديلات
المحلية إذا لم يتغيّر الملف في المكتبة. إذا تغيّر الملف في الجهتين، يتوقف
التحديث كاملًا قبل الكتابة ويعرض التعارضات. احفظ تعديلاتك جانبًا، واستعد النسخة
المثبّتة السابقة، ثم حدّث وأعد تطبيق تعديلاتك؛ أو استبدل الملف بمصدره الجديد
المطابق للمكتبة ثم أعد المحاولة.
لا تحذف `raxui.lock.json`؛ فهو أساس المقارنة. لا يوجد خيار لفرض الاستبدال.

### Blazor: تشغيل الأداة مباشرة من المصدر

هذا يتجاوز نسخة الأداة المثبّتة سابقاً ومشاكل تخزين حزمة بنفس رقم الإصدار:

```powershell
cd C:\Users\saada\source\repos\RaxUI
dotnet run --project .\src\RaxUI.Cli -c Release -f net10.0 -- init --cwd "C:\Users\saada\source\repos\blazor-test-new"
dotnet run --project .\src\RaxUI.Cli -c Release -f net10.0 -- add button --cwd "C:\Users\saada\source\repos\blazor-test-new"
```

يجب أن يكون التطبيق الجديد موجوداً قبل تشغيل هذه الأوامر.

### React وNext.js: إعادة تجهيز الحزمة

```powershell
cd C:\Users\saada\source\repos\RaxUI
npm pack ./src/react-cli --pack-destination .
```

بعد ذلك استخدم أوامر التثبيت والتهيئة داخل التطبيق التجريبي الجديد.
إعادة إنشاء ملف `.tgz` وحدها لا تغيّر أي تطبيق ثُبّتت فيه الحزمة سابقاً.

### عند تعديل الثيم داخل مستودع المكتبة

المصدر المشترك في `theme/scss/`. بعد تغييره:

```powershell
cd C:\Users\saada\source\repos\RaxUI
npm run theme:css
node src/react-cli/scripts/update-hashes.mjs
```

الأمر الأول يعيد توليد CSS الخاص بـBlazor، والثاني يحدّث بصمات ملفات React.
يلزم أيضاً تحديث SHA-256 لأصل CSS في `registry/blazor/components/button/manifest.json`
قبل اختبار أداة Blazor، ثم إعادة بناء الأداة أو تشغيلها من المصدر.
لا تعدّل CSS الناتج وحده كحل دائم؛ أعد توليده من SCSS.

## 8. التحذيرات والمشاكل الشائعة

| الحالة | الإجراء |
| --- | --- |
| ظهور `DEP0190` أثناء `init` | أعد تجهيز الحزمة من المصدر المحدّث وثبّتها في التطبيق؛ الإصلاح يشغّل npm عبر Node دون shell على Windows. |
| رسائل إهمال Sass من Bootstrap | الأداة المحدّثة تضيف إعدادات توافق للقوالب البسيطة. هذه معالجة مؤقتة لفئات التحذيرات المعروفة، وليست ترقية لكود Bootstrap. تبقى أخطاء Sass والتحذيرات الأخرى فعّالة. |
| Next.js يختار مجلد المستخدم بسبب ملف قفل آخر | في القالب البسيط تضبط التهيئة `turbopack.root` و`outputFileTracingRoot`. لا تحذف ملف قفل خارج التطبيق لمجرد إخفاء الرسالة. |
| الأداة تقول إنها احتفظت بملف إعداد مخصّص | ادمج الإعدادات يدوياً كما في [دليل React](react.md#tooling-diagnostics). الأداة لا تخمّن كيفية تعديل إعداداتك. |
| خطأ عن ملفات من إصدار سابق أو ملفات معدّلة | لا تحذف ملف القفل لتجاوز الحماية. اختبر في تطبيق جديد، أو راجع التغييرات وادمجها يدوياً مع نسخة احتياطية. |
| التطبيق يعمل لكن الشكل مختلف | تحقق من استيراد ثيم المكتبة مرة واحدة، وعدم تكرار Bootstrap CSS، ومن عدم بقاء أنماط قالب أو تخصيصات تتجاوز الثيم. |
| زر Blazor يظهر ولا يستجيب | تحقق من Interactive Server وتفعيل render mode للصفحة أو التطبيق. |

إعدادات توافق Sass تنطبق على فئات التحذيرات المحددة في كامل بناء التطبيق،
بما فيها SCSS الخاص بك. راجع [التفاصيل والقيود](react.md#tooling-diagnostics)،
خصوصاً عند استخدام monorepo أو حزم مرتبطة خارج جذر تطبيق Next.js.

## 9. قائمة تحقق قبل اعتماد التجربة

لفحص المستودع أثناء التطوير استخدم `npm run check`، وقبل دمج التغييرات استخدم
`npm run check:full`. راجع [دليل أدوات الفحص المحلي](local-checks.ar.md).

- ينجح `dotnet build` أو `npm run build`.
- تظهر صفحة الترحيب وتعمل خيارات الثيم.
- يعمل الزر عند الضغط عليه.
- تعمل المظاهر الثلاثة في الوضعين الفاتح والداكن واتجاه RTL.
- لا تؤدي إعادة `init` و`add button` بالنسخة نفسها إلى تكرار الاستيرادات.
- تعرف أن المكونات أصبحت ملفات داخل التطبيق، وأن تحديث الأداة وحده لا يحدّثها.

للتفاصيل الإضافية: [الموقع الرسمي](https://raxui.com/)، و[README](../README.md)، و[React](react.md)،
و[الثيم المشترك](../theme/README.md).
