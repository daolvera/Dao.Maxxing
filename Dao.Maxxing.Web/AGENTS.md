
You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.

## TypeScript Best Practices

- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain

## Angular Best Practices

- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default in Angular v20+.
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images.
  - `NgOptimizedImage` does not work for inline base64 images.

## Styling: ALWAYS Bootstrap first

The UI is Bootstrap 5.3 with ng-bootstrap. See
[docs/ui-framework.md](../docs/ui-framework.md) for the decision. Don't add
Angular Material, Tailwind, or any other UI kit or CSS framework.

- ALWAYS build with Bootstrap classes and utilities. Do NOT write custom CSS
  or SCSS for anything Bootstrap can express:
  - Layout and spacing: grid, `d-flex`, `gap-*`, `m-*`, `p-*`, `w-*`, and the
    responsive variants (`d-md-none` and so on).
  - Typography and color: `fs-*`, `fw-*`, `text-*`, `bg-*`, `bg-*-subtle`,
    `border-*`, and `rounded-*`.
  - Components: `btn`, `card`, `alert`, `badge`, `list-group`, `nav-pills`,
    `table`, and `placeholder`.
  - Forms: `form-label` above `form-control`, `form-select`, `form-check`,
    `input-group`, and `is-invalid` with `invalid-feedback`.
- Interactive components come from ng-bootstrap. Never use Bootstrap's own
  JavaScript (`bootstrap.bundle.js`, `data-bs-toggle`), jQuery, or hand-rolled
  versions.
  - **Modals:** `ModalService` (`services/modal.service.ts`) wraps `NgbModal`.
    Reuse `ConfirmModalComponent` for confirmations and `AlertModalComponent`
    for messages.
  - **Toasts:** `NotificationService` (`services/notification.service.ts`).
    `App` already renders `<app-notifications />`, so don't add another host.
  - **Inline alerts:** `<ngb-alert>` or `.alert alert-*`.
  - **Sidenav:** a persistent `nav nav-pills flex-column` on desktop, and
    `NgbOffcanvas` on small screens.
  - **Loading:** `SpinnerService`, or `spinner-border` inline.
  - **Others:** dropdowns, tooltips, popovers, collapse, tabs, and the
    datepicker use their `Ngb*` components.
- Theme Bootstrap through Sass variables in `src/styles/_variables.scss`, such
  as `$primary`, the font, and radii. At runtime, use `--bs-*` CSS variables.
  Never restyle Bootstrap's component classes by overriding them. Dark mode is
  Bootstrap's `data-bs-theme`, set by `ThemeService`.
- Icons are Bootstrap Icons: `<i class="bi bi-check-circle" aria-hidden="true"></i>`.
  Icon-only buttons need an `aria-label`.
- Custom styles are a last resort, for when no class, utility, or variable can
  do it. When you need one:
  - Keep it in that component's styles and keep it small.
  - Use Bootstrap variables (`var(--bs-primary)`, `var(--bs-border-radius)`),
    never hard-coded colors.
  - Add a comment saying why Bootstrap couldn't do it.
  - Never use `!important`, and never add global styles to `src/styles.scss`.
- `src/app/demo/` is the UI mock, with hand-written styles in `_content.scss`.
  It is the visual reference, not a pattern. Don't copy or extend its classes.
  When you rebuild a screen from it, use Bootstrap equivalents.

## Accessibility Requirements

- It MUST pass all AXE checks.
- It MUST follow all WCAG AA minimums, including focus management, color contrast, and ARIA attributes.
- Bootstrap doesn't make markup accessible by itself:
  - Pair every `form-label` with its control through `for`/`id`.
  - Use `visually-hidden` for text that only screen readers need.
  - Check contrast when you pick `text-*` or `bg-*` combinations.

### Components

- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `computed()` for derived state
- Set `changeDetection: ChangeDetectionStrategy.OnPush` in `@Component` decorator
- Prefer inline templates for small components
- Prefer Reactive forms instead of Template-driven ones
- Do NOT use `ngClass`, use `class` bindings instead
- Do NOT use `ngStyle`, use `style` bindings instead
- When using external templates/styles, use paths relative to the component TS file.

## State Management

- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead

## Templates

- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables
- Do not assume globals like (`new Date()`) are available.
- Do not write arrow functions in templates (they are not supported).

## Services

- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Use the `inject()` function instead of constructor injection
