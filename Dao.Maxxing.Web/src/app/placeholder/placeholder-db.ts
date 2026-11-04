import { inject, Injectable } from '@angular/core';
import { defer, Observable, of } from 'rxjs';
import { dateInZone, NOW, offsetDate, portion, PortionUnit } from '../nutrition/nutrition';
import type { DiaryDay, DiaryEntry, NewDiaryEntry } from '../features/diary/data-access/diary-day';
import { Collection, Food, recipeAsFood } from '../features/foods/data-access/food';
import type { Weight } from '../features/progress/data-access/weight';
import type { Goal, MealSection, Preferences } from '../features/settings/data-access/settings';

/**
 * PLACEHOLDER. An in-memory stand-in for the database behind endpoints that don't exist yet.
 * The `Local*DataSource` classes read and write it so features stay consistent with each other
 * (meal defaults saved in Settings show up in the Diary, for example). Everything is sample data
 * and resets when the page reloads. Delete it once every data source calls the API.
 */
@Injectable({ providedIn: 'root' })
export class PlaceholderDb {
  foods: Food[] = [];
  collections: Collection[] = [];
  days: DiaryDay[] = [];
  goals: Goal[] = [];
  mealSections: MealSection[] = [];
  /** Visible section names by the date they apply from, oldest first. */
  sectionVersions: { from: string; names: string[] }[] = [];
  preferences: Preferences = { timeZone: 'UTC', weightUnit: 'lb' };
  weights: Weight[] = [];
  private sequence = 100;

  constructor() {
    this.seed(inject(NOW)());
  }

  nextId(prefix: string): string {
    return `${prefix}-${++this.sequence}`;
  }

  /** The stored day, or an empty one with the meal defaults in effect on that date. */
  day(date: string): DiaryDay {
    const stored = this.days.find((d) => d.date === date);
    if (stored) return structuredClone(stored);
    const version = this.sectionVersions.filter((v) => v.from <= date).at(-1);
    return { date, sections: [...(version?.names ?? ['Breakfast'])], entries: [], complete: false };
  }

  writeDay(day: DiaryDay): DiaryDay {
    this.days = [...this.days.filter((d) => d.date !== day.date), structuredClone(day)];
    return structuredClone(day);
  }

  makeEntry({ food, quantity, unit, section }: NewDiaryEntry): DiaryEntry {
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error('Enter a quantity greater than zero.');
    }
    if (unit === 'g' && !food.grams) {
      throw new Error('Grams are unavailable for this food. Log it in servings instead.');
    }
    return {
      ...portion(food, quantity, unit),
      id: this.nextId('entry'),
      foodId: food.id,
      name: food.name,
      serving: food.serving,
      grams: food.grams,
      quantity,
      unit,
      base: { calories: food.calories, protein: food.protein, carbs: food.carbs, fat: food.fat },
      section,
    };
  }

  private seed(now: Date): void {
    this.preferences = {
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      weightUnit: 'lb',
    };
    const today = dateInZone(this.preferences.timeZone, now);
    this.foods = [
      { id: 'oats', name: 'Rolled oats', serving: '1/2 cup dry', grams: 40, calories: 150, protein: 5, carbs: 27, fat: 3, favorite: true, barcode: '0123456789012' },
      { id: 'yogurt', name: 'Greek yogurt', serving: '3/4 cup, plain nonfat', grams: 170, calories: 100, protein: 18, carbs: 7, fat: 0, favorite: true },
      { id: 'berries', name: 'Blueberries', serving: '1 cup', grams: 148, calories: 84, protein: 1, carbs: 21, fat: 0.5, favorite: true },
      { id: 'chicken', name: 'Grilled chicken breast', serving: '100 g, cooked', grams: 100, calories: 165, protein: 31, carbs: 0, fat: 3.6, favorite: true },
      { id: 'rice', name: 'Brown rice', serving: '1 cup, cooked', grams: 195, calories: 216, protein: 5, carbs: 45, fat: 1.8, favorite: false },
      { id: 'avocado', name: 'Avocado', serving: '1/2 medium', grams: 75, calories: 120, protein: 1.5, carbs: 6, fat: 11, favorite: false },
      { id: 'banana', name: 'Banana', serving: '1 medium', grams: 118, calories: 105, protein: 1.3, carbs: 27, fat: 0.4, favorite: false },
      { id: 'coffee', name: 'Black coffee', serving: '1 mug', calories: 2, protein: 0, carbs: 0, fat: 0, favorite: false },
    ];
    const [oats, yogurt, berries, chicken, rice, avocado, banana] = this.foods;
    this.collections = [
      { id: 'breakfast', name: 'My everyday breakfast', kind: 'meal', servings: 1, ingredients: [{ food: oats, servings: 1 }, { food: yogurt, servings: 1 }, { food: berries, servings: 0.5 }] },
      { id: 'bowl', name: 'Chicken & rice bowl', kind: 'recipe', servings: 4, cookedGrams: 1600, ingredients: [{ food: chicken, servings: 6 }, { food: rice, servings: 4 }, { food: avocado, servings: 2 }] },
    ];
    this.mealSections = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'].map((name) => ({ name, visible: true }));
    this.sectionVersions = [{ from: '0001-01-01', names: this.mealSections.map((s) => s.name) }];
    this.goals = [{ from: '0001-01-01', calories: 2200, protein: 160, carbs: 255, fat: 60 }];
    const log = (food: Food, quantity: number, unit: PortionUnit, section: string) =>
      this.makeEntry({ food, quantity, unit, section });
    this.days = [];
    for (let i = 6; i >= 0; i--) {
      if (i === 4) continue;
      const entries = [
        log(oats, 1, 'serving', 'Breakfast'),
        log(yogurt, 1, 'serving', 'Breakfast'),
        log(berries, 0.5, 'serving', 'Breakfast'),
        log(chicken, i === 0 ? 160 : 200, 'g', 'Lunch'),
        log(rice, 1, 'serving', 'Lunch'),
        log(avocado, 1, 'serving', 'Lunch'),
      ];
      if (i > 0) {
        entries.push(
          log(recipeAsFood(this.collections[1]), 1.2, 'serving', 'Dinner'),
          log(banana, 1, 'serving', 'Snacks'),
        );
      }
      this.writeDay({
        date: offsetDate(today, -i),
        sections: [...this.sectionVersions[0].names],
        entries,
        complete: i > 1,
      });
    }
    this.weights = [21, 14, 7, 0].map((daysAgo, index) => ({
      date: offsetDate(today, -daysAgo),
      kg: 82.4 - index * 0.3,
    }));
  }
}

/** Runs a placeholder operation on subscribe. A thrown validation error becomes an error notification. */
export function placeholderCall<T>(operation: () => T): Observable<T> {
  return defer(() => of(operation()));
}
