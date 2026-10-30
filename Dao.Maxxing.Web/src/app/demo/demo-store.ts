import { computed, Injectable, signal } from '@angular/core';

export interface Nutrition { calories: number; protein: number; carbs: number; fat: number }
export interface Food extends Nutrition {
  id: string; name: string; serving: string; grams?: number; barcode?: string; favorite: boolean;
}
export interface Ingredient { food: Food; servings: number }
export interface Collection {
  id: string; name: string; kind: 'meal' | 'recipe'; ingredients: Ingredient[];
  servings: number; cookedGrams?: number;
}
export interface Entry extends Nutrition {
  id: string; name: string; serving: string; grams?: number; quantity: number;
  unit: 'serving' | 'g'; base: Nutrition; section: string;
}
export interface Day { date: string; sections: string[]; entries: Entry[]; complete: boolean }
export interface Goal extends Nutrition { from: string }
export interface Weight { date: string; kg: number; photo: boolean }
export interface Section { name: string; visible: boolean }
export const nutrients = ['calories', 'protein', 'carbs', 'fat'] as const;
export const emptyNutrition = (): Nutrition => ({ calories: 0, protein: 0, carbs: 0, fat: 0 });
export function scale(n: Nutrition, factor: number): Nutrition {
  return { calories: n.calories * factor, protein: n.protein * factor, carbs: n.carbs * factor, fat: n.fat * factor };
}
export function sum(items: Nutrition[]): Nutrition {
  return items.reduce((a, n) => ({
    calories: a.calories + n.calories, protein: a.protein + n.protein,
    carbs: a.carbs + n.carbs, fat: a.fat + n.fat,
  }), emptyNutrition());
}
export function offsetDate(date: string, offset: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}
export function dateInZone(zone: string, now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (type: string) => parts.find(p => p.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function validDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) &&
    new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) === date;
}
function requireValue(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}
function validateNutrition(n: Nutrition): void {
  requireValue(nutrients.every(k => Number.isFinite(n[k]) && n[k] >= 0), 'Nutrition values must be finite and zero or greater.');
}
export function recipeFood(collection: Collection): Food {
  const total = sum(collection.ingredients.map(i => scale(i.food, i.servings)));
  return {
    ...scale(total, 1 / collection.servings), id: collection.id, name: collection.name,
    serving: `1 serving (${collection.servings} in recipe)`, favorite: false,
    grams: collection.cookedGrams ? collection.cookedGrams / collection.servings : undefined,
  };
}

@Injectable({ providedIn: 'root' })
export class DemoStore {
  readonly zone = signal(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  readonly today = computed(() => dateInZone(this.zone()));
  readonly date = signal(this.today());
  readonly foods = signal<Food[]>([]);
  readonly collections = signal<Collection[]>([]);
  readonly days = signal<Day[]>([]);
  readonly goals = signal<Goal[]>([]);
  readonly weights = signal<Weight[]>([]);
  readonly sections = signal<Section[]>([]);
  readonly sectionVersions = signal<{ from: string; names: string[] }[]>([]);
  readonly recentIds = signal<string[]>([]);
  readonly weightUnit = signal<'kg' | 'lb'>('lb');
  readonly failNext = signal(false);
  readonly notice = signal('');
  readonly error = signal('');
  readonly day = computed(() => this.getDay(this.date()));
  readonly total = computed(() => sum(this.day().entries));
  readonly target = computed(() => this.goalFor(this.date()));
  readonly week = computed(() => Array.from({ length: 7 }, (_, i) => this.getDay(offsetDate(this.date(), i - 6))));
  readonly completedDays = computed(() => this.week().filter(d => d.complete));
  readonly average = computed(() => this.completedDays().length
    ? scale(sum(this.completedDays().map(d => sum(d.entries))), 1 / this.completedDays().length) : null);
  private sequence = 0;

  constructor() { this.reset(); }

  run(action: () => void, message: string): boolean {
    this.error.set(''); this.notice.set('');
    try {
      if (this.failNext()) {
        this.failNext.set(false);
        throw new Error('Demo save failed. Your input is retained. Retry the same action.');
      }
      action(); this.notice.set(message); return true;
    } catch (error: unknown) {
      this.error.set(error instanceof Error ? error.message : 'The demo action failed. Try again.');
      return false;
    }
  }
  getDay(date: string): Day {
    const version = this.sectionVersions().filter(v => v.from <= date).at(-1);
    return this.days().find(d => d.date === date) ?? {
      date, sections: [...(version?.names ?? ['Breakfast', 'Lunch', 'Dinner', 'Snacks'])], entries: [], complete: false,
    };
  }
  goalFor(date: string): Nutrition { return this.goals().filter(g => g.from <= date).at(-1) ?? emptyNutrition(); }
  selectDate(date: string): void {
    if (!validDate(date)) { this.error.set('Choose a valid diary date.'); return; }
    this.date.set(date);
  }
  private writeDay(day: Day): void {
    this.days.update(days => [...days.filter(d => d.date !== day.date), structuredClone(day)]);
  }
  addFood(food: Food, quantity: number, unit: 'serving' | 'g', section: string): void {
    const entry = this.makeEntry(food, quantity, unit, section);
    requireValue(this.day().sections.includes(section), 'Choose a meal section.');
    this.writeDay({ ...this.day(), entries: [...this.day().entries, entry], complete: false });
    this.recentIds.update(ids => [food.id, ...ids.filter(id => id !== food.id)].slice(0, 20));
  }
  private makeEntry(food: Food, quantity: number, unit: 'serving' | 'g', section: string): Entry {
    requireValue(Number.isFinite(quantity) && quantity > 0, 'Enter a quantity greater than zero.');
    requireValue(unit === 'serving' || !!food.grams, 'Grams are unavailable. Add a known grams-per-serving conversion first.');
    return {
      ...scale(food, unit === 'g' ? quantity / food.grams! : quantity),
      id: `entry-${++this.sequence}`, name: food.name, serving: food.serving, grams: food.grams,
      quantity, unit, base: { calories: food.calories, protein: food.protein, carbs: food.carbs, fat: food.fat }, section,
    };
  }
  editEntry(id: string, quantity: number, unit: 'serving' | 'g', section: string): void {
    const old = this.day().entries.find(e => e.id === id);
    requireValue(!!old, 'This entry no longer exists.');
    requireValue(this.day().sections.includes(section), 'Choose a meal section.');
    const source = old!;
    const replacement = this.makeEntry({ ...source.base, id, name: source.name, serving: source.serving, grams: source.grams, favorite: false }, quantity, unit, section);
    this.writeDay({ ...this.day(), entries: this.day().entries.map(e => e.id === id ? { ...replacement, id } : e), complete: false });
  }
  deleteEntry(id: string): void {
    this.writeDay({ ...this.day(), entries: this.day().entries.filter(e => e.id !== id), complete: false });
  }
  copyMeal(section: string, destination: string): void {
    requireValue(validDate(destination), 'Choose a valid destination date.');
    const source = this.day().entries.filter(e => e.section === section);
    requireValue(source.length > 0, 'There are no foods in this meal to copy.');
    const target = this.getDay(destination);
    const sections = target.sections.includes(section) ? target.sections : [...target.sections, section];
    this.writeDay({ ...target, sections, entries: [...target.entries, ...source.map(e => ({ ...structuredClone(e), id: `entry-${++this.sequence}` }))], complete: false });
  }
  removeDaySection(section: string): void {
    requireValue(!this.day().entries.some(e => e.section === section), 'Move the foods to another section before removing this one.');
    requireValue(this.day().sections.length > 1, 'Keep at least one meal section.');
    this.writeDay({ ...this.day(), sections: this.day().sections.filter(s => s !== section) });
  }
  toggleComplete(): void { this.writeDay({ ...this.day(), complete: !this.day().complete }); }
  saveFood(food: Food): void {
    requireValue(!!food.name.trim() && !!food.serving.trim(), 'Enter a food name and serving description.');
    validateNutrition(food);
    requireValue(food.grams === undefined || (Number.isFinite(food.grams) && food.grams > 0), 'Grams per serving must be greater than zero.');
    requireValue(!food.barcode || !this.foods().some(f => f.barcode === food.barcode && f.id !== food.id), 'That barcode is already assigned to another food.');
    const value = { ...food, id: food.id || `food-${++this.sequence}`, name: food.name.trim(), serving: food.serving.trim() };
    this.foods.update(foods => [...foods.filter(f => f.id !== value.id), structuredClone(value)]);
  }
  favorite(id: string): void {
    this.run(() => {
      this.foods.update(foods => foods.map(f => f.id === id ? { ...f, favorite: !f.favorite } : f));
    }, 'Favorite updated.');
  }
  saveCollection(value: Collection): void {
    requireValue(!!value.name.trim(), 'Enter a meal or recipe name.');
    requireValue(value.ingredients.length > 0 && value.ingredients.every(i => Number.isFinite(i.servings) && i.servings > 0), 'Add ingredients with quantities greater than zero.');
    requireValue(Number.isFinite(value.servings) && value.servings > 0, 'Enter a serving count greater than zero.');
    requireValue(value.cookedGrams === undefined || (Number.isFinite(value.cookedGrams) && value.cookedGrams > 0), 'Cooked weight must be greater than zero.');
    value.ingredients.forEach(i => validateNutrition(i.food));
    const saved = { ...structuredClone(value), id: value.id || `collection-${++this.sequence}`, name: value.name.trim() };
    this.collections.update(all => [...all.filter(c => c.id !== saved.id), saved]);
  }
  saveMealFromDiary(section: string): void {
    const entries = this.day().entries.filter(e => e.section === section);
    requireValue(entries.length > 0, 'Log at least one food before saving this meal.');
    this.saveCollection({
      id: '', name: `${section} favorites`, kind: 'meal', servings: 1,
      ingredients: entries.map(e => ({
        food: { ...e.base, id: e.id, name: e.name, serving: e.serving, grams: e.grams, favorite: false },
        servings: e.unit === 'g' ? e.quantity / e.grams! : e.quantity,
      })),
    });
  }
  logMeal(meal: Collection, section: string): void {
    requireValue(this.day().sections.includes(section), 'Choose a meal section.');
    const entries = meal.ingredients.map(i => this.makeEntry(i.food, i.servings, 'serving', section));
    this.writeDay({ ...this.day(), entries: [...this.day().entries, ...entries], complete: false });
  }
  saveGoals(value: Nutrition): void {
    validateNutrition(value);
    requireValue(nutrients.every(k => value[k] > 0), 'Every daily target must be greater than zero.');
    this.goals.update(goals => [...goals.filter(g => g.from < this.today()), { ...value, from: this.today() }]);
  }
  saveSections(sections: Section[]): void {
    const names = sections.map(s => s.name.trim());
    requireValue(names.every(Boolean), 'Meal section names cannot be empty.');
    requireValue(new Set(names.map(s => s.toLowerCase())).size === names.length, 'Meal section names must be unique.');
    requireValue(sections.some(s => s.visible), 'Keep at least one visible meal section.');
    const tomorrow = offsetDate(this.today(), 1);
    this.sections.set(sections.map(s => ({ ...s, name: s.name.trim() })));
    this.sectionVersions.update(versions => [...versions.filter(v => v.from < tomorrow), { from: tomorrow, names: sections.filter(s => s.visible).map(s => s.name.trim()) }]);
  }
  saveZone(zone: string): void {
    requireValue(!!zone.trim(), 'Enter a time zone.');
    try { new Intl.DateTimeFormat('en-US', { timeZone: zone }).format(); }
    catch { throw new Error('Use a valid IANA time zone, such as America/Los_Angeles or UTC.'); }
    this.zone.set(zone);
  }
  saveWeight(date: string, amount: number, photo: boolean, originalDate?: string): void {
    requireValue(validDate(date), 'Choose a valid weight date.');
    requireValue(Number.isFinite(amount) && amount > 0, 'Weight must be greater than zero.');
    requireValue(date === originalDate || !this.weights().some(w => w.date === date), 'A weight already exists for that date. Edit it in history instead.');
    const kg = this.weightUnit() === 'lb' ? amount / 2.2046226218 : amount;
    this.weights.update(all => [...all.filter(w => w.date !== (originalDate ?? date)), { date, kg, photo }].sort((a, b) => a.date.localeCompare(b.date)));
  }
  deleteWeight(date: string): void { this.weights.update(all => all.filter(w => w.date !== date)); }
  displayWeight(kg: number): number { return this.weightUnit() === 'lb' ? kg * 2.2046226218 : kg; }
  clearData(): void {
    this.foods.set([]); this.collections.set([]); this.days.set([]); this.goals.set([]); this.weights.set([]);
    this.recentIds.set([]); this.sections.set([{ name: 'Breakfast', visible: true }]);
    this.sectionVersions.set([{ from: '0001-01-01', names: ['Breakfast'] }]);
  }
  reset(): void {
    this.sequence = 100;
    this.zone.set(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
    this.date.set(this.today());
    this.weightUnit.set('lb');
    this.error.set(''); this.notice.set(''); this.failNext.set(false);
    const foods: Food[] = [
      { id: 'oats', name: 'Rolled oats', serving: '1/2 cup dry', grams: 40, calories: 150, protein: 5, carbs: 27, fat: 3, favorite: true, barcode: '0123456789012' },
      { id: 'yogurt', name: 'Greek yogurt', serving: '3/4 cup, plain nonfat', grams: 170, calories: 100, protein: 18, carbs: 7, fat: 0, favorite: true, barcode: '0987654321098' },
      { id: 'berries', name: 'Blueberries', serving: '1 cup', grams: 148, calories: 84, protein: 1, carbs: 21, fat: 0.5, favorite: true },
      { id: 'chicken', name: 'Grilled chicken breast', serving: '100 g, cooked', grams: 100, calories: 165, protein: 31, carbs: 0, fat: 3.6, favorite: true },
      { id: 'rice', name: 'Brown rice', serving: '1 cup, cooked', grams: 195, calories: 216, protein: 5, carbs: 45, fat: 1.8, favorite: false },
      { id: 'avocado', name: 'Avocado', serving: '1/2 medium', grams: 75, calories: 120, protein: 1.5, carbs: 6, fat: 11, favorite: false },
      { id: 'banana', name: 'Banana', serving: '1 medium', grams: 118, calories: 105, protein: 1.3, carbs: 27, fat: 0.4, favorite: false },
      { id: 'coffee', name: 'Black coffee', serving: '1 mug', calories: 2, protein: 0, carbs: 0, fat: 0, favorite: false },
    ];
    this.foods.set(foods);
    this.collections.set([
      { id: 'breakfast', name: 'My everyday breakfast', kind: 'meal', servings: 1, ingredients: [{ food: foods[0], servings: 1 }, { food: foods[1], servings: 1 }, { food: foods[2], servings: 0.5 }] },
      { id: 'bowl', name: 'Chicken & rice bowl', kind: 'recipe', servings: 4, cookedGrams: 1600, ingredients: [{ food: foods[3], servings: 6 }, { food: foods[4], servings: 4 }, { food: foods[5], servings: 2 }] },
    ]);
    this.sections.set(['Breakfast', 'Lunch', 'Dinner', 'Snacks'].map(name => ({ name, visible: true })));
    this.sectionVersions.set([{ from: '0001-01-01', names: this.sections().map(s => s.name) }]);
    this.goals.set([{ from: '0001-01-01', calories: 2200, protein: 160, carbs: 255, fat: 60 }]);
    const today = this.today();
    this.days.set([]);
    for (let i = 6; i >= 0; i--) {
      if (i === 4) continue;
      const entries = [
        this.makeEntry(foods[0], 1, 'serving', 'Breakfast'),
        this.makeEntry(foods[1], 1, 'serving', 'Breakfast'),
        this.makeEntry(foods[2], 0.5, 'serving', 'Breakfast'),
        this.makeEntry(foods[3], i === 0 ? 160 : 200, 'g', 'Lunch'),
        this.makeEntry(foods[4], 1, 'serving', 'Lunch'),
        this.makeEntry(foods[5], 1, 'serving', 'Lunch'),
      ];
      if (i > 0) entries.push(this.makeEntry(recipeFood(this.collections()[1]), 1.2, 'serving', 'Dinner'), this.makeEntry(foods[6], 1, 'serving', 'Snacks'));
      this.writeDay({ date: offsetDate(today, -i), sections: this.sections().map(s => s.name), entries, complete: i > 1 });
    }
    this.recentIds.set(['oats', 'yogurt', 'berries', 'chicken']);
    this.weights.set([21, 14, 7, 0].map((days, index) => ({ date: offsetDate(today, -days), kg: 82.4 - index * 0.3, photo: index !== 1 })));
  }
}
