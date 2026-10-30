import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Collection, DemoStore, Entry, nutrients, offsetDate, sum } from './demo-store';
import { FoodPicker } from './food-picker';
import { Icon } from './icon';

@Component({
  selector: 'mx-diary',
  imports: [DecimalPipe, ReactiveFormsModule, FoodPicker, Icon],
  templateUrl: './diary.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Diary {
  readonly store = inject(DemoStore);
  readonly nutrients = nutrients;
  readonly picker = signal<string | null>(null);
  readonly editing = signal<Entry | null>(null);
  readonly quickCollection = signal<Collection | null>(null);
  readonly copy = signal<string | null>(null);
  readonly deleting = signal<string | null>(null);
  readonly destination = new FormControl(this.store.today(), { nonNullable: true });
  entries(section: string): Entry[] { return this.store.day().entries.filter(e => e.section === section); }
  mealCalories(section: string): number { return sum(this.entries(section)).calories; }
  percent(key: typeof nutrients[number]): number {
    const target = this.store.target()[key];
    return target ? Math.min(100, this.store.total()[key] / target * 100) : 0;
  }
  remaining(key: typeof nutrients[number]): number { return this.store.target()[key] - this.store.total()[key]; }
  absolute(n: number): number { return Math.abs(n); }
  meterValue(key: typeof nutrients[number]): number { return Math.min(this.store.total()[key], this.store.target()[key] || 1); }
  step(offset: number): void { this.store.selectDate(offsetDate(this.store.date(), offset)); this.close(); }
  open(section: string, entry: Entry | null = null, collection: Collection | null = null): void {
    this.editing.set(entry); this.quickCollection.set(collection); this.picker.set(section);
  }
  close(): void { this.picker.set(null); this.editing.set(null); }
  complete(): void { this.store.run(() => this.store.toggleComplete(), 'Day completion updated. You can still edit your diary.'); }
  saveMeal(section: string): void { this.store.run(() => this.store.saveMealFromDiary(section), 'Reusable meal saved in Foods & recipes.'); }
  copyMeal(): void {
    if (this.store.run(() => this.store.copyMeal(this.copy()!, this.destination.value), `Meal copied to ${this.destination.value}.`)) this.copy.set(null);
  }
  removeSection(section: string): void { this.store.run(() => this.store.removeDaySection(section), 'Section removed from this date only.'); }
  deleteEntry(id: string): void {
    if (this.store.run(() => this.store.deleteEntry(id), 'Food removed from the diary.')) this.deleting.set(null);
  }
}
