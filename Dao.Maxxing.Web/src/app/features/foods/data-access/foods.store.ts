import { computed, inject, Injectable } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { createMutationRunner, toErrorMessage } from '../../../data-access/mutation-runner';
import { Food, FoodDraft } from './food';
import { FoodsDataSource } from './foods.data-source';

/** The food library. App-wide because the Diary's food picker reads it too. */
@Injectable({ providedIn: 'root' })
export class FoodsStore {
  private readonly source = inject(FoodsDataSource);
  private readonly mutations = createMutationRunner();

  private readonly foodsResource = rxResource({ stream: () => this.source.getFoods() });
  private readonly collectionsResource = rxResource({
    stream: () => this.source.getCollections(),
  });

  readonly foods = computed(() =>
    [...(this.foodsResource.value() ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
  );
  readonly favorites = computed(() => this.foods().filter((f) => f.favorite));
  readonly collections = computed(() => this.collectionsResource.value() ?? []);
  readonly meals = computed(() => this.collections().filter((c) => c.kind === 'meal'));
  readonly recipes = computed(() => this.collections().filter((c) => c.kind === 'recipe'));
  readonly loading = computed(
    () => this.foodsResource.isLoading() || this.collectionsResource.isLoading(),
  );
  readonly error = computed(() => {
    const error = this.foodsResource.error() ?? this.collectionsResource.error();
    return error ? toErrorMessage(error) : null;
  });
  readonly saving = this.mutations.saving;

  saveFood(draft: FoodDraft): Promise<boolean> {
    return this.mutations.run(this.source.saveFood(draft), `${draft.name.trim()} saved.`, (food) =>
      this.replace(food),
    );
  }

  toggleFavorite(food: Food): Promise<boolean> {
    const favorite = !food.favorite;
    return this.mutations.run(
      this.source.setFavorite(food.id, favorite),
      favorite ? `${food.name} added to favorites.` : `${food.name} removed from favorites.`,
      (updated) => this.replace(updated),
    );
  }

  reload(): void {
    this.foodsResource.reload();
    this.collectionsResource.reload();
  }

  private replace(food: Food): void {
    this.foodsResource.update((foods = []) =>
      foods.some((f) => f.id === food.id)
        ? foods.map((f) => (f.id === food.id ? food : f))
        : [...foods, food],
    );
  }
}
