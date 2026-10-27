# React-equivalent Blazor data examples

Install `data-table`, `sortable`, `resizable` and `data-grid`. The examples also use `switch`, `avatar`, `progress` and the `textarea` styles for the reply field; install those four components too. Copy the four `.razor` files into your app and render the desired sample:

```razor
<DataTableExamples />
<SortableExamples />
<ResizableExamples />
<DataGridExamples />
```

Set `Arabic="true"` and the surrounding `dir="rtl"` for Arabic labels and direction. Independent Arabic examples are always RTL. The theme inherits from the surrounding app. Use an interactive render mode for behavior.

- DataTable: four recent invoices and 48 searchable/filterable/sortable orders, loading switch, column/density menu, selection, bulk export/delete and row actions.
- Sortable: five task rows with grips, horizontal chips, mixed color tiles, and Arabic chapter rows; pointer/touch/keyboard reorder and announcements.
- Resizable: saved mail layout with collapsible folders and nested reply split, live percentage readouts, editor/terminal vertical split, and an Arabic split.
- DataGrid: 10,000 deterministic employees with all editor types, validation, selection/deletion, pinned columns and aggregates; a smaller Arabic product grid with IQD prices.

Export/send controls demonstrate local feedback, as in the React examples. They do not connect to an export service or send real mail. Editing and deletion affect local component data. See the [component API](../../../docs/blazor-data-components.md) and [virtualization decision evidence](../../../docs/blazor-data-virtualization.md).
