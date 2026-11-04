import { TestBed } from '@angular/core/testing';
import { firstValueFrom, Observable } from 'rxjs';
import { DiaryDataSource } from '../features/diary/data-access/diary.data-source';
import { LocalDiaryDataSource } from '../features/diary/data-access/local-diary.data-source';
import { FoodsDataSource } from '../features/foods/data-access/foods.data-source';
import { LocalFoodsDataSource } from '../features/foods/data-access/local-foods.data-source';
import { LocalWeightsDataSource } from '../features/progress/data-access/local-weights.data-source';
import { WeightsDataSource } from '../features/progress/data-access/weights.data-source';
import { LocalSettingsDataSource } from '../features/settings/data-access/local-settings.data-source';
import { SettingsDataSource } from '../features/settings/data-access/settings.data-source';
import { offsetDate } from '../nutrition/nutrition';
import { fixedToday, provideFixedClock } from '../testing/fixed-clock';

const value = <T>(source: Observable<T>) => firstValueFrom(source);

describe('placeholder data sources', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideFixedClock()] }));

  it('are the default implementation of each data-source contract', () => {
    expect(TestBed.inject(DiaryDataSource)).toBeInstanceOf(LocalDiaryDataSource);
    expect(TestBed.inject(FoodsDataSource)).toBeInstanceOf(LocalFoodsDataSource);
    expect(TestBed.inject(SettingsDataSource)).toBeInstanceOf(LocalSettingsDataSource);
    expect(TestBed.inject(WeightsDataSource)).toBeInstanceOf(LocalWeightsDataSource);
  });

  describe('diary', () => {
    let diary: DiaryDataSource;
    let foods: FoodsDataSource;
    beforeEach(() => {
      diary = TestBed.inject(DiaryDataSource);
      foods = TestBed.inject(FoodsDataSource);
    });

    it('snapshots nutrition when a food is logged, so later food edits do not change it', async () => {
      const [oats] = (await value(foods.getFoods())).filter((f) => f.id === 'oats');
      const day = await value(
        diary.addEntry(fixedToday, { food: oats, quantity: 20, unit: 'g', section: 'Breakfast' }),
      );
      const entry = day.entries.at(-1)!;
      expect(entry.calories).toBe(75);
      expect(day.complete).toBe(false);

      await value(foods.saveFood({ ...oats, calories: 500 }));
      const reread = await value(diary.getDay(fixedToday));
      expect(reread.entries.find((e) => e.id === entry.id)?.calories).toBe(75);
    });

    it('re-scales an edited entry from its snapshot and deletes entries', async () => {
      const [entry] = (await value(diary.getDay(fixedToday))).entries;
      const updated = await value(
        diary.updateEntry(fixedToday, entry.id, { quantity: 2, unit: 'serving', section: 'Lunch' }),
      );
      const edited = updated.entries.find((e) => e.id === entry.id)!;
      expect(edited.calories).toBe(entry.base.calories * 2);
      expect(edited.section).toBe('Lunch');

      const after = await value(diary.deleteEntry(fixedToday, entry.id));
      expect(after.entries.some((e) => e.id === entry.id)).toBe(false);
    });

    it('rejects invalid portions and unknown sections', async () => {
      const coffee = (await value(foods.getFoods())).find((f) => f.id === 'coffee')!;
      const add = (quantity: number, unit: 'g' | 'serving', section = 'Breakfast') =>
        value(diary.addEntry(fixedToday, { food: coffee, quantity, unit, section }));
      await expect(add(0, 'serving')).rejects.toThrow('greater than zero');
      await expect(add(50, 'g')).rejects.toThrow('Grams are unavailable');
      await expect(add(1, 'serving', 'Elevenses')).rejects.toThrow('meal section');
    });

    it('returns every day in a range, including empty ones', async () => {
      const days = await value(diary.getDays(offsetDate(fixedToday, -6), fixedToday));
      expect(days.map((d) => d.date)).toHaveLength(7);
      expect(days[2].entries).toHaveLength(0);
      expect((await value(diary.setComplete(fixedToday, true))).complete).toBe(true);
    });
  });

  describe('settings', () => {
    it('applies new meal defaults only from their start date', async () => {
      const settings = TestBed.inject(SettingsDataSource);
      const diary = TestBed.inject(DiaryDataSource);
      const tomorrow = offsetDate(fixedToday, 1);
      await value(
        settings.saveMealSections(
          [
            { name: 'Morning', visible: true },
            { name: 'Hidden', visible: false },
          ],
          tomorrow,
        ),
      );
      expect((await value(diary.getDay(offsetDate(fixedToday, 2)))).sections).toEqual(['Morning']);
      expect((await value(diary.getDay(fixedToday))).sections).toContain('Breakfast');
    });

    it('validates goals, sections, and time zones', async () => {
      const settings = TestBed.inject(SettingsDataSource);
      await expect(
        value(settings.saveGoals({ calories: 0, protein: 1, carbs: 1, fat: 1 }, fixedToday)),
      ).rejects.toThrow('greater than zero');
      await expect(
        value(settings.saveMealSections([{ name: 'A', visible: true }, { name: 'a', visible: true }], fixedToday)),
      ).rejects.toThrow('unique');
      await expect(
        value(settings.savePreferences({ timeZone: 'Mars/Olympus', weightUnit: 'kg' })),
      ).rejects.toThrow('IANA');
    });

    it('keeps earlier goals when targets change', async () => {
      const settings = TestBed.inject(SettingsDataSource);
      const goals = await value(
        settings.saveGoals({ calories: 2000, protein: 150, carbs: 200, fat: 70 }, fixedToday),
      );
      expect(goals).toHaveLength(2);
      expect(goals.at(-1)).toEqual({ calories: 2000, protein: 150, carbs: 200, fat: 70, from: fixedToday });
    });
  });

  describe('weights', () => {
    it('keeps one weight per date, sorted, and supports edits and deletes', async () => {
      const weights = TestBed.inject(WeightsDataSource);
      await expect(value(weights.saveWeight({ date: fixedToday, kg: 80 }))).rejects.toThrow(
        'already exists',
      );
      const edited = await value(weights.saveWeight({ date: fixedToday, kg: 80 }, fixedToday));
      expect(edited.at(-1)).toEqual({ date: fixedToday, kg: 80 });
      const moved = await value(
        weights.saveWeight({ date: offsetDate(fixedToday, -30), kg: 85 }),
      );
      expect(moved[0].date).toBe(offsetDate(fixedToday, -30));
      expect(await value(weights.deleteWeight(fixedToday))).toHaveLength(moved.length - 1);
    });
  });

  describe('foods', () => {
    it('creates foods, refuses duplicate barcodes, and toggles favorites', async () => {
      const foods = TestBed.inject(FoodsDataSource);
      const created = await value(
        foods.saveFood({ name: ' Toast ', serving: '1 slice', calories: 80, protein: 3, carbs: 14, fat: 1 }),
      );
      expect(created.name).toBe('Toast');
      expect(created.favorite).toBe(false);
      await expect(
        value(foods.saveFood({ ...created, id: undefined, barcode: '0123456789012' })),
      ).rejects.toThrow('barcode');
      expect((await value(foods.setFavorite(created.id, true))).favorite).toBe(true);
    });
  });
});
