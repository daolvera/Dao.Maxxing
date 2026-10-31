import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from './auth/auth.service';
import { AlertModalComponent } from './components/alert-modal/alert-modal.component';
import { ConfirmModalComponent } from './components/confirm-modal/confirm-modal.component';
import {
  FieldControlDirective,
  FormFieldComponent,
} from './components/form-field/form-field.component';
import { ThemeToggleComponent } from './components/theme-toggle/theme-toggle.component';
import { ModalService } from './services/modal.service';
import { NotificationService } from './services/notification.service';
import { SpinnerService } from './services/spinner.service';
import { FormUtils } from './utils/form-utils';
import { WeatherComponent } from './weather/weather.component';

/** Sandbox for the API wiring and the shared controls. Not part of the app's navigation. */
@Component({
  imports: [
    ReactiveFormsModule,
    FormFieldComponent,
    FieldControlDirective,
    ThemeToggleComponent,
    WeatherComponent,
  ],
  templateUrl: './template.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TemplateComponent {
  protected readonly auth = inject(AuthService);
  private readonly modals = inject(ModalService);
  protected readonly notifications = inject(NotificationService);
  private readonly spinner = inject(SpinnerService);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
    servingGrams: [100, [Validators.required, Validators.min(1), Validators.max(5000)]],
    meal: ['breakfast'],
    favorite: [false],
  });

  protected save(): void {
    if (this.form.invalid) {
      FormUtils.markAllAsTouched(this.form);
      return;
    }
    this.notifications.success(`Saved ${this.form.controls.name.value}.`);
  }

  protected confirmDelete(): void {
    const ref = this.modals.open(ConfirmModalComponent, { title: 'Delete food?' });
    Object.assign(ref.componentInstance as ConfirmModalComponent, {
      message: 'This removes it from your library.',
      details: 'Diary entries that use it keep their nutrition values.',
      confirmText: 'Delete',
      confirmButtonClass: 'btn-danger',
    });
  }

  protected showAlert(): void {
    const ref = this.modals.open(AlertModalComponent, { title: 'Sync failed' });
    Object.assign(ref.componentInstance as AlertModalComponent, {
      type: 'error',
      message: 'We could not reach the food database.',
      details: 'Check your connection and try again.',
    });
  }

  protected showSpinner(): void {
    this.spinner.show('Loading foods...');
    setTimeout(() => this.spinner.hide(), 1500);
  }
}
