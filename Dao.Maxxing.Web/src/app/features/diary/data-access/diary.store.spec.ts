import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { offsetDate } from '../../../nutrition/nutrition';
import { fixedToday, provideFixedClock } from '../../../testing/fixed-clock';
import { Food } from '../../foods/data-access/food';
import { DiaryDay } from './diary-day';
import { DiaryDataSource } from './diary.data-source';
import { DiaryStore } from './diary.store';

const banana: Food = {
  id: 'banana', name: 'Banana', serving: '1 medium', grams: 118,
  calories: 105, protein: 1.3, carbs: 27, fat: 0.4, favorite: false,
};

function emptyDay(date: string): DiaryDay {
  return { date, sections: ['Breakfast', 'Lunch'], entries: [], complete: false };
}

describe('DiaryStore', () => {
  let source: { [K in keyof DiaryDataSource]: ReturnType<typeof vi.fn> };
  let store: DiaryStore;

  beforeEach(() => {
    source = {
      getDay: vi.fn((date: string) => of(emptyDay(date))),
      getDays: vi.fn(),
      addEntry: vi.fn(),
      updateEntry: vi.fn(),
      deleteEntry: vi.fn(),
      setComplete: vi.fn((date: string, complete: boolean) => of({ ...emptyDay(date), complete })),
    };
    TestBed.configureTestingModule({
      providers: [DiaryStore, provideFixedClock(), { provide: DiaryDataSource, useValue: source }],
    });
    store = TestBed.inject(DiaryStore);
    TestBed.tick();
  });

  it("loads today's day through the data source", () => {
    expect(store.date()).toBe(fixedToday);
    expect(source.getDay).toHaveBeenCalledWith(fixedToday);
    expect(store.isToday()).toBe(true);
    expect(store.status()).toBe('empty');
    expect(store.meals().map((m) => m.name)).toEqual(['Breakfast', 'Lunch']);
  });

  it('reloads when the date changes and ignores invalid dates', () => {
    store.step(-1);
    TestBed.tick();
    expect(source.getDay).toHaveBeenLastCalledWith(offsetDate(fixedToday, -1));
    expect(store.isToday()).toBe(false);
    store.selectDate('2026-02-30');
    expect(store.date()).toBe(offsetDate(fixedToday, -1));
  });

  it('applies the saved day and derives totals per meal', async () => {
    source.addEntry.mockReturnValue(
      of({
        ...emptyDay(fixedToday),
        entries: [
          {
            ...banana, id: 'e1', foodId: 'banana', quantity: 2, unit: 'serving', section: 'Lunch',
            calories: 210, protein: 2.6, carbs: 54, fat: 0.8, base: banana,
          },
        ],
      }),
    );
    const saved = await store.addEntry({ food: banana, quantity: 2, unit: 'serving', section: 'Lunch' });
    expect(saved).toBe(true);
    expect(source.addEntry).toHaveBeenCalledWith(fixedToday, expect.objectContaining({ section: 'Lunch' }));
    expect(store.total().calories).toBe(210);
    expect(store.meals()[1].calories).toBe(210);
    expect(store.status()).toBe('in-progress');
  });

  it('keeps the current day when a save fails', async () => {
    source.addEntry.mockReturnValue(throwError(() => new Error('Choose a meal section.')));
    const saved = await store.addEntry({ food: banana, quantity: 1, unit: 'serving', section: 'Brunch' });
    expect(saved).toBe(false);
    expect(store.day()?.entries).toEqual([]);
  });

  it('toggles completion', async () => {
    await store.toggleComplete();
    expect(source.setComplete).toHaveBeenCalledWith(fixedToday, true);
    expect(store.status()).toBe('complete');
  });

  it('exposes a load error', () => {
    source.getDay.mockReturnValue(throwError(() => new Error('Offline.')));
    store.reload();
    TestBed.tick();
    expect(store.error()).toBe('Offline.');
  });
});
