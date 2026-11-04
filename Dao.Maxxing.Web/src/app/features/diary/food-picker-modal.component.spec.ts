import { TestBed } from '@angular/core/testing';
import { ModalService } from '../../services/modal.service';
import { provideFixedClock } from '../../testing/fixed-clock';
import { closeOverlays, nextModalRender, provideNoNgbAnimations } from '../../testing/modals';
import { DiaryEntry } from './data-access/diary-day';
import { FoodPickerModalComponent, PortionChoice } from './food-picker-modal.component';

describe('FoodPickerModalComponent', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({ providers: [provideFixedClock(), provideNoNgbAnimations()] }),
  );
  afterEach(() => closeOverlays());

  async function open(options: Partial<FoodPickerModalComponent>) {
    const ref = TestBed.inject(ModalService).open(FoodPickerModalComponent);
    Object.assign(ref.componentInstance as FoodPickerModalComponent, {
      sections: ['Breakfast', 'Lunch'],
      ...options,
    });
    ref.result.catch(() => undefined);
    await nextModalRender();
    return document.querySelector('ngb-modal-window') as HTMLElement;
  }

  /** Lets change detection and the async save run after a DOM event. */
  const settle = () => nextModalRender();

  it('filters foods by search and previews the chosen portion', async () => {
    const modal = await open({ section: 'Lunch' });
    const search = modal.querySelector('input[type=search]') as HTMLInputElement;
    search.value = 'oat';
    search.dispatchEvent(new Event('input'));
    await settle();
    const results = [...modal.querySelectorAll('.list-group-item')].map((b) => b.textContent);
    expect(results).toHaveLength(1);
    expect(results[0]).toContain('Rolled oats');

    (modal.querySelector('.list-group-item') as HTMLElement).click();
    await settle();
    expect((modal.querySelector('select[formcontrolname=section]') as HTMLSelectElement).value).toBe('Lunch');
    const quantity = modal.querySelector('input[formcontrolname=quantity]') as HTMLInputElement;
    quantity.value = '2';
    quantity.dispatchEvent(new Event('input'));
    await settle();
    expect(modal.querySelector('app-nutrition-line')?.textContent).toContain('300 kcal');
  });

  it('keeps the modal open with its input when the save fails', async () => {
    const save = vi.fn(async (_: PortionChoice) => false);
    const modal = await open({ save });
    (modal.querySelector('.list-group-item') as HTMLElement).click();
    await settle();
    (modal.querySelector('button[type=submit]') as HTMLElement).click();
    await settle();
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ quantity: 1, unit: 'serving', section: 'Breakfast' }));
    expect(document.querySelector('ngb-modal-window')).not.toBeNull();
  });

  it('edits an existing entry without the food chooser', async () => {
    const entry: DiaryEntry = {
      id: 'e1', foodId: 'coffee', name: 'Black coffee', serving: '1 mug', quantity: 2, unit: 'serving',
      section: 'Lunch', calories: 4, protein: 0, carbs: 0, fat: 0,
      base: { calories: 2, protein: 0, carbs: 0, fat: 0 },
    };
    const modal = await open({ entry, title: 'Edit Black coffee' });
    expect(modal.querySelector('input[type=search]')).toBeNull();
    expect((modal.querySelector('input[formcontrolname=quantity]') as HTMLInputElement).value).toBe('2');
    // No gram conversion is known for coffee, so grams can't be chosen.
    expect((modal.querySelector('option[value=g]') as HTMLOptionElement).disabled).toBe(true);
  });
});
