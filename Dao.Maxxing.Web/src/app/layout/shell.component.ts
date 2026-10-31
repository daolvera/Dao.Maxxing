import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap';
import { filter, skip } from 'rxjs';
import { ThemeToggleComponent } from '../components/theme-toggle/theme-toggle.component';
import { INavigationItem } from '../models';

export const navigation: INavigationItem[] = [
  { label: 'Diary', route: '/diary', icon: 'bi-journal-text' },
  { label: 'Foods & recipes', route: '/foods', icon: 'bi-egg-fried' },
  { label: 'Progress', route: '/progress', icon: 'bi-graph-up' },
  { label: 'Settings', route: '/settings', icon: 'bi-sliders' },
];

/**
 * The signed-in layout: a persistent sidenav on large screens, an offcanvas menu on small ones,
 * and the feature routes in `<main>`.
 */
@Component({
  selector: 'app-shell',
  imports: [NgTemplateOutlet, RouterOutlet, RouterLink, RouterLinkActive, ThemeToggleComponent],
  template: `
    <a class="visually-hidden-focusable position-absolute top-0 start-0 m-2 p-2 bg-body z-3" href="#main-content">
      Skip to content
    </a>
    <ng-template #brand>
      <span class="d-inline-flex align-items-center gap-2 fs-5 fw-semibold text-primary-emphasis">
        <i class="bi bi-leaf" aria-hidden="true"></i>Maxxing
      </span>
    </ng-template>
    <ng-template #links let-menuRef="menuRef">
      <ul class="nav nav-pills flex-column gap-1">
        @for (item of navigation; track item.route) {
          <li class="nav-item">
            <a
              class="nav-link d-flex align-items-center gap-2"
              [routerLink]="item.route"
              routerLinkActive="active"
              ariaCurrentWhenActive="page"
              (click)="menuRef?.close()"
            >
              <i class="bi {{ item.icon }}" aria-hidden="true"></i>{{ item.label }}
            </a>
          </li>
        }
      </ul>
    </ng-template>

    <div class="container-fluid">
      <div class="row min-vh-100">
        <nav
          class="col-lg-3 col-xl-2 d-none d-lg-flex flex-column gap-4 p-3 border-end"
          aria-label="Main"
        >
          <a class="text-decoration-none" routerLink="/diary">
            <ng-container [ngTemplateOutlet]="brand" />
            <span class="visually-hidden">, go to diary</span>
          </a>
          <ng-container [ngTemplateOutlet]="links" />
          <div class="mt-auto d-flex align-items-center justify-content-between">
            <span class="small text-body-secondary">Just for you</span>
            <app-theme-toggle />
          </div>
        </nav>

        <div class="col-lg-9 col-xl-10 d-flex flex-column px-0">
          <header class="d-flex d-lg-none align-items-center gap-2 border-bottom px-3 py-2">
            <button
              type="button"
              class="btn btn-outline-secondary"
              aria-label="Open menu"
              (click)="openMenu()"
            >
              <i class="bi bi-list" aria-hidden="true"></i>
            </button>
            <a class="text-decoration-none me-auto" routerLink="/diary">
              <ng-container [ngTemplateOutlet]="brand" />
              <span class="visually-hidden">, go to diary</span>
            </a>
            <app-theme-toggle />
          </header>
          <main id="main-content" #main tabindex="-1" class="flex-grow-1 p-3 p-md-4">
            <router-outlet />
          </main>
        </div>
      </div>
    </div>

    <ng-template #menu let-offcanvas>
      <div class="offcanvas-header">
        <h2 class="offcanvas-title h5" id="menu-title">Menu</h2>
        <button
          type="button"
          class="btn-close"
          aria-label="Close menu"
          (click)="offcanvas.dismiss()"
        ></button>
      </div>
      <nav class="offcanvas-body" aria-label="Main">
        <ng-container
          [ngTemplateOutlet]="links"
          [ngTemplateOutletContext]="{ menuRef: offcanvas }"
        />
      </nav>
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShellComponent {
  private readonly offcanvas = inject(NgbOffcanvas);
  private readonly main = viewChild.required<ElementRef<HTMLElement>>('main');
  private readonly menu = viewChild.required<TemplateRef<unknown>>('menu');
  protected readonly navigation = navigation;

  constructor() {
    // A route change replaces the page without a reload, so move focus to the new content the
    // way a page load would. Skip the first navigation so loading the app doesn't steal focus.
    inject(Router)
      .events.pipe(
        filter((event) => event instanceof NavigationEnd),
        skip(1),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.main().nativeElement.focus());
  }

  protected openMenu(): void {
    this.offcanvas.open(this.menu(), { ariaLabelledBy: 'menu-title', position: 'start' });
  }
}
