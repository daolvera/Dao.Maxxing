import { Nutrition, scale, sum } from '../../../nutrition/nutrition';

/** A food from the user's library. Nutrition is per serving. */
export interface Food extends Nutrition {
  id: string;
  name: string;
  serving: string;
  /** Grams in one serving, when known. Logging in grams needs it. */
  grams?: number;
  barcode?: string;
  favorite: boolean;
}

/** A food as the create and edit form submits it. A missing `id` creates a new food. */
export type FoodDraft = Omit<Food, 'id' | 'favorite'> & { id?: string };

export interface Ingredient {
  food: Food;
  servings: number;
}

/** A saved meal (logged whole) or a recipe (logged per serving). */
export interface Collection {
  id: string;
  name: string;
  kind: 'meal' | 'recipe';
  ingredients: Ingredient[];
  servings: number;
  cookedGrams?: number;
}

/** Nutrition for a whole meal, or for one serving of a recipe. */
export function collectionNutrition(collection: Collection): Nutrition {
  const total = sum(collection.ingredients.map((i) => scale(i.food, i.servings)));
  return collection.kind === 'recipe' ? scale(total, 1 / collection.servings) : total;
}

/** A recipe as a loggable food, one serving at a time. */
export function recipeAsFood(recipe: Collection): Food {
  return {
    ...collectionNutrition(recipe),
    id: recipe.id,
    name: recipe.name,
    serving: `1 serving (${recipe.servings} in recipe)`,
    grams: recipe.cookedGrams ? recipe.cookedGrams / recipe.servings : undefined,
    favorite: false,
  };
}
