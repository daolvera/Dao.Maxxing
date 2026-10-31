import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { INotification } from '../../models';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [],
  templateUrl: './notifications.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsComponent {
  private notificationService = inject(NotificationService);
  protected notifications = toSignal(this.notificationService.notifications$, {
    initialValue: [] as INotification[],
  });

  dismiss(notification: INotification): void {
    this.notificationService.dismiss(notification);
  }

  getToastClass(type: string): string {
    const typeMap: { [key: string]: string } = {
      success: 'text-bg-success',
      error: 'text-bg-danger',
      warning: 'text-bg-warning',
      info: 'text-bg-info',
    };
    return typeMap[type] || 'text-bg-info';
  }

  hasDarkBackground(type: string): boolean {
    return type === 'success' || type === 'error';
  }

  getIcon(type: string): string {
    const iconMap: { [key: string]: string } = {
      success: 'check-circle',
      error: 'exclamation-circle',
      warning: 'exclamation-triangle',
      info: 'info-circle',
    };
    return iconMap[type] || 'info-circle';
  }
}
