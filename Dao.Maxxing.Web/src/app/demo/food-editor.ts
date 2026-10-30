import { ChangeDetectionStrategy, Component, inject, input, OnChanges, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DemoStore, Food } from './demo-store';

@Component({
  selector: 'mx-food-editor',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [formGroup]="form" (ngSubmit)="save()" class="editor">
      <h3>{{ food() ? 'Edit food' : 'Create a private food' }}</h3>
      <p class="muted">Use the nutrition label. Changes only affect future logs.</p>
      <div class="form-grid">
        <label class="wide">Food name<input formControlName="name" maxlength="100" required /></label>
        <label class="wide">Serving description<input formControlName="serving" placeholder="e.g. 1/2 cup dry" required /></label>
        <label>Grams per serving (optional)<input formControlName="grams" type="number" min="0.01" step="any" /></label>
        <label>Barcode (optional)<input formControlName="barcode" inputmode="numeric" /></label>
        <label>Calories (kcal)<input formControlName="calories" type="number" min="0" step="any" required /></label>
        <label>Protein (g)<input formControlName="protein" type="number" min="0" step="any" required /></label>
        <label>Carbs (g)<input formControlName="carbs" type="number" min="0" step="any" required /></label>
        <label>Fat (g)<input formControlName="fat" type="number" min="0" step="any" required /></label>
      </div>
      @if (attempted && form.invalid) { <p class="error" role="alert">Enter a name, serving description, and non-negative nutrition values.</p> }
      <div class="actions"><button type="submit" class="primary">Save food</button><button type="button" (click)="cancel.emit()">Cancel</button></div>
    </form>
  `,
})
export class FoodEditor implements OnChanges {
  readonly food = input<Food | null>(null);
  readonly barcode = input('');
  readonly saved = output<void>();
  readonly cancel = output<void>();
  readonly store = inject(DemoStore);
  private readonly fb = inject(FormBuilder).nonNullable;
  attempted = false;
  readonly form = this.fb.group({
    name: ['', Validators.required], serving: ['', Validators.required],
    grams: this.fb.control<number | null>(null, Validators.min(0.01)), barcode: '',
    calories: [0, [Validators.required, Validators.min(0)]], protein: [0, [Validators.required, Validators.min(0)]],
    carbs: [0, [Validators.required, Validators.min(0)]], fat: [0, [Validators.required, Validators.min(0)]],
  });
  ngOnChanges(): void {
    this.attempted = false;
    const food = this.food();
    if (food) this.form.patchValue({ ...food, grams: food.grams ?? null, barcode: food.barcode ?? '' });
    else this.form.reset({ name: '', serving: '', grams: null, barcode: this.barcode(), calories: 0, protein: 0, carbs: 0, fat: 0 });
  }
  save(): void {
    this.attempted = true;
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    if (this.store.run(() => this.store.saveFood({
      ...value, id: this.food()?.id ?? '', favorite: this.food()?.favorite ?? false,
      grams: value.grams ?? undefined, barcode: value.barcode.trim() || undefined,
    }), 'Food saved to your demo library.')) this.saved.emit();
  }
}
