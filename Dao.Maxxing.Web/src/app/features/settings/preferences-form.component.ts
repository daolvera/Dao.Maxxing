import { ChangeDetectionStrategy, Component, effect, inject, untracked } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import {
  FieldControlDirective,
  FormFieldComponent,
} from '../../components/form-field/form-field.component';
import { isValidTimeZone, WeightUnit } from '../../nutrition/nutrition';
import { FormUtils } from '../../utils/form-utils';
import { SettingsStore } from './data-access/settings.store';

function timeZone(control: AbstractControl<string>): ValidationErrors | null {
  return !control.value || isValidTimeZone(control.value.trim()) ? null : { timeZone: true };
}

/** The diary's time zone and the weight display unit. */
@Component({
  selector: 'app-preferences-form',
  imports: [ReactiveFormsModule, FormFieldComponent, FieldControlDirective],
  template: `
    <section class="card h-100" aria-labelledby="preferences-heading">
      <form class="card-body" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <h2 id="preferences-heading" class="h5">Dates &amp; measurements</h2>
        <app-form-field
          label="Diary time zone"
          hint="An IANA time zone, such as America/Los_Angeles or UTC."
          [control]="form.controls.timeZone"
        >
          <input appFieldControl class="form-control" formControlName="timeZone" list="time-zones" autocomplete="off" />
        </app-form-field>
        <datalist id="time-zones">
          @for (zone of suggestedZones; track zone) {
            <option [value]="zone"></option>
          }
        </datalist>
        <app-form-field
          label="Weight display"
          hint="Changing units doesn't change your stored measurements."
          [control]="form.controls.weightUnit"
        >
          <select appFieldControl class="form-select" formControlName="weightUnit">
            <option value="lb">Pounds (lb)</option>
            <option value="kg">Kilograms (kg)</option>
          </select>
        </app-form-field>
        <button type="submit" class="btn btn-primary" [disabled]="store.saving()">Save preferences</button>
      </form>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreferencesFormComponent {
  protected readonly store = inject(SettingsStore);
  protected readonly suggestedZones = [
    'America/Los_Angeles',
    'America/Denver',
    'America/Chicago',
    'America/New_York',
    'Europe/London',
    'UTC',
  ];
  protected readonly form = inject(FormBuilder).nonNullable.group({
    timeZone: ['', [Validators.required, timeZone]],
    weightUnit: ['lb' as WeightUnit],
  });

  constructor() {
    effect(() => {
      const value = { timeZone: this.store.timeZone(), weightUnit: this.store.weightUnit() };
      untracked(() => this.form.reset(value));
    });
  }

  protected submit(): void {
    if (this.form.invalid) {
      FormUtils.markAllAsTouched(this.form);
      return;
    }
    const { timeZone, weightUnit } = this.form.getRawValue();
    this.store.savePreferences({ timeZone: timeZone.trim(), weightUnit });
  }
}
