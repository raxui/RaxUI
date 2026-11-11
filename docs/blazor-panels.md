# Blazor Sheet and Drawer

Sheet and Drawer use native modal dialogs. Use an interactive Blazor render mode for opening, gestures and bindings; static SSR renders closed panels. They share Dialog focus containment, Escape/backdrop dismissal and animation-aware closing. No additional package is required. Drawer depends on Sheet for its shared gesture module and styles.

## Placement and sizing

Both accept `Side="start|end|left|right|top|bottom"`. Start/end follow the panel direction; left/right are physical. Side panels fill the available viewport height with an 8px inset. Sheet top panels fill the available width, and bottom sheets become inset cards on wider screens. Body content scrolls independently so the header and footer remain reachable.

Both support `Open`/`OpenChanged`, `ShowAsync()`/`CloseAsync()`, `Title`, `Description`, `ChildContent`, `Footer`, `Class`, `Appearance`, `HeaderClass`, `BodyClass`, `FooterClass`, and native attributes. Public state is synchronized with native close events; use `@bind-Open` when the parent needs the current state.

## Gestures and accessibility

`Draggable` defaults to true. Drag the header or content toward its physical edge to dismiss; a drag over 30% of the panel size or a fast outward flick closes it. Short and cancelled gestures return to the current position. Scrolled content keeps its scrolling behavior; editable controls and actions do not start a drag. Add `data-panel-no-drag` to other custom interactive regions.

`ShowHandle` is nullable: Sheet shows a handle on bottom panels, Drawer on top/bottom panels. The handle is a keyboard-focusable button with customizable `HandleLabel`. `ShowCloseButton` defaults to true for Sheet and **false for Drawer**, matching the React reference. Existing Drawer consumers needing the previous close icon should explicitly set it to true. `CloseLabel` names that button. Reduced-motion preferences remove panel motion.

## Drawer snap points and nesting

```razor
<Drawer @bind-Open="open" Title="Nearby" SnapPoints="points"
        @bind-ActiveSnapPoint="active" FadeFromIndex="1">
    <ChildContent>Places...</ChildContent>
</Drawer>
@code {
    private bool open;
    private readonly string[] points = ["148px", "0.55", "0.96"];
    private string? active = "148px";
}
```

Snap points are positive CSS pixel strings (`148px`), percentages (`55%`) or viewport fractions (`0.55`). They are sorted by visible size and capped at the viewport. Invalid values are rejected. Snap points are supported on top/bottom drawers only. `ActiveSnapPointChanged` reports pointer, touch and keyboard changes. Clicking the handle cycles points; arrows move between points, Home selects the smallest and End the largest. `FadeFromIndex` determines where backdrop fading reaches full opacity.

Place a child Drawer inside the parent content or footer. Its modal layer steps the parent back without adding another dimming or blur layer over it; closing it returns focus to its trigger. Closing or disposing a parent also cleans up its child layers and scroll locks.

## Reference examples

Copy `examples/blazor/panels/` into your app (the samples use namespace inferred from their folder). Import that namespace and render `SheetExamples` / `DrawerExamples`. Install `sheet`, `drawer`, `button`, `input`, `switch`, and `toast`, and render one `Toaster`. Keep `ResponsivePanelExample.razor.js` next to its Razor source and update its import URL if your folder differs from `Components/Examples/Panels`.

A named `CascadingValue` with `Name="PanelExamplesArabic"` and a boolean value switches the examples between English and Arabic. The dedicated Arabic order example always uses RTL.

The samples mirror the React gallery scenarios:

- Sheet: profile from four edges, navigation, share actions, long comments.
- Drawer: daily goal, nearby places with three snap points, nested invitation, left/right filters, responsive desktop Dialog/mobile Drawer, and Arabic order options.

Material tokens remain shared with React: Sheet surface opacity 45%, Drawer 40%, surface blur 32px, backdrop opacity 25% and backdrop blur 4px in light and dark modes. Native backdrops now apply the same blur tokens. Glass affects the surface; default and flat remain opaque.

## Verification

The generated-app browser suite installs the published registry assets and samples in .NET 8/9/10/11 projects. It covers desktop/mobile and LTR/RTL placement, material/backdrop tokens, long content, mouse/touch/cancel/flick gestures, keyboard snapping, nested focus/scroll cleanup, responsive switching and closed static SSR. Browser checks use Chromium; native modal and touch behavior on other engines and physical devices still needs separate validation.
