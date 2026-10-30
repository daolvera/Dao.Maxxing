# DaoAspireAngularWeb

## Maxxing interactive prototype

The root route (`/`) is a responsive, sample-data-only nutrition prototype. Start
it with `npm start` and open the URL printed by Angular. It runs without the API,
Google credentials, a database, or Azure. The original authentication/weather
template remains at `/template` and still requires its backend configuration.

Use the four navigation sections to try diary logging, custom foods, reusable
meals, cooked-weight recipes, weekly nutrition, weights with illustrated photo
placeholders, two-photo comparison, goals, and meal-section settings. The banner's
**Sign-in demo** demonstrates allowed and denied accounts. Settings contains
**Simulate next save failing**, a fictional export preview, and confirmed deletion.
After a simulated failure, submit the retained form again to retry.

All data is fictional and held in memory: **Reset demo** or refreshing restores
the examples. No real camera access, food lookup, authentication, photo upload,
download, or persistent deletion occurs. Barcode `0123456789012` matches sample
oats; other unknown barcodes demonstrate the manual-entry fallback. Weight photos
are explicitly labeled illustrations, not personal images.

Saved diary nutrition is a snapshot. Library edits do not rewrite old logs.
Goal updates start today; meal-default updates start tomorrow and do not rewrite
existing diaries. Weekly averages include only days explicitly marked complete.
Food edits make a completed day incomplete again.

Run `npm run build` and `npm test -- --watch=false` for validation. Production
account enforcement, food-data integration, photo storage, export files, BFF,
database, and Azure deployment are not implemented in this prototype.

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.1.3.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
