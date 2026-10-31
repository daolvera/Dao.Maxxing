import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Collection, Food, FoodDraft } from './food';
import { LocalFoodsDataSource } from './local-foods.data-source';

/**
 * The food library backend. Stores and components depend on this contract only.
 *
 * There is no `/api/foods` endpoint yet (F5 #15, F8 #20), so the default is the in-memory
 * placeholder. When the endpoints exist, add an implementation over `inject(Api).invoke(...)` and
 * point `useClass` at it.
 */
@Injectable({ providedIn: 'root', useClass: LocalFoodsDataSource })
export abstract class FoodsDataSource {
  abstract getFoods(): Observable<Food[]>;
  abstract saveFood(food: FoodDraft): Observable<Food>;
  abstract setFavorite(id: string, favorite: boolean): Observable<Food>;
  abstract getCollections(): Observable<Collection[]>;
}
