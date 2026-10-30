import { DemoStore, dateInZone, offsetDate, recipeFood, scale, sum, validDate } from './demo-store';

describe('DemoStore', () => {
  let store: DemoStore;
  beforeEach(() => { store = new DemoStore(); });

  it('calculates proportional grams without changing a food', () => {
    const food = store.foods()[0];
    store.addFood(food, 20, 'g', 'Breakfast');
    const entry = store.day().entries.at(-1)!;
    expect(entry.calories).toBe(75);
    expect(entry.protein).toBe(2.5);
    expect(food.calories).toBe(150);
    expect(sum([scale(food, 0.5), scale(food, 0.5)]).calories).toBe(150);
  });

  it('rejects unknown gram conversions and nonpositive quantities', () => {
    const coffee = store.foods().find(f => f.id === 'coffee')!;
    expect(() => store.addFood(coffee, 50, 'g', 'Breakfast')).toThrow('Grams are unavailable');
    expect(() => store.addFood(coffee, 0, 'serving', 'Breakfast')).toThrow('quantity');
    expect(() => store.addFood(coffee, Number.NaN, 'serving', 'Breakfast')).toThrow('quantity');
  });

  it('preserves diary nutrition when a library food is edited', () => {
    const before = structuredClone(store.day().entries[0]);
    store.saveFood({ ...store.foods()[0], calories: 500 });
    expect(store.day().entries[0]).toEqual(before);
    store.editEntry(before.id, 2, 'serving', 'Lunch');
    expect(store.day().entries[0].calories).toBe(before.base.calories * 2);
    expect(store.day().entries[0].section).toBe('Lunch');
  });

  it('calculates cooked recipe portions and retains logged snapshots', () => {
    const recipe = store.collections().find(c => c.kind === 'recipe')!;
    const food = recipeFood(recipe);
    expect(food.grams).toBe(400);
    const ingredientCalories = recipe.ingredients.reduce((n, i) => n + i.food.calories * i.servings, 0);
    expect(food.calories).toBeCloseTo(ingredientCalories / 4);
    store.addFood(food, 200, 'g', 'Dinner');
    const logged = store.day().entries.at(-1)!;
    expect(logged.calories).toBeCloseTo(ingredientCalories / 8);
    store.saveCollection({ ...recipe, servings: 2, cookedGrams: 1000 });
    expect(store.day().entries.at(-1)).toEqual(logged);
  });

  it('logs reusable meals independently and saves diary combinations', () => {
    const meal = store.collections().find(c => c.kind === 'meal')!;
    const original = structuredClone(meal);
    store.logMeal(meal, 'Dinner');
    const entry = store.day().entries.at(-1)!;
    store.editEntry(entry.id, 2, 'serving', 'Dinner');
    expect(meal).toEqual(original);
    store.saveMealFromDiary('Dinner');
    expect(store.collections().at(-1)?.kind).toBe('meal');
    expect(store.collections().at(-1)?.ingredients.length).toBe(3);
  });

  it('copies a meal without replacing destination foods', () => {
    const source = structuredClone(store.day());
    const tomorrow = offsetDate(store.today(), 1);
    store.copyMeal('Breakfast', tomorrow);
    store.copyMeal('Breakfast', tomorrow);
    expect(store.getDay(tomorrow).entries.length).toBe(6);
    expect(new Set(store.getDay(tomorrow).entries.map(e => e.id)).size).toBe(6);
    expect(store.day()).toEqual(source);
    expect(store.getDay(tomorrow).complete).toBe(false);
  });

  it('changes defaults only for future days and preserves existing sections', () => {
    const today = structuredClone(store.day());
    const yesterday = structuredClone(store.getDay(offsetDate(store.today(), -1)));
    store.saveSections([{ name: 'Brunch', visible: true }, { name: 'Dinner', visible: false }]);
    expect(store.day()).toEqual(today);
    expect(store.getDay(offsetDate(store.today(), -1))).toEqual(yesterday);
    expect(store.getDay(offsetDate(store.today(), 1)).sections).toEqual(['Brunch']);
    expect(() => store.removeDaySection('Breakfast')).toThrow('Move the foods');
    store.removeDaySection('Dinner');
    expect(store.day().sections).not.toContain('Dinner');
  });

  it('validates section names and visibility', () => {
    expect(() => store.saveSections([{ name: 'Lunch', visible: true }, { name: 'lunch', visible: true }])).toThrow('unique');
    expect(() => store.saveSections([{ name: 'Lunch', visible: false }])).toThrow('visible');
    expect(() => store.saveSections([{ name: '', visible: true }])).toThrow('empty');
  });

  it('sets goals from today without rewriting history or rejecting a mismatch', () => {
    const yesterday = offsetDate(store.today(), -1);
    const previous = structuredClone(store.goalFor(yesterday));
    const value = { calories: 2000, protein: 150, carbs: 200, fat: 50 };
    store.saveGoals(value);
    expect(store.goalFor(yesterday)).toEqual(previous);
    expect(store.goalFor(store.today()).calories).toBe(2000);
    expect(store.goalFor(offsetDate(store.today(), 3)).calories).toBe(2000);
    expect(() => store.saveGoals({ ...value, protein: -1 })).toThrow();
  });

  it('averages only completed days and resets completion after food changes', () => {
    const completed = store.week().filter(d => d.complete);
    expect(store.average()?.calories).toBeCloseTo(completed.reduce((n, d) => n + sum(d.entries).calories, 0) / completed.length);
    store.toggleComplete();
    expect(store.day().complete).toBe(true);
    store.addFood(store.foods()[0], 1, 'serving', 'Breakfast');
    expect(store.day().complete).toBe(false);
    store.days.set([]);
    expect(store.average()).toBeNull();
    expect(store.week().every(d => d.entries.length === 0)).toBe(true);
  });

  it('retains existing state on simulated failure and succeeds on retry', () => {
    const before = structuredClone(store.days());
    store.failNext.set(true);
    const action = () => store.addFood(store.foods()[0], 1, 'serving', 'Snacks');
    expect(store.run(action, 'Saved')).toBe(false);
    expect(store.days()).toEqual(before);
    expect(store.error()).toContain('Retry');
    expect(store.run(action, 'Saved')).toBe(true);
    expect(store.error()).toBe('');
    expect(store.notice()).toBe('Saved');
  });

  it('stores one weight per date, converts units, edits and deletes attached photos', () => {
    const date = offsetDate(store.today(), -2);
    store.weightUnit.set('lb');
    store.saveWeight(date, 220.46226218, true);
    expect(store.weights().find(w => w.date === date)?.kg).toBeCloseTo(100);
    expect(() => store.saveWeight(date, 200, false)).toThrow('already exists');
    store.weightUnit.set('kg');
    store.saveWeight(date, 99, false, date);
    expect(store.weights().find(w => w.date === date)).toEqual({ date, kg: 99, photo: false });
    store.deleteWeight(date);
    expect(store.weights().some(w => w.date === date)).toBe(false);
  });

  it('keeps diary dates fixed when time zone changes', () => {
    const before = structuredClone(store.days());
    store.saveZone('Pacific/Auckland');
    expect(store.days()).toEqual(before);
    expect(() => store.saveZone('Not/AZone')).toThrow('valid IANA');
    expect(dateInZone('America/Los_Angeles', new Date('2026-10-30T01:00:00Z'))).toBe('2026-10-29');
    expect(offsetDate('2026-12-31', 1)).toBe('2027-01-01');
    expect(validDate('2026-02-31')).toBe(false);
  });

  it('rejects invalid custom food, duplicate barcodes, and invalid recipe yield', () => {
    const food = store.foods()[0];
    expect(() => store.saveFood({ ...food, id: '', name: '' })).toThrow('name');
    expect(() => store.saveFood({ ...food, id: '', name: 'Duplicate' })).toThrow('barcode');
    expect(() => store.saveFood({ ...food, grams: 0 })).toThrow('Grams');
    const recipe = store.collections()[1];
    expect(() => store.saveCollection({ ...recipe, servings: 0 })).toThrow('serving');
    expect(() => store.saveCollection({ ...recipe, cookedGrams: -1 })).toThrow('weight');
    expect(() => store.saveCollection({ ...recipe, ingredients: [] })).toThrow('ingredients');
  });

  it('clears and restores sample data without browser persistence', () => {
    const original = structuredClone(store.foods());
    store.clearData();
    expect(store.days()).toEqual([]);
    expect(store.weights()).toEqual([]);
    expect(store.goals()).toEqual([]);
    expect(store.foods()).toEqual([]);
    store.reset();
    expect(store.foods()).toEqual(original);
    expect(store.weights()).toHaveLength(4);
    expect(store.day().entries.length).toBeGreaterThan(0);
  });
});
