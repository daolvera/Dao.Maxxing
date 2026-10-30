import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DemoStore, nutrients, sum, Weight } from './demo-store';
import { Photo } from './photo';

@Component({
  selector: 'mx-progress',
  imports: [DatePipe, DecimalPipe, ReactiveFormsModule, Photo],
  templateUrl: './progress.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Progress {
  readonly store = inject(DemoStore);
  private readonly fb = inject(FormBuilder).nonNullable;
  readonly nutrients = nutrients;
  readonly sum = sum;
  readonly editing = signal<string | null>(null);
  readonly formOpen = signal(false);
  readonly deleting = signal<string | null>(null);
  readonly comparing = signal(false);
  readonly first = this.fb.control(this.store.weights().filter(w => w.photo)[0]?.date ?? '');
  readonly second = this.fb.control(this.store.weights().filter(w => w.photo).at(-1)?.date ?? '');
  readonly weightForm = this.fb.group({
    date: [this.store.today(), Validators.required],
    amount: [180, [Validators.required, Validators.min(0.01)]],
    photo: false,
  });
  readonly photos = computed(() => this.store.weights().filter(w => w.photo));
  readonly reversedWeights = computed(() => [...this.store.weights()].reverse());
  readonly points = computed(() => this.store.weights().map((w, index) => {
    const weights = this.store.weights();
    const min = Math.min(...weights.map(x => x.kg)) - 0.3;
    const max = Math.max(...weights.map(x => x.kg)) + 0.3;
    const first = Date.parse(weights[0].date);
    const span = Date.parse(weights.at(-1)!.date) - first;
    return { x: span ? 20 + (Date.parse(w.date) - first) / span * 560 : 300, y: 145 - (w.kg - min) / (max - min) * 120, w, index };
  }));
  readonly line = computed(() => this.points().map(p => `${p.x},${p.y}`).join(' '));
  attempted = false;
  start(weight?: Weight): void {
    this.attempted = false; this.editing.set(weight?.date ?? null); this.formOpen.set(true);
    this.weightForm.reset({ date: weight?.date ?? this.store.today(), amount: weight ? Number(this.store.displayWeight(weight.kg).toFixed(2)) : 180, photo: weight?.photo ?? false });
  }
  save(): void {
    this.attempted = true;
    if (this.weightForm.invalid) return;
    const v = this.weightForm.getRawValue();
    if (this.store.run(() => this.store.saveWeight(v.date, v.amount, v.photo, this.editing() ?? undefined), 'Weight entry saved in demo history.')) this.formOpen.set(false);
  }
  remove(date: string): void {
    if (this.store.run(() => this.store.deleteWeight(date), 'Weight and its attached sample photo deleted.')) this.deleting.set(null);
  }
  unit(value: 'kg' | 'lb'): void {
    const previous = this.store.weightUnit();
    if (value === previous) return;
    const amount = this.weightForm.controls.amount.value;
    this.weightForm.controls.amount.setValue(Number((value === 'kg' ? amount / 2.2046226218 : amount * 2.2046226218).toFixed(2)));
    this.store.weightUnit.set(value);
  }
  selectedPhoto(date: string): Weight | undefined { return this.photos().find(w => w.date === date); }
  bar(date: string): number {
    const max = Math.max(1, ...this.store.week().map(d => sum(d.entries).calories));
    return sum(this.store.getDay(date).entries).calories / max * 100;
  }
}
