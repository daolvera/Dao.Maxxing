import { afterNextRender, ChangeDetectionStrategy, Component, computed, ElementRef, inject, input, OnChanges, output, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Collection, DemoStore, Entry, Food, recipeFood, scale } from './demo-store';
import { FoodEditor } from './food-editor';
import { Icon } from './icon';

@Component({
  selector: 'mx-food-picker',
  imports: [ReactiveFormsModule, DecimalPipe, FoodEditor, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './food-picker.html',
})
export class FoodPicker implements OnChanges {
  readonly section = input('Breakfast');
  readonly entry = input<Entry | null>(null);
  readonly initialCollection = input<Collection | null>(null);
  readonly closed = output<void>();
  readonly store = inject(DemoStore);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly previousFocus = this.element.nativeElement.ownerDocument.activeElement;
  private readonly fb = inject(FormBuilder).nonNullable;
  readonly search = this.fb.control('');
  readonly searchValue = toSignal(this.search.valueChanges, { initialValue: '' });
  readonly barcode = this.fb.control('0123456789012');
  readonly tab = signal('Recent');
  readonly tabs = ['Recent', 'Favorites', 'All foods', 'Saved meals', 'Recipes', 'Barcode'];
  readonly selected = signal<Food | null>(null);
  readonly creating = signal(false);
  readonly barcodeMessage = signal('');
  readonly portion = this.fb.group({
    quantity: [1, [Validators.required, Validators.min(0.001)]],
    unit: this.fb.control<'serving' | 'g'>('serving'),
    section: ['', Validators.required],
  });
  readonly portionValue = toSignal(this.portion.valueChanges, { initialValue: this.portion.getRawValue() });
  readonly preview = computed(() => {
    const f = this.selected(); const v = this.portionValue();
    return f ? scale(f, v.unit === 'g' && f.grams ? (v.quantity ?? 0) / f.grams : (v.quantity ?? 0)) : null;
  });
  readonly results = computed(() => {
    const query = this.searchValue().toLowerCase().trim();
    let foods = this.store.foods();
    if (this.tab() === 'Recent') foods = this.store.recentIds().flatMap(id => foods.filter(f => f.id === id));
    if (this.tab() === 'Favorites') foods = foods.filter(f => f.favorite);
    return foods.filter(f => `${f.name} ${f.serving}`.toLowerCase().includes(query));
  });
  readonly collections = computed(() => this.store.collections().filter(c =>
    c.kind === (this.tab() === 'Recipes' ? 'recipe' : 'meal') &&
    c.name.toLowerCase().includes(this.searchValue().toLowerCase().trim())));
  attempted = false;
  constructor() {
    afterNextRender(() => this.element.nativeElement.querySelector<HTMLElement>('h2')?.focus());
  }
  close(): void {
    if (this.previousFocus instanceof HTMLElement && this.previousFocus.isConnected) this.previousFocus.focus();
    this.closed.emit();
  }
  ngOnChanges(): void {
    this.selected.set(null); this.creating.set(false); this.barcodeMessage.set('');
    this.search.setValue(''); this.tab.set('Recent');
    this.portion.reset({ quantity: 1, unit: 'serving', section: this.section() });
    const collection = this.initialCollection();
    if (collection) {
      this.tab.set(collection.kind === 'recipe' ? 'Recipes' : 'Saved meals');
      this.search.setValue(collection.name);
      if (collection.kind === 'recipe') this.chooseRecipe(collection);
    }
    const e = this.entry();
    if (e) {
      this.selected.set({ ...e.base, id: e.id, name: e.name, serving: e.serving, grams: e.grams, favorite: false });
      this.portion.patchValue({ quantity: e.quantity, unit: e.unit, section: e.section });
    }
  }
  choose(food: Food): void {
    this.selected.set(food);
    this.portion.patchValue({ quantity: 1, unit: 'serving' });
    this.attempted = false;
  }
  chooseRecipe(collection: Collection): void { this.choose(recipeFood(collection)); }
  lookup(): void {
    const match = this.store.foods().find(f => f.barcode === this.barcode.value.trim());
    if (match) { this.barcodeMessage.set('Demo barcode matched. Review the portion below.'); this.choose(match); }
    else { this.selected.set(null); this.barcodeMessage.set('Barcode not found in sample data. Create a private food from its label.'); }
  }
  logMeal(meal: Collection): void {
    if (this.store.run(() => this.store.logMeal(meal, this.portion.controls.section.value), `${meal.name} added to the diary.`)) this.close();
  }
  save(): void {
    this.attempted = true;
    const food = this.selected();
    if (!food || this.portion.invalid) return;
    const v = this.portion.getRawValue();
    const e = this.entry();
    if (this.store.run(() => e
      ? this.store.editEntry(e.id, v.quantity, v.unit, v.section)
      : this.store.addFood(food, v.quantity, v.unit, v.section), e ? 'Diary entry updated.' : `${food.name} added to the diary.`)) this.close();
  }
}
