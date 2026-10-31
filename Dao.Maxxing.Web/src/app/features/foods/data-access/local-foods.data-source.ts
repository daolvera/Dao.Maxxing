import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { nutrients } from '../../../nutrition/nutrition';
import { placeholderCall, PlaceholderDb } from '../../../placeholder/placeholder-db';
import { Collection, Food, FoodDraft } from './food';
import type { FoodsDataSource } from './foods.data-source';

/** PLACEHOLDER food library over `PlaceholderDb`, until F5 (#15) adds `/api/foods`. */
@Injectable({ providedIn: 'root' })
export class LocalFoodsDataSource implements FoodsDataSource {
  private readonly db = inject(PlaceholderDb);

  getFoods(): Observable<Food[]> {
    return placeholderCall(() => structuredClone(this.db.foods));
  }

  saveFood(draft: FoodDraft): Observable<Food> {
    return placeholderCall(() => {
      const name = draft.name.trim();
      const serving = draft.serving.trim();
      if (!name || !serving) throw new Error('Enter a food name and serving description.');
      if (!nutrients.every((k) => Number.isFinite(draft[k]) && draft[k] >= 0)) {
        throw new Error('Nutrition values must be zero or greater.');
      }
      const barcode = draft.barcode?.trim() || undefined;
      if (barcode && this.db.foods.some((f) => f.barcode === barcode && f.id !== draft.id)) {
        throw new Error('That barcode is already assigned to another food.');
      }
      const existing = this.db.foods.find((f) => f.id === draft.id);
      const food: Food = {
        ...draft,
        id: existing?.id ?? this.db.nextId('food'),
        name,
        serving,
        barcode,
        favorite: existing?.favorite ?? false,
      };
      this.db.foods = existing
        ? this.db.foods.map((f) => (f.id === food.id ? food : f))
        : [...this.db.foods, food];
      return structuredClone(food);
    });
  }

  setFavorite(id: string, favorite: boolean): Observable<Food> {
    return placeholderCall(() => {
      const food = this.db.foods.find((f) => f.id === id);
      if (!food) throw new Error('This food no longer exists.');
      const updated = { ...food, favorite };
      this.db.foods = this.db.foods.map((f) => (f.id === id ? updated : f));
      return structuredClone(updated);
    });
  }

  getCollections(): Observable<Collection[]> {
    return placeholderCall(() => structuredClone(this.db.collections));
  }
}
