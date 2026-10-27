# React-equivalent Blazor Kanban examples

Install `kanban` (it brings `sortable`), plus `button`, `badge` and `avatar` for the card details. Copy `KanbanExamples.razor` into your app and render it in an interactive render mode:

```razor
<KanbanExamples />
```

- Project board: five columns with colored dots, an "In progress" limit of 3, an add-card button on Backlog, cards with tag, due date, comments and assignee, and a log of committed moves.
- بالعربية: a right-to-left board with Arabic instructions and announcements.

Drag cards between columns or columns by their grip. Keyboard: Tab to a card, Space, arrows, Space. Data is local and is not sent to a service. See the [component API](../../../docs/blazor-kanban.md).
