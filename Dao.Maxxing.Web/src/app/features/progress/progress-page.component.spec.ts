import { ComponentFixture, TestBed } from '@angular/core/testing';
import { offsetDate } from '../../nutrition/nutrition';
import { fixedToday, provideFixedClock } from '../../testing/fixed-clock';
import { closeOverlays, nextModalRender, provideNoNgbAnimations } from '../../testing/modals';
import { ProgressStore } from './data-access/progress.store';
import { ProgressPageComponent } from './progress-page.component';

describe('ProgressPageComponent', () => {
  let fixture: ComponentFixture<ProgressPageComponent>;
  let element: HTMLElement;
  let store: ProgressStore;

  const settle = async () => {
    await fixture.whenStable();
    await nextModalRender();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [ProgressPageComponent],
      providers: [ProgressStore, provideFixedClock(), provideNoNgbAnimations()],
    });
    fixture = TestBed.createComponent(ProgressPageComponent);
    element = fixture.nativeElement;
    store = TestBed.inject(ProgressStore);
    await settle();
  });

  afterEach(() => closeOverlays());

  it('shows a row per day of the week and the averages of completed days', () => {
    expect(element.querySelectorAll('tbody tr')).toHaveLength(7);
    expect(element.textContent).toContain(`Averages include ${store.completedDays().length} completed days`);
    expect(element.querySelectorAll('dl dt')).toHaveLength(4);
  });

  it('switches the weight unit', async () => {
    const kg = [...element.querySelectorAll('[aria-label="Weight unit"] button')].find(
      (b) => b.textContent?.trim() === 'kg',
    ) as HTMLElement;
    kg.click();
    await settle();
    expect(store.weightUnit()).toBe('kg');
    expect(kg.getAttribute('aria-pressed')).toBe('true');
    expect(element.querySelector('.list-group-item strong')?.textContent).toContain('kg');
  });

  it('records a weight through the modal', async () => {
    const record = [...element.querySelectorAll('button')].find((b) => b.textContent?.includes('Record weight'));
    record!.click();
    await settle();
    const modal = document.querySelector('ngb-modal-window')!;
    const date = modal.querySelector('input[type=date]') as HTMLInputElement;
    date.value = offsetDate(fixedToday, -3);
    date.dispatchEvent(new Event('input'));
    (modal.querySelector('button[type=submit]') as HTMLElement).click();
    await settle();
    expect(document.querySelector('ngb-modal-window')).toBeNull();
    expect(store.weights().some((w) => w.date === offsetDate(fixedToday, -3))).toBe(true);
  });
});
