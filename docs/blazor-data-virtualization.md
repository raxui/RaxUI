# DataGrid virtualization comparison

Related: [ADR 019](adr/019-blazor-data-components.md). This experiment compares the ordinary framework Virtualize window with an explicit fixed-height window that also keeps the active/editor row mounted. It does not claim every possible custom Virtualize integration is impossible.

## Method

Run on Windows, .NET 10 Interactive Server and Chromium, using 10,000 rows at 40px with overscan 12 in both candidates. The minimal probes are [VirtualizationProbe.razor](../tests/RaxUI.Integration.Tests/Fixtures/VirtualizationProbe.razor) and its [collocated module](../tests/RaxUI.Integration.Tests/Fixtures/VirtualizationProbe.razor.js). Both retain the draft in C#; only the manual candidate explicitly unions the active row into the rendered indexes.

The latency run used a local TCP proxy delaying traffic by 60ms in each direction, including the existing SignalR connection. Actual JS interop round-trip measurements verified the delay. The scroll sample moved 80px every 20ms for 20 samples, followed by a distant jump, the last row, and a return to the editor. Blank samples were measured at the viewport's top data position; these counts are observations, not a benchmark guarantee.

| Candidate | Added delay per direction | Measured round trips (ms) | Editor/focus retained offscreen | Rows at distant jump | Blank samples / 20 |
| --- | --- | --- | --- | --- | --- |
| Virtualize | 0ms | 8, 16, 16 | No / No | 33 | 0 |
| Calculated window | 0ms | 25, 15, 31 | Yes / Yes | 31 | 0 |
| Virtualize | 60ms | 135, 121, 122 | No / No | 33 | 3 |
| Calculated window | 60ms | 151, 137, 122 | Yes / Yes | 31 | 7 |

Both candidates retained the C# draft and reached the final row. The ordinary Virtualize window removed the input element, losing focus; reconstructing its value did not meet the editor-retention requirement. The calculated window kept the existing editor and focus while preserving increasing DOM row indexes and bounded rendered row counts.

The manual probe recorded 16 completed range callbacks without added delay and 7 with delay. Virtualize uses its own internal machinery, so the probe's custom callback counter does not measure its calls. Transport-frame counts include acknowledgements/lifecycle traffic and are not presented as direct callback comparisons.

## Result and implementation boundary

Choose calculated, positioned rows for the retained-editor contract. It keeps the existing shared grid geometry and avoids another editor ownership/render layer. The latency observations show that manual rendering needs careful buffering; the production grid uses overscan 24 and coalesces pending range requests, with at most one in flight. This larger buffer is not a guarantee against blanks during distant jumps or arbitrary fast scrolling.

The complete grid is verified separately on .NET 8/9/10/11, including a nonzero active row moving between visible and retained positions, invalid drafts, final-row navigation, clipboard, select/date editors, pinning and RTL. The comparison itself used .NET 10. Repeat the latency measurement for deployment conditions; do not infer hardware, browser or network coverage from localhost timings.

To repeat the probe, copy both fixture files to a .NET 10 interactive Blazor app's `Components/Pages/`, run that app locally, and open `/virtual-window?mode=framework` or `?mode=manual`. The probe exposes `probePing()` on `#probe-grid` for actual interop latency measurement. Use an actual transport delay and record the observed round trip before interpreting scroll results. Screenshots/logs belong outside the checkout.
