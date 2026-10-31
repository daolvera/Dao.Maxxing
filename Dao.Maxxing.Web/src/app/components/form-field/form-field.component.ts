import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  computed,
  inject,
  input,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, Validators } from '@angular/forms';
import { map, startWith, switchMap } from 'rxjs';
import { FormUtils } from '../../utils/form-utils';

let nextId = 0;

/**
 * Labelled form field with a hint and validation message.
 * The projected control gets its id, `aria-describedby`, `aria-invalid`, and `is-invalid` from the
 * field through `appFieldControl`, so a label and its error can't drift apart.
 *
 * @example
 * ```html
 * <app-form-field label="Email" hint="We never share it." [control]="form.controls.email">
 *   <input appFieldControl class="form-control" type="email" [formControl]="form.controls.email" />
 * </app-form-field>
 * ```
 */
@Component({
  selector: 'app-form-field',
  template: `
    <label class="form-label" [for]="controlId">
      {{ label() }}
      @if (required()) {
        <span class="text-danger" aria-hidden="true">*</span>
        <span class="visually-hidden">(required)</span>
      }
    </label>
    <ng-content />
    @if (hint()) {
      <div class="form-text" [id]="hintId">{{ hint() }}</div>
    }
    @if (error()) {
      <div class="invalid-feedback d-block" [id]="errorId">{{ error() }}</div>
    }
  `,
  host: { class: 'd-block mb-3' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormFieldComponent {
  readonly label = input.required<string>();
  readonly control = input.required<AbstractControl>();
  readonly hint = input<string>();

  readonly controlId = `app-field-${++nextId}`;
  protected readonly hintId = `${this.controlId}-hint`;
  protected readonly errorId = `${this.controlId}-error`;

  /** Re-reads the control whenever its value, status, or touched state changes. */
  private readonly state = toSignal(
    toObservable(this.control).pipe(
      switchMap((control) =>
        control.events.pipe(
          startWith(null),
          map(() => ({
            required: control.hasValidator(Validators.required),
            errors: control.touched && control.invalid ? control.errors : null,
          })),
        ),
      ),
    ),
  );

  readonly required = computed(() => this.state()?.required ?? false);

  /** The first validation message, shown once the user has left the field. */
  readonly error = computed(() => {
    const errors = this.state()?.errors;
    const [key] = Object.keys(errors ?? {});
    return key ? FormUtils.getErrorMessage(this.label(), key, errors![key]) : null;
  });

  readonly describedBy = computed(
    () =>
      [this.hint() ? this.hintId : null, this.error() ? this.errorId : null]
        .filter(Boolean)
        .join(' ') || null,
  );
}

/** Marks the control inside an `app-form-field` and wires it to the field's label and messages. */
@Directive({
  selector: '[appFieldControl]',
  host: {
    '[id]': 'field.controlId',
    '[attr.aria-describedby]': 'field.describedBy()',
    '[attr.aria-invalid]': 'field.error() ? true : null',
    '[class.is-invalid]': '!!field.error()',
  },
})
export class FieldControlDirective {
  protected readonly field = inject(FormFieldComponent);
}
