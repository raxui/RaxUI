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
  never silently replaced by `init` or `add`; use the explicit Blazor `update` command.
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
  `radio-group`, `switch`, `select`, `slider`, and `rating`. WebAssembly testing
  and configurable paths remain future work.

### Updating an existing Blazor application

Install or build the newer CLI first: its embedded registry is the update source.
From your app directory, preview and apply the changes:

```powershell
sheenui update --dry-run
sheenui update
dotnet build
```

Use `sheenui update button` to update one installed component and its dependencies;
the shared theme is refreshed with either form. `--cwd <app-directory>` works on
both commands. A new dependency is installed automatically. Existing imports are
retained, new imports are added once, and obsolete, unmodified component files are
removed. The lockfile is written last; ordinary write failures roll the operation
back. A dry run never writes files and returns a nonzero exit code on conflicts.

Local changes are kept when the corresponding registry file is unchanged. If
both changed, the entire update stops before writing and reports every conflict.
Save your edits separately, restore the previous installed bytes, update, then
reapply the edits. Alternatively, replace the app file with the exact new registry
source and retry; this refreshes its baseline. Automatic three-way merges are not
provided. There is no force-overwrite option. Locally deleted managed files,
untracked destination files, and edits to the shared `sheenui.css` also require
explicit recovery; keep custom theme rules in a separate app stylesheet.

Starter pages, layouts, `wwwroot/app.css`, and Bootstrap are not updated. Your
demo pages therefore remain app-owned. Keep `sheenui.lock.json`: it supplies the
baseline needed to distinguish your changes from registry changes. React's Node
CLI does not yet provide this update workflow.

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


## Dates and times

Install `date-input`, `time-picker`, `date-time-input`, or `date-range-input`.
Blazor retains native browser pickers; React provides the boot-ui segmented fields,
custom calendar and time wheels described below, with explicit Native exports for
compatibility. Bootstrap dark mode supplies color-scheme for native pickers.
All controls integrate with Field; React and Blazor value types differ.

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

React: DateInput and DateTimeInput now match boot-ui's segmented fields. Their
value/defaultValue and onChange use Date | null, refs point to the field group
(focus() moves to the first empty segment), and name posts a local ISO string.
DateInput also exports TimeInput, DateTimeInput and their prop types. DateTimeInput
is available from the date-time-input entry as well. Segment order, numerals and
labels follow locale; Arabic/Persian digits, arrow stepping, visual left/right
navigation, clearable, picker, min/max, isDateDisabled, sizes and field variants
are supported. Time fields add hourCycle (12 or 24) and minuteStep. Picker content
uses the shared calendar and time wheels inside the nearest SheenThemeProvider.
clearLabel, pickerLabel, nowLabel and doneLabel customize picker actions.

TimePicker is the standalone wheel group: value/defaultValue are
{ hours: number, minutes: number } | null and onChange receives TimeValue.
It supports locale, hourCycle, minuteStep, disabled and autoFocus. Use TimeInput
for an editable time field with hidden form submission. Current-time defaults are
read after hydration to support deterministic static Next.js prerendering. Calendar is independently
installable and supports single/range selection, min/max/disabled dates, localized
week starts, keyboard navigation, month/year selection and optional day content.

Migration: the old native string/ChangeEvent/HTMLInputElement APIs remain available
as NativeDateInput, NativeTimePicker and NativeDateTimeInput from the corresponding
entries. Existing applications can alias those exports to keep their old behavior.
Use Controller with Date | null for the new segmented fields instead of native
register handlers. No implicit UTC conversion is performed.

DateRangeInput now uses { from?: Date, to?: Date }, typed start/end segments, a
responsive one/two-month calendar, presets, minDays/maxDays, excludeDisabled,
renderDayContent, days/nights summaries and closeOnComplete. name posts
name_from/name_to local ISO date strings. It exports defaultRangePresets and
DateRangePreset without installing a separate picker. The native { start, end }
string contract, name/endName and orderMessage remain available through
NativeDateRangeInput and NativeDateRangeValue.


### Calendar-based React pickers

Install `date-picker` or `date-range-picker`. Both reuse the shared Calendar,
Popover, Input material and Field wiring; no additional runtime package is needed.
These button-based fields are separate from the segmented DateInput/DateRangeInput.

DatePicker accepts Date | null through value/defaultValue and onChange. It formats
the value using locale and formatOptions, closes on selection, and posts a local
YYYY-MM-DD hidden input when name is supplied. min, max and isDateDisabled constrain
the calendar. The forwarded ref reaches the trigger for schema error focus.

DateRangePicker accepts { from?: Date, to?: Date }. Edits stay in a draft: Apply
commits both dates; Cancel, Escape or outside dismissal discards them. Its calendar
previews a range on hover and displays two months on wider screens or one on phones.
Presets are shared with DateRangeInput; custom presets use DateRangePreset
{ label, range: () => DateRange }, and [] hides them. name submits name_from and
name_to ISO dates. Apply stays disabled for incomplete, reversed or constrained
ranges. Controlled values change only when the parent accepts onChange.

Both support appearance, field variant, size, dir, disabled, readOnly, invalid,
clearable, accessible names/descriptions, nearest-theme portals and field-level
onBlur. Disabled hidden inputs are excluded from form posts. clearLabel and
calendarLabel customize actions; DateRangePicker also exposes applyLabel,
cancelLabel, presetsLabel and startPrompt. Supply custom preset labels for
translation. Built-in presets are evaluated only while the popup is open, keeping
closed Next.js static prerenders deterministic.

```tsx
import { DatePicker } from "./components/ui/date-picker"
import { DateRangePicker } from "./components/ui/date-range-picker"

<DatePicker value={date} onChange={setDate} locale="en-GB" name="due" />
<DateRangePicker value={period} onChange={setPeriod} locale="ar-IQ" dir="rtl"
  applyLabel="تطبيق" cancelLabel="إلغاء" clearLabel="مسح" presets={[]}
  placeholder="اختر الفترة" calendarLabel="اختيار الفترة" name="period" />
```

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
input and field. React Combobox additionally installs Command for searchable
grouped results and multiple selection. Blazor retains its existing single-value
controls. Options use unique values; the React APIs below describe both modes.

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

React Combobox composes Popover and Command. Options support value, label,
disabled, description, icon, group and keywords. Single selection uses string | null;
multiple=true uses string[] with removable chips and maxChips. onValueChange
receives the matching value shape. clearable, onCreate(label), onSearchChange(query)
and loading cover clearing, creation and remote results (remote mode disables
client filtering). name posts one hidden input per selected value; disabled values
are not submitted. Field-level onBlur, invalid, size, variant and appearance are
supported. Translate placeholder/searchPlaceholder/emptyText, clearLabel,
removeLabel, createLabel and selectedText. The old single-value onChange callback
and emptyMessage alias remain available. The ref still points to the trigger.

React Autocomplete has two explicit modes. With options, each option has a distinct
value/label plus description, icon and disabled. value/defaultValue/onValueChange
control selection, while inputValue/defaultInputValue/onInputValueChange control
the text. minChars, custom filter (or false for server filtering), renderOption,
emptyMessage(query), loading, clearLabel, loadingMessage, wrapperClassName and
contentClassName customize the reference behavior. Ref and standard input/Field
attributes reach the search input. Editing clears selection; choosing shows its
label. Without options, the existing suggestions:string[] and onChange(string)
free-text API is retained, including loadSuggestions(query, AbortSignal), loading,
loadingMessage, emptyMessage, errorMessage, cancellation and stale-result guards.

Combobox and Autocomplete retain gliding pointer/keyboard highlights, disabled-item
skipping, Home/End, Enter, Escape, focus management and nearest-theme portals.
Combobox uses Command's highlight for grouped results. Select remains Radix-based
with groups, scrolling, form wiring and the shared gliding highlight. Command
retains matching/keywords, groups, loading/empty, shortcuts, dialog/focus support,
explicit IDs, Home/End and accessibility improvements; listId optionally connects
an external trigger with its list. No new external runtime dependency is needed.


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


## Overlays and feedback (phase 3)

Install `tooltip`, `hover-card`, `toast`, `sheet`, `drawer`, `context-menu`, or
`command` with `sheenui add <name>`. These items use manual native popovers or
native modal dialogs and require an interactive render mode. Each installs its
own compiled CSS and declared dependencies. Theme appearance, dark mode, accent,
density, and direction inherit from ancestors.

Tooltip and HoverCard render a real trigger button during static SSR; their
`popover="manual"` content stays hidden. Do not put essential information only
in these previews. The trigger fragments contain button content, not nested
buttons or links. Other overlays remain closed without JavaScript. Toaster is
interactive-only; place it once inside the same interactive layout/circuit as
its callers (for per-page interactivity, put the outlet in that page).

```razor
@rendermode InteractiveServer
@inject Toaster.ToastService Toasts

<Tooltip Side="top" Align="center" OpenDelay="400">
    <Trigger>Help</Trigger><ChildContent>Save your work first.</ChildContent>
</Tooltip>
<HoverCard Side="bottom" Label="Author preview">
    <Trigger>Author</Trigger>
    <ChildContent><p>Author details</p><a href="/author">View profile</a></ChildContent>
</HoverCard>
<button @onclick="@(() => Toasts.Show("Saved", "success", actionLabel: "Undo", action: Undo))">Save</button>
<Toaster DismissLabel="Dismiss notification" />
<button @onclick="@(() => sheetOpen = true)">Show settings</button>
<Sheet @bind-Open="sheetOpen" Side="end" Title="Settings" Description="Your preferences">
    <ChildContent>Settings content</ChildContent><Footer><button @onclick="@(() => sheetOpen = false)">Done</button></Footer>
</Sheet>
<button @onclick="@(() => drawerOpen = true)">Show actions</button>
<Drawer @bind-Open="drawerOpen" Title="Actions">Drawer content</Drawer>
<ContextMenu Label="File actions">
    <Target>Right-click or press Shift+F10 here</Target>
    <ChildContent><DropdownMenuItem OnSelect="OpenFile">Open file</DropdownMenuItem></ChildContent>
</ContextMenu>
<button @onclick="@(() => commandOpen = true)">Search commands</button>
<Command @bind-Open="commandOpen" Items="commands" OnSelect="RunCommand" />

@code {
    private bool sheetOpen, drawerOpen, commandOpen;
    private List<Command.Item> commands = new() { new("open", "Open file", "Files"), new("save", "Save file", "Files") };
    private Task Undo() => Task.CompletedTask;
    private void OpenFile() { /* Open the selected file. */ }
    private void RunCommand(string value) { /* Dispatch the command value. */ }
}
```

Register the service in **Program.cs**, before `builder.Build()` (replace
`YourApp` with your app's root namespace):

```csharp
builder.Services.AddScoped<YourApp.Components.UI.Toast.Toaster.ToastService>();
```

The nested service ships in `Toaster.razor`, so it needs no package or installer
extension. Scoped lifetime isolates Blazor Server circuits; never register it as
a singleton. Call it on the component's renderer dispatcher, using `InvokeAsync`
when reporting work from a background thread. `Show(title, tone="info",
description=null, duration=5000, actionLabel=null, action=null)` returns an ID.
Tones are info/success/warning/danger; duration is milliseconds, and zero or a
negative value disables auto-dismiss. Actions are `Func<Task>` and require a
nonempty action label. Auto-dismiss pauses for pointer hover, focus, and dragging;
horizontal swipes over 60px dismiss. Danger announces assertively, other tones
politely. The outlet waits for exit motion before removing each message.

| Item | Parameters and behavior |
| --- | --- |
| Tooltip | `Trigger`, `ChildContent`, `OpenDelay=400`, `CloseDelay=0`, `Side="top"` (bottom/left/right/start/end), `Align="center"` (start/end), `TriggerClass`, `Class`, `Appearance`, additional content attributes. The button's aria-describedby points to the content. Hover/focus opens; Escape, blur and leaving close. |
| HoverCard | Same preview parameters, `CloseDelay=200`, `Label="Preview"`. Pointer and keyboard focus may move into the content; Tab from the trigger enters its first control. Escape dismisses. |
| Toaster | `Position="top-center"` (top/bottom with center/right/left), `Label="Notifications"`, `DismissLabel="Dismiss"`, `Class`, `Appearance`. One outlet per interactive scope. |
| Sheet | `Open` / `OpenChanged`, `Title`, `Description`, `ChildContent`, `Footer`, `Side="end"` (start/top/bottom), `CloseLabel="Close"`, `Class`, `Appearance`, native attributes. Logical sides flip in RTL. |
| Drawer | Same panel parameters, bottom placement and a drag handle. Drag down past the greater of 60px and 25% of panel height to dismiss; shorter/cancelled drags spring back. Content remains scrollable because dragging starts only on the handle. |
| ContextMenu | `Target`, `ChildContent` composed of DropdownMenuItem/Label/Separator, `Label="Actions"`, `TargetClass`, `Class`, `Appearance`, content attributes. Right-click, Shift+F10 and the context-menu key open; arrows, Home/End, character typeahead, Enter/Space, Escape and Tab work like DropdownMenu. |
| Command | `Open` / `OpenChanged`, `Items: List<Command.Item>` (`Value`, `Label`, `Group=""`, `Disabled=false`, `Keywords=""`), `OnSelect(string)`, `Title="Command palette"`, `SearchPlaceholder="Search commands..."`, `EmptyMessage="No results found."`, `Class`, `Appearance`, native dialog attributes. Case-insensitive label/keyword filtering; arrows and Home/End skip disabled items, Enter runs and closes. Values should be unique. |

Sheet, Drawer and Command can also be opened through `@ref` and `ShowAsync()`
without binding. Sheet/Drawer expose `CloseAsync()`; Command exposes `Close()`.
They never mutate their Open parameter. Closing runs in the DOM, then reports
`OpenChanged(false)`; a parent controls subsequent parameter transitions.
Sheet and Drawer share the dialog item's native focus containment, Escape and
backdrop dismissal, and animation-aware closing. Reduced motion removes motion.
Blazor's command matcher uses ordinary case-insensitive substring matching;
React also retains boot-ui's accent/Arabic folding and subsequence matching.

## Adopted overlay appearance and gliding choices

The shared theme uses the boot-ui token values, with the following approved defaults.
Transparency is the visible-through amount; the corresponding CSS alpha is opacity.

| Component | Surface transparency | Surface blur | Light backdrop dim | Dark backdrop dim | Backdrop blur |
| --- | --- | --- | --- | --- | --- |
| Dialog / ConfirmDialog | 40% | 32px | 25% | 25% | 4px |
| Sheet | 45% | 32px | 25% | 25% | 4px |
| Drawer | 40% | 32px | 25% | 25% | 4px |

Surface transparency and blur apply to Glass; Default and Flat keep opaque panels.
Reduced-transparency preferences still force opaque surfaces. The same theme is compiled for Blazor.
Override the CSS properties on the theme provider or an appearance boundary to drive controls from app state:

- Dialog and ConfirmDialog share --sheen-dialog-alpha, --sheen-dialog-blur, --sheen-dialog-overlay-alpha, and --sheen-dialog-overlay-blur.
- Sheet uses the equivalent --sheen-sheet-* properties; Drawer uses --sheen-drawer-*.
- Alpha is 0–1: 0.4 means 60% transparency. Blur values require a CSS length, for example 32px.
- Light and dark dimming defaults resolve independently at data-bs-theme boundaries.

Ordinary Input keeps its original material and shadows with a slightly clearer border.
React Select, Combobox and Autocomplete include one sliding highlight matching Command's 160ms easing, including pointer and keyboard navigation, filtering, resizing, and reduced-motion preferences. Their manifests ship the helper and stylesheet even when adding to an already initialized app. Blazor Select remains a native select whose popup is drawn by the browser.

## React app shell

Install independently with `npx sheenui-react add navbar`, `sidebar`, `navigation-menu`, `menubar`, `footer` or `banner`. Each manifest installs its local dependencies, exact package versions and styles. Existing starters are unchanged.

| Component | Composition and behavior |
| --- | --- |
| Navbar | Brand, Links/Link, Actions, Toggle, Menu/MenuLink. Controlled or default open state; glass/transparent/solid and floating variants; configurable collapse breakpoint; gliding hover/current-page indicators; optional hide-on-scroll with a window or element scroll container. Escape restores toggle focus, links and breakpoint changes close the mobile menu. |
| Sidebar | Provider, Trigger/Rail, Header/Content/Footer/Inset, groups, menu items, badges, skeletons and collapsible submenus. Offcanvas/icon/none modes, sidebar/floating/inset variants, logical start/end sides and a themed mobile Sheet. Optional storageKey remembers desktop collapse; shortcut defaults to Ctrl/Command+B and ignores editable controls. Give each independently controlled sidebar its own provider. |
| NavigationMenu | List, Item, Trigger, Content, Link, ListItem, Indicator and Viewport. Radix mega-menu semantics and keyboard navigation; a shared viewport glides and resizes under the active trigger, clamped inside the window. viewport=false allows custom panel placement; viewportAlign selects trigger or start. |
| Menubar | Menu/Trigger/Content, groups, labels, items, checkboxes, radio groups, submenus and shortcuts. Gliding open-trigger highlight, disabled/destructive items, keyboard navigation and nearest-theme portals. |
| Footer | Brand, columns, links, social links, newsletter, bottom/legal/copyright and back-to-top. Columns become disclosures on phones. Newsletter validates email, awaits onSubscribe, displays success or a configurable errorMessage and supports retry; no service is called unless the consumer provides onSubscribe. Back-to-top respects reduced motion. Pass year for an explicit server-rendered copyright year; otherwise the current year appears after hydration. |
| Banner | Inline, sticky top or floating bottom placement; tinted/solid/glass variants; tone icons and optional actions; controlled open state or dismissible internal state. persistKey remembers dismissal; resetBanner(key) clears it for the next mount. BannerGroup stacks top banners. Floating banners portal into the nearest theme and mount after hydration. |

Roots accept appearance overrides and inherit theme tokens, density, color mode and direction; local dir sections are respected. Navbar/sidebar roots and their composable parts forward refs. Built-in names can be translated with aria-label or the label, description, dismissLabel and newsletter text props. Sidebar desktop preference and banner dismissal storage are read after hydration so persisted settings cannot change the initial server markup. React 18 and 19 inert/ref differences are handled by the shared installed helper. CSS motion follows prefers-reduced-motion.

```tsx
import { Navbar, NavbarBrand, NavbarLinks, NavbarLink, NavbarToggle, NavbarMenu, NavbarMenuLink } from "@/components/ui/navbar"
import { Banner } from "@/components/ui/banner"

<>
  <Banner title="New release" dismissible dismissLabel="Dismiss announcement">Read the release notes.</Banner>
  <Navbar expand="md">
    <NavbarBrand href="/">My app</NavbarBrand>
    <NavbarLinks label="Main"><NavbarLink href="/docs" active>Docs</NavbarLink></NavbarLinks>
    <NavbarToggle aria-label="Open navigation" />
    <NavbarMenu label="Mobile navigation"><NavbarMenuLink href="/docs" active>Docs</NavbarMenuLink></NavbarMenu>
  </Navbar>
</>
```

The reference-based consumer examples in react-test cover all six components, including Arabic sections and desktop/mobile layouts. Shared generated CSS is refreshed; new Blazor app-shell components remain deferred.
