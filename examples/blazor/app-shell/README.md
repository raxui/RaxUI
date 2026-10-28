# App-shell examples

Install `navbar`, `sidebar`, `navigation-menu`, `menubar`, `footer`, `banner`, plus `avatar`, `accordion`, `toggle` and `menu-toggle` for the composed examples. Copy the Razor files together so `ShellExampleBase`, `ShellIcon` and `ShellSidebarToggle` remain available. Serve `/avatars/astronaut.jpg` from the same asset used by react-test.

`NavbarExamples` includes a scrolling hero with appearance/floating/hide controls, an always-collapsed phone frame, and an Arabic floating bar. `SidebarExamples` includes workspace selection, reports, project add/rename/delete actions, loading favorites, account information, persistence and a separate Arabic frame. `NavigationMenuExamples` includes feature/component cards, solutions, resources, an active top-level link, an Arabic menu and mobile accordion navigation.

Examples mutate local state only; no account, project or navigation changes are sent to a service. The favorites delay is cancelled when the example is disposed. Local page selection prevents URL navigation; the independent routing fixture tests native links separately.
