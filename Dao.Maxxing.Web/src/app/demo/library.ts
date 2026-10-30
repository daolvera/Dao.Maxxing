import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Collection, DemoStore, Food, recipeFood, scale, sum } from './demo-store';
import { FoodEditor } from './food-editor';
import { FoodPicker } from './food-picker';
import { Icon } from './icon';

@Component({
  selector: 'mx-library',
  imports: [ReactiveFormsModule, DecimalPipe, FoodEditor, FoodPicker, Icon],
  templateUrl: './library.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Library {
  readonly store = inject(DemoStore);
  private readonly fb = inject(FormBuilder).nonNullable;
  readonly tab = signal('Saved meals');
  readonly tabs = ['Saved meals', 'Recipes', 'Foods'];
  readonly editingFood = signal<Food | null>(null);
  readonly foodEditor = signal(false);
  readonly builder = signal(false);
  readonly picker = signal(false);
  readonly loggingCollection = signal<Collection | null>(null);
  readonly editingCollection = signal<Collection | null>(null);
  readonly search = this.fb.control('');
  readonly query = toSignal(this.search.valueChanges, { initialValue: '' });
  readonly ingredientOptions = computed(() => {
    const foods = this.store.foods();
    return [...foods, ...(this.editingCollection()?.ingredients ?? []).map(i => i.food).filter(f => !foods.some(x => x.id === f.id))];
  });
  readonly collectionForm = this.fb.group({
    name: ['', Validators.required], kind: this.fb.control<'meal' | 'recipe'>('recipe'),
    servings: [4, [Validators.required, Validators.min(0.001)]],
    cookedGrams: this.fb.control<number | null>(null, Validators.min(0.001)),
    ingredients: this.fb.array([this.ingredientGroup()]),
  });
  readonly values = toSignal(this.collectionForm.valueChanges, { initialValue: this.collectionForm.getRawValue() });
  readonly preview = computed(() => {
    const v = this.values();
    const total = sum((v.ingredients ?? []).flatMap(i => {
      const food = this.ingredientOptions().find(f => f.id === i.foodId);
      return food ? [scale(food, i.servings ?? 0)] : [];
    }));
    return scale(total, 1 / (v.kind === 'meal' ? 1 : (v.servings || 1)));
  });
  readonly filteredFoods = computed(() => this.store.foods().filter(f => f.name.toLowerCase().includes(this.query().toLowerCase())));
  readonly filteredCollections = computed(() => this.store.collections().filter(c => c.kind === (this.tab() === 'Recipes' ? 'recipe' : 'meal') && c.name.toLowerCase().includes(this.query().toLowerCase())));
  attempted = false;
  private ingredientGroup(foodId = this.store.foods()[0]?.id ?? '', servings = 1) {
    return this.fb.group({ foodId: [foodId, Validators.required], servings: [servings, [Validators.required, Validators.min(0.001)]] });
  }
  addIngredient(): void { this.collectionForm.controls.ingredients.push(this.ingredientGroup()); }
  removeIngredient(index: number): void { this.collectionForm.controls.ingredients.removeAt(index); }
  editFood(food: Food | null): void { this.editingFood.set(food); this.foodEditor.set(true); this.builder.set(false); }
  editCollection(value: Collection | null): void {
    this.attempted = false;
    this.foodEditor.set(false); this.builder.set(true); this.editingCollection.set(value);
    this.collectionForm.reset({ name: value?.name ?? '', kind: value?.kind ?? 'recipe', servings: value?.servings ?? 4, cookedGrams: value?.cookedGrams ?? null });
    const array = this.collectionForm.controls.ingredients;
    array.clear();
    if (value) for (const i of value.ingredients) array.push(this.ingredientGroup(i.food.id, i.servings));
    else array.push(this.ingredientGroup());
  }
  saveCollection(): void {
    this.attempted = true;
    if (this.collectionForm.invalid) return;
    const v = this.collectionForm.getRawValue();
    if (this.store.run(() => {
      const ingredients = v.ingredients.map(i => {
        const food = this.ingredientOptions().find(f => f.id === i.foodId);
        if (!food) throw new Error('An ingredient is unavailable. Choose a food from your library.');
        return { food, servings: i.servings };
      });
      this.store.saveCollection({
        id: this.editingCollection()?.id ?? '', name: v.name, kind: v.kind, ingredients,
        servings: v.kind === 'meal' ? 1 : v.servings,
        cookedGrams: v.kind === 'recipe' ? v.cookedGrams ?? undefined : undefined,
      });
    }, `${v.kind === 'meal' ? 'Meal' : 'Recipe'} saved. Previously logged nutrition is unchanged.`)) this.builder.set(false);
  }
  log(collection: Collection): void { this.loggingCollection.set(collection); this.picker.set(true); }
  nutrition(c: Collection) { return c.kind === 'recipe' ? recipeFood(c) : sum(c.ingredients.map(i => scale(i.food, i.servings))); }
}
