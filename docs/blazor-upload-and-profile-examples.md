# Upload and profile examples

Source-owned Blazor `file-upload`, `badge` and `avatar` include the behavior needed by the React-equivalent samples in `examples/blazor/`. Use an interactive render mode for events; static SSR renders initial markup, labels, counts and native file selection. Built-in queue text is replaceable through `FileUploadQueue.Text`. Existing FileUpload callers without `Variant` retain their native batch selection, form mapping and `Progress` behavior.

## Upload queue

Set `Variant="dropzone"` or `Variant="compact"` to enable the queue. `Layout="grid"` renders square image tiles. Bind `Value` to `IReadOnlyList<IBrowserFile>`. Multiple selections accumulate, duplicate file metadata is ignored, and `MaxFiles="1"` replaces the previous selection. Validation rejects unsupported types, oversized files and excess files without clearing accepted files. `Accept` is a convenience check, not a server-side trust boundary: validate actual content and apply a stream-size limit in the consuming upload service.

`Upload` receives `(IBrowserFile, FileUploadQueue.UploadContext)` with a cancellation token and progress callback. At most three uploads run simultaneously. The callback must honor cancellation; an upload ignoring its token continues occupying its slot until it returns. Failed/cancelled entries can retry, and removal/reset/disposal cancel work. `OnUploaded` reports success. `Preview` supplies URLs for already-selected files; new images use local object URLs which are revoked on removal/reset/disposal. The component sends no network request itself.

Picker batches retain their InputFile elements while corresponding files exist, preserving handles for delayed reads and retries across subsequent selections. Native multipart selection is kept aligned with retained files. Drop and focused paste route through the current InputFile. Each entry has a stable identity; Razor owns the rendered list and JS owns object URLs and native input bookkeeping.

## Badge and Avatar

`Badge.OnRemove` renders an accessible remove button with `RemoveLabel`. `BadgeCount` wraps a control/avatar, supports capped counts (`Max`, default 99), dots, zero visibility, placement, colors and parameterized `GetLabel`. Count changes replay the shared motion only when motion is enabled.

`AvatarGroup<TItem>` accepts `Items`, `GetName`, optional `GetId`/`GetImage`, `Max` and `Size`. Overflow is labeled through `MoreLabel`; shared CSS provides overlap and hover expansion. Existing Avatar APIs and image-error fallback remain unchanged.

## Sortable

The pointer overlay is attached outside Glass/transform ancestors, with inherited theme variables/direction/font/color copied onto it. The original item becomes a dashed placeholder and moves to the prospective drop slot. Escape/disposal remove the overlay and restore layout; C# still commits the order only after a completed drop.

## Timeline, Accordion, Pagination and Stepper

Timeline supports `Layout` (start, alternate, horizontal). Alternate uses side times and folds in narrow containers; horizontal provides a focusable scrolling wrapper. Give item `Index` values in display order for alternation/stagger, and use `TitleContent` for rich titles. `TimelineGroup` is a heading item, not a wrapper around timeline entries.

Accordion retains native details/name behavior in static SSR. Optional `Values`/`ValuesChanged` controls the open item IDs; multiple mode supports Expand/Collapse all. `Icon="plus"` uses plus/minus; item `Disabled` prevents activation. Interactive keyboard navigation supports Up/Down/Home/End and skips disabled triggers.

Pagination preserves real links without `PageChanged`. Binding `Page` handles local state without changing the route. `Layout="compact"` and `IconOnly` provide the React example presentations; `FormatPage`/`GetPageLabel` localize Arabic page numbers. Narrow tracks scroll within their own width.

Stepper keeps the existing `Items`/static-link API. Binding `Value` enables native navigation buttons, `Linear` limits direct navigation to current/completed steps, and `Busy` locks navigation during work. Item options add icons, optional/error labels and vertical content. `StepperPanel` shows the matching index, including index `Items.Count` for completion. The checkout example keeps form drafts in C#, validates only the current step through EditContext, focuses the invalid field and simulates confirmation locally.
