# Blazor data components

Phase 6 follows [ADR 019](adr/019-blazor-data-components.md). These components are copied into the app, with no new runtime NuGet or JavaScript package. Their models and focused view/helper files are source-owned too. Use an interactive render mode for interaction; static SSR provides a bounded, read-only initial display, without query-string sorting/paging.

```text
raxui add data-table
raxui add sortable
raxui add resizable
raxui add data-grid
```

`add` installs registry dependencies; `update <name>` also updates tracked dependencies that need changes. In an existing app, update `pagination` and `dropdown-menu` before adding these data components if their installed versions lack the callback/checked-menu support. Modified source files remain yours; review update conflicts instead of replacing them blindly.

## DataTable

```razor
<DataTable TItem="Order" Items="orders" Columns="columns"
           GetRowId="row => row.Id" Label="Orders" />

@code {
    private sealed record Order(string Id, decimal Amount);
    private IReadOnlyList<Order> orders = new[] { new Order("ORD-1", 125000m) };
    private IReadOnlyList<DataTableTypes.Column<Order>> columns = new[] {
        new DataTableTypes.Column<Order> { Id="id", Title="Order", Value=row=>row.Id },
        new DataTableTypes.Column<Order> { Id="amount", Title="Amount", Value=row=>row.Amount,
            Format=value=>$"{value:N0} IQD", Align="end" }
    };
}
```

`Items`, `Columns` and `GetRowId` define the table; row/column IDs must be unique and nonempty. Columns accept `Cell`, `Format`, `Sortable`, `Hideable`, `Searchable`, `Align`, `Class`, and `Options` for multi-choice faceted filters. Numeric/date values remain typed for sorting. Shift-click adds sort keys; repeated activation cycles ascending, descending and unsorted. Search and filters reset paging; a changed Items collection resets/clamps it and prunes deleted selections.

Parameters include `InitialPageSize`, `PageSizeOptions`, `InitialSorting`, `InitialHiddenColumns`, `Density`, `MaxHeight`, `Loading`, `Selectable`, `Toolbar`, `EmptyState`, `BulkActions` and `SelectionChanged`. Bulk actions and selection callbacks receive filtered selected rows, matching React. Use `@ref` and public `ClearSelection()` to clear after a bulk action. Replace the Items collection when applying data changes.

The table reuses Table, Checkbox, Select, Button, DropdownMenu and Pagination. Pagination's optional `PageChanged` intercepts links for an interactive owner; without it, existing URL-link navigation remains available. DropdownMenuItem's `Role` supports `menuitem`, `menuitemcheckbox` and `menuitemradio`; provide `aria-checked` for checked menu roles.

## DataGrid

`DataGrid<TItem>` accepts `Items`, `Columns`, required `GetRowId` and accessible `Label`, `Height` (CSS length, default `480px`), `Density`, `Selectable`, `Toolbar`, `EmptyState`, `Selection`/`SelectionChanged`, and `CellEdit`. Omit Selection for internal selection state, or update it in the callback when controlling it.

`DataGridTypes.Column<T>` defines `Id`, `Title`, typed `Value`, optional `Cell`/`Format`, `Editor`, `Validate`, `Width`/`MinWidth`/`MaxWidth` in pixels, initial `Pin` (`start`/`end`), `Hideable`, `Sortable`, `Align`, and `Aggregate` or `AggregateValue`. The synthetic `__select` ID is reserved when Selectable is enabled.

Editors use `DataGridTypes.Editor`: `Type` is `text`, `number`, `select`, `date` or `checkbox`; numeric limits are `Min`/`Max`, and select options are `DataGridTypes.Option`. Committed numbers are `decimal`, dates are `DateOnly?`, booleans are `bool`, and other values are strings. A validation callback returns an error string or null. The owner applies `CellEdit` to its data; the event supplies Row, RowId, ColumnId, Value and Previous. No external service or automatic persistence is built in.

Drafts live in C# keyed by row ID and column ID. Scroll-window changes keep the keyed active row/editor mounted. Explicit Escape cancels and discards a draft; if an externally changed collection removes the edited row, the draft is retained and the component reports that the cell is no longer available. Aggregates run over filtered rows (`sum`, `avg`, `min`, `max`, `count`, or a custom function). `count` excludes null/empty/false values, matching the reference.

Navigation is one grid tab stop: arrows, Home/End, Ctrl/Meta+Home/End and PageUp/Down move; Tab leaves. Enter/F2 starts editing; typing starts text/number editing; Delete/Backspace clears where allowed. In editing mode Enter/Shift+Enter commits and moves down/up; Tab/Shift+Tab commits and moves within the same row, clamping at its first/last column; Escape cancels. Invalid commits retain the editor and draft. Shift+F10 on an active header opens its column actions, including keyboard width adjustments.

Copy uses the raw value's plain text, not display formatting. Paste outside editing consumes only the first line and validates the parsed value. Rejected text/number/select paste retains the pasted draft; rejected date paste opens with the previous date; rejected checkbox paste reports a grid-level error without opening an editor. Multi-cell TSV copy/paste is outside this phase. Clipboard write failures are ignored as in React; browser permissions still apply.

Requested pins are restored when space permits. If their total width would leave less than 80px for scrolling columns, only the selection column stays sticky and a configurable `PinsConstrained` hint explains the narrow layout; static SSR also avoids width-dependent pins. Keyboard scrolling uses the effective pinned boundaries.

Rows have fixed heights (34px compact, 42px comfortable). The manual window renders visible rows plus overscan and the active row, sorted in DOM order, at calculated translateY positions. One range callback is in flight at a time, and pending updates coalesce to the newest range. A distant jump may briefly expose blank space while Interactive Server supplies rows. See the [comparison evidence](blazor-data-virtualization.md); neither overscan nor this test promises uninterrupted display at arbitrary network latency or scroll speed.

## Sortable

```razor
<Sortable TItem="string" @bind-Items="items" GetId="item=>item"
          Class="vstack gap-2" ItemClass="border rounded p-2 d-flex gap-2">
    <ItemTemplate Context="item">@item</ItemTemplate>
</Sortable>
@code { private IReadOnlyList<string> items = new[] { "Design", "Build", "Review" }; }
```

The default grip starts a drag. `AsHandle` makes the whole item the activator, while embedded controls remain usable. Set `Orientation` to `vertical`, `horizontal` or `mixed`; the content's Class/Style supplies layout. `GetLabel`, `ItemTemplate`, `ItemClass`, `ItemStyle`, `IsDisabled`, `Disabled`, `Direction` and `Appearance` customize presentation/behavior. ItemsChanged supplies the reordered list, and the owner updates Items (`@bind-Items` does so).

Mouse activation uses a small movement threshold. Touch uses a hold; movement before activation cancels it. Space/Enter picks up and drops, arrows move to the nearest item in that visual direction, and Escape cancels. Pointer drags use an inert visual copy; keyboard drags keep their focused original visible. Neighbors animate to their pending positions, and reduced motion suppresses movement effects. `Instructions`, `HandleLabel`, `Grabbed`, `Moved`, `Dropped`, `Cancelled` parameterize accessible text; announcements support `{item}`, `{position}` and `{total}`.

## Resizable

```razor
<ResizablePanelGroup AutoSaveId="mail" Style="height:300px">
    <ResizablePanel Id="folders" DefaultSize="30%" MinSize="15%" Collapsible>Folders</ResizablePanel>
    <ResizableHandle WithHandle Label="Resize folders" />
    <ResizablePanel Id="message" DefaultSize="70%" MinSize="30%">Message</ResizablePanel>
</ResizablePanelGroup>
```

Put exactly one handle between each adjacent pair of panels. Groups accept `Orientation` (`horizontal`/`vertical`), `Variant` (`plain`/`glass`), `AutoSaveId`, `LayoutChanged`, `Direction`, `Appearance`, Class/Style and other root attributes. Panels accept `Id`, `DefaultSize`, `MinSize`, `MaxSize`, `Collapsible`, `CollapsedSize`, Class/Style and content. Sizes are strings in percent, px or rem; a unitless string means percent. Defaults normalize to 100% and respect constraints; impossible initial constraints produce an error. Panel IDs must be unique and nonempty.

Handles accept `Label`, `WithHandle` and `Disabled`. Arrow keys resize, Shift increases the step, Home/End reach available constraints (including collapse), and double-click resets the group. Horizontal arrow/pointer direction follows RTL. LayoutChanged reports completed sizes as a dictionary of percentages; pointer motion remains local. Optional output elements with `data-resizable-size="<panelId>"` preview the rounded percentage locally during a drag, as in the live-sizes sample; C# still receives only the completed layout. Nested groups have independent axes and state.

AutoSaveId opts into localStorage under `rax-resizable:<key>`, with memory fallback if storage throws. Persisted groups require explicit stable panel IDs. Missing, malformed, mismatched or out-of-bounds saved layouts are ignored. Without a key, nothing is stored. Layout persistence stores geometry only, not application content.

## Examples and verification

Copy the [four portable examples](../examples/blazor/data/README.md) into a namespace covered by your app's imports; they match the React playground scenarios, including 48 orders, the sortable task/chip/color/Arabic lists, nested mail/live/vertical/RTL splits, and the 10,000-employee/Arabic-product grids. English/Arabic labels, RTL, theme appearances, mode and density remain configurable.

`GeneratedAppTests.Data_components_install_and_match_React_behavior` generates clean .NET 8/9/10 apps and covers installation/idempotence, C# state checks, sorting/filtering/paging/selection, editing/focus/validation, clipboard, mouse/keyboard/emulated touch, resize persistence, responsive themes and static SSR. The independent original generated-app flow checks existing controls and forms. Physical touch devices, Firefox/WebKit, screen readers, WebAssembly and Auto need separate evidence before claiming coverage.
