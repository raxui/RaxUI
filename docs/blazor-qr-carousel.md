# Blazor QRCode and Carousel

## Installation and ownership

`sheenui add qr-code` and `sheenui add carousel` install source-owned components with `button` and existing shared per-component CSS. No consumer npm, CDN, new NuGet package or project-file edits are required. ADR 020 records the C# port and the exact Embla builds/licenses. The CLI now accepts `cs` in component folders, with the same hashes, conflict protection and recovery as Razor. The C# helpers are internal and independent of the app namespace.

## QRCode

`QRCode` accepts `Value`, `Size=200`, `Level="M"` (L/M/Q/H), `Margin=2`, `Shape="square"` (square/rounded/dots), solid `ForegroundColor`/`BackgroundColor`, `Label`, and `Format="svg"` (svg/canvas/image). Errors render `ErrorLabel` and invoke `OnError` in an interactive mode; `OnGenerated` runs after value/level generation. Use normal escaped Razor content, and pass a localized `Label`/`ErrorLabel`.

`Overlay` is a RenderFragment: pass null to remove its hole. The hole follows React's odd-module formula. Use H for logos; this is a recommendation, not a forced correction-level change. The component always disables Nayuki's ECC boosting so the requested correction level is respected. Empty Value encodes a single space. Oversized data or malformed UTF-16 fails clearly. C# numeric SVG output is culture-independent; SVG attributes are escaped, and color inputs reject URLs/CSS expressions. Size, margin and export resolution have bounded ranges.

`Downloads=true` adds buttons named by `PngLabel`/`SvgLabel`; `Filename` supplies the base name and `Resolution` sets PNG pixels (default four times Size, capped at 8192). SVG and PNG exports match React: the code includes the overlay hole, while arbitrary overlay child markup is not embedded in downloads. SVG is rendered immediately in static SSR. Canvas and Image progressively rasterize that SVG after interactivity; SSR retains the same visible SVG fallback. There is no loading skeleton because C# generation is synchronous.

## Carousel

Compose `Carousel`, `CarouselContent`, `CarouselItem`, `CarouselPrevious`, `CarouselNext`, `CarouselDots`, `CarouselCounter`, `CarouselThumbs` and `CarouselPlayPause`.

Root parameters: `Label`, `Labels` (`Carousel.Text`, including `{0}`/`{1}` templates), `Orientation="horizontal|vertical"`, `Effect="slide|fade|scale"`, `Direction` (or inherited dir), `Loop`, `Align="start|center|end"`, `SlideSize` and Small/Medium/Large/ExtraLargeSlideSize, `Gap`, `Autoplay` milliseconds, `Duration`, and `StartIndex`. `SelectedChanged` receives the selected scroll-snap index after motion settles (immediately for reduced/zero-duration motion); `GoToAsync(index)` is available through a component reference. Snap count can differ from slide count in multi-item views.

Content accepts `ViewportClass`/`ViewportStyle`, for rounded corners or a fixed vertical viewport height. Items accept child markup, keys and attributes. Thumbs use a `RenderFragment<int>` Template. Arrows and play/pause accept the house Button variants. Dots have default/overlay variants. Responsive dimensions and animation styles reuse shared SCSS; demo artwork lives only in the example stylesheet.

Embla handles pointer/touch dragging, snapping, loop, fade and autoplay locally. Dots, counters, labels and navigation states update on selection without waiting for a Server round trip. The root is keyboard-focusable; horizontal arrows mirror in RTL, vertical arrows use Up/Down, and editable fields retain their keys. Autoplay pauses on hover/focus. User pause survives hover/focus and reinitialization. Reduced motion disables autoplay and makes navigation immediate; returning to normal motion restores configured duration. Use a play/pause control wherever autoplay is enabled.

Slide structure and direction changes trigger reinitialization, preserving selection where possible. Modules, observers, media listeners and .NET references are disposed when removed. Static SSR displays the initial viewport and disables controls until interactivity. Server, WebAssembly or Auto is required for movement and callbacks. Theme appearance/mode/accent/density continue to inherit normally.

## Verification

Tests pin 298 Nayuki matrix hashes (all masks/levels, automatic masking, version ranges, boost, Unicode) and 18 React drawing paths on a fixed matrix. ZXing.Net 0.16.11 is test-only. Browser tests capture the QR frame including overlay, decode screenshot PNG in browser Image/canvas, and feed RGBA bytes to ZXing; no image binding is required. Arabic/emoji/mixed text, all shapes, H overlays, downloads, formats, malformed/oversized input, and static SSR are covered. The M-overlay observation case (240px, margin 4, the SheenUI URL, dots) decoded successfully; this is not a promise for every logo/payload/size.

Generated clean applications on .NET 8/9/10 cover installation idempotence and .cs ownership protection, animation frames, dragging, dynamic slide changes, RTL keyboard navigation, thumbnails, autoplay/manual pause, reduced motion, teardown/recreation, SSR and desktop/mobile theme combinations. Browser evidence uses Chromium; physical device scanning and other engines remain separate checks.
