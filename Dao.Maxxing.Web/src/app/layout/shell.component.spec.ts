import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { stubMatchMedia } from '../testing/match-media';
import { closeOverlays, nextModalRender, provideNoNgbAnimations } from '../testing/modals';
import { ShellComponent } from './shell.component';

@Component({ template: '<h1>Page</h1>' })
class PageComponent {}

describe('ShellComponent', () => {
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    stubMatchMedia();
    TestBed.configureTestingModule({
      providers: [
        provideNoNgbAnimations(),
        provideRouter([
          {
            path: '',
            component: ShellComponent,
            children: ['diary', 'foods', 'progress', 'settings'].map((path) => ({ path, component: PageComponent })),
          },
        ]),
      ],
    });
    harness = await RouterTestingHarness.create('/diary');
  });

  afterEach(() => closeOverlays());

  it('renders a skip link, the main landmark, and every feature link', () => {
    const element = harness.routeNativeElement!;
    expect(element.querySelector('a[href="#main-content"]')?.textContent).toContain('Skip to content');
    expect(element.querySelector('main#main-content')).not.toBeNull();
    const links = [...element.querySelectorAll('nav[aria-label=Main] a.nav-link')];
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/diary', '/foods', '/progress', '/settings']);
    expect(element.querySelector('nav a[aria-current=page]')?.textContent).toContain('Diary');
  });

  it('moves focus to the main content after navigating', async () => {
    await harness.navigateByUrl('/foods');
    expect(document.activeElement?.id).toBe('main-content');
  });

  it('opens the menu as an offcanvas and closes it after choosing a page', async () => {
    const element = harness.routeNativeElement!;
    (element.querySelector('button[aria-label="Open menu"]') as HTMLElement).click();
    await nextModalRender();
    const offcanvas = document.querySelector('ngb-offcanvas-panel')!;
    expect(offcanvas.getAttribute('aria-labelledby')).toBe('menu-title');
    (offcanvas.querySelector('a[href="/settings"]') as HTMLElement).click();
    await harness.fixture.whenStable();
    await nextModalRender();
    expect(document.querySelector('ngb-offcanvas-panel')).toBeNull();
    expect(harness.routeNativeElement?.querySelector('nav a[aria-current=page]')?.textContent).toContain('Settings');
  });
});
