# SheenUI for React

Source-owned React components on Bootstrap 5.3 SCSS and Radix UI, with the shared SheenUI theme: `default`, `flat`, and `glass` appearances, light and dark mode, accents, density, and RTL. It supports **React 18.3 or 19 with TypeScript** on **Vite 6 or later** or **Next.js 15 or later (App Router, without Tailwind)**, with buttons, overlays, fields, forms and basic controls ([ADR 006](adr/006-react-first-milestone.md), [ADR 010](adr/010-vite-6-and-later.md), [ADR 011](adr/011-nextjs.md)).

The registry keeps components under `registry/react/components/<name>/`, the
foundation under `registry/react/foundation/`, and starters under `starter-react/`
(Vite) and `starter-next/` (Next.js). The Vite starter item is named `starter-react`.
Installed component and SCSS paths in your app are unchanged.

## Basic controls

Install `input`, `input-group`, `textarea`, `checkbox`, `radio-group`, `switch`,
or `select` with `npx sheenui-react add <name>`. They require `foundation` and
`field`; `input-group` also installs `input`. Selection controls pin Radix
Checkbox **1.4.1**, RadioGroup **1.5.1**, Switch **1.4.1**, and Select **2.4.1**.
The installer adds each control's SCSS import; input and textarea share a mixin
partial shipped with each item, so either works when installed alone.

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
| `Input` | `appearance`, `size="default"` (sm/lg), `variant="filled"` (outline; glass is a legacy alias of filled), `startIcon`, `endIcon`, `clearable`, `onClear`, `clearLabel="Clear"`, `invalid`, `wrapperClassName` |
| `PasswordInput` | Input props except type/endIcon; `showLabel="Show password"`, `hideLabel="Hide password"`. Eye action toggles visibility and aria-pressed; defaults autocomplete to current-password. |
| `InputGroup` | `size`, `variant="filled"`, `orientation="horizontal"` (vertical), `disabled`, `invalid`, `required`, `autoAdvance=false`. Members accept Input props except size/icons/clear and wrapper options. |
| `Textarea` | `appearance`, `variant="filled"` (outline; glass is a legacy alias of filled), `autoResize=false`, `minRows=3`, `maxRows=10`, `showCount=false`, `limitLabel="Character limit reached"`, `footer`, `footerEnd`, `invalid`, `wrapperClassName`. Counter requires maxLength. |
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

Install `alert`, `badge`, `avatar`, `card`, `skeleton`, `spinner`, `progress`,
`table`, or `timeline` with `npx sheenui-react add <name>`. Each requires only
foundation. Avatar pins Radix Avatar **1.3.1**; Progress pins Radix Progress
**1.2.1**; Badge, Card and Skeleton reuse Radix Slot **1.5.0**. No icon package is
required. Roots accept `appearance` (default/flat/glass; unset inherits),
`className`, native attributes and forwarded refs. Theme, accents, dark mode,
density and RTL inherit from the enclosing provider or DOM boundary. These
components have no portals.

```tsx
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback, AvatarBadge } from "@/components/ui/avatar"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Skeleton, SkeletonText } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Progress } from "@/components/ui/progress"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption } from "@/components/ui/table"
import { Timeline, TimelineItem } from "@/components/ui/timeline"

export function DisplayBasics() {
  return <>
    <Alert tone="success" title="Saved" dismissible dismissLabel="Dismiss message">
      <AlertDescription>Your changes are ready.</AlertDescription>
    </Alert>
    <Badge color="success" dot="pulse">Live</Badge>
    <Avatar size="lg">
      <AvatarImage src="/people/saad.jpg" alt="Saad" />
      <AvatarFallback name="Saad Alsaree" />
      <AvatarBadge status="online" label="Available" />
    </Avatar>
    <Card appearance="glass"><CardHeader><CardTitle>Account</CardTitle>
      <CardDescription>Your details</CardDescription></CardHeader>
      <CardContent>Profile information</CardContent><CardFooter>Updated today</CardFooter>
    </Card>
    <Skeleton shape="circle" width={40} />
    <SkeletonText lines={3} />
    <Spinner label="Loading account" size="sm" color="primary" />
    <Progress label="Upload" value={25} max={50} showValue />
    <Progress accessibleLabel="Preparing files" value={null} />
    <Table density="compact" striped><TableCaption>People</TableCaption>
      <TableHeader><TableRow><TableHead>Name</TableHead></TableRow></TableHeader>
      <TableBody><TableRow><TableCell>Saad</TableCell></TableRow></TableBody>
    </Table>
    <Timeline labels={{ current: "Active" }}>
      <TimelineItem title="Placed" status="done" time="09:00" dateTime="2026-10-24T09:00" />
      <TimelineItem title="Delivery" status="current" description="On the way" />
    </Timeline>
  </>
}
```

| Item | Props and defaults |
| --- | --- |
| Alert | `tone="info"` (success/warning/danger/neutral), `variant="tinted"` (outline/solid/glass), `icon=true` (false or custom node), `title`, `dismissible=false`, `open` / `defaultOpen=true` / `onOpenChange`, `dismissLabel="Dismiss"`. Parts: AlertTitle, AlertDescription, AlertActions. Warning/danger announce assertively; other tones politely. Dismissal collapses then unmounts; reduced motion removes it immediately. |
| Badge | `variant="tinted"` (solid/outline/glass), `color="primary"` (secondary/success/warning/danger/info/neutral), `size="default"` (sm/lg), `shape="pill"` (rounded), `dot` (true or pulse), `onRemove`, `removeLabel="Remove"`, `asChild=false`. With asChild supply dot/remove content yourself. `BadgeCount`: required count, `max=99`, dot, showZero, `color="danger"`, `placement="top-end"` (bottom-end), `getLabel(count)` defaults to ?N notifications?. |
| Avatar | `size="default"` (xs/sm/lg/xl), `shape="circle"` (rounded), `ring=false`. AvatarImage takes native image props including alt; Radix shows it after successful loading. AvatarFallback takes name (initials and stable tint), `fallbackLabel="Avatar"`, optional children and delayMs. AvatarBadge takes required status (online/away/busy/offline) and label (defaults to status). AvatarGroup takes max, size, and `getMoreLabel(count)` (defaults to ?N more?). `getInitials(name)` supports Unicode and skips Arabic ??. |
| Card | `variant="default"` (tinted/outline), `interactive=false`, `asChild=false`. Parts: CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter. For an interactive card use asChild with a native link/button; interactive supplies visual feedback only. CardTitle is a div; supply a heading when needed. |
| Skeleton | `shape="rect"` (circle/pill/text), width/height (numbers in px or CSS strings), `animation="shimmer"` (pulse/none), `loading=true`. With children, loading hides and makes content inert, then reveals it; without children it is decorative. SkeletonText takes `lines=3`, `lastLineWidth="60%"`, animation. |
| Spinner | `label="Loading"`, `size="default"` (sm/lg), `color="primary"` (secondary/success/warning/danger/info/neutral), native SVG attributes. Role status; pass aria-hidden when the parent announces loading. Stops with reduced motion. Existing inline Bootstrap spinners remain unchanged. |
| Progress | Nullable value (null/undefined = indeterminate), `max=100`, label, `accessibleLabel="Progress"`, showValue, `formatValue(value,max)` (percentage), Radix getValueLabel, `size="default"` (sm/lg), `color="primary"` (success/warning/danger/info/neutral), segments, successOnComplete. Values clamp to 0..max; invalid maxima use 100, nonfinite values are indeterminate. Indeterminate bars omit aria-valuenow and stay visible without motion. ProgressCircle takes value/max/color, `size=56` px, thickness, showValue (true at 40px+), formatValue, successOnComplete and center children; supply aria-label. |
| Table | density (inherits; comfortable/compact), `hover=true`, `striped=false`, `stickyHeader=false`, containerClassName/containerStyle. Parts: TableHeader, TableBody, TableFooter, TableRow, TableHead (`scope="col"`), TableCell, TableCaption. Native table attributes and refs pass through; row headers use scope=row. Give the container maxHeight for sticky headers. No sorting or paging. |
| Timeline | `layout="start"` (alternate/horizontal), `timePosition="inline"` (side), `size="default"` (sm), `animated=true`, labels overrides for done/current/upcoming/error (completed/in progress/upcoming/failed). TimelineItem takes `status="done"`, tone (primary/success/warning/danger/info/neutral; inferred), marker, time, dateTime, title, description and children. Current events expose aria-current=step. TimelineGroup supplies list headings. `relativeTime(date, {locale, now, maxDays=30})` formats relative times; pass an explicit now for deterministic SSR. |

All built-in words are translatable through props, including removal/dismiss
labels, avatar fallback/presence/overflow labels, progress formatting, and timeline
statuses. Inline built-in icons use Lucide paths (ISC); custom slots accept any
markup and use two-class sizing. Reduced motion disables shimmer, pulsing,
entrance, collapse and spinner motion. Table and Timeline keep their native list
and table semantics. React retains boot-ui's optional helpers (BadgeCount,
AvatarGroup, ProgressCircle); Blazor's phase-one API focuses on the display basics
and vertical timeline.

## Navigation

Install `tabs`, `accordion`, `breadcrumb`, `pagination`, `stepper`, `toggle`, or
`menu-toggle`. Tabs pins Radix Tabs 1.2.1; Accordion pins Accordion 1.3.1;
Toggle pins Toggle and ToggleGroup 1.2.1. Breadcrumb requires dropdown-menu;
Stepper and MenuToggle require button. Slot users pin 1.5.0. No icon package is
needed. Each item imports from `@/components/ui/<name>` and ships its own SCSS.

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { BreadcrumbTrail } from "@/components/ui/breadcrumb"
import { PaginationControl } from "@/components/ui/pagination"
import { Stepper, StepperNav, StepperStep, StepperPanel, StepperNext, StepperPrevious } from "@/components/ui/stepper"
import { Toggle, ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle"
import { MenuToggle } from "@/components/ui/menu-toggle"

export function NavigationExamples() {
  return <>
    <Tabs defaultValue="profile">
      <TabsList aria-label="Account"><TabsTrigger value="profile">Profile</TabsTrigger><TabsTrigger value="security">Security</TabsTrigger></TabsList>
      <TabsContent value="profile">Profile content</TabsContent><TabsContent value="security">Security content</TabsContent>
    </Tabs>
    <Accordion type="single" collapsible variant="inset">
      <AccordionItem value="delivery"><AccordionTrigger description="Shipping information">Delivery</AccordionTrigger><AccordionContent>Ships tomorrow.</AccordionContent></AccordionItem>
    </Accordion>
    <BreadcrumbTrail maxItems={3} items={[{ label: "Home", href: "/" }, { label: "Account", href: "/account" }]} />
    <PaginationControl pageCount={20} defaultPage={1} />
    <Stepper>
      <StepperNav aria-label="Checkout"><StepperStep title="Cart" /><StepperStep title="Payment" /></StepperNav>
      <StepperPanel index={0}>Cart contents</StepperPanel><StepperPanel index={1}>Payment details</StepperPanel>
      <StepperPrevious /><StepperNext />
    </Stepper>
    <Toggle aria-label="Bold">B</Toggle>
    <ToggleGroup type="multiple" aria-label="Formatting"><ToggleGroupItem value="bold">Bold</ToggleGroupItem><ToggleGroupItem value="italic">Italic</ToggleGroupItem></ToggleGroup>
    <MenuToggle aria-controls="site-navigation" />
  </>
}
```

Roots accept `appearance` (default/flat/glass, unset inherits), `className`, native
attributes and refs. Accent, dark mode, density and RTL inherit the theme.
Tabs and groups accept explicit `dir`; tabs additionally reads the theme direction.
Breadcrumb's collapsed menu reuses DropdownMenu and portals into the nearest
SheenThemeProvider. All built-in text is overridable, and icons use inline Lucide
paths (ISC). Custom icon slots support SVG or other markup with two-class sizing.

| Item | Props and defaults |
| --- | --- |
| Tabs | Radix root props: `value`/`defaultValue`/`onValueChange`, `orientation`, `dir`, `activationMode` (automatic default). TabsList `variant="segmented"` (underline/pills); TabsTrigger `value`, `disabled`; TabsContent `value`, `forceMount`. Automatic roving arrows, Home/End and RTL. One measured indicator glides; panels enter from the direction of travel. |
| Accordion | Radix `type="single"` or `"multiple"`, value/defaultValue/onValueChange (string or string array), collapsible for single, orientation, dir, disabled; `variant="default"` (inset/cards), `icon="chevron"` (plus). AccordionItem value/disabled; AccordionTrigger icon/description/children; AccordionContent children. Native Radix keyboard navigation and measured height animation. |
| Breadcrumb | `label="Breadcrumb"`, `variant="default"` (glass), `separator="chevron"` (slash/dot). Parts: BreadcrumbList, BreadcrumbItem, BreadcrumbLink (href or button, asChild), BreadcrumbPage, BreadcrumbSeparator, BreadcrumbEllipsis (children overrides "More"). BreadcrumbTrail: items `{label,href?,onClick?,icon?,key?}`, maxItems, itemsBeforeCollapse=1, itemsAfterCollapse=2, collapsedLabel="Show hidden pages". |
| Pagination | `label="Pagination"`, `variant="glass"` (plain), `size="default"` (sm). Parts: PaginationContent, PaginationItem, PaginationLink (isActive, disabled, href, asChild), PaginationPrevious/Next (iconOnly, children replaces Previous/Next), PaginationEllipsis. PaginationControl: pageCount, page/defaultPage=1/onPageChange, siblings=1, boundaries=1, layout="pages" (compact), getHref, iconOnly, previousLabel, nextLabel, formatPage=String, getPageLabel defaults to "Page N". Exported paginationRange returns stable ranges with start/end ellipsis keys. |
| Stepper | value/defaultValue=0/onValueChange, orientation="horizontal" (vertical), labelPlacement="end" (bottom), linear=false, size="default" (sm), labels overrides optional/completed/current/error/stepOf/previous/next. StepperNav wraps StepperStep (title, description, icon, optional, error, completed, disabled, children for vertical content). StepperPanel index/unmountOnHide=false. StepperPrevious/Next use Button props; preventDefault in onClick blocks advancement. useStepper exposes value/count/isFirst/isLast/isComplete/goTo/next/previous. Value equal to count means complete. |
| Toggle | Radix pressed/defaultPressed/onPressedChange, disabled; variant="default" (outline), size="default" (sm/lg/icon/icon-sm/icon-lg). ToggleGroup: type single/multiple, value/defaultValue/onValueChange (string/string array), variant (also segmented), size, required (defaults true for segmented), orientation, dir, disabled. ToggleGroupItem value, variant/size overrides. Single segmented groups glide a thumb; multiple groups highlight each selection. |
| MenuToggle | open/defaultOpen=false/onOpenChange, openLabel="Open menu", closeLabel="Close menu", icon="close" (arrow), Button variant="ghost", size="default" (sm/lg), children. Explicit aria-label overrides both state labels; aria-controls associates the menu. Supports asChild use by a Radix trigger. |

PaginationControl uses buttons without getHref and links when it is supplied.
Ordinary link clicks update its local/controlled state; modified clicks retain
native navigation. Use onPageChange to synchronize your router when controlling
page. Disabled previous/next links have no destination. All page links expose
aria-current on the selected page. Indicators place instantly at first render,
remeasure on resize, and animate subsequent changes. Pagination keeps keyed
numbers so shifted ranges FLIP and new numbers pop in. Reduced motion disables
transitions, FLIP, pop-in and smooth scrolling. Server-rendered active tabs and
pages retain a static highlight until measurement.


## Overlays and feedback (phase 3)

Install `tooltip`, `hover-card`, `toast`, `sheet`, `drawer`, `context-menu`, and
`command` with `npx sheenui-react add <name>`. The toast item includes `toast.tsx`,
`toaster.tsx`, and `use-toast.ts`. Exact pins: Radix Tooltip 1.4.1, HoverCard 1.2.1,
Toast 1.3.1, ContextMenu 2.4.1, and Vaul 1.1.2. Sheet and Command use the existing
Radix Dialog 1.3.1. Declared dependencies install shared button, spinner, dialog,
popover, or dropdown-menu items as needed. No new icon package is needed.

```tsx
import { Tooltip } from "@/components/ui/tooltip"
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { ToastAction } from "@/components/ui/toast"
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetBody } from "@/components/ui/sheet"
import { Drawer, DrawerTrigger, DrawerContent, DrawerTitle, DrawerDescription, DrawerClose } from "@/components/ui/drawer"
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem } from "@/components/ui/context-menu"
import { CommandDialog, CommandInput, CommandList, CommandGroup, CommandItem, CommandEmpty } from "@/components/ui/command"

export function Feedback() {
  return <>
    <Tooltip content="Save your work" side="top"><button>Help</button></Tooltip>
    <HoverCard><HoverCardTrigger href="/author">Author</HoverCardTrigger>
      <HoverCardContent><p>Author details</p><a href="/author">View profile</a></HoverCardContent>
    </HoverCard>
    <button onClick={() => toast({ title: "Saved", tone: "success", action: <ToastAction altText="Undo save" onClick={() => {}}>Undo</ToastAction> })}>Save</button>
    <Toaster />
    <Sheet><SheetTrigger>Settings</SheetTrigger><SheetContent side="end">
      <SheetHeader><SheetTitle>Settings</SheetTitle><SheetDescription>Your preferences</SheetDescription></SheetHeader>
      <SheetBody>Settings content</SheetBody>
    </SheetContent></Sheet>
    <Drawer><DrawerTrigger>Actions</DrawerTrigger><DrawerContent>
      <DrawerTitle>Actions</DrawerTitle><DrawerDescription>Choose an action</DrawerDescription><DrawerClose>Done</DrawerClose>
    </DrawerContent></Drawer>
    <ContextMenu><ContextMenuTrigger>Right-click here</ContextMenuTrigger><ContextMenuContent>
      <ContextMenuItem onSelect={() => {}}>Open file</ContextMenuItem>
    </ContextMenuContent></ContextMenu>
    <CommandDialog><CommandInput /><CommandList><CommandGroup heading="Files">
      <CommandItem value="Open file" onSelect={() => {}}>Open file</CommandItem>
    </CommandGroup><CommandEmpty /></CommandList></CommandDialog>
  </>
}
```

Place the example under `SheenThemeProvider`; every overlay portals into the
nearest provider, inheriting its appearance, mode, accent, density and direction.
DOM parts forward refs and native attributes. Radix/Vaul roots support their
controlled/uncontrolled contracts (`open`, `defaultOpen`, `onOpenChange`);
ContextMenu has Radix's `onOpenChange` and submenu control. It opens through a
pointer or keyboard context-menu gesture rather than an `open` root prop.

| Item | Props and defaults |
| --- | --- |
| Tooltip | Compound Tooltip/TooltipTrigger/TooltipContent, or shorthand `content`, `title`, `shortcut`, `side`, `align`, `variant="dark"` (glass), `showArrow=false`, `contentProps`. TooltipProvider has `delayDuration=400`, `skipDelayDuration=300`; an implicit provider is supplied if absent. Content gap 6px, collision padding 8px. Disabled child controls get a focusable wrapper; touch supports long-press. TooltipTitle, TooltipShortcut, TruncatedText (`lines=1`, tooltip, side, variant) are included. |
| HoverCard | `openDelay=400`, `closeDelay=200`; Trigger supports asChild, Content has align=center, sideOffset=8, collisionPadding=8. Keep essential information in the trigger link too. |
| Toast | `toast({title, description, tone, variant, duration, action, icon})` returns `{id, update, dismiss}`. Tone info/success/warning/danger; boot-ui variants default/success/destructive/warning/info/loading remain available. Default duration 5000ms, loading Infinity. `toast.success/error/warning/info/loading`, `toast.promise`, `toast.dismiss(id?)` and `useToast()` are included. Mount one Toaster per application; call toast only in browser events/effects. At most three notifications remain open; dismissed entries stay briefly for exit motion. |
| Toaster | `position="top-center"` (top/bottom with center/right/left), `dismissLabel="Dismiss"`, `label="Notification"`, `viewportLabel="Notifications ({hotkey})"`. Radix handles hover/focus pausing, swipe, Escape, live announcements and F8 viewport focus. ToastAction requires `altText`; translate that descriptive alternative too. Raw ToastClose's aria-label overrides its default Dismiss label. |
| Sheet | SheetTrigger/Close, Content `side="end"` (start/top/bottom; logical sides flip with provider direction), `draggable=true`, `showCloseButton=true`, `closeLabel="Close"`, `showHandle` defaults true for bottom. Header, Body, Footer, Title, Description, Portal and Overlay compose the panel. Drag threshold and velocity follow boot-ui. |
| Drawer | Vaul Root props including snapPoints, activeSnapPoint, direction, dismissible, and NestedRoot via DrawerNested. Content `showHandle=true`, `handleLabel="Resize drawer"`. Trigger, Close, Header, Body, Footer, Title, Description, Portal and Overlay are included. Native Vaul gesture physics manage drag, scroll handoff and dismissal. |
| Command | Inline Command with `search` / `onSearchChange`, `filter=true`, `loop=true`, `label="Command palette"`. CommandInput `placeholder="Search commands..."` supplies its default accessible name (override aria-label); leading/loading optional. CommandItem takes value, keywords, disabled, onSelect(value), forceMount. CommandGroup heading, CommandList, CommandEmpty (`children="No results found."`), Separator, Shortcut, Footer and Loading (children overrides Loading?) are included. |
| CommandDialog | `open`/`defaultOpen`/`onOpenChange`, `shortcut="k"` (Ctrl/Command+K, false disables), `title="Command palette"`, `description="Search for a command to run"`, `commandProps`, className. To close after selection, control open and set it false in the item's onSelect. |

ContextMenu includes Group, Label, Separator, Shortcut, CheckboxItem, RadioGroup,
RadioItem, Sub, SubTrigger and SubContent. Items accept `inset` and
`variant="destructive"`. Its styles reuse DropdownMenu; arrows, Home/End,
typeahead, Enter and Escape are handled by Radix. The focusable trigger also
supports Shift+F10 and the context-menu key.

Command keeps focus in the search input with aria-activedescendant pointing to
an enabled option. Arrows, Home/End and Enter work across groups. Matching retains
boot-ui's accent and Arabic normalization plus subsequence matching. Empty groups
and the empty-state display follow the supplied CSS. Reduced motion disables
motion; Radix retains mounted content until CSS exit animations finish. Vaul owns
drawer enter/exit and swipe physics. Optional boot-ui page-receding effects are
not part of this port.

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

## React data components

Install independently: `npx sheenui-react add data-table`, `data-grid`, `sortable` or `resizable`. Manifests ship every supporting source and stylesheet and pin the approved packages: TanStack Table 8.21.3, TanStack Virtual 3.14.13, dnd-kit core 6.3.1/sortable 10.0.0/modifiers 9.0.0/utilities 3.2.2, and react-resizable-panels 4.14.3. Consumers install only the dependencies their selected component needs.

| Component | Public behavior |
| --- | --- |
| DataTable | TanStack client-side sorting/multi-sort, search, faceted filters with counts, paging, row selection, column visibility and density controls, loading/empty states, sticky headers and a themed bulk-action toolbar. Accepts columns/data, stable getRowId, initialSorting/initialPageSize/initialColumnVisibility, filters, toolbar, bulkActions, labels, appearance and dir; forwards the wrapper ref. |
| DataGrid | Virtual rows, sticky headers/footer aggregates, logical start/end pinned columns, column sorting/hiding/resizing and inline text/number/select/date/checkbox editors. onCellEdit receives row, rowId, columnId, value and previous; the owner updates data to apply an edit. Selection and visibility support controlled/uncontrolled state. Column meta supplies editor, validate, format, aggregate, label, align and className. |
| Sortable | Controlled value/onValueChange with stable unique IDs; mouse, touch and keyboard sensors; vertical/horizontal/mixed layouts, handles, disabled items, overlays, custom movement, strategies/modifiers and translated announcements. Objects require getItemValue. Exported primitives compose into lists, cards or table rows; withoutSlot renders semantic rows without a wrapper. |
| Resizable | Horizontal/vertical panel groups, optional glass variant, min/max/default sizes, collapsible panels, grips, pointer/touch/keyboard separators and double-click reset. autoSaveId remembers layout with safe storage fallback; corrupt saved data is ignored. Horizontal RTL reverses physical panel order while preserving RTL panel content and pointer direction. DOM refs and the underlying group/panel imperative refs are supported. |

DataTable and DataGrid keep small public entry files. Responsibilities are separated into presentation components, model/state hooks, editing/navigation hooks, types, labels and pure utilities. For example, DataGrid uses use-data-grid-model, use-data-grid-editing, use-data-grid-navigation and use-data-grid-virtualizer; header/body/editor/footer components render their supplied model/controller. DataTable separates its state, column definitions, filters, toolbar/view options, content, pagination and bulk bar. Supporting files use direct relative imports; public imports remain unchanged:

```tsx
import { DataTable, DataTableColumnHeader, getSelectColumn } from "@/components/ui/data-table"
import { DataGrid, type DataGridCellEdit } from "@/components/ui/data-grid"
import type { ColumnDef } from "@tanstack/react-table"
```

Grid keyboard: arrows, Home/End, Ctrl/Command+Home/End, PageUp/PageDown move the active cell; Enter/F2 or typing opens an editor; Enter/Tab commit and Escape cancels. Shift+F10 on a header opens its menu, including keyboard width adjustment. Delete clears an editable cell through validation, Shift+Space selects a row, and Ctrl/Command+C or paste copies/edits the active value. Numeric input rejects invalid/non-finite values and enforces editor min/max; pasted numbers use plain numeric text and dates use YYYY-MM-DD. Invalid options/dates are rejected, custom validation errors remain visible, and drafts cannot be applied to a different row/column after reordering. Use stable getRowId for changing datasets. The active/editor row stays mounted when virtual scrolling; aggregates are cached across navigation.

Sortable keyboard: Space/Enter pick up and drop, arrows move, Escape cancels. Touch uses a short hold so ordinary scrolling remains possible. Reduced motion removes drag transitions/drop animation. Give getItemLabel and labels for localized announcements. Drag overlays and table bulk actions inherit the nearest theme; local RTL sections and all appearances are supported.

Resizable separators accept aria-label and keyboard arrows/Home/End. Pass percentages as strings such as `"40%"`; numbers are pixels. Persisted groups first hydrate the same initial markup, then remount once with their saved layout; unsaved groups remain mounted. Avoid sharing autoSaveId across unrelated groups. The underlying v4 imperative APIs remain available through usePanelRef/useGroupRef and the panelRef/groupRef props.

DataTable labels translate controls, summaries and selection names; column helpers also accept label overrides. DataGrid labels translate menus, errors, cell names, counts and aggregates, while meta.validate can return application-specific messages. react-test contains reference-based examples for all four components, including a 10,000-row editable employee grid and RTL products. Data is local demo state; applications supply their own persistence/server callbacks. Existing Table and public source imports remain available. New Blazor counterparts are deferred in #74.
