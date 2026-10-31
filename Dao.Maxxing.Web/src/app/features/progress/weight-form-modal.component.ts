import { ChangeDetectionStrategy, Component, inject, Input, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import {
  FieldControlDirective,
  FormFieldComponent,
} from '../../components/form-field/form-field.component';
import { WeightUnit } from '../../nutrition/nutrition';
import { FormUtils } from '../../utils/form-utils';

export interface WeightChoice {
  date: string;
  amount: number;
}

/**
 * Records or edits one dated weight. Inputs stay `@Input()` because `ModalService` sets them
 * through `componentInstance`. Closes only when `save` resolves `true`.
 */
@Component({
  selector: 'app-weight-form-modal',
  imports: [ReactiveFormsModule, FormFieldComponent, FieldControlDirective],
  template: `
    <div class="modal-header">
      <h2 class="modal-title h5" [id]="titleId">{{ title }}</h2>
      <button type="button" class="btn-close" aria-label="Close" (click)="activeModal.dismiss()"></button>
    </div>
    <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <div class="modal-body row g-2">
        <app-form-field class="col-sm-6" label="Date" [control]="form.controls.date">
          <input appFieldControl class="form-control" type="date" formControlName="date" />
        </app-form-field>
        <app-form-field class="col-sm-6" [label]="'Weight (' + unit + ')'" [control]="form.controls.amount">
          <input appFieldControl class="form-control" type="number" min="0" step="any" formControlName="amount" />
        </app-form-field>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-outline-secondary" (click)="activeModal.dismiss()">Cancel</button>
        <button type="submit" class="btn btn-primary" [disabled]="saving()">Save weight</button>
      </div>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeightFormModalComponent implements OnInit {
  protected readonly activeModal = inject(NgbActiveModal);

  @Input() title = 'Record a weight';
  /** Set by `ModalService` so the dialog is named by its title. */
  @Input() titleId = 'app-weight-form-title';
  @Input() unit: WeightUnit = 'lb';
  @Input() initial: WeightChoice = { date: '', amount: 0 };
  @Input() save: (choice: WeightChoice) => Promise<boolean> = async () => true;

  protected readonly saving = signal(false);
  protected readonly form = inject(FormBuilder).nonNullable.group({
    date: ['', Validators.required],
    amount: [0, [Validators.required, Validators.min(0.01)]],
  });

  ngOnInit(): void {
    this.form.setValue({ ...this.initial });
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      FormUtils.markAllAsTouched(this.form);
      return;
    }
    this.saving.set(true);
    const saved = await this.save(this.form.getRawValue());
    this.saving.set(false);
    if (saved) this.activeModal.close(true);
  }
}
