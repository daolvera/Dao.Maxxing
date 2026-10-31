import { Injectable, Type, inject } from '@angular/core';
import { NgbModal, NgbModalOptions, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { Observable, catchError, from, map, of } from 'rxjs';
import { IModalConfig } from '../models';

export type ModalObservableResult<TResult> =
  { closed: true; result: TResult } | { closed: false; reason: unknown };

interface ModalTitleComponent {
  title: string;
}

/**
 * Service to manage modals using ng-bootstrap
 */
@Injectable({
  providedIn: 'root',
})
export class ModalService {
  private ngbModal = inject(NgbModal);

  private hasTitleProperty(instance: unknown): instance is ModalTitleComponent {
    return typeof instance === 'object' && instance !== null && 'title' in instance;
  }

  /**
   * Open a modal with the specified component
   * @param component The component to display in the modal
   * @param config Modal configuration options
   * @returns NgbModalRef reference to the opened modal
   */
  open<T>(component: Type<T>, config?: IModalConfig): NgbModalRef {
    const options: NgbModalOptions = {
      size: config?.size,
      backdrop: config?.backdrop ?? true,
      keyboard: config?.keyboard ?? true,
      centered: config?.centered ?? false,
    };

    const modalRef = this.ngbModal.open(component, options);

    // If title is provided, set it on the component instance if it has a title property
    if (config?.title && this.hasTitleProperty(modalRef.componentInstance)) {
      modalRef.componentInstance.title = config.title;
    }

    return modalRef;
  }

  /**
   * Open a modal and return the result as an Observable
   * @param component The component to display in the modal
   * @param config Modal configuration options
   * @returns Observable that emits when the modal is closed or dismissed
   */
  openAsObservable<T, TResult = unknown>(
    component: Type<T>,
    config?: IModalConfig,
  ): Observable<ModalObservableResult<TResult>> {
    const modalRef = this.open(component, config);
    return from(modalRef.result as Promise<TResult>).pipe(
      map((result) => ({ closed: true as const, result })),
      catchError((reason: unknown) => of({ closed: false as const, reason })),
    );
  }

  /**
   * Close all open modals
   */
  closeAll(): void {
    this.ngbModal.dismissAll();
  }

  /**
   * Check if any modal is currently open
   */
  hasOpenModals(): boolean {
    return this.ngbModal.hasOpenModals();
  }
}
