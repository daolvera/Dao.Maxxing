import { TestBed } from '@angular/core/testing';
import { provideFixedClock } from '../../../testing/fixed-clock';
import { FoodsStore } from './foods.store';

describe('FoodsStore', () => {
  let store: FoodsStore;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideFixedClock()] });
    store = TestBed.inject(FoodsStore);
    TestBed.tick();
  });

  it('loads the library sorted by name and splits meals from recipes', () => {
    const names = store.foods().map((f) => f.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    expect(store.favorites().every((f) => f.favorite)).toBe(true);
    expect(store.meals().every((c) => c.kind === 'meal')).toBe(true);
    expect(store.recipes().every((c) => c.kind === 'recipe')).toBe(true);
  });

  it('adds a saved food and edits an existing one in place', async () => {
    const count = store.foods().length;
    expect(
      await store.saveFood({ name: 'Toast', serving: '1 slice', calories: 80, protein: 3, carbs: 14, fat: 1 }),
    ).toBe(true);
    expect(store.foods()).toHaveLength(count + 1);

    const toast = store.foods().find((f) => f.name === 'Toast')!;
    await store.saveFood({ ...toast, calories: 90 });
    expect(store.foods()).toHaveLength(count + 1);
    expect(store.foods().find((f) => f.id === toast.id)?.calories).toBe(90);
  });

  it('toggles a favorite', async () => {
    const food = store.foods().find((f) => !f.favorite)!;
    await store.toggleFavorite(food);
    expect(store.favorites().some((f) => f.id === food.id)).toBe(true);
  });

  it('does not change the library when a save is rejected', async () => {
    const before = store.foods();
    expect(await store.saveFood({ name: ' ', serving: '', calories: 0, protein: 0, carbs: 0, fat: 0 })).toBe(false);
    expect(store.foods()).toEqual(before);
  });
});
