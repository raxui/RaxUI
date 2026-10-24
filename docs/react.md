# SheenUI for React

Source-owned React components on Bootstrap 5.3 SCSS and Radix UI, with the shared SheenUI theme: `default`, `flat`, and `glass` appearances, light and dark mode, accents, density, and RTL. It supports **React 18.3 or 19 with TypeScript** on **Vite 6 or later** or **Next.js 15 or later (App Router, without Tailwind)**, with buttons, overlays, fields, forms and basic controls ([ADR 006](adr/006-react-first-milestone.md), [ADR 010](adr/010-vite-6-and-later.md), [ADR 011](adr/011-nextjs.md)).

## Basic controls

Install `input`, `input-group`, `textarea`, `checkbox`, `radio-group`, `switch`,
or `select` with `npx sheenui-react add <name>`. They require `foundation` and
`field`; `input-group` also installs `input`. Selection controls pin Radix
Checkbox **1.4.1**, RadioGroup **1.5.1**, Switch **1.4.1**, and Select **2.4.1**.
The installer adds each control's SCSS import; input and textarea share a mixin
partial owned by foundation, so either works when installed alone.

```tsx
import { Field, FieldControl, FieldLabel, FieldError } from "@/components/ui/field"
import { Input, PasswordInput } from "@/components/ui/input"
import { InputGroup, InputGroupItem } from "@/components/ui/input-group"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"

export function BasicControls() {
  return <>
    <Field id="email"><FieldLabel>Email</FieldLabel>
      <FieldControl><Input type="email" clearable startIcon={<i className="your-mail-icon" aria-hidden="true" />} /></FieldControl>
      <FieldError />
    </Field>
    <Field><FieldLabel>Password</FieldLabel><FieldControl><PasswordInput /></FieldControl></Field>
    <Field><FieldLabel>Quantity</FieldLabel><FieldControl><Input type="number" defaultValue="1" /></FieldControl></Field>
    <Field><FieldLabel>Search</FieldLabel><FieldControl><Input type="search" /></FieldControl></Field>
    <Field><FieldLabel>Phone</FieldLabel>
      <FieldControl><InputGroup autoAdvance>
        <InputGroupItem aria-label="Prefix" maxLength={3} />
        <InputGroupItem aria-label="Number" maxLength={7} />
      </InputGroup></FieldControl>
    </Field>
    <Field><FieldLabel>Notes</FieldLabel><FieldControl><Textarea autoResize minRows={3} maxRows={10} /></FieldControl></Field>
    <Field orientation="inline"><FieldControl><Checkbox defaultChecked="indeterminate" /></FieldControl><FieldLabel>Select all</FieldLabel></Field>
    <Field orientation="inline"><FieldControl><Switch /></FieldControl><FieldLabel>Updates</FieldLabel></Field>
    <Field><FieldLabel>Plan</FieldLabel><FieldControl><RadioGroup defaultValue="personal">
      <label><RadioGroupItem value="personal" /> Personal</label>
      <label><RadioGroupItem value="team" /> Team</label>
    </RadioGroup></FieldControl></Field>
    <Select defaultValue="iq"><Field><FieldLabel>Country</FieldLabel>
      <FieldControl><SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger></FieldControl>
    </Field><SelectContent><SelectItem value="iq">Iraq</SelectItem><SelectItem value="gb">United Kingdom</SelectItem></SelectContent></Select>
  </>
}
```

Controls also read `useFieldControlProps` directly, so they work with
`FieldControl` and react-hook-form's `FormControl` without duplicate description
IDs. For Select, put the trigger inside Field; Root has no DOM element. Each
joined-input member gets its own identity. Supply individual member labels.
Wrap themed areas in `SheenThemeProvider`; Select portals into its nearest
element to preserve appearance, mode, accent, density and direction.

| Control | Props beyond native / Radix props and forwarded refs |
| --- | --- |
| `Input` | `appearance`, `size="default"` (sm/lg), `variant="outline"` (filled/glass alias), `startIcon`, `endIcon`, `clearable`, `onClear`, `clearLabel="Clear"`, `invalid`, `wrapperClassName` |
| `PasswordInput` | Input props except type/endIcon; `showLabel="Show password"`, `hideLabel="Hide password"`. Eye action toggles visibility and aria-pressed; defaults autocomplete to current-password. |
| `InputGroup` | `size`, `variant`, `orientation="horizontal"` (vertical), `disabled`, `invalid`, `required`, `autoAdvance=false`. Members accept Input props except size/icons/clear and wrapper options. |
| `Textarea` | `appearance`, `variant="glass"` (filled), `autoResize=false`, `minRows=3`, `maxRows=10`, `showCount=false`, `limitLabel="Character limit reached"`, `footer`, `footerEnd`, `invalid`, `wrapperClassName`. Counter requires maxLength. |
| `Checkbox` | `appearance`, `size="default"` (sm/lg), `shape="square"` (circle); Radix checked/defaultChecked allow true, false or indeterminate. |
| `RadioGroup` | `appearance`; Radix value/defaultValue, onValueChange, orientation, dir, disabled, required, name. `RadioGroupItem` takes value, appearance and size. |
| `Switch` | `appearance`, `size="default"` (sm/lg), `loading=false` (disables changes and shows a Bootstrap spinner); checked/defaultChecked and onCheckedChange. |
| `Select` | `appearance`; Radix value/defaultValue, onValueChange, open/defaultOpen, onOpenChange, disabled, required, name and dir. |
| `SelectTrigger` | `appearance`, `size="default"` (sm/lg), className and Radix trigger props. |
| `SelectContent` | `appearance`, `position="popper"` (item-aligned), `sideOffset=6`, `collisionPadding=8` and Radix content props. |

Select also exports `SelectGroup`, `SelectLabel`, `SelectSeparator`,
`SelectScrollUpButton` and `SelectScrollDownButton` with their Radix props.
All visible built-in text has an English default that can be translated through
the corresponding label prop. Decorative slot clicks focus Input; icon sizing
covers SVG and font icons with selectors stronger than Blazicons defaults.

Use `value`/`onChange` or `defaultValue` for input, textarea and each joined
segment; `checked`/`onCheckedChange` or `defaultChecked` for checkbox/switch;
`value`/`onValueChange` or `defaultValue` for radio/select. Example controlled
checkbox: `checked={checked} onCheckedChange={setChecked}`, where state is
`boolean | "indeterminate"`. `Input type="password"` renders a native masked
input; use `PasswordInput` for the eye action. Joined inputs move at maxlength,
on empty Backspace and boundary arrows (following direction), and distribute
long pastes. Each retains its own value and form name. Radix owns selection
keyboard behavior, including Space, radio arrows, and Select typeahead,
arrows, Home/End, Enter and Escape. Focus rings stay visible and decorative
motion respects reduced-motion preferences.

## Fields and forms

Install with `npx sheenui-react add field`, `add form`, or `add form-section`.
Dependencies are installed first: Form and FormSection require Field and the
foundation. Form pins `react-hook-form` **7.91.0**, `zod` **4.6.7**, and
`@hookform/resolvers` **5.9.2**. All new sources are client components.

### Field

`Field`, `FieldLabel`, `FieldControl`, `FieldDescription`, `FieldError`,
`FieldSet`, and `FieldLegend` work with plain state or a form library.

```tsx
import { Field, FieldLabel, FieldControl, FieldDescription, FieldError,
  FieldSet, FieldLegend } from "./components/ui/field"

<Field id="email" required invalid={!!error}>
  <FieldLabel requiredIndicator="*">Email</FieldLabel>
  <FieldControl><input className="form-control" value={email} onChange={e => setEmail(e.target.value)} /></FieldControl>
  <FieldDescription>We'll never share it.</FieldDescription>
  <FieldError>{error}</FieldError>
</Field>

<Field optional>
  <FieldLabel optionalText="Optional">Nickname</FieldLabel>
  <FieldControl><input className="form-control" /></FieldControl>
</Field>

<FieldSet disabled>
  <FieldLegend>Notifications</FieldLegend>
  <label><input type="checkbox" /> Email updates</label>
</FieldSet>
```

Use your own `email`, `setEmail`, and `error` state. `FieldControl` wraps one
control and merges its props with `id`, `aria-labelledby`, `aria-describedby`,
`aria-invalid`, `aria-required`, and `disabled`. Description and error IDs are
included only while their parts exist. Custom controls can instead call
`useFieldControlProps(ownProps)` or read `useField()`. Pass the control ID to
Field so its label targets the same ID. Inputs must forward props and refs.

`orientation` is `vertical`, `horizontal`, or `inline` (control before label).
`required` shows an asterisk, `optional` shows `"(Optional)"` instead;
`requiredIndicator={false}` hides the visual marker. FieldError supports
`forceMount`. FieldSet renders a native fieldset for grouped controls.
All parts accept `className` and native HTML attributes. Theme with ancestor
`data-sheen-appearance`, `data-bs-theme`, `data-sheen-accent`, and `dir`.

### Form

```tsx
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Form, FormField, FormItem, FormLabel, FormControl,
  FormDescription, FormMessage } from "./components/ui/form"

const schema = z.object({ name: z.string().min(1, "Name is required") })

export function ProfileForm() {
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { name: "" } })
  return <Form {...form} schema={schema}>
    <form noValidate onSubmit={form.handleSubmit(values => console.log(values))}>
      <FormField control={form.control} name="name" render={({ field }) => (
        <FormItem>
          <FormLabel>Name</FormLabel>
          <FormControl><input className="form-control" {...field} /></FormControl>
          <FormDescription>Your full name</FormDescription>
          <FormMessage />
        </FormItem>
      )} />
      <button type="submit">Save</button>
    </form>
  </Form>
}
```

Form provides React Hook Form context; you own the actual `<form>` and submit
handler. FormField wraps Controller and supplies error, disabled and required
state to the next Field. FormItem, FormLabel, FormControl, FormDescription and
FormMessage are the corresponding Field parts. A FormRow inside FormField
receives the same defaults. `useFormField()` exposes the current field state
and IDs. `form.setError("name", { type: "server", message: "Already used" })`
displays server errors through FormMessage.

`isRequiredInSchema(schema, name)` follows boot-ui: a field is required only
when none of `undefined`, `""`, `false`, `[]`, or `null` pass its schema. Thus
`z.string().min(1)` is required, while `z.string()` and `.optional()` are not.
Nested object and array paths are supported. FormField's `required` prop can
override inference. Set `optional` on FormItem/FormRow to show the optional
hint. After an invalid submit, Form focuses the first invalid control and
shakes its Field. Reduced motion disables the shake and smooth scrolling.
Plain forms can call `focusFirstInvalid(formElement)` from the field module.

### FormSection

```tsx
import { FormSection, FormRow, FormRowLink } from "./components/ui/form-section"

<FormSection title="Account" footer="Manage your public profile.">
  <FormRow label="Nickname" optional description="Visible to friends">
    <input className="form-control" />
  </FormRow>
  <FormRow label="Biography" layout="stacked"><textarea className="form-control" /></FormRow>
  <FormRowLink label="Language" value="English" asChild><a href="/language" /></FormRowLink>
  <FormRowLink label="Sign out" destructive onClick={signOut} />
</FormSection>
```

Supply your `signOut` callback. FormRow takes one control and wires it through
FieldControl. It accepts `id`, `required`, `optional`, `disabled`, `invalid`,
`error`, `description`, `icon`, `iconColor`, and `layout` (`inline` or `stacked`).
FormRowLink is a button by default, or your link with `asChild`; `destructive`
makes its text red and hides the chevron. It also accepts `label`, `value`,
`description`, `icon`, `iconColor`, and native button props. Icon colors are
blue, green, red, orange, yellow, teal, indigo, purple, pink, and gray.

## Install

The CLI is not published to npm yet; install it from a packed tarball. From this repository:

```sh
npm ci
npm pack ./src/react-cli --pack-destination .
```

In a React + Vite (TypeScript) app:

```sh
npm install -D --save-exact --ignore-scripts /path/to/sheenui-react-0.1.0-preview.1.tgz
npx sheenui-react init
npx sheenui-react add button
```

`init`:

- copies `src/lib/theme.tsx`, `src/lib/utils.ts`, and the theme partials into `src/styles/sheenui/`;
- creates `src/styles/sheenui.scss` (theme variables, then Bootstrap, then the theme core);
- adds `import "./styles/sheenui.scss"` as the first line of `src/main.tsx` (or `src/main.jsx`);
- installs Button (`src/components/ui/button.tsx` and its style partial), used by the welcome page;
- replaces the unmodified Vite template `src/App.tsx` with a SheenUI app shell and welcome page where you can try the theme, and removes the template files only that App used (`App.css`, `index.css` and its import, `src/assets/*`, `public/icons.svg`). Files you changed are kept and reported ([ADR 008](adr/008-starter-app.md));
- installs missing packages (`bootstrap`, `sass`, `clsx`, `@radix-ui/react-slot`) with `npm install --save-exact --ignore-scripts`.

`add <component>` copies a component and its style partial and adds the style import to `src/styles/sheenui.scss`. `add button` after `init` changes nothing, since Button is already installed.

Options: `--cwd <dir>`, `--no-install` (print the npm command instead of running it). With Yarn, pnpm, or Bun lockfiles the CLI prints the command for you to run.

If your entry already imports Bootstrap CSS (for example `bootstrap/dist/css/bootstrap.min.css`), remove that import first: Bootstrap is compiled from SCSS in `src/styles/sheenui.scss`.

## Next.js

In a Next.js 15+ App Router project created without Tailwind (`npx create-next-app@latest --ts --app --no-tailwind`), the same commands work. The CLI detects Next.js and:

- installs into the project root, or into `src/` when you used `--src-dir`;
- creates `styles/sheenui.scss`, which imports Bootstrap by path (`../node_modules/bootstrap/scss/bootstrap`), and imports it as the first line of `app/layout.tsx`. Your layout is kept;
- replaces the unmodified template `app/page.tsx` with the welcome page (a client component), and removes the template `page.module.css`, `globals.css` (and its import), and `public/*.svg`. Changed files are kept and reported;
- installs `lib/theme.tsx` and `components/ui/button.tsx` with `"use client"`, so use them from client components or pass them into server components as children.

Tailwind projects, the Pages Router, JavaScript layouts, and Next.js 14 or older are rejected with a message ([ADR 011](adr/011-nextjs.md)).

## Tooling diagnostics

`init` configures plain Vite `defineConfig({ ... })` and Next.js `nextConfig`
template objects for Bootstrap 5 Sass compatibility. It suppresses only the
`import`, `global-builtin`, `color-functions`, and `if-function` deprecation
categories, which Bootstrap 5 still uses. This is temporary compatibility
configuration, not a migration of Bootstrap to modern Sass. Other Sass warnings
and compilation errors remain enabled. These category settings also apply to
your own SCSS in the same build.
Next.js also suppresses `legacy-js-api`, because Next 15's Turbopack loader uses
that Sass API; this does not change the loader's implementation.

For Vite the options go in `css.preprocessorOptions.scss.silenceDeprecations`;
for Next.js they go in `sassOptions.silenceDeprecations`:

```ts
silenceDeprecations: ["import", "global-builtin", "color-functions", "if-function"]
```

For plain Next.js templates, `init` also sets `turbopack.root` and
`outputFileTracingRoot` to the config file's directory (`__dirname`, or
`import.meta.dirname` for ES module configs) so unrelated parent lockfiles do not
change the application root, wherever the command runs from.
Monorepos or linked packages may need a shared parent root instead.
Existing CSS/Sass/root settings, spreads, and unsupported config shapes are kept
and reported for manual setup. Review custom settings before merging these options.
Windows package installation runs `npm-cli.js` directly with Node, without a shell.

## Use

```tsx
import { Button } from "./components/ui/button"
import { SheenAppearanceScope, SheenThemeProvider } from "./lib/theme"

export default function App() {
  return (
    <SheenThemeProvider appearance="default" mode="light" direction="ltr" density="comfortable">
      <Button onClick={() => alert("Saved")}>Save</Button>
      <Button variant="outline" size="sm">Cancel</Button>
      <Button color="success">Approve</Button>
      <Button asChild variant="link">
        <a href="/docs">Docs</a>
      </Button>

      <SheenAppearanceScope appearance="glass">
        <Button>Glass</Button>
        <Button appearance="flat">Flat override</Button>
      </SheenAppearanceScope>
    </SheenThemeProvider>
  )
}
```

Button props:

| Prop | Values |
| --- | --- |
| `variant` | `default`, `solid`, `secondary`, `tinted`, `destructive`, `outline`, `ghost`, `link` |
| `size` | `default`, `sm`, `lg`, `icon`, `icon-sm`, `icon-lg` |
| `appearance` | `default`, `flat`, `glass` (inherits when omitted) |
| `color` | `primary`, `secondary`, `success`, `danger`, `warning`, `info`, or any Bootstrap theme color name |
| `asChild` | Render the child element (for example a link) with the button styles |

Plus every native `<button>` attribute and a forwarded `ref`. `type` defaults to `button`, so buttons do not submit forms unless you pass `type="submit"`.

### Icons

Components take any icon node. For your own icons, SheenUI recommends [`lucide-react`](https://lucide.dev) ([ADR 014](adr/014-icons.md)); icons follow the text color and the slot's size:

```tsx
import { Trash2 } from "lucide-react"

<Button variant="destructive"><Trash2 aria-hidden /> Delete</Button>
```

### Dialog and DropdownMenu

`npx sheenui-react add dialog` and `npx sheenui-react add dropdown-menu` install wrappers over Radix with the shared styles ([ADR 013](adr/013-overlay-primitives.md)). Their content renders inside the nearest `SheenThemeProvider`, so mode, appearance, accent, and direction apply to it.

```tsx
<Dialog>
  <DialogTrigger asChild><Button variant="destructive">Delete…</Button></DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Delete file?</DialogTitle>
      <DialogDescription>This cannot be undone.</DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
      <Button variant="destructive" onClick={remove}>Delete</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

<DropdownMenu>
  <DropdownMenuTrigger asChild><Button variant="secondary">Options</Button></DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuLabel>Actions</DropdownMenuLabel>
    <DropdownMenuItem onSelect={edit}>Edit</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem disabled>Archive</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

`DialogContent` also takes `appearance`, `showCloseButton`, and `closeLabel`; `DropdownMenuContent` takes `appearance` and every Radix content prop (it defaults to `align="start"` and `sideOffset={4}`).

### ConfirmDialog

`npx sheenui-react add confirm-dialog` installs boot-ui's confirmation on Radix AlertDialog (it also installs Button). A click outside nudges it instead of closing; focus starts on Cancel.

```tsx
<ConfirmDialog
  trigger={<Button variant="destructive">Delete project</Button>}
  title="Delete project?"
  description="This removes it for everyone."
  tone="destructive"
  confirmText="Delete"
  confirmationText="my-app"
  onConfirm={() => api.deleteProject()} // a promise keeps it open with a spinner; a rejection shows its message
/>
```

Props: `tone` (`default`, `destructive`, `warning`, `success`), `icon`, `cancelText`, `confirmationLabel`, `layout` (`inline` or `stacked`), `appearance`, `open`/`defaultOpen`/`onOpenChange`, and `onCancel`. The file also exports the `AlertDialog*` parts for custom layouts.

Appearance precedence: the component's `appearance`, then the nearest `SheenAppearanceScope`, then `SheenThemeProvider`, then `default`. `mode`, `direction`, and `density` travel the same way.

## Slider and rating

`npx sheenui-react add slider` installs `@radix-ui/react-slider` **1.6.1**;
`npx sheenui-react add rating` adds no packages. Both require `foundation` and
`field`. Import `Slider` from `@/components/ui/slider` and `Rating` (or
`RatingBreakdown`) from `@/components/ui/rating`.

```tsx
<Field id="volume">
  <FieldLabel>Volume</FieldLabel>
  <Slider defaultValue={[40]} name="volume" />
  <FieldDescription>Choose your listening level.</FieldDescription>
</Field>
<Slider value={price} onValueChange={setPrice} min={0} max={100} step={1}
        thumbLabels={["Minimum price", "Maximum price"]} />
<Field id="score">
  <FieldLabel>Score</FieldLabel>
  <Rating value={score} onValueChange={setScore} name="score" allowHalf />
  <FieldError />
</Field>
<RatingBreakdown counts={[4, 8, 12, 40, 86]} />
```

Slider takes all Radix root props, including `value`/`defaultValue` (arrays: one
value or two for a range), `onValueChange`, `onValueCommit`, `min`, `max`, `step`,
`disabled`, `name`, `dir`, and `orientation`. Additional props: `size`
(`sm`, `default`, `lg`), `variant` (`default`, `bar`), `showValue` (true, false,
`always`), `formatValue`, `marks` (numbers or `{ value, label }`), `icon`,
`thumbLabels`, and `appearance`. Its ref is the root span; Field ids and ARIA are
applied to the focusable thumb (both thumbs receive descriptions and errors).
Arrows, Home/End and PageUp/PageDown are native Radix behavior; range values
stay ordered. Marks are horizontal only. RTL mirrors fill, keys and marks.

Rating takes numeric `value`/`defaultValue` (default 0), `onValueChange`, `onChange`
(an alias for form libraries), `onBlur`, `max` (5), `allowHalf`, `clearable` (true),
`disabled`, `readOnly`, `invalid`, `size`, `color` (`warning`, `primary`, `danger`,
`success`), `icon`, `labels`, `showLabel`, `showValue`, `count`, `locale`, `name`,
`dir`, `appearance`, and standard div attributes. The ref points to its focusable
slider. Pointer hover previews a score; clicking the current score clears it.
Arrows step by one or half (horizontal arrows mirror in RTL), Home/End choose
zero/max, and digits choose a score. `name` adds a hidden input for form posts.
Read-only mode displays fractional scores as an accessible image.

All English text is overridable: `getValueText(value, max, label)` defaults to
"4 out of 5 stars, Great"; `RatingBreakdown.formatTotal(total, formatted)` defaults
to "1,284 ratings", and `formatBar(stars, count, percent)` names each summary bar.
`labels` supplies app-defined score words. Supply `thumbLabels` for distinct
range endpoint names. Appearance, density, dark mode and accents inherit the
shared theme; direction uses `useSheenTheme` and falls back to computed CSS direction.

## Customize

- **Bootstrap variables:** set them at the top of `src/styles/sheenui.scss`, above the imports, for example `$primary: #0a84ff;`.
- **Theme tokens:** override `--sheen-*` custom properties in your own CSS, for example `--sheen-radius-control` or `--sheen-glass-blur`.
- **Accent:** add `data-sheen-accent="emerald"` (or `indigo`, `amber`) on `<html>` or any wrapper.
- **Source:** component files such as `button.tsx` and `_button.scss` are yours to edit. Repeated `init`/`add` never overwrite files you changed.

Users who set their system to reduce transparency get opaque glass automatically.

## Guarantees and limits

- `sheenui.react.json` and `sheenui.react.lock.json` record the CLI release and SHA-256 hashes of installed files.
- Unknown files, locally modified files, and files from another release are never silently replaced. Paths that escape the project, including through symlinks or junctions, are rejected.
- Ordinary write failures restore original files and remove new empty folders.
- Sass prints `@import` deprecation warnings that come from Bootstrap 5.3 itself.
- Only React on Vite 6+ or Next.js 15+ (App Router, no Tailwind) and the shipped registry components are supported. The welcome page replaces the `create-vite` 6.x–9.x `react-ts` App or the `create-next-app` 15.x–16.x page; other templates are kept and reported. Other components, `update`/`diff`, path aliases, and other build tools are future work.


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
