import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthService } from '../../auth/auth.service';
import { ThemeToggleComponent } from '../../components/theme-toggle/theme-toggle.component';
import { LandingDemoComponent } from './landing-demo.component';

/** The public front door. It must not call protected endpoints or show anything personal. */
@Component({
  imports: [ThemeToggleComponent, LandingDemoComponent],
  template: `
    <header class="container d-flex align-items-center gap-2 py-3">
      <span class="d-inline-flex align-items-center gap-2 fs-5 fw-semibold text-primary-emphasis me-auto">
        <i class="bi bi-leaf" aria-hidden="true"></i>Maxxing
      </span>
      <app-theme-toggle />
      <button type="button" class="btn btn-outline-primary" (click)="auth.login()">Sign in</button>
    </header>

    <main class="container pb-5 d-flex flex-column gap-5">
      @if (auth.error(); as error) {
        <div class="alert alert-danger mb-0" role="alert">{{ error }}</div>
      }

      <section class="row align-items-center g-4 pt-md-4" aria-labelledby="landing-title">
        <div class="col-lg-6">
          <h1 id="landing-title" class="display-5 fw-bold">Know what you eat. Reach your goals.</h1>
          <p class="lead text-body-secondary">
            Maxxing is a simple nutrition tracker. Log a meal in seconds, see where your day stands,
            and watch your progress add up.
          </p>
          <button type="button" class="btn btn-primary btn-lg" (click)="auth.login()">
            <i class="bi bi-google" aria-hidden="true"></i> Sign in with Google
          </button>
        </div>
        <div class="col-lg-6">
          <h2 class="visually-hidden">See it in action</h2>
          <app-landing-demo />
        </div>
      </section>

      <section aria-labelledby="features-title">
        <h2 id="features-title" class="h3 mb-3">Everything you need, nothing you don't</h2>
        <div class="row row-cols-1 row-cols-md-2 row-cols-xl-4 g-3">
          @for (feature of features; track feature.title) {
            <div class="col">
              <div class="card h-100">
                <div class="card-body">
                  <i class="bi {{ feature.icon }} fs-3 text-primary-emphasis" aria-hidden="true"></i>
                  <h3 class="h5 mt-2">{{ feature.title }}</h3>
                  <p class="card-text text-body-secondary">{{ feature.text }}</p>
                </div>
              </div>
            </div>
          }
        </div>
      </section>
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingPageComponent {
  protected readonly auth = inject(AuthService);

  protected readonly features = [
    { icon: 'bi-journal-text', title: 'Log meals fast', text: 'Search foods, reuse favorites, and repeat yesterday in a tap.' },
    { icon: 'bi-upc-scan', title: 'Scan barcodes', text: 'Point your camera at a package to pull in its nutrition.' },
    { icon: 'bi-bullseye', title: 'Set your goals', text: 'Choose calorie and macro targets and see what is left today.' },
    { icon: 'bi-graph-up', title: 'Track progress', text: 'Follow your weight and weekly nutrition over time.' },
  ];
}
