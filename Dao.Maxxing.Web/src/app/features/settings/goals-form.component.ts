import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  FieldControlDirective,
  FormFieldComponent,
} from '../../components/form-field/form-field.component';
import { macroCalories, nutrientLabels, nutrients, nutrientUnits } from '../../nutrition/nutrition';
import { FormUtils } from '../../utils/form-utils';
import { SettingsStore } from './data-access/settings.store';

/** Daily calorie and macro targets. New targets start today. */
@Component({
  selector: 'app-goals-form',
  imports: [DecimalPipe, ReactiveFormsModule, FormFieldComponent, FieldControlDirective],
  template: `
    <section class="card h-100" aria-labelledby="goals-heading">
      <form class="card-body" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <h2 id="goals-heading" class="h5">Daily targets</h2>
        <p class="text-body-secondary">
          The same targets each day until you change them. New targets start today,
          {{ store.today() }}. Earlier days keep theirs.
        </p>
        <div class="row g-2">
          @for (key of nutrients; track key) {
            <app-form-field
              class="col-6"
              [label]="labels[key] + ' (' + units[key] + ')'"
              [control]="form.controls[key]"
            >
              <input appFieldControl class="form-control" type="number" min="0" step="any" [formControlName]="key" />
            </app-form-field>
          }
        </div>
        <p class="small text-body-secondary">
          Macros provide about {{ macroTotal() | number: '1.0-0' }} kcal (protein and carbs 4 kcal/g,
          fat 9 kcal/g).
        </p>
        <div aria-live="polite">
          @if (mismatch()) {
            <p class="alert alert-warning small">
              Your calorie and macro targets don't line up. You can still save them as entered.
            </p>
          }
        </div>
        <button type="submit" class="btn btn-primary" [disabled]="store.saving()">Save daily targets</button>
      </form>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoalsFormComponent {
  protected readonly store = inject(SettingsStore);
  protected readonly nutrients = nutrients;
  protected readonly labels = nutrientLabels;
  protected readonly units = nutrientUnits;

  private readonly positive = [Validators.required, Validators.min(0.01)];
  protected readonly form = inject(FormBuilder).nonNullable.group({
    calories: [0, this.positive],
    protein: [0, this.positive],
    carbs: [0, this.positive],
    fat: [0, this.positive],
  });
  private readonly value = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });
  protected readonly macroTotal = computed(() => {
    const { protein = 0, carbs = 0, fat = 0 } = this.value();
    return macroCalories({ protein, carbs, fat });
  });
  protected readonly mismatch = computed(
    () => Math.abs(this.macroTotal() - (this.value().calories ?? 0)) > 50,
  );

  constructor() {
    effect(() => {
      const goal = this.store.currentGoal();
      untracked(() => this.form.reset(goal));
    });
  }

  protected submit(): void {
    if (this.form.invalid) {
      FormUtils.markAllAsTouched(this.form);
      return;
    }
    this.store.saveGoals(this.form.getRawValue());
  }
}
