import { TestBed } from '@angular/core/testing';
import { ConfirmModalComponent } from '../components/confirm-modal/confirm-modal.component';
import { ModalService } from './modal.service';

describe('ModalService', () => {
  afterEach(() => TestBed.inject(ModalService).closeAll());

  it('names the dialog by its title', async () => {
    const ref = TestBed.inject(ModalService).open(ConfirmModalComponent, { title: 'Delete food?' });
    await new Promise((resolve) => setTimeout(resolve));

    const dialog = document.querySelector('[role=dialog]')!;
    const titleId = dialog.getAttribute('aria-labelledby')!;
    expect((ref.componentInstance as ConfirmModalComponent).titleId).toBe(titleId);
    expect(document.getElementById(titleId)?.textContent).toContain('Delete food?');
  });
});
