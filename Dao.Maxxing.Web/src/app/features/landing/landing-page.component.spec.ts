import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../auth/auth.service';
import { provideFakeAuth } from '../../testing/fake-auth';
import { stubMatchMedia } from '../../testing/match-media';
import { LandingPageComponent } from './landing-page.component';

describe('LandingPageComponent', () => {
  function render(error: string | null = null): HTMLElement {
    stubMatchMedia();
    TestBed.configureTestingModule({ providers: [provideFakeAuth(null, error)] });
    const fixture = TestBed.createComponent(LandingPageComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('labels the preview as a demo with sample data', () => {
    expect(render().textContent).toContain('Demo · sample data');
  });

  it('describes each main feature', () => {
    const titles = [...render().querySelectorAll('h3')].map((h) => h.textContent?.trim());
    expect(titles).toEqual(
      expect.arrayContaining(['Log meals fast', 'Scan barcodes', 'Set your goals', 'Track progress']),
    );
  });

  it('starts Google sign-in from the main button', () => {
    const buttons = [...render().querySelectorAll('button')];
    buttons.find((b) => b.textContent?.includes('Sign in with Google'))!.click();
    expect(TestBed.inject(AuthService).login).toHaveBeenCalledOnce();
  });

  it('shows a sign-in failure', () => {
    expect(render('Sign-in failed.').querySelector('[role=alert]')?.textContent).toContain('Sign-in failed.');
  });
});
