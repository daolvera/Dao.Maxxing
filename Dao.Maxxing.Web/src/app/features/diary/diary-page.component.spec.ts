import { ComponentFixture, TestBed } from '@angular/core/testing';
import { offsetDate } from '../../nutrition/nutrition';
import { fixedToday, provideFixedClock } from '../../testing/fixed-clock';
import { closeOverlays, nextModalRender, provideNoNgbAnimations } from '../../testing/modals';
import { DiaryStore } from './data-access/diary.store';
import { DiaryPageComponent } from './diary-page.component';

describe('DiaryPageComponent', () => {
  let fixture: ComponentFixture<DiaryPageComponent>;
  let element: HTMLElement;
  let store: DiaryStore;

  const click = async (target: Element | null | undefined) => {
    (target as HTMLElement).click();
    await fixture.whenStable();
    await nextModalRender();
  };
  const buttonWithText = (root: ParentNode, text: string) =>
    [...root.querySelectorAll('button')].find((b) => b.textContent?.includes(text));

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [DiaryPageComponent],
      providers: [DiaryStore, provideFixedClock(), provideNoNgbAnimations()],
    });
    fixture = TestBed.createComponent(DiaryPageComponent);
    element = fixture.nativeElement;
    store = TestBed.inject(DiaryStore);
    await fixture.whenStable();
  });

  afterEach(() => closeOverlays());

  it("shows today's meals, totals, and the placeholder notice", () => {
    expect(element.querySelector('h1')?.textContent).toContain('Your daily diary');
    expect([...element.querySelectorAll('app-meal-section h2')].map((h) => h.textContent)).toEqual([
      'Breakfast',
      'Lunch',
      'Dinner',
      'Snacks',
    ]);
    expect(element.querySelector('app-macro-summary h2')?.textContent).toContain("Today's nutrition");
    expect(element.querySelector('app-placeholder-notice a')?.getAttribute('href')).toContain('/issues/16');
  });

  it('moves between days with the date controls', async () => {
    await click(element.querySelector('button[aria-label="Previous day"]'));
    expect(store.date()).toBe(offsetDate(fixedToday, -1));
    expect((element.querySelector('input[type=date]') as HTMLInputElement).value).toBe(
      offsetDate(fixedToday, -1),
    );
    await click(buttonWithText(element, 'Today'));
    expect(store.date()).toBe(fixedToday);
  });

  it('adds a food to a meal through the picker', async () => {
    const before = store.meals()[3].entries.length;
    await click(buttonWithText(element.querySelectorAll('app-meal-section')[3], 'Add food'));

    const modal = document.querySelector('ngb-modal-window')!;
    expect(modal.querySelector('h2')?.textContent).toContain('Add to Snacks');
    await click(buttonWithText(modal, 'Rolled oats'));
    await click(modal.querySelector('button[type=submit]'));

    expect(store.meals()[3].entries).toHaveLength(before + 1);
    expect(store.meals()[3].entries.at(-1)?.name).toBe('Rolled oats');
    expect(document.querySelector('ngb-modal-window')).toBeNull();
  });

  it('deletes an entry after confirmation', async () => {
    const [entry] = store.meals()[0].entries;
    await click(element.querySelector(`button[aria-label="Delete ${entry.name} from Breakfast"]`));
    await click(buttonWithText(document.querySelector('ngb-modal-window')!, 'Delete entry'));
    expect(store.meals()[0].entries.some((e) => e.id === entry.id)).toBe(false);
  });
});
