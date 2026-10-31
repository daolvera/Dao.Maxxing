import { Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NgbConfig, NgbModal, NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap';

/** Turns off ng-bootstrap transitions so modals open and close without waiting on CSS. */
export function provideNoNgbAnimations(): Provider {
  return { provide: NgbConfig, useFactory: () => Object.assign(new NgbConfig(), { animation: false }) };
}

/**
 * Closes every modal and offcanvas and waits for ng-bootstrap to remove them. Call it in
 * `afterEach`: if TestBed tears down first, ng-bootstrap's delayed removal throws an unhandled
 * error that fails the run.
 */
export async function closeOverlays(): Promise<void> {
  TestBed.inject(NgbModal).dismissAll();
  const offcanvas = TestBed.inject(NgbOffcanvas);
  if (offcanvas.hasOpenOffcanvas()) offcanvas.dismiss();
  while (document.querySelector('ngb-modal-window, ngb-modal-backdrop, ngb-offcanvas-panel, ngb-offcanvas-backdrop')) {
    await new Promise((resolve) => setTimeout(resolve));
  }
}

/** Waits for a just-opened modal to render. */
export function nextModalRender(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve));
}
