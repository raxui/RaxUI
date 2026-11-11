# Blazor advanced components part 1: Chat and SpeedDial

Implements issue #119. Both are source-owned Razor components: install with `raxui add chat` or `raxui add speed-dial`. Their only component dependency is `button`; there are no new NuGet or JavaScript packages. Each declares its existing generated per-component CSS. The examples also install `avatar`, `toggle`, and `switch`.

## Chat

Compose `Chat`, `ChatMessages`, `ChatDaySeparator`, `ChatMessageGroup`, `ChatBubble`, `ChatTyping`, and `ChatComposer`. The markup and classes match React. `Chat` accepts `Labels` (`Chat.Text`) for sending/sent/delivered/read/failed/retry. Translate the messages log label, jump label, composer placeholder/label/send label, and typing label at their respective components.

`ChatMessageGroup` accepts `From="self|other"`, `Name`, `Time`, an `Avatar` fragment and child bubbles. A bubble accepts a delivery `Status`, `OnRetry`, and a `Footer` fragment for reactions. Message text remains normal escaped Razor content; consumers own rich content and attachments.

`ChatComposer` supports `@bind-Value`, `OnSend`, `Disabled`, `MaxRows` (default six) and an `Actions` fragment. The C# model owns the draft; local JavaScript provides immediate resizing, empty-send prevention, Enter/Shift+Enter and IME protection. Revision acknowledgements prevent a delayed Server render from replacing a newer draft. Sending trims text, clears the draft and retains field focus. `OnSend` is an application callback, not a network transport: add a message immediately and manage its pending/success/failure state in the application. Callback exceptions follow normal Blazor error handling; delivery/retry is not silently handled by the composer.

`ChatMessages` initially scrolls to the latest content. It follows additions/resizes while near the bottom (48px); while reading older messages it keeps the scroll position and offers a jump button when a new bubble is added. The log uses `aria-live="polite"` and `aria-relevant="additions"`. Supply a bounded chat height. Reduced motion disables smooth scrolling.

## SpeedDial

Compose `SpeedDial`, `SpeedDialTrigger`, `SpeedDialContent`, `SpeedDialItem`, `SpeedDialLabel` and `SpeedDialAction`. Root options: `Side="top|bottom|left|right"`, `ActivationMode="click|hover"`, `Delay` (250ms), `Disabled`, `DefaultOpen` or `@bind-Open`. The trigger accepts a custom icon fragment, `Label`, `Variant`, and `Size`; `SpeedDialContent` accepts `Offset`, `Gap` and a menu `Label`. Actions use `OnSelect`, `Disabled`, and `CloseOnSelect` (default true). Actions without a visible label require an explicit `Label`.

The arrow away from the trigger opens the actions and focuses the nearest enabled item. The same arrow moves/wraps outward; the opposite arrow moves back and returns to the trigger. Home/End jump; Escape returns focus; Tab out closes. Top/bottom labels and positioning follow RTL; left/right remain physical sides, matching React. Touch uses click, never hover. The root exposes `CloseOnEscape` and `CloseOnInteractOutside` to express React's cancellable-dismiss callbacks without a synchronous Server round trip. Selection closes and returns focus unless `CloseOnSelect=false`.

The actions remain inside the root, matching React, rather than using a top-layer popover. This preserves the shared CSS staggered opening/reverse closing and theme inheritance. Containers with `overflow:hidden` can clip actions; reserve enough space or position the root outside that container. No viewport flipping is added beyond the React behavior.

## Render modes and lifecycle

Static SSR renders message content and existing draft text, with composer/trigger disabled and actions inert. Interactive Server, WebAssembly or Auto is required for callbacks, sending, scrolling and menus. JavaScript modules are collocated with their Razor components; disposal removes observers, timers, global listeners and .NET references. The example cancels its simulated delivery timers on disposal.

## Examples and verification

`examples/blazor/advanced/` contains the live conversation (sending/read/typing/reply/offline/retry), Arabic conversation, labelled/physical-side/controlled-hover/Arabic SpeedDial examples. RaxDemo hosts the same files at `#chat` and `#speed-dial`. Upload/transport is not implemented; the attachment button demonstrates an application action and delivery is simulated.

`GeneratedAppTests.AdvancedPart1.cs` installs into fresh .NET 8/9/10/11 applications and checks build/idempotence, static SSR, native keyboard/pointer behavior, disabled actions, dismissal policy, controlled hover, multiline/IME/rapid drafts, retry, Arabic labels, scrolling, component removal/recreation, appearance/mode/direction/viewport combinations, alternate accents/densities, reduced motion, and clean browser runtime errors. Browser validation uses Chromium; other engines and real mobile devices are not implied.
