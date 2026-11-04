import { InjectionToken } from '@angular/core';

/** Domain types and pure helpers shared by every feature. No Angular state lives here. */

export interface Nutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export const nutrients = ['calories', 'protein', 'carbs', 'fat'] as const;
export type Nutrient = (typeof nutrients)[number];

export const nutrientLabels: Record<Nutrient, string> = {
  calories: 'Calories',
  protein: 'Protein',
  carbs: 'Carbs',
  fat: 'Fat',
};

export const nutrientUnits: Record<Nutrient, string> = {
  calories: 'kcal',
  protein: 'g',
  carbs: 'g',
  fat: 'g',
};

export type PortionUnit = 'serving' | 'g';
export type WeightUnit = 'kg' | 'lb';

export const emptyNutrition = (): Nutrition => ({ calories: 0, protein: 0, carbs: 0, fat: 0 });

export function scale(n: Nutrition, factor: number): Nutrition {
  return {
    calories: n.calories * factor,
    protein: n.protein * factor,
    carbs: n.carbs * factor,
    fat: n.fat * factor,
  };
}

export function sum(items: readonly Nutrition[]): Nutrition {
  return items.reduce(
    (a, n) => ({
      calories: a.calories + n.calories,
      protein: a.protein + n.protein,
      carbs: a.carbs + n.carbs,
      fat: a.fat + n.fat,
    }),
    emptyNutrition(),
  );
}

/** Nutrition for a quantity of something with per-serving values and an optional gram conversion. */
export function portion(
  perServing: Nutrition & { grams?: number },
  quantity: number,
  unit: PortionUnit,
): Nutrition {
  const servings = unit === 'g' && perServing.grams ? quantity / perServing.grams : quantity;
  return scale(perServing, servings);
}

/** Calories implied by the macros: 4 kcal/g for protein and carbs, 9 kcal/g for fat. */
export function macroCalories(n: Pick<Nutrition, 'protein' | 'carbs' | 'fat'>): number {
  return n.protein * 4 + n.carbs * 4 + n.fat * 9;
}

const poundsPerKilogram = 2.2046226218;

export function toKilograms(amount: number, unit: WeightUnit): number {
  return unit === 'lb' ? amount / poundsPerKilogram : amount;
}

export function fromKilograms(kg: number, unit: WeightUnit): number {
  return unit === 'lb' ? kg * poundsPerKilogram : kg;
}

/** Diary dates are ISO calendar dates (`yyyy-MM-dd`) in the user's time zone. */
export function offsetDate(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function isValidDate(date: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    Number.isFinite(Date.parse(date)) &&
    new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) === date
  );
}

export function dateInZone(zone: string, now: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function isValidTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone }).format();
    return true;
  } catch {
    return false;
  }
}

/** The current instant. Tests provide a fixed clock instead of patching `Date`. */
export const NOW = new InjectionToken<() => Date>('NOW', {
  providedIn: 'root',
  factory: () => () => new Date(),
});
