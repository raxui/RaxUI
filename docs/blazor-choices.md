# Blazor choice components

Select (#102), Combobox (#103), Autocomplete (#104), and Command (#105) use the same material, sizing, rich-option classes and sliding-highlight motion as React. Native Blazor binding, EditContext and static SSR are preserved. No React runtime, JavaScript UI framework or new package is required.

## Select

Existing `Select<TValue>` callers keep their typed `Value`/`ValueChanged`/`ValueExpression` and native `<option>`/`<optgroup>` children. Interactive rendering upgrades the control to a themed, anchored listbox with selected checks, disabled choices, groups, typeahead, arrows/Home/End, Enter/Space selection, Escape, outside dismissal and focus return. The native select still supplies form data and parsing/validation. `Native` opts out of enhancement (including the browser's mobile picker); it is the default fallback without interactivity. `Size="sm"|"default"|"lg"` and `Placeholder` customize the trigger. A disabled `<option data-separator></option>` renders a separator; hide the empty native option to use it only as a placeholder. The viewport scrolls with mouse, touch and keyboard.

## Combobox

Single selection keeps the string API (`""` means clear). For multiple selection use `Multiple`, `@bind-Values` (`string[]`, with optional `ValuesExpression`) and `MaxChips`. Clicking a checked option toggles it; multiple selection keeps the list open and clears the query. Chips can be removed by their named buttons, or Backspace on the trigger; overflow shows a count. `Clearable` defaults to true.

`Option(Value, Label, Disabled=false, Description=null, Icon=null, Group="", Keywords="")` supports rich grouped results. `Icon` is a RenderFragment. `OptionTemplate` replaces the row body. `OnCreate` accepts the query and returns an Option (or null for a value/label fallback). Created choices stay available. Known option labels survive remote search results.

`OnSearchChange` supplies query changes to an owner performing remote requests; set `ShouldFilter=false` and `Loading` when the server filters. The owner cancels or ignores stale requests (the demo uses a request counter). `Filter` optionally replaces local matching. `Size`, `Variant`, placeholder/search/empty/loading/create/remove/clear labels are customizable. Disabled controls cannot mutate values. Native InputSelect remains editable in static SSR, including multiple selection.

```razor
<Combobox Options="technologies" Multiple @bind-Values="selected" MaxChips="2"
          OnCreate="@(label => new Combobox.Option(label, label))" />
@code {
    private string[] selected = ["react"];
    private Combobox.Option[] technologies = [new("react", "React", Description: "Frontend library", Group: "Web", Keywords: "jsx")];
}
```

## Autocomplete

Legacy `Suggestions` and `LoadSuggestions(query, CancellationToken)` retain free-text `Value` behavior. Rich `Options` or `LoadOptions(query, CancellationToken)` separates selected `Value` from the displayed label/query. `Option(Value, Label, Description=null, Icon=null, Disabled=false)` supplies rich rows, selected checks and matched text. Editing clears the rich selected value; choosing a row commits its value and displays its label. `InputValue`/`InputValueChanged` control the query, and `OnSelect(Option?)` reports a selection or clear.

`ShouldFilter=false`, custom `Filter`, `MinChars`, `OptionTemplate`, `Loading`, `Size`, `Variant`, `WrapperClass`, `ContentClass`, `Placeholder` and translated status/clear labels are supported. The leading search icon changes to a loading indicator; initial asynchronous requests show skeletons, existing results remain dimmed while loading, errors are recoverable, and cancellation/stale response guards survive close/disposal. Disabled and read-only inputs cannot select or clear.

Static SSR uses the native datalist in text mode and a native select in rich mode. Interactive rich selection posts the value through a hidden input, with the same InputBase validation notifications. A load-only remote source needs interactivity to retrieve options.

## Command

Existing modal `Open`/`OpenChanged`, `ShowAsync`, `Close`, `Items` and `OnSelect` callers continue to work. Add `Inline` to render the same surface inside the page. Controlled `Search`/`SearchChanged` and `CloseOnSelect=false` support nested pages; the demo shows a leading breadcrumb action. An optional `Shortcut="k"` toggles a modal with Ctrl/Command+K. Inline commands do not register global shortcuts.

`Item` keeps its original first five arguments, then appends `Icon`, `Shortcut`, `Description`, `ForceMount`. `Leading`, `Footer`, `ItemTemplate`, `Loading`, `LoadingMessage`, `ShouldFilter`, custom `Filter` and `Loop` customize rendering. Disabled/loading actions cannot run. Groups, separators, empty/loading states, shortcuts and footer use the React styles. The results height and one highlight animate; reduced motion removes transitions.

Default matching folds accents, Arabic harakat/tatweel/alef forms, ة/ه, ى/ي and Arabic/Persian digits, requires every search token, and permits a same-initial subsequence within one word (`stg` → `settings`). `ForceMount` keeps an action visible during searches. This matcher is also used by local Combobox and Autocomplete filtering.

## Verification

`GeneratedAppTests.Choices.cs` and `Fixtures/ChoiceParity.razor` exercise generated .NET 8/9/10 apps: typed selection and disabled groups, keyboard/typeahead/focus, multiple values and creation/removal, value/label separation, FormData and DataAnnotations, stale asynchronous requests/error recovery/minimum query, rich remote label retention, Arabic/Latin/fuzzy/token search, forced actions/loading/shortcuts, highlight geometry, themes/RTL/mobile, external reset and JavaScript-disabled SSR fallbacks. SheenDemo's four examples exercise the same public APIs and templates. Run the repository checks plus generated-app E2E; build the demo and run `scripts/smoke.mjs` for gallery integration.
