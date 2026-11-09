import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { provideFakeAuth } from './testing/fake-auth';
import { provideFixedClock } from './testing/fixed-clock';
import { stubMatchMedia } from './testing/match-media';

describe('app routes when signed out', () => {
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    stubMatchMedia();
    TestBed.configureTestingModule({ providers: [provideRouter(routes), provideFixedClock(), provideFakeAuth(null)] });
    harness = await RouterTestingHarness.create();
  });

  it('shows the landing page at the root', async () => {
    await harness.navigateByUrl('/');
    expect(TestBed.inject(Router).url).toBe('/');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain('Know what you eat');
    expect(document.title).toBe('Maxxing | Personal nutrition tracker');
  });

  it.each(['/diary', '/foods', '/progress', '/settings', '/nope'])('sends %s to the landing page', async (url) => {
    await harness.navigateByUrl(url);
    expect(TestBed.inject(Router).url).toBe('/');
    expect(harness.routeNativeElement?.querySelector('nav[aria-label=Main]')).toBeNull();
  });
});

describe('app routes', () => {
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    stubMatchMedia();
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideFixedClock(), provideFakeAuth({ id: 'owner', name: 'Owner' })],
    });
    harness = await RouterTestingHarness.create();
  });

  it('opens the diary by default inside the shell', async () => {
    await harness.navigateByUrl('/');
    expect(TestBed.inject(Router).url).toBe('/diary');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain('Your daily diary');
    expect(document.title).toBe('Diary · Maxxing');
  });

  it.each([
    ['/foods', 'Foods & recipes'],
    ['/progress', 'Your progress'],
    ['/settings', 'Make it yours'],
  ])('lazy-loads %s', async (url, heading) => {
    await harness.navigateByUrl(url);
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain(heading);
  });

  it('marks the current page in the navigation', async () => {
    await harness.navigateByUrl('/progress');
    const current = harness.routeNativeElement?.querySelectorAll('nav [aria-current=page]');
    expect([...(current ?? [])].map((a) => a.textContent?.trim())).toEqual(['Progress']);
  });

  it('sends unknown URLs to the diary', async () => {
    await harness.navigateByUrl('/nope');
    expect(TestBed.inject(Router).url).toBe('/diary');
  });
});
