# SheenUI

Formerly BlazorUI. See [the identity change and existing-app guidance](docs/adr/012-sheenui-identity.md).

Source-owned Blazor and React components with a shared theme, installed into your application by .NET and Node CLIs.
Licensed under [MIT](LICENSE).

للتجربة دون نشر الحزم: [دليل الاستخدام المحلي على Windows بالعربية](docs/local-development.ar.md).

For local usage without publishing packages: [Windows local usage guide in English](docs/local-development.en.md).

The preview supports **Blazor Web Apps on .NET 8, 9, and 10**, the template's
Bootstrap, buttons, overlays, fields, forms, and basic controls. JavaScript
enhancements require an interactive render mode such as Interactive Server.
On .NET 8, `init` upgrades the template's unmodified Bootstrap 5.1 to 5.3, which
the theme needs ([ADR 009](docs/adr/009-dotnet-8-9-10.md)). Installed components
run without the CLI or a registry connection.

## Fields and forms

Install `field`, `form`, and `form-section` with `sheenui add <name>` from your
app directory. For local development, use `dotnet run --project <repo>/src/SheenUI.Cli -- add <name>`.
`form` and `form-section` install `field`
first. They share the React components' classes, theme attributes and motion.

`Field`, `FieldLabel`, `FieldDescription`, `FieldError`, `FieldSet`, and
`FieldLegend` provide accessible composition. `Field.For` reads `[Required]`
and validation messages from the enclosing `EditContext`. `Required` and
`Invalid` override inferred state; `Optional` shows an optional hint instead
of the asterisk. `FieldLabel` and `FieldLegend` expose `OptionalText` (default
`"(Optional)"`) and `RequiredIndicator` (default `"*"`, null to hide).
`Orientation` is `vertical`, `horizontal`, or `inline`.

Place `Form` **inside** `EditForm`. It installs
`Form.BootstrapFieldCssClassProvider`: errors produce `is-invalid`, modified
fields without errors produce `is-valid`, and untouched valid fields have no
validation class. Keep your own validator and submit callbacks. After
interactive validation, Form focuses the first invalid control and shakes its
field. Reduced motion disables shaking and smooth scrolling.

```razor
@page "/profile"
@rendermode InteractiveServer
@using System.ComponentModel.DataAnnotations

<EditForm Model="model" OnValidSubmit="Save" Context="edit">
    <Form>
        <DataAnnotationsValidator />
        <Field Id="name" For="@(() => model!.Name)" Context="field">
            <ChildContent>
                <FieldLabel>Name</FieldLabel>
                <InputText @attributes="field.ControlAttributes"
                           class="form-control" @bind-Value="model!.Name" />
                <FieldError />
            </ChildContent>
            <Description>Your full name</Description>
        </Field>
        <button type="submit" class="btn btn-primary">Save</button>
    </Form>
</EditForm>

@code {
    private Profile model = new();
    private void Save() { /* Save the validated model. */ }
    public class Profile
    {
        [Required(ErrorMessage = "Name is required")]
        public string Name { get; set; } = "";
    }
}
```

The small cascading `Field.FieldContext` is the contract for future SheenUI
inputs. It exposes control/label/description/error IDs, state, error text and
`ControlAttributes` (`id`, `aria-labelledby`, `aria-describedby`,
`aria-invalid`, `aria-required`, `disabled`). Native controls and Blazor's
`InputText` can splat these explicitly as above; custom controls can read it
with `[CascadingParameter]`. Give `Id` to Field rather than changing just the
control's ID. Render `FieldError` when using validation or `Error`. If its
content is custom markup with no Field.Error or validation message, set
`Field HasError="true"` to include its ID during static SSR as well.

For manual description placement, set `HasDescription` so the reference is
correct on the very first static server render:

```razor
<Field Id="nickname" Optional HasDescription Context="field">
    <FieldLabel OptionalText="Optional">Nickname</FieldLabel>
    <input @attributes="field.ControlAttributes" class="form-control" />
    <FieldDescription>Shown to other members.</FieldDescription>
</Field>

<FieldSet Optional Context="group">
    <FieldLegend>Notifications</FieldLegend>
    <label><input type="checkbox" /> Email updates</label>
    <label><input type="checkbox" /> Product news</label>
</FieldSet>
```

`FieldSet` renders a native fieldset, including native group disabling, and
accepts the same validation/hint parameters. Give each control inside a group
its own identity; do not splat the group's attributes onto every checkbox.
All parts support `Class` and additional HTML attributes. Field, FieldSet and
FormSection accept `Appearance`; otherwise theme, direction and density are
inherited from `data-sheen-*` ancestors.

### Static SSR and server errors

For a static SSR page, omit `@rendermode`, set `FormName="profile"` on
`EditForm`, and use a form-bound property instead of the model field:

```razor
@code {
    [SupplyParameterFromForm] private Profile? model { get; set; }
    protected override void OnInitialized() => model ??= new();
}
```

Keep the form's `DataAnnotationsValidator`, the public model class and
`OnValidSubmit` handler from the example. Form does not import JavaScript in
static SSR; native server posting and browser behavior remain in effect.
Validation messages, Bootstrap classes and ARIA render in the server response.

Use `EditForm EditContext="editContext"` for server-side errors. Create the
context and store once for the current model, then add errors and notify:

```csharp
editContext = new EditContext(model);
serverErrors = new ValidationMessageStore(editContext);

// After the server rejects a value:
serverErrors.Clear();
serverErrors.Add(new FieldIdentifier(model, nameof(Profile.Name)), "This name is already used.");
editContext.NotifyValidationStateChanged();
```

Declare `EditContext editContext` and `ValidationMessageStore serverErrors`
on the page and initialize them in `OnInitialized`. Clear the relevant stored
errors when the user edits a field or before retrying; the store belongs to
your app. FieldError reads the same store through EditContext.

### Optional FluentValidation through Blazilla

SheenUI does not depend on a validation package. To use FluentValidation,
install [Blazilla](https://packages.nuget.org/packages/Blazilla), add
`@using Blazilla` and `@using FluentValidation`, then replace
`<DataAnnotationsValidator />` with `<FluentValidator Validator="validator" />`:

```csharp
private readonly ProfileValidator validator = new();
public class ProfileValidator : AbstractValidator<Profile>
{
    public ProfileValidator() => RuleFor(x => x.Name).NotEmpty().WithMessage("Name is required");
}
```

Alternatively register `IValidator<Profile>` in DI and use `<FluentValidator />`.
The Field and Form components consume EditContext messages from either validator.
Hints still come from `[Required]`; set `Field Required="true"` when your
required rule exists only in FluentValidation. For asynchronous rules, follow
Blazilla's `AsyncMode`/`OnSubmit`/`ValidateAsync` guidance instead of relying on
synchronous `OnValidSubmit`.

FieldError shows every message for the field, joined. Use
`.Cascade(CascadeMode.Stop)` on a rule to show only its first failure, for
example "required" before "not a valid email".

Blazilla 2.4.2 is covered by the browser tests on .NET 8, 9, and 10: its
messages reach Field and FieldError, set `is-invalid`/`aria-invalid`, focus the
first invalid control, and block submit until the form is valid.

### Settings sections

`FormSection` groups `FormRow` controls and `FormRowLink` actions. A row is a
Field: it accepts `For`, `Id`, `Required`, `Optional`, `Disabled`, `Invalid`,
and `Error`. It renders the label, description and error itself. `Layout` is
`inline` or `stacked`; `Icon` accepts arbitrary markup and `IconColor` selects
blue, green, red, orange, yellow, teal, indigo, purple, pink, or gray.

```razor
<FormSection Title="Account" Appearance="glass">
    <ChildContent>
        <FormRow Label="Name" For="@(() => model!.Name)" Description="Public name" Context="field">
            <InputText @attributes="field.ControlAttributes" class="form-control" @bind-Value="model!.Name" />
        </FormRow>
        <FormRowLink Label="Language" Value="English" Href="/language" />
        <FormRowLink Label="Sign out" Destructive OnClick="SignOut" />
    </ChildContent>
    <Footer>Manage your account preferences.</Footer>
</FormSection>
```

Place bound rows inside the EditForm/Form example and provide your `SignOut`
callback. FormRowLink renders an anchor when `Href` is set, otherwise a button;
it accepts `Label`, `Value`, `Description`, `Icon`, `IconColor`, `Destructive`,
`OnClick`, and button `Disabled`. `Destructive` removes the chevron.

## Basic controls

Install `input`, `input-group`, `textarea`, `checkbox`, `radio-group`, `switch`,
or `select` with `sheenui add <name>`. Each installs `field`. All controls wrap
Blazor's built-in form inputs: `@bind-Value`, `ValueChanged`, `ValueExpression`,
EditContext validation, and native static SSR posting work on .NET 8, 9 and 10.
They read the cascading Field attributes themselves; no splat is needed.
Explicit HTML attributes override Field defaults. Give Field the control's `Id`
so its label still points to the right element.

Inside an `EditForm` and `Form` (with a validator), use:

```razor
<Field Id="email" For="@(() => model.Email)">
    <FieldLabel>Email</FieldLabel>
    <Input Type="email" @bind-Value="model.Email" Clearable>
        <StartIcon><i class="your-mail-icon" aria-hidden="true"></i></StartIcon>
    </Input>
    <FieldError />
</Field>
<Field Id="password" For="@(() => model.Password)">
    <FieldLabel>Password</FieldLabel><Input Type="password" @bind-Value="model.Password" /><FieldError />
</Field>
<Field Id="age" For="@(() => model.Age)">
    <FieldLabel>Age</FieldLabel><NumberInput @bind-Value="model.Age" /><FieldError />
</Field>
<Field Id="search" For="@(() => model.Search)">
    <FieldLabel>Search</FieldLabel><Input Type="search" @bind-Value="model.Search" />
</Field>
<Field Id="notes" For="@(() => model.Notes)">
    <FieldLabel>Notes</FieldLabel><Textarea @bind-Value="model.Notes" AutoResize MinRows="3" MaxRows="10" /><FieldError />
</Field>
<Field Id="accepted" For="@(() => model.Accepted)" Orientation="inline">
    <Checkbox @bind-Value="model.Accepted" /><FieldLabel>Accept terms</FieldLabel><FieldError />
</Field>
<Field Id="all" Orientation="inline">
    <Checkbox @bind-Value="model.All" @bind-Indeterminate="mixed" /><FieldLabel>Select all</FieldLabel>
</Field>
<Field Id="updates" For="@(() => model.Updates)" Orientation="inline">
    <Switch @bind-Value="model.Updates" /><FieldLabel>Email updates</FieldLabel><FieldError />
</Field>
<Field Id="plan" For="@(() => model.Plan)">
    <FieldLabel>Plan</FieldLabel>
    <RadioGroup @bind-Value="model.Plan">
        <label><RadioGroupItem TValue="string" Value="@("personal")" /> Personal</label>
        <label><RadioGroupItem TValue="string" Value="@("team")" /> Team</label>
    </RadioGroup>
    <FieldError />
</Field>
<Field Id="country" For="@(() => model.Country)">
    <FieldLabel>Country</FieldLabel>
    <Select @bind-Value="model.Country"><option value="">Choose</option><option value="iq">Iraq</option></Select>
    <FieldError />
</Field>
<Field Id="phone" For="@(() => model.PhonePrefix)">
    <FieldLabel>Phone</FieldLabel>
    <InputGroup AutoAdvance>
        <InputGroupItem aria-label="Prefix" maxlength="3" @bind-Value="model.PhonePrefix" />
        <InputGroupItem aria-label="Number" maxlength="7" @bind-Value="model.PhoneNumber" />
    </InputGroup>
    <FieldError />
</Field>
```

Declare the illustrated model properties (`Age` is an `int`, the checkboxes and
switch use `bool`, and the other values are strings) and a `bool mixed = true`.
Decorative icon slots accept SVG, Blazicons or font icons; clicking them focuses
the input through a native label. Built-in icons are inline Lucide SVG (ISC).

| Component | Parameters beyond binding and common attributes |
| --- | --- |
| `Input` | `Type="text"` (also email, password, number, search), `StartIcon`, `EndIcon`, `Clearable=false`, `ClearLabel="Clear"`, `ShowLabel="Show password"`, `HideLabel="Hide password"`, `Size="default"` (sm/lg), `Variant="outline"` (filled/glass alias) |
| `NumberInput<TValue>` | Typed numeric binding through `InputNumber<TValue>`; nullable numbers supported. `Input Type="number"` instead binds a string. |
| `InputGroup` | `ChildContent`, `AutoAdvance=false`, `Orientation="horizontal"` (vertical). Each `InputGroupItem` has its own binding, `Class`, and native attributes such as maxlength, id and aria-label. |
| `Textarea` | `AutoResize=false`, `MinRows=3`, `MaxRows=10` |
| `Checkbox` | `Indeterminate=false`, `IndeterminateChanged` / `@bind-Indeterminate`. Mixed state uses role checkbox and aria-checked=mixed; interactive activation clears mixed state. |
| `RadioGroup<TValue>` | `ChildContent`, `Orientation="vertical"` (horizontal). `RadioGroupItem<TValue>` takes `Value`, `Class` and native attributes. |
| `Switch` | Boolean binding; native checkbox with role switch. |
| `Select<TValue>` | `ChildContent` containing native option/optgroup elements; native Bootstrap form-select, including browser keyboard and mobile picker support. |

All root controls accept `Appearance` (default/flat/glass, unset inherits),
`Class` and additional HTML attributes (`disabled`, `readonly`, `autocomplete`,
`placeholder`, ARIA, etc.). Validation classes come from `Form`. Radio and
joined-input groups apply Field's identity to a native fieldset, whose disabled
state disables its children. Give each member a separate label or aria-label;
the group's ID must not be copied onto every member.

Password visibility, clearing, textarea auto-grow, and joined-input enhancements
require an interactive render mode such as `@rendermode InteractiveServer`.
They use disposable collocated `.razor.js` modules. Joined inputs advance at
maxlength, go back on empty Backspace, follow RTL at caret boundaries, and
distribute long pastes. Password and clear buttons stay hidden during static
SSR; all values still post through their generated native form names. For static
SSR, use `FormName` and `[SupplyParameterFromForm]` as shown above. Keep normal
submit buttons and validators; no JavaScript is needed for server validation.

## Quick start

Once the preview is published to NuGet:

```sh
dotnet tool install --global SheenUI.Cli --version 0.1.0-preview.2
dotnet new blazor --interactivity Server -n MyApp
cd MyApp
sheenui init
sheenui add button
```

`init` replaces the template's sidebar layout and sample pages with a SheenUI
app shell and a welcome page where you can try the theme, and replaces the
template `wwwroot/app.css` with a minimal one (validation, error boundary, and
heading focus styles only), so it no longer overrides the theme's buttons. It only replaces or
removes template files you have not changed; anything you edited is kept and
reported ([ADR 008](docs/adr/008-starter-app.md)).

Use Button in any page, for example a new `Components/Pages/Counter.razor`:

```razor
@page "/counter"
@rendermode InteractiveServer

<Button OnClick="@(() => count++)">Clicked @count times</Button>

@code {
    private int count;
}
```

`init` installs the core theme as `wwwroot/css/sheenui/sheenui.css`, plus the
starter's `starter.css`, and links the core after Bootstrap. `add button` copies
`Components/UI/Button/Button.razor` and `wwwroot/css/sheenui/components/button.css`,
adds its namespace to `_Imports.razor`, and adds one CSS import to `sheenui.css`.
Only installed components' CSS is loaded. Edit `components/button.css` to customize
Button independently; the CLI keeps those edits. Keep custom core overrides in a
separate stylesheet: the CLI manages the core's leading import list and refuses
manual changes to `sheenui.css` ([ADR 015](docs/adr/015-per-component-css.md)). Keep the template Bootstrap and
application styles links. If `Program.cs` does not enable Interactive Server (an
app created without `--interactivity Server`), `init` prints a warning with the
two lines to add; it does not edit `Program.cs`.

Button has the same options and look as the React Button:
`Variant` (`default`, `solid`, `secondary`, `tinted`, `destructive`, `outline`,
`ghost`, `link`), `Size` (`default`, `sm`, `lg`, `icon`, `icon-sm`, `icon-lg`),
`Appearance` (`default`, `flat`, `glass`), `Color` (a Bootstrap theme color such
as `success`), plus `Disabled`, `Type`, `Class`, and `OnClick`.

Theme any part of the page with attributes; components inherit them:

```razor
<div data-sheen-appearance="glass" data-bs-theme="dark" data-sheen-accent="emerald" dir="rtl">
    <Button>Glass</Button>
    <Button Appearance="flat" Color="success">Flat override</Button>
</div>
```

### Icons

Components take any icon markup. For your own icons, SheenUI recommends Lucide
through [`Blazicons.Lucide`](https://github.com/kyleherzog/Blazicons.Lucide)
([ADR 014](docs/adr/014-icons.md)); icons follow the text color and the slot's size:

```razor
@* dotnet add package Blazicons.Lucide, then @using Blazicons in _Imports.razor *@
<Button><Blazicon Svg="Lucide.Trash" aria-hidden="true" /> Delete</Button>
```

### Dialog and DropdownMenu

`sheenui add dialog` and `sheenui add dropdown-menu` install overlays built on the
native `<dialog>` element and the `popover` attribute, each with a small
collocated `.razor.js` module ([ADR 013](docs/adr/013-overlay-primitives.md)).
They need an interactive render mode, for example `@rendermode InteractiveServer`:

```razor
<Button OnClick="@(() => open = true)">Delete…</Button>
<Dialog @bind-Open="open" Title="Delete file?" Description="This cannot be undone.">
    <Footer>
        <Button Variant="outline" OnClick="@(() => open = false)">Cancel</Button>
        <Button Variant="destructive" OnClick="Delete">Delete</Button>
    </Footer>
</Dialog>

<DropdownMenu>
    <Trigger>Options</Trigger>
    <ChildContent>
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem OnSelect="Edit">Edit</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem OnSelect="Archive" Disabled>Archive</DropdownMenuItem>
    </ChildContent>
</DropdownMenu>
```

`Dialog` also takes `ShowCloseButton`, `CloseLabel`, `Appearance`, and `Class`;
`Esc`, a click outside, and the close button set `Open` to `false`.
`sheenui add confirm-dialog` installs a centred confirmation (from boot-ui's
AlertDialog). A click outside nudges it instead of closing; Esc or Cancel run
`OnCancel`. `OnConfirm` may be async: the dialog shows a spinner, closes when it
finishes, and shows the message if it throws:

```razor
<ConfirmDialog @bind-Open="confirm" Title="Delete project?" Description="This removes it for everyone."
               Tone="destructive" ConfirmText="Delete" ConfirmationText="my-app" OnConfirm="DeleteAsync" />
```

`Tone` is `default`, `destructive`, `warning`, or `success`; also `ShowIcon`,
`CancelText`, `ConfirmationLabel`, `Layout` (`inline` or `stacked`), `OnCancel`,
`Appearance`, and `Class`.

`DropdownMenu` takes `TriggerVariant` (a Button variant, `secondary` by default),
`TriggerClass`, `Disabled`, `Appearance`, and `Class`; the menu supports arrow
keys, `Home`/`End`, and typeahead.

## Installation guarantees and limits

- Configuration and lock files record the CLI's embedded registry release. A newer
  CLI can keep adding components to a project; an older CLI refuses files written
  by a newer one. Files installed from another release whose content differs are
  never silently replaced, because update commands are not supported yet.
- Custom install paths are not supported in this preview. Destinations and
  existing symlinks/junctions must stay inside the selected project.
- Locally edited and untracked destination files are never silently replaced.
- `add` installs a component's dependencies first, in one transaction with a
  single lock-file write. A dependency that is already installed is kept as it
  is, including your edits.
- Ordinary write failures restore original files and remove newly created empty
  directories. Concurrent edits and process termination during installation are
  not covered by that rollback guarantee.
- `init` and `add` support `button`, `dialog`, `confirm-dialog`, `dropdown-menu`,
  `field`, `form`, `form-section`, `input`, `input-group`, `textarea`, `checkbox`,
  `radio-group`, `switch`, `select`, `slider`, and `rating`. Update commands, WebAssembly testing,
  and configurable paths remain future work.

## Slider and rating

Add either item with `sheenui add slider` or `sheenui add rating`; both install `field`.
Inside an `EditForm`, bind numeric model properties just like other inputs:

```razor
<Field Id="volume" For="@(() => model.Volume)" Context="volumeField">
    <FieldLabel>Volume</FieldLabel>
    <Slider @bind-Value="model.Volume" Min="0" Max="100" Step="1" />
    <FieldError />
</Field>
<Slider Range @bind-Value="model.Minimum" @bind-EndValue="model.Maximum"
        StartLabel="Minimum price" EndLabel="Maximum price" />
<Field Id="score" For="@(() => model.Score)" Context="scoreField">
    <FieldLabel>Score</FieldLabel>
    <Rating @bind-Value="model.Score" ClearLabel="Clear rating"
            GetValueText="@(score => $"{score} stars")" />
    <FieldError />
</Field>
```

`Slider.Value` and `EndValue` are `double`; `Rating.Value` is `int`. The usual
`ValueChanged`/`ValueExpression` and `EndValueChanged`/`EndValueExpression`
parameters support explicit binding. Use `Form` inside `EditForm` for Bootstrap
`is-valid`/`is-invalid` classes. Field supplies id, labels, descriptions, errors,
required state and disabled state. Unmatched attributes go to the input or fieldset.

Slider parameters: `Min` (0), `Max` (100), `Step` (1), `Range` (false), `EndValue`
(100), `StartLabel` ("Minimum"), `EndLabel` ("Maximum"), `Variant` (`default` or
`bar`), `Size` (`default`, `sm`, `lg`), `Appearance`, and `Class`. Two native inputs
share a track and constrain each endpoint to its neighbor; incoming values are
normalized to `Min <= Value <= EndValue <= Max`. Bounds and step must be finite,
with `Min < Max` and `Step > 0`. Native arrows, Home/End and PageUp/PageDown work
without JavaScript. Range endpoint labels override the shared Field label so each
thumb has a distinct name. Bubble values, marks and icons are React-only.

Rating parameters: `Max` (5), `Clearable` (true), `ClearLabel` ("Clear rating"),
`ReadOnly` (false), `Color` (`warning`, `primary`, `danger`, `success`), `Size`,
`Appearance`, `Class`, and `GetValueText` (English "No rating", "1 star", "2 stars",
etc.). Translate both label parameters for your app. Native radio arrows select
whole stars; the zero option clears the rating and posts a real zero. Read-only
radios are disabled and therefore do not post. Half steps, hover previews and the
rating summary are React-only.

Both controls support static SSR posts through `EditForm FormName="..."` and
`[SupplyParameterFromForm]`. CSS provides theme accents, dark mode, density, RTL
and reduced-motion behavior; no collocated JavaScript is required for these controls.

## React

A React library with the same theme lives in this repository: React 18.3/19 on
Vite 6+ or Next.js 15+ (App Router, no Tailwind), Bootstrap 5.3 SCSS, Radix UI, and a Node CLI (`npx sheenui-react init`,
`npx sheenui-react add button`). It is not published to npm yet. See
[docs/react.md](docs/react.md) for installation, usage, and customization.

## Build and test

Local checks are the default workflow during this development phase. After
`npm ci`, run `npm run check` during development and `npm run check:full` before
merging. See [local verification](docs/local-checks.md) for coverage and prerequisites.
الدليل العربي: [استخدام أدوات الفحص المحلي](docs/local-checks.ar.md).
ولـUbuntu وWSL 2: [الفحص على Linux](docs/local-checks-linux.ar.md).
GitHub CI runs only through **Actions → CI → Run workflow** after this change is
merged; pushes and pull requests do not start hosted jobs automatically.

Requires the .NET 8, 9, and 10 SDKs (the CLI multi-targets and the end-to-end
test builds an app on each) and PowerShell 7 for Playwright's install script.

```sh
dotnet restore SheenUI.slnx
dotnet build SheenUI.slnx -c Release --no-restore
pwsh tests/SheenUI.Integration.Tests/bin/Release/net10.0/playwright.ps1 install chromium
dotnet test SheenUI.slnx -c Release --no-build
dotnet pack src/SheenUI.Cli/SheenUI.Cli.csproj -c Release --no-build -o ./nupkg
dotnet tool install --tool-path ./local-tools --add-source ./nupkg SheenUI.Cli --version 0.1.0-preview.2
```

On Linux, use `install --with-deps chromium` to install browser system dependencies.
The E2E test generates and builds an application, runs it on an ephemeral local
port, checks two interactive clicks and computed styles, and stops the process.

React library (requires Node.js 22):

```sh
npm ci
npm run typecheck
npm test
npx playwright install chromium
npm run test:acceptance       # Vite (CREATE_VITE_VERSION, default 9.3.1)
npm run test:acceptance:next  # Next.js (CREATE_NEXT_APP_VERSION, default 16.4.3)
```

## Releases

Publishing remains deferred. The Release workflow is manual only and requires
the explicit `publish` option and an existing `v*` tag. Creating a tag alone does
not publish anything. When explicitly requested, the workflow builds and tests
the tagged source, packs the CLI, attaches the package to a GitHub Release, and
publishes to NuGet. The owner must configure
the `NUGET_API_KEY` repository secret scoped to `SheenUI.Cli` before tagging.
The tag version controls both the package and registry release identity; component
versions and their content hashes are independent.

See [the project brief](PROJECT_BRIEF.md), [architecture](ARCHITECTURE.md), and
[ADR 004](docs/adr/004-simplified-first-milestone.md) for scope and design decisions.


## Native dates and times

Install `date-input`, `time-picker`, `date-time-input`, or `date-range-input`.
These use the browser's built-in pickers, including its locale and keyboard behavior;
custom calendars belong to #38. Bootstrap dark mode supplies `color-scheme: dark`.
`StartIcon`, appearance, size, variant, disabled/read-only and native min/max/step
attributes follow Input. All controls consume Field attributes automatically.

Blazor: `DateInput<TValue>` accepts DateOnly, DateTime, DateTimeOffset (and nullable
forms); `TimePicker` binds TimeOnly; `DateTimeInput<TValue>` accepts DateTime or
DateTimeOffset. Use `@bind-Value` inside EditForm. Browser date/time values carry no
time zone: a DateTimeOffset is interpreted as local wall time by InputDate.
`ParsingErrorMessage` translates the built-in parsing error.
`DateRangeInput` binds nullable DateOnly `Value` and `EndValue` with separate
ValueExpression/EndValueExpression. It validates order in EditContext without
silently changing either endpoint. StartLabel, EndLabel, Separator and OrderMessage
are translatable. Native min/max prevent crossing through the picker. All these
inputs post with generated names in static SSR; use FormName/SupplyParameterFromForm.

React: DateInput, TimePicker and DateTimeInput forward their input ref and accept
Input props. Values are native strings (`YYYY-MM-DD`, `HH:mm`, `YYYY-MM-DDTHH:mm`).
DateRangeInput accepts `value`/`defaultValue` as `{ start, end }` and `onChange`;
`name`/`endName` name the endpoints for native form posts. `startLabel`, `endLabel`,
`separator` and `orderMessage` translate its text. In react-hook-form use Controller
for the range and an order refinement in the application's schema to block submit;
the range displays the error and sets native endpoint limits. Single inputs use
register or Controller through Field like Input.


## File upload

Install `file-upload`. FileUpload is a native file input inside a labelled drop zone,
with a removable list and Bootstrap progress bars. Tab to the native input and use
its picker keys; clicking the zone also opens it. No upload request is made.
Each selection replaces the previous batch (InputFile invalidates earlier handles).
A rejected batch clears the list. Limits default to 1 file and 10 MiB per file.
Accept accepts extensions, MIME types or wildcards (`.pdf,image/*`).

Blazor: bind `IReadOnlyList<IBrowserFile>` with `@bind-Value` inside an EditForm/Field.
Set `Accept`, `MaxSize` (bytes), `MaxFiles`; errors enter EditContext and block submit.
`Progress` is `Func<IBrowserFile, double?>`: null hides the bar; 0 to 100 displays it.
The app reads streams and updates progress. Translate `Label`, `RemoveLabel`,
`TypeMessage`, `SizeMessage`, `CountMessage`; `OnError` reports a rejection.
The collocated JS adds drag highlighting and synchronizes removals with native posts.
For static SSR give the input an explicit `name`, set `enctype="multipart/form-data"`
on EditForm and read IFormFile entries from the request in the server handler.
InputFile's IBrowserFile callbacks and progress require interactivity. Static SSR
posts bytes using the native input; the app must enforce accept/count/size again
on the server. All upload endpoints must independently enforce server limits.

React: `value`/`defaultValue` are File arrays; `onChange` receives the next array.
Use Controller's `{...field}` inside Field for react-hook-form. `accept`, `maxSize`,
`maxFiles`, `progress(file)` and `onError` mirror Blazor. Text props use camelCase.
The forwarded ref reaches the native input for error focusing. Native multipart
posts use `name`; controlled files, drops and removals synchronize that payload.


## Popover, combobox and autocomplete

Install `popover`, `combobox` or `autocomplete`. The latter two require popover,
input and field; no Command item is installed. Both support a single selection.
Options have unique string values; autocomplete permits free text. All visible
built-in text is overridable for translation.

Blazor Popover uses the native `popover` top layer and a disposable collocated JS
module extracted from DropdownMenu (ADR 013). It aligns below the trigger's inline
start, flips above if needed, follows scroll/resize and content size, and inherits
its theme, accent and RTL direction. Set `Trigger` and `ChildContent` fragments,
`@bind-Open`, `Label` (accessible panel name), `Appearance` and `Class`.
An external input can supply `Anchor` instead of a Trigger. TriggerAttributes,
TriggerClass, PopupRole and Role allow accessible composition. Native light dismiss
and Escape close it; focus returns to the trigger when it was inside the panel.
Interactivity is required for positioning and C# state synchronization.

Blazor Combobox: bind string `Value` with `@bind-Value`; `Options` is an
IReadOnlyList of `Combobox.Option(Value, Label, Disabled=false)`. Translate
Placeholder, SearchPlaceholder and EmptyMessage. A native InputSelect is the
static SSR fallback, with generated form names and EditContext validation.
Interactive mode replaces the visible select with a button and searchable listbox;
the hidden native select continues to post the selected value.

Blazor Autocomplete: bind string `Value`; `Suggestions` holds strings. Optional
`LoadSuggestions(query, cancellationToken)` returns Task<IReadOnlyList<string>>.
Older requests are cancelled and their results ignored; `Loading` can also be
controlled by the application. Translate SuggestionsLabel, LoadingMessage,
EmptyMessage and ErrorMessage. Static SSR renders a named text input and datalist;
async suggestions and the custom listbox require interactivity.

React Popover exports Popover, PopoverTrigger, PopoverAnchor, PopoverContent and
PopoverClose. Content uses Radix Popover 1.3.1 and portals into the nearest
SheenThemeProvider, preserving theme attributes and accent. Open/defaultOpen and
onOpenChange follow Radix. Content defaults to inline start alignment with a 4px gap.

React Combobox takes `options: { value, label, disabled? }[]`, value/defaultValue,
onChange (or onValueChange), name for a hidden native post, placeholder,
searchPlaceholder and emptyMessage. Its ref is the button. Autocomplete takes
string value/defaultValue, onChange(string), suggestions, optional
loadSuggestions(query, AbortSignal), loading, loadingMessage, emptyMessage and
errorMessage. Its ref is the input; Input props and name pass through. Use Controller
and `{...field}` inside Field to integrate either control with react-hook-form.

Keyboard: open combobox with Enter/Space, arrows or typeahead; type to filter in
its search input. Arrows skip disabled options, Home/End jump, Enter selects,
Escape dismisses, and Tab closes while continuing navigation. Focus stays in
an autocomplete input while an aria-activedescendant identifies its suggestion.
Autocomplete Home/End navigate while suggestions are open. Both listboxes expose
selection with aria-selected; pending async results expose aria-busy and a Bootstrap
spinner with translated status text. Reduced motion disables pop-in and spinner motion.

## Display basics

Install each item with `sheenui add <name>`: `alert`, `badge`, `avatar`, `card`,
`skeleton`, `spinner`, `progress`, `table`, and `timeline`. Each owns its compiled
CSS and adds exactly one import to `sheenui.css`; none installs another item.
All roots and parts accept `Class`, `Appearance` (default/flat/glass; unset
inherits), and additional HTML attributes. Theme, accent, dark mode, density and
RTL inherit from `data-sheen-*`, `data-bs-theme` and `dir` ancestors.

```razor
<Alert Tone="success" Title="Saved" Description="Your changes are ready." />
<Badge Color="success" Dot Ping>Live</Badge>
<Avatar Name="Saad Alsaree" Src="/people/saad.jpg" Alt="Saad" Size="lg"
        Status="online" StatusLabel="Available" />
<Card Appearance="glass">
    <CardHeader><CardTitle>Account</CardTitle><CardDescription>Your details</CardDescription></CardHeader>
    <CardContent>Profile information</CardContent>
    <CardFooter>Updated today</CardFooter>
</Card>
<Skeleton Shape="circle" Width="40px" />
<SkeletonText Lines="3" LastLineWidth="60%" />
<Spinner Label="Loading account" Size="sm" Color="primary" />
<Progress Label="Upload" Value="25" Max="50" ShowValue />
<Progress AccessibleLabel="Preparing files" />
<Table Striped Density="compact">
    <TableCaption>People</TableCaption>
    <TableHeader><TableRow><TableHead>Name</TableHead></TableRow></TableHeader>
    <TableBody><TableRow><TableCell>Saad</TableCell></TableRow></TableBody>
    <TableFooter><TableRow><TableCell>One person</TableCell></TableRow></TableFooter>
</Table>
<Timeline CurrentLabel="Active">
    <TimelineGroup>Today</TimelineGroup>
    <TimelineItem Title="Placed" Status="done" Time="09:00" DateTime="2026-10-24T09:00" />
    <TimelineItem Title="Delivery" Status="current" Description="On the way" />
</Timeline>
```

| Item | Parameters and defaults |
| --- | --- |
| Alert | `Tone="info"` (success/warning/danger/neutral), `Variant="tinted"` (outline/solid/glass), `Title`, `Description`, `ShowIcon=true`, `Icon`, `ChildContent`, `Dismissible=false`, `DismissLabel="Dismiss"`, `Open=true`, `OpenChanged` / `@bind-Open`. Parts: `AlertTitle`, `AlertDescription`, `AlertActions`. Warning/danger use role alert; other tones use status. |
| Badge | `Variant="tinted"` (solid/outline/glass), `Color="primary"` (secondary/success/warning/danger/info/neutral), `Size="default"` (sm/lg), `Shape="pill"` (rounded), `Dot=false`, `Ping=false`, `ChildContent`. Ping also shows the dot. |
| Avatar | `Src`, `Alt` (defaults to Name or FallbackLabel), `Name`, `FallbackLabel="Avatar"`, `Size="default"` (xs/sm/lg/xl), `Shape="circle"` (rounded), `Ring=false`, `Status` (online/away/busy/offline), `StatusLabel` (defaults to Status), `ChildContent` replaces initials. Initials use the first and last word, skipping Arabic ??, and a stable name-derived tint. |
| Card | `Variant="default"` (tinted/outline), `ChildContent`; parts: `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter`. Use a heading inside CardTitle when the page hierarchy needs one. |
| Skeleton | `Shape="rect"` (circle/pill/text), CSS-string `Width`/`Height`, `Animation="shimmer"` (pulse/none), `Loading=true`, `ChildContent`. Loading content is hidden and inert; no content means a decorative placeholder. `SkeletonText`: `Lines=3`, `LastLineWidth="60%"`, `Animation="shimmer"`. |
| Spinner | `Label="Loading"`, `Size="default"` (sm/lg), `Color="primary"` (secondary/success/warning/danger/info/neutral). Role status; use `aria-hidden="true"` when surrounding content already announces loading. Existing inline Bootstrap spinners are unchanged. |
| Progress | Nullable `Value` (null = indeterminate), `Max=100`, `Label`, `AccessibleLabel="Progress"`, `ShowValue=false`, `FormatValue(value,max)` (percentage), `Size="default"` (sm/lg), `Color="primary"` (success/warning/danger/info/neutral), `Segments=0`, `SuccessOnComplete=false`. Values clamp to 0..Max; invalid maxima use 100 and nonfinite values are indeterminate. |
| Table | `Density` (inherits; comfortable/compact), `Hover=true`, `Striped=false`, `StickyHeader=false`, `ContainerClass`, `ContainerStyle`. Parts: Header, Body, Footer, Row, Head, Cell, Caption with the Table prefix. `TableHead.Scope="col"`; use row for row headings. Additional native attributes support colspan/rowspan. Give the container a max-height for sticky headers. No sorting or paging. |
| Timeline | Vertical list; `TimePosition="inline"` (side), `Size="default"` (sm), `Animated=true`, `DoneLabel="completed"`, `CurrentLabel="in progress"`, `UpcomingLabel="upcoming"`, `ErrorLabel="failed"`. `TimelineItem`: `Status="done"` (current/upcoming/error), `Tone` (primary/success/warning/danger/info/neutral; inferred from status), `Title`, `Description`, `Time`, `DateTime`, `Marker`, `ChildContent`, optional `StatusLabel` override and zero-based `Index=0` animation stagger. `TimelineGroup` is a list heading. Current items expose aria-current=step. |

All nine render in static SSR. Alert omits the dismiss button until its first
interactive render; use `@rendermode InteractiveServer` to dismiss from C# and
bind Open. Dismissal hides locally even without a callback; toggle Open false then
true to reopen. It removes the alert immediately. React also animates collapse.
Avatar renders the image when Src is supplied, or initials otherwise. Interactive
rendering adds a disposable, collocated image-error module and shows initials on
load failure; static SSR keeps the supplied image and its alt text. None of the
other items imports JavaScript. Progress is an ARIA progressbar with min/max and
an omitted current value when indeterminate. All motion has reduced-motion
fallbacks; Spinner stops, Skeleton stays still, and indeterminate progress remains
visible. Icon slots accept arbitrary markup with two-class sizing (ADR 014).

## Navigation

Install `tabs`, `accordion`, `breadcrumb`, `pagination`, `stepper`, `toggle`,
or `menu-toggle` with `sheenui add <name>`. Menu-toggle installs button;
all seven install their own compiled CSS. Roots accept `Appearance`, `Class`
and additional HTML attributes. Appearance, accent, density, dark mode and RTL
inherit from the surrounding theme. Built-in text is overridable.

```razor
@rendermode InteractiveServer

<Tabs Items="tabs" @bind-Value="tab" Label="Account sections">
    <Panel Context="value"><p>Content for @value</p></Panel>
</Tabs>
<Accordion Variant="inset">
    <AccordionItem Title="Delivery" Description="Shipping information">Ships tomorrow.</AccordionItem>
    <AccordionItem Title="Returns">Return within 30 days.</AccordionItem>
</Accordion>
<Breadcrumb Items="crumbs" MaxItems="3" />
<Pagination Page="@(PageNumber ?? 1)" PageCount="20" />
<Stepper Items="steps" Value="1" />
<Toggle @bind-Pressed="bold">Bold</Toggle>
<ToggleGroup @bind-Value="formats" Multiple Label="Formatting">
    <ToggleGroupItem Value="bold">Bold</ToggleGroupItem>
    <ToggleGroupItem Value="italic">Italic</ToggleGroupItem>
</ToggleGroup>
<MenuToggle @bind-Open="menuOpen" aria-controls="navigation" />

@code {
    [SupplyParameterFromQuery(Name = "page")] public int? PageNumber { get; set; }
    private readonly Tabs.Item[] tabs = [new("profile", "Profile"), new("security", "Security")];
    private readonly Breadcrumb.Item[] crumbs = [new("Home", "/"), new("Account", "/account")];
    private readonly Stepper.Item[] steps = [new("Cart"), new("Payment"), new("Done")];
    private string tab = "profile";
    private bool bold, menuOpen;
    private IReadOnlyList<string> formats = Array.Empty<string>();
}
```

| Component | Parameters and defaults |
| --- | --- |
| Tabs | `Items`: unique `Item(Value, Label, Disabled=false)` values; `Panel`: content template receiving the value; `Value`/`ValueChanged`, `DefaultValue` (otherwise first enabled item), `Id`, `Label="Tabs"`, `Variant="segmented"` (underline/pills), `Orientation="horizontal"` (vertical). |
| Accordion | `Multiple=false`, unique `Name` (generated), `Variant="default"` (inset/cards), `ChildContent`. AccordionItem: `Title`, `Description`, `Icon`, `DefaultOpen=false`, `ChildContent`, `Class`, native attributes. |
| Breadcrumb | `Items`: `Item(Label, Href)`; last item is current, `Label="Breadcrumb"`, `Separator="/"`, `MaxItems=0` (no collapse; 2+ collapses middle links), `CollapsedLabel="Show hidden pages"`, `Variant="default"` (glass). |
| Pagination | `Page=1`, `PageCount=1`, `Siblings=1`, `Boundaries=1`, `GetHref(page)` defaults to the current URL with `page=N`, `GetPageLabel(page)` defaults to `Page N`, `FormatPage`, `Label="Pagination"`, `PreviousLabel="Previous"`, `NextLabel="Next"`, `MoreLabel="More pages"`, `Variant="glass"` (plain), `Size="default"` (sm). |
| Stepper | `Items`: `Item(Title, Description=null, Href=null, Completed=false, Error=false)`; zero-based `Value=0`, `Orientation="horizontal"` (vertical), `LabelPlacement="end"` (bottom), `Size="default"` (sm), `Label="Progress"`, `CompletedLabel`, `CurrentLabel`, `UpcomingLabel`, `ErrorLabel`, `ChildContent`. Earlier steps are complete; error overrides current/complete. Optional destinations are native links. |
| Toggle | `Pressed`/`PressedChanged` (`@bind-Pressed`), `DefaultPressed=false`, `Disabled=false`, `Variant="default"` (outline), `Size="default"` (sm/lg/icon/icon-sm/icon-lg), `ChildContent`. |
| ToggleGroup | `Value`/`ValueChanged` (`@bind-Value`, `IReadOnlyList<string>` in both modes), `Multiple=false`, `Required=false`, `Disabled=false`, `Label="Options"`, `Variant="default"` (outline/segmented), `Size="default"`, `ChildContent`. ToggleGroupItem: unique `Value`, `Disabled`, `ChildContent`, `Class`, native attributes. Single mode selects at most one item; required prevents clearing the last selection. |
| MenuToggle | `Open`/`OpenChanged`, `DefaultOpen=false`, `Disabled=false`, `OpenLabel="Open menu"`, `CloseLabel="Close menu"`, `Icon="close"` (arrow), `Variant="ghost"`, `ChildContent`; supply `aria-controls` for your navigation. |

Tabs, toggles and menu-toggle require interactivity for state changes. Bind state
when the parent owns it; unbound controls keep separate internal state. Tabs use
roving focus, automatic activation, Home/End, orientation-aware arrows and RTL.
In static SSR the initial enabled tab is selected and its panel is visible; the
other panels are hidden. This intentionally chooses the initial-panel fallback,
so use separate links if every section must be navigable without JavaScript.

Accordion uses native details/summary and works without JavaScript. Single-open
mode shares the HTML `name` attribute: browsers supporting named details enforce
exclusivity; older browsers allow multiple open items. No JavaScript polyfill is
installed. `DefaultOpen` is initial native state, not a binding. CSS height
animation uses `::details-content` and `interpolate-size` where supported;
other browsers open/close instantly. Reduced motion disables animation.

Breadcrumb collapse uses native details so hidden links remain reachable in
static SSR. Pagination always renders real URLs and `aria-current="page"`.
Bind `Page` from the query string as above, or provide your own `GetHref`. The default preserves the current path and other
query parameters. Interactive query navigation can retain the list and glide its indicator;
a full document navigation places it instantly. Page numbers use FLIP and pop-in
motion when the range shifts. Tabs and pagination each own a disposable collocated
JS module with resize/mutation observers. Initial placement is instant, resize
remeasures, and reduced motion disables glide and FLIP. Static CSS marks the
active item before measurement and with JavaScript disabled.
