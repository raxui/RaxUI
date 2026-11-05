# ADR 020 — Third-party source in Blazor components

- Status: Accepted for #120; extended for #121 (AI Markdown and the TextEditor engine).
- Date: 2026-10-27

## Decision

Consumers own installed sources, without npm, CDN or new runtime NuGet dependencies. The CLI accepts `cs` alongside Razor, isolated CSS and JavaScript in the existing single-component-folder destination. Existing path safety, file hashes, conflict detection and installation recovery apply unchanged. This is not NuGet installation support.

Copied (vendored) JavaScript builds remain byte-for-byte unchanged. Record their exact version, source URL, size and SHA-256; preserve upstream licenses in adjacent attributed JavaScript notices (installed alongside the builds). Updates replace all three builds together, refresh manifest hashes, and rerun browser tests. The Razor SDK serves collocated `.razor.js` files, not arbitrary JS in Components. The unchanged Embla source files therefore install as `CarouselContent.razor.js` (core), `CarouselPlayPause.razor.js` (autoplay), and `CarouselItem.razor.js` (fade), each associated with an existing Razor part. The installed `CarouselCounter.razor.js` notice module is imported so the full Embla MIT notice is delivered with the runtime modules. The manifest records original source names and installed targets; no wrapper/stub components or project-file edits are needed. Source maps are not shipped; build sourceMappingURL comments remain unchanged.

Ported code is maintained by RaxUI. `QrCodeEncoder.cs` is a C# translation of https://github.com/nayuki/QR-Code-generator/blob/3c6d0b3cefb4e049dc337e82237c9644399716a8/typescript-javascript/qrcodegen.ts (MIT). Preserve the full upstream license. Integers store bit/byte values; C# unsigned right shift preserves the upstream bit operations. Strict UTF-8 encoding rejects malformed UTF-16 rather than replacing invalid surrogate characters, matching encodeURI rejection. Lists replace JS arrays; integer divisions are explicit. Keep the upstream segment/version/mask/Reed–Solomon/penalty algorithms; review later upstream changes manually instead of replacing the file. The component uses boostEcl=false; the encoder retains the option for comparison tests. Empty component values encode a single space. Helpers are internal in an isolated namespace, independent of the consumer root namespace.

`QrCodeDrawing.cs` ports RaxUI React drawing, separate from the encoder and Razor UI. SVG is generated synchronously in C# for static SSR. SVG, Canvas and Image parts share this SVG; Canvas/Image use the browser after interactivity and retain a static SVG fallback. Downloaded PNG is rasterized in the browser. Export behavior follows React: the code contains the overlay hole; arbitrary overlay child markup is not embedded into the download. H with an overlay is recommended, not forced.

## Vendored files

- `embla-carousel.esm.js`: Embla 8.6.0, MIT, 48089 bytes, SHA-256 `07a80a91c1834772c8435fc4a234ba6f811daa7ade991903a8a75885d603e077`. Source: https://github.com/davidjerleke/embla-carousel/tree/v8.6.0/packages/embla-carousel/src .
- `embla-carousel-autoplay.esm.js`: Embla 8.6.0, MIT, 5460 bytes, SHA-256 `84911d2f9b684038360e7be1019923462ffb8a34659b868f6fb046eb13edd42a`. Source: https://github.com/davidjerleke/embla-carousel/tree/v8.6.0/packages/embla-carousel-autoplay/src .
- `embla-carousel-fade.esm.js`: Embla 8.6.0, MIT, 7765 bytes, SHA-256 `e682c8390b81c9e7e4c0eef705f3fa868bd32f336f1156838d1611baabf67bce`. Source: https://github.com/davidjerleke/embla-carousel/tree/v8.6.0/packages/embla-carousel-fade/src .

## Carousel behavior

Razor owns slides and controls. Embla owns transforms, gestures and autoplay; browser state updates dots/counters/ARIA immediately, with selected-index callbacks to C# after settle (and reinitialization). Do not send frame events through Server. Reinitialize when slide structure/options/direction change; preserve user pause. Disable autoplay and instant-scroll under reduced motion. Dispose observers, listeners, plugins and .NET references. Static SSR renders the initial viewport, with inactive controls until interactive initialization.

## Verification

Pin Nayuki reference vectors to the source commit, fix all options for exact matrix comparison, cover masks 0–7 and automatic masks, versions 1–40, correction levels and boost. Independently decode via test-only ZXing.Net 0.16.11, including Arabic/emoji/mixed inputs. Browser screenshots include quiet zone and overlay; decode PNG inside the browser to RGBA and pass raw bytes to ZXing, requiring no image binding unless proven necessary. Test rendering with the same fixed matrices as React. An overlay at M is an observation test; any demonstrated shared limitation is tracked separately rather than changing the contract silently. Generated apps and SSR are tested on .NET 8/9/10.

Reference vectors are regenerated with `node scripts/generate-qr-vectors.mjs <path-to-pinned-qrcodegen.ts>`; the script verifies the upstream source digest before evaluating it.

## Extension for #121

**AI Markdown** needs no third-party code. `AIMarkdownParser.cs` is RaxUI-owned: a documented GFM subset rendered through `RenderTreeBuilder`, so it never emits raw HTML.

**TextEditor engine.** Tiptap and ProseMirror ship as about 40 ESM packages with bare imports, so their files cannot be installed unchanged the way Embla's are. This is a bounded exception to "byte-for-byte unchanged":

- `scripts/text-editor/entry.mjs` only re-exports the modules the editor uses (`Editor`, `Extension`, `StarterKit`, `CharacterCount`, `Placeholder`, `TextAlign`, `Highlight`, `TaskList`, `TaskItem`, `BubbleMenu`). It contains no RaxUI logic.
- `scripts/build-text-editor.mjs` bundles it with the exact-pinned devDependency `rolldown` 1.2.15 (ES module, minified) from the exact-pinned Tiptap 3.31.4 packages in `package-lock.json`. The output is `registry/blazor/components/text-editor/TextEditorContent.razor.js`, collocated with `TextEditorContent.razor` like the Embla files.
- The file starts with every bundled package's name, version, SPDX license and full license text, generated from `node_modules`. All 40 are MIT. Source maps are not shipped.
- The bundle is derived, not edited. `npm run check` runs `scripts/build-text-editor.mjs --check`, which rebuilds it and fails unless the committed file is byte-identical. The manifest hash covers the installed bytes as usual.
- Updates change the pinned versions in `package.json`, run `npm ci` and `node scripts/build-text-editor.mjs`, refresh hashes (`node scripts/update-blazor-hashes.mjs`), update the size below and rerun the browser tests.
- RaxUI behavior (toolbar, menus, link form, counter, value transport) lives in the readable, source-owned `TextEditor.razor.js`, which imports the engine.

Built from Tiptap 3.31.4: 466,930 bytes (46 KB of it license text), 134 KB gzip, 113 KB Brotli. SHA-256 `12b5dd5e6b70f51b4679297cb1207b76db44c1238f11d31c8f9d664bcf43e92d`. It is loaded only by pages that render a TextEditor.

## Extension for Chart

**Chart engine.** Chart.js 4.6.1 publishes a self-contained UMD build, so it follows the Embla rule and is installed byte-for-byte unchanged. Its ESM build is not used: it imports the bare specifier `@kurkle/color` and shared chunks.

- `chart.umd.min.js`: Chart.js 4.6.1, MIT, 210,082 bytes (71 KB gzip), SHA-256 `87364cc2b2a76a6684929e7d6b80b18a897794db38400caff1fcf1791c6925d2`. It bundles @kurkle/color 0.3.2 (MIT). Source: https://registry.npmjs.org/chart.js/-/chart.js-4.6.1.tgz (`dist/chart.umd.min.js`).
- It installs as `ChartTypes.razor.js`, collocated with the existing `ChartTypes.razor` contracts. Imported as a module, the UMD wrapper sets `globalThis.Chart`.
- The full MIT notices of Chart.js and @kurkle/color are at the top of the source-owned `Chart.razor.js`, which imports the engine, so they are delivered with it.
- React installs the same version from npm (`chart.js` 4.6.1 in the manifest `packages`). Both frameworks build the Chart.js configuration with the same `chartConfig` logic; keep `Chart.razor.js` and `chart.tsx` in step.
- Updates replace the file, update the version, size and hash here and in both manifests, and rerun the browser tests.
