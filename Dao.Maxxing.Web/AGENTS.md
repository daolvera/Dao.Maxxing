
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
  - **Form fields:** `<app-form-field>` with `appFieldControl` on the input
    (`components/form-field`). It wires the label, hint, and validation
    message to the control, so use it instead of a hand-written
    `form-label` and `invalid-feedback`.
  - **Others:** dropdowns, tooltips, popovers, collapse, tabs, and the
    datepicker use their `Ngb*` components.
- Theme Bootstrap through Sass variables in `src/styles/_variables.scss`, such
  as `$primary`, the font, and radii. At runtime, use `--bs-*` CSS variables.
  Never restyle Bootstrap's component classes by overriding them. Dark mode is
  Bootstrap's `data-bs-theme`, set by `ThemeService`.
  - The one exception is `src/styles/_accessibility.scss`, for contrast fixes
    that no Sass variable can reach. Keep it tiny and give each rule a WCAG
    reason.
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

## Feature structure

Each screen is a lazy-loaded feature under `src/app/features/<name>/`, mounted
inside `layout/ShellComponent` by `app.routes.ts` with `loadChildren`:

```
features/diary/
  diary.routes.ts            route, page title, and route-scoped providers
  diary-page.component.ts    the page; small child components beside it
  data-access/
    diary-day.ts             domain types and pure helpers
    diary.data-source.ts     abstract contract (the backend boundary)
    local-diary.data-source.ts  PLACEHOLDER implementation, see below
    diary.store.ts           signal store for the page
```

Shared, feature-agnostic pieces stay in `components/`, `services/`, and
`nutrition/` (types and math). A feature may import another feature's
`data-access/` but never its components.

## State management

One pattern: **data source → signal store → component**.

- **Data sources** are the only code that talks to the backend. Each is an
  abstract class with `@Injectable({ providedIn: 'root', useClass: ... })` and
  returns `Observable`s. Implementations call `inject(Api).invoke(fn, params)`
  from the generated client (see `weather/weather.service.ts`).
- **Placeholders.** While an endpoint doesn't exist, `useClass` points at a
  `Local*DataSource` over the in-memory `placeholder/PlaceholderDb`, and the
  page shows `<app-placeholder-notice>` with the issue that adds the endpoint.
  When it lands, write the `Api`-backed class, switch `useClass`, and delete
  the placeholder and notice. Stores and components don't change.
- **Stores** are `@Injectable` classes that hold a feature's state as signals.
  - Reads use `rxResource({ params, stream })` over the data source, so loading
    and error state come for free and changing a `params` signal (the date, the
    week) refetches.
  - Expose read-only signals and `computed()` views. Components never write a
    store's signals directly; they call its methods.
  - Writes go through `createMutationRunner()`
    (`data-access/mutation-runner.ts`). It tracks `saving`, applies the
    server's response to the resource with `.set()`/`.update()`, shows a toast,
    and resolves `true` or `false`. Forms and modals close only on `true`, so a
    failed save keeps the user's input.
  - Scope: provide a page's store in its route's `providers` so it resets when
    you leave. Use `providedIn: 'root'` only for state other features read
    (`FoodsStore`, `SettingsStore`).
- **Components** keep UI-only state (open tabs, search text, form values) in
  local signals and reactive forms. Modals opened through `ModalService` can't
  inject route-scoped stores, so pass them a `save` callback instead.
- Time comes from the `NOW` token (`nutrition/nutrition.ts`), never
  `new Date()` in a store, so specs can use `provideFixedClock()`.
- Keep state transformations pure. Use `set` or `update` on signals, never
  `mutate`.

## Testing

- Specs use Vitest through `ng test`. Stores are tested with a fake data source
  or the placeholder plus `provideFixedClock()` and `TestBed.tick()`.
- Specs that open modals or the offcanvas use `provideNoNgbAnimations()` and
  call `closeOverlays()` in `afterEach` (`testing/modals.ts`). Otherwise
  ng-bootstrap removes the element after teardown and the run fails.

## Templates

- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables
- Do not assume globals like (`new Date()`) are available.
- Do not write arrow functions in templates (they are not supported).

## API calls

- Call the backend only through the generated client in `src/app/api/`:
  `inject(Api).invoke(getWeatherForecast)`, and only from a feature's data
  source (see State management). Don't write `HttpClient` calls or model
  interfaces for `/api` endpoints by hand.
- `src/app/api/` is generated from `../openapi/dao-maxxing-api.json`. Don't
  edit it. Building `Dao.Maxxing.Api` regenerates it, and so does running
  `npm run generate:api`. CI fails when it's out of date.

## Services

- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Use the `inject()` function instead of constructor injection
