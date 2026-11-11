# Blazor app shell components

Phase 5 ports the React app shell components to source-owned Razor. The six components use the same SCSS, tokens and inline Lucide icons (ISC), without React/Radix dependencies or new NuGet packages. Adding a component through the CLI installs its required components and per-component CSS imports.

```text
raxui add navbar
raxui add sidebar
raxui add navigation-menu
raxui add menubar
raxui add footer
raxui add banner
```

## Rendering and routing

Navbar, Sidebar and Footer keep navigable links in static SSR, including at phone widths. They use NavigationManager for current-page state and refresh after navigation. NavbarLink and SidebarMenuButton support an explicit Active/IsActive override and exact/prefix matching. NavigationMenuLink/ListItem also resolve the current page. Use Href for navigation; use PreventDefault with OnClick when the host handles selection without navigating (as in the gallery examples). PreventDefault also disables enhanced navigation for that link so SSR page navigation cannot bypass the callback.

Use an interactive render mode, such as `@rendermode InteractiveServer`, for collapses, open bindings, menu keyboard behavior, persistence and subscription callbacks. Static SSR does not invoke JavaScript. Mobile footer columns remain ordinary link lists until enhanced; Sidebar is expanded and accessible before enhancement even when its remembered interactive state is collapsed.

Native manual popovers provide the top layer for NavigationMenu, Menubar and floating Banner without moving Razor-owned nodes. Consequently the nearest theme/direction still applies inside popovers and Glass containers do not clip them.

## Navbar

Compose NavbarBrand, NavbarLinks/NavbarLink, NavbarActions, NavbarToggle and NavbarMenu/NavbarMenuLink inside Navbar. Links render list items; do not wrap them in another li.

- Variant: glass, transparent or solid; Floating creates the inset rounded bar.
- Expand: sm, md, lg, always or never. The menu closes on Escape (returning toggle focus), link selection, route change and growing past the breakpoint.
- Open/OpenChanged supports binding; DefaultOpen controls the initial unbound state. Toggle labels and navigation landmark labels are configurable.
- HideOnScroll watches the window or the CSS selector passed as ScrollContainer. Transparent bars become glass off the top; downward/upward scroll hides/reveals the bar. MaxWidth and Style customize the content width and host styles.
- Hover/current-page indicators glide between links; reduced-motion preferences avoid animated travel.

## Sidebar

Place Sidebar and SidebarInset inside an independent SidebarProvider. Provider parameters include Open/OpenChanged, DefaultOpen=true, StorageKey, Shortcut="b" (null/empty disables it), Class and Appearance. Storage is optional and failures are ignored. Ctrl/Command+B applies to the relevant provider and ignores editable fields and modified shortcuts.

Sidebar accepts Side=start/end, Variant=sidebar/floating/inset, Collapsible=offcanvas/icon/none, Label and Description. Under 768px it uses the existing Sheet; modal focus containment, Escape/backdrop dismissal and scroll locking are handled by Sheet. Closing a link or resizing out of mobile removes that layer cleanly. Collapsible=none keeps ordinary navigation on all widths.

Parts include Header, Footer, Content, Inset, Trigger, Rail, Separator, Input, Group/Label/Content/Action, Menu/Item/Button/Action/Badge/Skeleton, MenuSub/Item/Button and MenuCollapsible (all prefixed Sidebar). MenuButton/SubButton accept Href, IsActive, Exact, Disabled, Size, Variant, Icon, Tooltip, OnClick and PreventDefault. Tooltip is the native title hint, including in icon mode. MenuCollapsible accepts Title, Icon and DefaultOpen; opening a group while folded to icons expands the sidebar. Give custom icon-only actions a Label. `Href=""` is the app root, as in an anchor. The active item sits on a highlight that glides between items, and a lighter pill follows the pointer from item to item; both keep their spring when the page under the inset changes height, and reduced-motion preferences avoid animated travel.

For a custom trigger, the provider cascades itself: `IsOpen` (expanded on desktop, the Sheet open on phones), `Ready`, `PanelId` and `Toggle()`. `examples/blazor/app-shell/ShellSidebarToggle.razor` uses them to drive an animated `MenuToggle` (`raxui add menu-toggle`):

```razor
<MenuToggle Open="@(Parent?.IsOpen == true)" OpenChanged="@(_ => Parent?.Toggle() ?? Task.CompletedTask)"
            Disabled="@(Parent?.Ready != true)" aria-controls="@Parent?.PanelId" OpenLabel="Toggle sidebar" CloseLabel="Toggle sidebar" />
@code { [CascadingParameter] public SidebarProvider? Parent { get; set; } }
```

## NavigationMenu

Compose NavigationMenuList, Item, Trigger, Content, Link, ListItem and optional Indicator. Each Item can have a stable Value, otherwise it receives an instance-unique key. ListItem accepts Href, Title, Description, Icon, Active, OnClick and PreventDefault; Link can use TriggerStyle for a top-level link.

The root accepts Value/ValueChanged, DefaultValue, Loop, Label, Appearance, DelayDuration=200 and ViewportAlign=trigger/start. Hover/click opens one panel; the shared surface glides/resizes between panels. Alignment follows the trigger's logical start and is clamped 8px inside the viewport, including RTL. The built-in viewport is always shared; custom independent viewport composition is not part of this Blazor API.

Arrows move along the bar in the page direction; Home/End move to its ends. Up/Down opens and focuses the last/first panel control, and moves within the panel. Escape closes and returns trigger focus. Selection, outside clicks and leaving focus close the panel; a short pointer grace period allows movement into it.

## Menubar

Compose Menu, Trigger and Content inside Menubar. Menu accepts a stable Value. The root exposes Value/ValueChanged, DefaultValue, Loop, Label and Appearance. Open triggers share one gliding highlight. Native popover positioning follows direction and flips submenus away from viewport edges.

MenubarItem supports Href or OnSelect, Disabled, Inset and destructive Variant. MenubarCheckboxItem supports Checked/CheckedChanged. MenubarRadioGroup exposes Value/ValueChanged and Label; RadioItem takes Value and Disabled. Label, Group, Separator and Shortcut provide semantic structure. Sub/SubTrigger/SubContent support nested menus. All parts are prefixed Menubar.

Keyboard behavior includes roving top-level focus, RTL-aware horizontal arrows, Up/Down/Home/End, buffered typeahead, skipping disabled items, Enter/Space selection, submenu arrows, Escape focus restoration, and Tab/Shift+Tab leaving the menubar. Mouse movement switches between open menus and items without extra clicks.

## Footer

Compose Main, Brand (Logo/Name/Tagline/Href), Columns/Column/Link, Social/Link, Newsletter, Bottom, Copyright, Legal and BackToTop (all prefixed Footer). Variant is plain, subtle or glass; MaxWidth and Style customize the host. Column takes Title and DefaultOpen and becomes a keyboard-accessible disclosure only on phones. Copyright accepts Owner and an explicit Year, defaulting to the server UTC year.

Newsletter exposes OnSubscribe(string), Title, Description, Placeholder, SubmitLabel, SendingLabel, SuccessMessage, InvalidMessage and ErrorMessage. It trims/validates the address, disables duplicate submission while pending and shows success or a recoverable error if the host callback throws. It does not send mail or configure a subscription service. BackToTop accepts Label and an optional CSS ScrollTarget; it honors reduced motion.

## Banner

Banner supports Tone=info/success/warning/danger/neutral, Variant=tinted/solid/glass, Position=inline/top/bottom, Title, ChildContent, Icon/ShowIcon, Action, Dismissible/DismissLabel, Label, Open/OpenChanged, Appearance and PersistKey. BannerGroup stacks announcements. A bottom banner uses the native top layer and inherits its ancestor theme. Dismissal waits for exit animation; reduced motion removes it.

Unbound banners remember dismissal in localStorage under `rax-banner:<PersistKey>`. `ResetAsync()` on an @ref clears that key and shows it again. Controlled Open takes precedence over remembered dismissal. Storage is read after hydration, so SSR cannot know a visitor's saved preference before interactivity starts.

## Examples and verification

`examples/blazor/app-shell/` contains portable English/Arabic examples. Copy the folder into your app, import its namespace and render NavbarExamples, SidebarExamples, NavigationMenuExamples, MenubarExamples, FooterExamples or BannerExamples. The named boolean cascade ShellExamplesArabic selects language. The local RaxDemo wrappers follow its existing theme controls; all six examples are registered in its gallery.

The generated-app suite installs all six components into real .NET 8/9/10/11 apps and compiles the public samples. Chromium acceptance checks routing/static SSR, desktop/mobile geometry, RTL, materials/accents/density, scroll behavior, highlights, keyboard/submenus, storage, newsletter states and banners. Existing library checks cover manifest ownership, dependency installation, generated assets and hashes. Browser plugin is unavailable in this workspace, so browser checks use the installed Playwright fallback. Physical touch devices, Firefox/WebKit and Interactive WebAssembly require separate validation.
