# UI framework (U1)

**Status:** Accepted.
**Decided:** 2026-10-31
**Choice:** Bootstrap 5.3 with ng-bootstrap 21. Not Angular Material.

## What the mock needs

The UI mock (`Dao.Maxxing.Web/src/app/demo/`) is a flat design:

- 1px borders and a 5–6px radius, with no shadows, elevation, or ripples.
- Labels sit above the inputs.
- Buttons are sentence case, small, and semibold.
- Panels are bordered cards.
- Notices and errors are tinted inline banners.

The app needs modals, alerts, toasts, a sidenav, and form inputs.

## Comparison

| Need | Angular Material 22 | ng-bootstrap 21 / Bootstrap 5.3 |
|---|---|---|
| Modals | `MatDialog`, with a CDK focus trap | `NgbModal`, with a focus trap. Flatter, so closer to the mock |
| Alerts | No component. You'd build one | `NgbAlert` / `.alert`. Matches the mock's notice and error banners |
| Toasts | `MatSnackBar`. One at a time, in Material styling | `NgbToast` without a service. The starter `NotificationService` fills that gap |
| Sidenav | `mat-sidenav` drawer | No persistent sidenav. Built from `nav-pills`, with `NgbOffcanvas` on mobile. The mock's mobile tab bar is custom work in either framework |
| Inputs | `mat-form-field`, with a floating label inside an outline. Doesn't match the mock | `form-label` + `form-control`. Matches the mock |
| Theming | `mat.theme()` palettes, plus token overrides for shape and density on each component | A handful of Sass variables (`$primary`, the font, radii) |
| Angular 22 | Supported | Supported (also needs `@angular/localize` and `@popperjs/core`) |

Both are accessible enough for the WCAG AA bar. Material's CDK is a little
stronger. The custom sidenav can use `@angular/cdk/a11y` if it needs to.

## Decision

Bootstrap matches the mock's look with almost no overrides. Its two gaps, a toast
service and a persistent sidenav, are small. Material's gaps are an alert
component and form fields that don't look like the mock. The form-field mismatch
would cost something on every form in a mostly-forms app.

## Setup

- Bootstrap and the starter services came from
  [`@daolvera/bootstrap-angular-schematic`](https://github.com/daolvera/bootstrap-angular-schematic).
  We kept its services and components for modals, notifications, the spinner,
  and the theme, plus its form utilities and validators. We dropped its sample
  pages and its header, footer, sidebar, and layout shell, because the app
  keeps the mock's shell. We also dropped its custom SCSS where Bootstrap
  already covers it:
  - `_global.scss`, because its reboot rules and `.dark-theme` overrides
    duplicate Bootstrap's reboot and `data-bs-theme`.
  - The `_variables.scss` entries that only restated Bootstrap's defaults.
  - The custom styles in the starter components. Notifications are now
    standard Bootstrap toasts.
- The app also differs from the schematic in these ways:
  - ng-bootstrap is `^21`, which is what Angular 22 requires. The schematic
    pins `^20`.
  - Bootstrap Icons come from npm, not a CDN.
  - There is no `@angular/animations`, and no separate `provideZonelessChangeDetection`
    because zoneless is already the default.
  - Sass `@import` deprecation warnings from Bootstrap 5.3 are silenced in
    `angular.json`.
- The theme lives in `Dao.Maxxing.Web/src/styles/_variables.scss`. `$primary` is
  the mock's `#058743`.
- The styling rules for agents are in
  [Dao.Maxxing.Web/AGENTS.md](../Dao.Maxxing.Web/AGENTS.md#styling-always-bootstrap-first).
