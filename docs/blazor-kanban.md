# Blazor Kanban

`sheenui add kanban` installs `Kanban` and `KanbanTypes` with its `sortable` dependency and the shared `kanban.css`. No consumer npm, CDN or new NuGet package is required. Kanban reuses `Sortable.razor.js` (ADR 019): one engine instance moves cards between columns and a second reorders columns. C# state is the source of truth; the browser only previews a move and reports the result.

```razor
<Kanban TItem="Card" @bind-Columns="columns" GetId="c=>c.Id" GetLabel="c=>c.Title" Committed="Save">
    <ItemTemplate Context="card">@card.Title</ItemTemplate>
    <Empty>Drop cards here</Empty>
</Kanban>
@code {
    private sealed record Card(string Id, string Title);
    private IReadOnlyList<KanbanTypes.Column<Card>> columns = new KanbanTypes.Column<Card>[] {
        new("todo", "To do", new[] { new Card("c1", "Write docs") }),
        new("doing", "In progress", Array.Empty<Card>()) { Limit = 3 }
    };
    private void Save(KanbanTypes.Change change) { /* persist change.Id, change.To, change.Index */ }
}
```

## API

- `Columns` is the ordered list of `KanbanTypes.Column<T>(Id, Title, Items)`. A column can be `Disabled`, which stops it from moving or receiving cards. `Limit` shows the count as `count/limit` and flags it when exceeded. `ColumnsChanged` supplies the next list; `@bind-Columns` applies it.
- `Committed` receives `KanbanTypes.Change(Id, Type, From, To, Index)` once per completed move, with `Type` set to `card` or `column`. Use it to save.
- `GetId` is required. Column IDs and card IDs must be unique and nonempty across the whole board. `GetLabel` names cards for screen readers.
- `ItemTemplate` renders a card. `ColumnHeader` replaces the default title and count; the column grip stays. `Empty` is shown in a column with no cards, and that column still accepts drops.
- `AsHandle` (default true) drags the whole card; embedded links, buttons and inputs stay usable. Set it to false to drag only by a grip button. `IsDisabled` locks individual cards and `Disabled` locks the board. `MovableColumns=false` removes the column grips.
- `Orientation` is `horizontal` (columns side by side, the default) or `vertical` (stacked columns, cards in rows).
- `Class`, `Style`, `ColumnClass`, `ItemClass`, `Appearance` and `Direction` customize presentation.

## Interaction

Mouse drags start after a small movement. Touch drags start after a hold; moving before the hold scrolls and cancels the drag. A pointer drag shows an inert copy that follows the pointer within the board. Cards in the target column make room, and the target column is highlighted (`data-over`). Over another column, the card is inserted at the pointer position; over its header, at the top.

Keyboard: Space or Enter picks up a card or column grip. Arrows along a column move within it. Arrows across columns move to the nearest enabled column in that visual direction, keeping the position; in RTL, left is the next column. Space or Enter drops, and Escape cancels and restores the board. Focus returns to the moved card. Reduced motion removes the movement transitions. Auto-scrolling a long board while dragging is not implemented.

Accessible text is parameterized: `Instructions`, `ItemHandleLabel`, `ColumnHandleLabel`, and the announcement templates `Grabbed`, `Moved`, `Dropped`, `Cancelled`, `ColumnGrabbed`, `ColumnMoved` and `ColumnDropped`. Card templates support `{item}`, `{column}`, `{position}` and `{total}`; column templates support `{item}`, `{position}` and `{total}`.

## SSR and tests

Static SSR renders the full board read-only: grips are disabled and cards are not focusable. Use an interactive render mode to move cards. `GeneratedAppTests.Kanban.cs` installs Kanban into generated .NET 8/9/10 apps. It covers keyboard, mouse and touch moves, cross-column moves, disabled cards and columns, Escape, column reordering, limits, RTL with Arabic announcements, flat/glass/dark appearance, and static SSR. `examples/blazor/kanban/` contains the copyable English and Arabic boards; the test renders them, and SheenDemo hosts them at `#kanban`.

## Sortable engine change

`Sortable.razor.js` now supports several lists per instance and several instances per root. Lists are `[data-sortable-content="<instance id>"]`, and the .NET callback receives `(id, list key, index)`. `Sortable` behavior is unchanged; run `sheenui update sortable` before adding Kanban to an existing app.
