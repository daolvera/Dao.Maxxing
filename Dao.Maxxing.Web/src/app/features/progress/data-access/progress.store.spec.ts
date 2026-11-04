import { TestBed } from '@angular/core/testing';
import { offsetDate } from '../../../nutrition/nutrition';
import { fixedToday, provideFixedClock } from '../../../testing/fixed-clock';
import { SettingsStore } from '../../settings/data-access/settings.store';
import { ProgressStore } from './progress.store';

describe('ProgressStore', () => {
  let store: ProgressStore;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [ProgressStore, provideFixedClock()] });
    store = TestBed.inject(ProgressStore);
    TestBed.tick();
  });

  it('loads the seven days ending on the selected date', () => {
    expect(store.week().map((d) => d.date)).toEqual(
      Array.from({ length: 7 }, (_, i) => offsetDate(fixedToday, i - 6)),
    );
    store.selectWeekEnd(offsetDate(fixedToday, -7));
    TestBed.tick();
    expect(store.week().at(-1)?.date).toBe(offsetDate(fixedToday, -7));
  });

  it('averages completed days only', () => {
    const completed = store.completedDays();
    expect(completed.length).toBeGreaterThan(0);
    expect(completed.length).toBeLessThan(store.week().length);
    const expected = completed.reduce((total, d) => total + d.total.calories, 0) / completed.length;
    expect(store.average()?.calories).toBeCloseTo(expected);
  });

  it('stores weights in kilograms and shows them in the preferred unit', async () => {
    await TestBed.inject(SettingsStore).savePreferences({ weightUnit: 'lb' });
    await store.saveWeight(offsetDate(fixedToday, -1), 176.37);
    const saved = store.weights().find((w) => w.date === offsetDate(fixedToday, -1))!;
    expect(saved.kg).toBeCloseTo(80, 1);
    expect(store.displayWeight(saved.kg)).toBeCloseTo(176.37, 1);

    await store.setWeightUnit('kg');
    expect(store.displayWeight(saved.kg)).toBeCloseTo(80, 1);

    await store.deleteWeight(saved.date);
    expect(store.weights().some((w) => w.date === saved.date)).toBe(false);
  });
});
