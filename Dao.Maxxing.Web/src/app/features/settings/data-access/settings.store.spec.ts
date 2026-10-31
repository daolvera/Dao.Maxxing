import { TestBed } from '@angular/core/testing';
import { offsetDate } from '../../../nutrition/nutrition';
import { fixedToday, provideFixedClock } from '../../../testing/fixed-clock';
import { SettingsStore } from './settings.store';

describe('SettingsStore', () => {
  let store: SettingsStore;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideFixedClock()] });
    store = TestBed.inject(SettingsStore);
    TestBed.tick();
  });

  it('computes today in the saved time zone', () => {
    expect(store.today()).toBe(fixedToday);
    expect(store.mealSections().map((s) => s.name)).toEqual(['Breakfast', 'Lunch', 'Dinner', 'Snacks']);
  });

  it('starts new goals today and keeps earlier days on their old goal', async () => {
    const before = store.currentGoal();
    await store.saveGoals({ calories: 1800, protein: 140, carbs: 180, fat: 60 });
    expect(store.currentGoal().calories).toBe(1800);
    expect(store.goalFor(offsetDate(fixedToday, -1))).toEqual(expect.objectContaining(before));
  });

  it('saves preferences, keeping fields that were not changed', async () => {
    const zone = store.timeZone();
    expect(await store.savePreferences({ weightUnit: 'kg' })).toBe(true);
    expect(store.weightUnit()).toBe('kg');
    expect(store.timeZone()).toBe(zone);
    expect(await store.savePreferences({ timeZone: 'Nowhere/Land' })).toBe(false);
    expect(store.timeZone()).toBe(zone);
  });
});
