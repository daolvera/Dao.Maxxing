import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { SpinnerService } from '../../services/spinner.service';

@Component({
  selector: 'app-spinner',
  standalone: true,
  imports: [],
  templateUrl: './spinner.component.html',
  // Bootstrap's z-* utilities stop at 3; the overlay must sit above modals (1055) and toasts (1090).
  styles: '.spinner-overlay { z-index: 1100; }',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpinnerComponent {
  private spinnerService = inject(SpinnerService);
  protected isLoading = toSignal(this.spinnerService.isLoading$, {
    initialValue: false,
  });
  protected message = toSignal(this.spinnerService.message$, {
    initialValue: '',
  });
}
