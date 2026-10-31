import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NotificationsComponent } from './components/notifications/notifications.component';
import { SpinnerComponent } from './components/spinner/spinner.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NotificationsComponent, SpinnerComponent],
  template: '<router-outlet /><app-notifications /><app-spinner />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
