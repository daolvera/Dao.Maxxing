import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

/**
 * Confirmation modal component
 * Used for yes/no, delete confirmations, etc.
 *
 * Inputs stay `@Input()` because NgbModal sets them through `componentInstance`, which signal
 * inputs don't support.
 */
@Component({
  selector: 'app-confirm-modal',
  imports: [],
  template: `
    <div class="modal-header">
      <h2 class="modal-title h5" [id]="titleId">{{ title }}</h2>
      <button
        type="button"
        class="btn-close"
        aria-label="Close"
        (click)="activeModal.dismiss()"
      ></button>
    </div>
    <div class="modal-body">
      <p [class.mb-0]="!details">{{ message }}</p>
      @if (details) {
        <p class="text-body-secondary small mb-0">{{ details }}</p>
      }
    </div>
    <div class="modal-footer">
      <!-- Focus starts on the safe choice, so Enter can't confirm by accident. -->
      <button
        type="button"
        class="btn btn-outline-secondary"
        ngbAutofocus
        (click)="activeModal.dismiss()"
      >
        {{ cancelText }}
      </button>
      <button type="button" [class]="'btn ' + confirmButtonClass" (click)="activeModal.close(true)">
        {{ confirmText }}
      </button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmModalComponent {
  protected activeModal = inject(NgbActiveModal);

  @Input() title = 'Confirm action';
  @Input() message = 'Are you sure you want to proceed?';
  @Input() details?: string;
  @Input() confirmText = 'Confirm';
  @Input() cancelText = 'Cancel';
  @Input() confirmButtonClass = 'btn-primary';
  /** Set by `ModalService` so the dialog is named by its title. */
  @Input() titleId = 'app-confirm-modal-title';
}
