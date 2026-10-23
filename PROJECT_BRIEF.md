# BlazorUI — Project Brief

## 1. Project Overview

**BlazorUI** is an open-source, source-first UI component library for Blazor applications, built on top of Bootstrap.

The project is inspired by the distribution model of shadcn/ui: developers install individual components directly into their applications, own the source code, and can freely customize the implementation.

Instead of depending entirely on a precompiled UI component package, developers receive editable Razor components and their required assets through a dedicated .NET CLI.

## 2. Vision

Build a modern, accessible, customizable, and developer-friendly UI component system for Blazor that combines Bootstrap's familiar styling foundation with the flexibility of source-owned components.

The project aims to make building polished Blazor interfaces easier while preserving developers' control over their codebase.

## 3. Core Principles

- **Source-first:** Components are copied into the consuming application as editable source files.
- **Developer ownership:** Developers can modify installed components without depending on a closed implementation.
- **Component-driven installation:** Install only the components required by the application.
- **Bootstrap foundation:** Use Bootstrap for layout, grid, utilities, and foundational styling.
- **Blazor-native behavior:** Prefer Razor, C#, and Blazor event handling over unnecessary JavaScript dependencies.
- **Accessibility:** Support semantic HTML, keyboard navigation, focus management, and appropriate ARIA attributes.
- **Customization:** Provide component variants, CSS classes, design tokens, and theme customization.
- **RTL support:** Support right-to-left layouts, including Arabic interfaces.
- **Maintainability:** Keep component definitions, dependencies, CLI logic, and documentation clearly organized.
- **No mandatory runtime service:** Installed components must not require a connection to a remote registry to function.

## 4. Target Frameworks

The first implementation milestone targets **.NET 10 Blazor Web App with Interactive Server**, including prerendering. The current phase is documentation only.

Long-term support targets are:

- Blazor Web App.
- Blazor Server.
- Blazor WebAssembly.

The library must account for the different rendering and interactivity models supported by these application types, including static server-side rendering and interactive rendering where applicable.

Components that require browser APIs or JavaScript interop must handle server-side rendering safely.

Additional hosting and rendering modes are not advertised as supported until verified. Reusable components do not hard-code a render mode; the consumer application selects it.

## 5. Technology Stack

| Area                 | Technology                                     |
| -------------------- | ---------------------------------------------- |
| Programming language | C#                                             |
| UI framework         | Blazor                                         |
| Component files      | Razor (`.razor`)                               |
| Styling foundation   | Bootstrap                                      |
| Custom design system | Global CSS variables/themes and isolated `.razor.css` |
| Developer tooling    | .NET CLI tool                                  |
| Registry format      | JSON                                           |
| Repository           | Git and GitHub                                 |
| Component testing    | bUnit                                          |
| Browser testing      | Playwright                                     |
| Documentation        | Markdown and a Blazor-based documentation site |

Use the .NET 10 SDK as the initial development baseline, while keeping framework-specific dependencies and compatibility requirements explicit.

## 6. Source-First Distribution Model

BlazorUI distributes components through its CLI rather than requiring every component to remain inside a central UI library package.

Example workflow:

```bash
dotnet new blazor -n MyApp
cd MyApp

dotnet tool install --global BlazorUI.Cli
blazorui init

blazorui add button
```

The CLI copies the selected component source files and required dependencies into the application.

Planned generated structure for the first milestone:

```text
MyApp/
├── Components/
│   └── UI/
│       └── Button/
│           ├── Button.razor
│           └── Button.razor.css
├── wwwroot/
│   ├── css/
│   ├── js/
│   └── lib/
│       └── bootstrap/
├── blazorui.json
└── blazorui.lock.json
```

Component and style destinations are configurable in `blazorui.json`. The CLI defaults to `Components/UI` and `wwwroot/css/blazorui`; the component namespace is explicit and configurable. Package publication remains future work; the commands above describe the intended experience.

## 7. CLI Responsibilities

The CLI is the primary developer interface for installing and maintaining components.

Initial commands:

- `blazorui init` — initialize BlazorUI in an existing application.
- `blazorui add <component>` — install a component and resolve its dependencies.

The first milestone provides only `init` and `add button`. Deferred commands:

- `blazorui list` — list available components.
- `blazorui update <component>` — update an installed component.
- `blazorui update --all` — update all installed components.
- `blazorui diff <component>` — inspect changes between the installed and registry versions.
- `blazorui remove <component>` — remove a component when safe.
- `blazorui doctor` — diagnose configuration and asset issues.
- `blazorui theme init` — initialize theme customization.
- `blazorui bootstrap update` — update the managed Bootstrap assets.

The CLI must detect local modifications and avoid silently overwriting developer-owned code.

## 8. Component Registry

The registry is a versioned collection of component definitions and source files.

Each component manifest should describe:

- Component name and version.
- Description and category.
- Supported frameworks or application requirements.
- Source files and their destination paths.
- Dependencies on other components.
- Required CSS, JavaScript, or other assets.
- Bootstrap and other relevant compatibility requirements.
- File integrity information where appropriate.

The initial registry should be static and hosted through a public repository or static hosting provider. A custom backend service is not required for the first release.

The registry format must be versioned to support future schema changes.

Published registry snapshots are immutable. Pin exact registry, component, and asset versions; never install from a floating `main` or `latest` reference. Record release identity, manifest digest, installed paths, source hashes, and hashes after template substitution in `blazorui.lock.json`. Manifest destinations are relative to configured base directories. See [ADR 003](docs/adr/003-installation-and-registry-contract.md).

## 9. Bootstrap Management

BlazorUI uses Bootstrap as its foundational styling framework.

The CLI should manage a pinned Bootstrap version locally by default, making application builds less dependent on external CDNs.

Requirements:

- Install and track the selected Bootstrap version.
- Support controlled Bootstrap updates.
- Avoid overwriting unrelated application assets.
- Allow developers to customize BlazorUI styles independently of Bootstrap.
- Prefer Blazor-native behavior over Bootstrap JavaScript when the two approaches would conflict.

## 10. Design System and Theming

BlazorUI should provide a consistent design system built around CSS custom properties.

Use `.razor.css` for component-local styling and global CSS for Bootstrap, tokens, and themes. Blazor bundles isolated styles during the consumer build. Load Bootstrap, tokens, themes, and the generated application styles bundle once, in that order; explicit consumer overrides may follow. Customize through variables and parameters. See [ADR 001](docs/adr/001-hybrid-css.md).

The design system should support:

- Light and dark themes.
- Custom colors, typography, borders, radii, and spacing.
- Component variants and sizes.
- Responsive layouts.
- Right-to-left layouts.
- CSS class customization.
- Integration with Bootstrap utilities.

Components should support standard Blazor patterns, including `EventCallback`, parameter binding, and additional HTML attributes where appropriate.

## 11. Initial Component Roadmap

### Phase 1 — Foundation

- Accepted documentation and three ADRs before implementation.
- One CLI project implementing `init` and `add button`.
- One static registry snapshot with Button, global tokens/themes, and pinned Bootstrap assets.
- Configuration and lock metadata from the first install.
- One .NET 10 Blazor Web App sample with Interactive Server.
- Verified installation, stylesheet loading, build, click behavior, repeatability, and preservation of local edits.

General dependency resolution, update/diff commands, and additional application models follow after this complete path works. See [ADR 002](docs/adr/002-first-milestone-scope.md).

### Phase 2 — Core Components

- Button.
- Input.
- Label.
- Checkbox.
- Switch.
- Card.
- Badge.
- Alert.

### Phase 3 — Interactive Components

- Dialog.
- Dropdown.
- Tabs.
- Accordion.
- Tooltip.
- Popover.
- Select.
- Date picker.

Interactive components must be tested for keyboard behavior, focus management, accessibility, and compatibility with Blazor rendering modes.

### Phase 4 — Developer Experience

- Documentation website.
- Interactive component examples.
- Theme customization tools.
- Improved CLI diagnostics.
- Component search and discovery.
- Contribution guidelines and release automation.

## 12. Quality and Testing

Quality is a core requirement, not a final-stage addition.

The project should include:

- Unit tests for registry parsing and dependency resolution.
- CLI tests for initialization, installation, updates, and error handling.
- Component tests using bUnit.
- Browser-based integration tests using Playwright.
- Accessibility checks for interactive components.
- Sample applications covering the supported Blazor application models.
- CI workflows for building, testing, and validating releases.

Tests must verify that source installation produces working applications and that updates do not silently destroy local changes.

## 13. Non-Goals for the Initial Release

The initial release will not require:

- A hosted account system.
- A custom backend API.
- A cloud component-management service.
- A mandatory runtime dependency on BlazorUI infrastructure.
- An exhaustive component catalog.
- A custom JavaScript framework.
- Automatic merging of conflicting developer modifications.

These features may be considered later if real user needs justify their complexity.

## 14. First Milestone and Later Release Criteria

The first implementation milestone is complete when a developer can:

1. Run `init` and `add button` in the supported .NET 10 Blazor Web App.
2. Build and run the app, see styled Button markup, and trigger its click handler under Interactive Server.
3. Repeat both commands without duplicate links/imports or overwritten local changes.
4. Inspect configuration and lock metadata containing exact versions and hashes.
5. Install with custom component/style paths and a custom namespace successfully.
6. Receive a clear conflict or validation error before any partial installation; ordinary write failures roll back.
7. Run the installed component without registry access.

The broader release, after this milestone, additionally requires:

1. Initialize BlazorUI in a supported Blazor project.
2. Install a component using the CLI.
3. Automatically resolve and install its required dependencies.
4. Build and run the application successfully.
5. Customize the installed component's source code.
6. Update an unmodified component safely.
7. Review differences when a component has local modifications.
8. Use the component without a mandatory runtime connection to the registry.
9. Verify the supported behavior in representative Blazor application models.

## 15. Development Strategy

Development must proceed incrementally, with small, verifiable milestones.

Recommended order:

1. Finalize this project brief.
2. Define `ARCHITECTURE.md`.
3. Design and validate the registry manifest schema.
4. Implement registry parsing and validation for Button and its shared assets.
5. Create the CLI foundation.
6. Implement `init` and `add`.
7. Deliver one complete Button component workflow.
8. Validate the workflow in the .NET 10 Interactive Server sample.
9. Add dependency resolution, core components, additional application models, and their tests incrementally.
10. Publish the initial public release.

Every implementation task should have a clear scope, acceptance criteria, and automated tests where appropriate.

## 16. Project Success Criteria

BlazorUI will be successful if developers can install and customize components quickly, understand the generated code, build accessible interfaces, and maintain their applications without being locked into a compiled UI library or a remote service.

**The primary measure of success is a reliable source-first developer experience, not the number of components shipped.**
