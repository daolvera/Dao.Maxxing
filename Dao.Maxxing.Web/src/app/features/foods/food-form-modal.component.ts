import { ChangeDetectionStrategy, Component, inject, Input, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import {
  FieldControlDirective,
  FormFieldComponent,
} from '../../components/form-field/form-field.component';
import { FormUtils } from '../../utils/form-utils';
import { Food } from './data-access/food';
import { FoodsStore } from './data-access/foods.store';

/**
 * Creates a private food from its nutrition label, or edits one. Closes only after the save
 * succeeds, so a failed save keeps what was typed.
 *
 * Inputs stay `@Input()` because `ModalService` sets them through `componentInstance`.
 */
@Component({
  selector: 'app-food-form-modal',
  imports: [ReactiveFormsModule, FormFieldComponent, FieldControlDirective],
  template: `
    <div class="modal-header">
      <h2 class="modal-title h5" [id]="titleId">{{ title }}</h2>
      <button type="button" class="btn-close" aria-label="Close" (click)="activeModal.dismiss()"></button>
    </div>
    <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <div class="modal-body">
        <p class="text-body-secondary">Use the nutrition label. Changes only affect future logs.</p>
        <div class="row g-2">
          <app-form-field class="col-12" label="Food name" [control]="form.controls.name">
            <input appFieldControl class="form-control" formControlName="name" maxlength="100" autocomplete="off" />
          </app-form-field>
          <app-form-field
            class="col-12"
            label="Serving description"
            hint="For example, 1/2 cup dry."
            [control]="form.controls.serving"
          >
            <input appFieldControl class="form-control" formControlName="serving" maxlength="100" autocomplete="off" />
          </app-form-field>
          <app-form-field
            class="col-sm-6"
            label="Grams per serving"
            hint="Optional. Needed to log in grams."
            [control]="form.controls.grams"
          >
            <input appFieldControl class="form-control" type="number" min="0" step="any" formControlName="grams" />
          </app-form-field>
          <app-form-field class="col-sm-6" label="Barcode" hint="Optional." [control]="form.controls.barcode">
            <input appFieldControl class="form-control" inputmode="numeric" formControlName="barcode" autocomplete="off" />
          </app-form-field>
          <app-form-field class="col-6 col-md-3" label="Calories (kcal)" [control]="form.controls.calories">
            <input appFieldControl class="form-control" type="number" min="0" step="any" formControlName="calories" />
          </app-form-field>
          <app-form-field class="col-6 col-md-3" label="Protein (g)" [control]="form.controls.protein">
            <input appFieldControl class="form-control" type="number" min="0" step="any" formControlName="protein" />
          </app-form-field>
          <app-form-field class="col-6 col-md-3" label="Carbs (g)" [control]="form.controls.carbs">
            <input appFieldControl class="form-control" type="number" min="0" step="any" formControlName="carbs" />
          </app-form-field>
          <app-form-field class="col-6 col-md-3" label="Fat (g)" [control]="form.controls.fat">
            <input appFieldControl class="form-control" type="number" min="0" step="any" formControlName="fat" />
          </app-form-field>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-outline-secondary" (click)="activeModal.dismiss()">Cancel</button>
        <button type="submit" class="btn btn-primary" [disabled]="store.saving()">Save food</button>
      </div>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FoodFormModalComponent implements OnInit {
  protected readonly activeModal = inject(NgbActiveModal);
  protected readonly store = inject(FoodsStore);

  @Input() title = 'Create a private food';
  /** Set by `ModalService` so the dialog is named by its title. */
  @Input() titleId = 'app-food-form-title';
  /** The food to edit. Without one, the modal creates a food. */
  @Input() food?: Food;

  private readonly fb = inject(FormBuilder).nonNullable;
  protected readonly form = this.fb.group({
    name: ['', Validators.required],
    serving: ['', Validators.required],
    grams: this.fb.control<number | null>(null, Validators.min(0.01)),
    barcode: [''],
    calories: [0, [Validators.required, Validators.min(0)]],
    protein: [0, [Validators.required, Validators.min(0)]],
    carbs: [0, [Validators.required, Validators.min(0)]],
    fat: [0, [Validators.required, Validators.min(0)]],
  });

  ngOnInit(): void {
    if (this.food) {
      this.form.patchValue({
        ...this.food,
        grams: this.food.grams ?? null,
        barcode: this.food.barcode ?? '',
      });
    }
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      FormUtils.markAllAsTouched(this.form);
      return;
    }
    const { grams, barcode, ...value } = this.form.getRawValue();
    const saved = await this.store.saveFood({
      ...value,
      id: this.food?.id,
      grams: grams ?? undefined,
      barcode: barcode.trim() || undefined,
    });
    if (saved) this.activeModal.close(true);
  }
}
