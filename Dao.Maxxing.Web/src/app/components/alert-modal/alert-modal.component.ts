import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

/**
 * Alert modal component
 * Simple informational modal with single OK button
 *
 * Inputs stay `@Input()` because NgbModal sets them through `componentInstance`, which signal
 * inputs don't support.
 */
@Component({
  selector: 'app-alert-modal',
  imports: [],
  template: `
    <!-- text-bg-* picks a text color that contrasts with the header background. -->
    <div class="modal-header" [class]="'text-bg-' + alertClass">
      <h2 class="modal-title h5" [id]="titleId">
        <i [class]="'bi ' + iconClass + ' me-2'" aria-hidden="true"></i>
        {{ title }}
      </h2>
      <button
        type="button"
        class="btn-close"
        [class.btn-close-white]="hasDarkHeader"
        aria-label="Close"
        (click)="activeModal.dismiss()"
      ></button>
    </div>
    <div class="modal-body">
      <p>{{ message }}</p>
      @if (details) {
        <div class="alert mb-0" [class]="'alert-' + alertClass">
          {{ details }}
        </div>
      }
    </div>
    <div class="modal-footer">
      <button
        type="button"
        [class]="'btn btn-' + alertClass"
        ngbAutofocus
        (click)="activeModal.close()"
      >
        {{ buttonText }}
      </button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertModalComponent {
  protected activeModal = inject(NgbActiveModal);

  @Input() type: AlertType = 'info';
  @Input() title = 'Alert';
  @Input() message = '';
  @Input() details?: string;
  @Input() buttonText = 'OK';
  /** Set by `ModalService` so the dialog is named by its title. */
  @Input() titleId = 'app-alert-modal-title';

  get alertClass(): string {
    const map: Record<AlertType, string> = {
      success: 'success',
      error: 'danger',
      warning: 'warning',
      info: 'info',
    };
    return map[this.type];
  }

  /** Bootstrap gives success and danger white text, and warning and info dark text. */
  get hasDarkHeader(): boolean {
    return this.type === 'success' || this.type === 'error';
  }

  get iconClass(): string {
    const map: Record<AlertType, string> = {
      success: 'bi-check-circle-fill',
      error: 'bi-exclamation-triangle-fill',
      warning: 'bi-exclamation-circle-fill',
      info: 'bi-info-circle-fill',
    };
    return map[this.type];
  }
}
