# الفحص المحلي على Linux وWSL 2

هذا الدليل لتشغيل اختبارات RaxUI داخل **Ubuntu 24.04**، سواء كانت توزيعة
Linux مستقلة أو تعمل على Windows عبر WSL 2. يكمّل
[دليل أدوات الفحص المحلي](local-checks.ar.md) الذي يشرح تغطية الاختبارات وقراءة نتائجها.

## 1. تجهيز WSL على Windows

تجاوز هذه الخطوة إذا كنت تستخدم Linux مباشرة أو لديك Ubuntu جاهزة بالفعل.
من PowerShell بصلاحية المسؤول:

```powershell
wsl --install -d Ubuntu-24.04
```

أعد تشغيل Windows إذا طلب المثبّت ذلك، ثم افتح Ubuntu من Start وأنشئ مستخدم
Linux وكلمة مروره. تحقق من PowerShell:

```powershell
wsl --list --verbose
```

يجب أن تظهر `Ubuntu-24.04` وبجانبها `VERSION 2`.
إذا كنت داخل Ubuntu، فاستخدم `wsl.exe --list --verbose` لاستدعاء أداة Windows.

مرجع: [تثبيت WSL من Microsoft](https://learn.microsoft.com/en-us/windows/wsl/install).

## 2. الأدوات داخل Ubuntu

ثبت هذه الأدوات **داخل Linux**؛ وجودها على Windows وحده لا يكفي:

- Git وcurl وشهادات النظام.
- Node.js 22 مع npm؛ يمكن إدارة Node باستخدام nvm.
- .NET SDK 11، وSDKs ورنتايمات .NET 8 و9 و10 لتوليد التطبيقات واختبارها.
- PowerShell 7، بأمر `pwsh`، لتثبيت متصفح اختبارات .NET.

```bash
sudo apt update
sudo apt install -y git curl ca-certificates
```

مراجع التثبيت: [Node عبر nvm](https://github.com/nvm-sh/nvm#installing-and-updating)،
[.NET على Ubuntu](https://learn.microsoft.com/en-us/dotnet/core/install/linux-ubuntu)،
[PowerShell على Ubuntu](https://learn.microsoft.com/en-us/powershell/scripting/install/install-ubuntu).

عند استخدام nvm، حمّله في الجلسة الحالية ثم تحقق:

```bash
source ~/.nvm/nvm.sh
node --version
npm --version
command -v node
command -v npm
dotnet --list-sdks
dotnet --list-runtimes
pwsh --version
git --version
```

يجب أن تكون مسارات Node وnpm من Linux، مثل
`/home/saada/.nvm/versions/node/.../bin/npm`، لا من `/mnt/c/Program Files/nodejs`.
في الطرفيات غير التفاعلية مثل `wsl.exe ... bash -lc` قد تحتاج تحميل nvm صراحةً.

## 3. نسخة مستقلة داخل نظام ملفات Linux

ضع المشروع تحت `~/projects/RaxUI`، لا تحت `/mnt/c/`، للاستفادة من أداء
نظام ملفات Linux وسلوكه في الصلاحيات والروابط وحالة أحرف أسماء الملفات.
لا تنسخ `node_modules` أو `bin` أو `obj` من Windows.
[توصية Microsoft بشأن الملفات](https://learn.microsoft.com/en-us/windows/wsl/filesystems).

### من نسخة Windows المحلية دون تسجيل دخول GitHub أول مرة

المثال يستخدم المجلد الحالي باسم `BlazorUI`. إذا غيّرت اسمه فعلياً إلى
`RaxUI`، فعدّل مسار المصدر. نفّذ الاستنساخ مرة واحدة، إلى مجلد غير موجود:

```bash
mkdir -p ~/projects
git clone --no-hardlinks --branch saad \
  /mnt/c/Users/saada/source/repos/BlazorUI \
  ~/projects/RaxUI

cd ~/projects/RaxUI
git remote set-url origin https://github.com/raxui/RaxUI.git
```

الاستنساخ يأخذ التغييرات المحفوظة في commits فقط، ولا ينقل تعديلات Windows
غير المحفوظة في Git. وتغيير `origin` لا يهيّئ تسجيل الدخول إلى GitHub داخل Linux.

### أو من GitHub مباشرةً

إذا كان تسجيل الدخول إلى المستودع الخاص مهيّأً داخل Linux:

```bash
mkdir -p ~/projects
git clone --branch saad https://github.com/raxui/RaxUI.git ~/projects/RaxUI
cd ~/projects/RaxUI
```

اختر طريقة واحدة؛ لا تعِد الاستنساخ فوق مجلد موجود.

## 4. الاعتماديات والمتصفح أول مرة

من داخل `~/projects/RaxUI`، كمستخدم Linux العادي:

```bash
npm ci
npx playwright install --with-deps chromium
```

قد يطلب Playwright كلمة مرور sudo لتثبيت مكتبات النظام الخاصة بالمتصفح.
الفحص الكامل يثبّت لاحقاً نسخة Chromium التي تحتاجها اختبارات .NET أيضاً؛
لذلك ظهور تنزيلين بإصدارين مختلفين للمتصفح أمر متوقع عند اختلاف إصداري
Playwright في Node و.NET.
[مرجع تثبيت المتصفحات واعتمادياتها](https://playwright.dev/docs/browsers).

لا تشغّل `sudo npm ci` أو `sudo npm run check:full`، حتى لا تصبح ملفات المشروع
والكاش مملوكة للمستخدم root.

## 5. تشغيل الفحص

```bash
cd ~/projects/RaxUI
source ~/.nvm/nvm.sh

# أثناء التطوير
npm run check

# جميع الاختبارات قبل الدمج
npm run check:full
```

الأمر الكامل يفحص .NET 8 و9 و10 و11، واختبارات React، وتطبيقات Vite عبر أدوات
الإنشاء الثلاث، وNext.js 15 و16، إضافة إلى التنسيق وRegistry والأنماط.
راجع [جدول التغطية](local-checks.ar.md#ما-الذي-يفحصه-كل-أمر).

النجاح النهائي يظهر بسطر مثل:

```text
[check] PASS (full, 234s). Nothing was published.
```

لرؤية رمز الخروج، نفّذ مباشرة بعد أمر الفحص:

```bash
echo $?
```

الرمز `0` يعني النجاح، وأي قيمة أخرى تستلزم مراجعة الخطأ. لا تعتبر نجاح
مرحلة واحدة أو تنزيل المتصفح نجاحاً للفحص الكامل.

## 6. تحديث نسخة Linux قبل فحص تغيير جديد

راجع التعديلات المحلية أولاً، ثم حدّث فرع `saad` من GitHub إذا كانت نسختك نظيفة:

```bash
cd ~/projects/RaxUI
git status --short
git switch saad
git pull --ff-only origin saad
npm ci
npm run check:full
```

لا تستخدم reset أو حذف المجلد لمعالجة تعارض دون مراجعة تعديلاتك.
إذا تعذّر الدخول إلى GitHub، يمكنك جلب commits من نسخة Windows المحلية:

```bash
git fetch /mnt/c/Users/saada/source/repos/BlazorUI saad
git merge --ff-only FETCH_HEAD
```

نفّذ ذلك وأنت على `saad` وبعد مراجعة حالة النسخة. عدّل مسار Windows عند تغييره.

لإثبات أن Windows وLinux اختبرا الكود نفسه، قارن هذا الأمر في النسختين:

```bash
git rev-parse HEAD
```

يجب أن يتطابق commit، مع أخذ أي تغييرات محلية غير محفوظة في الاعتبار.

## 7. ملاحظات وحلول سريعة

| الحالة | الإجراء |
| --- | --- |
| `node: command not found` مع وجود npm في `/mnt/c/` | حمّل `source ~/.nvm/nvm.sh`، ثم تحقق من المسارين مجدداً. |
| `pwsh` غير موجود | ثبّت PowerShell داخل Ubuntu، لا تكتفِ بنسخة Windows. |
| خطأ مكتبات Linux عند تشغيل Chromium | أعد `npx playwright install --with-deps chromium` وراجع أول خطأ في التثبيت. |
| فشل تنزيل حزم NuGet أو npm | تحقق من الاتصال والوكيل وإعدادات الشهادات؛ لا تعطل التحقق من TLS كحل. |
| `Permission denied` داخل المشروع | افحص الملكية والصلاحيات؛ لا تعِد تشغيل الفحص كله بـsudo. |
| فشل بسبب حالة أحرف اسم ملف أو مسار | أصلح المسار في المصدر؛ Linux يميّز عادةً بين `Button` و`button`. |
| تحذير `DEP0169` أثناء تنزيل متصفح .NET | سجّل التحذير؛ لا يعني فشلاً وحده. اعتمد رمز الخروج والنتيجة النهائية، ولا تُخفِ جميع التحذيرات. |

## 8. نتيجة التجربة والتوثيق في PR

التجربة المرسلة من Ubuntu 24.04 عبر WSL 2 نجحت خلال 234 ثانية: 75 اختبار
React، و79 اختبار .NET دون تخطٍّ، و12 اختبار قبول Vite، و6 اختبارات Next.js.
هذه نتيجة التجربة المسجلة وليست ضماناً لنجاح commits اللاحقة؛ الأعداد والأزمنة
قد تتغيّر مع تطور المكتبة.

عند فحص تغيير جديد، وثّق النتيجة الفعلية مثلاً:

```text
Commit: <git rev-parse HEAD>
Windows: npm run check:full — PASS
Linux: Ubuntu 24.04 / WSL 2 — npm run check:full — PASS
Skipped tests: <actual count and reasons for each environment>
```

فحص WSL يضيف تغطية Linux محلية، لكنه لا يطابق كل تفاصيل خوادم GitHub.
لا يحتاج Runner مسجلاً في GitHub، ولا يستهلك دقائق Actions، ولا ينشر الحزم.
