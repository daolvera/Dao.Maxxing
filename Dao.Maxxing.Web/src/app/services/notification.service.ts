import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { INotification } from '../models';

/**
 * Service to manage toast notifications
 */
@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private notificationsSubject = new BehaviorSubject<INotification[]>([]);
  private fallbackIdCounter = 0;

  /**
   * Observable of current notifications
   */
  public notifications$: Observable<INotification[]> = this.notificationsSubject.asObservable();

  private createNotificationId(): string {
    const uuid = globalThis.crypto?.randomUUID?.();
    if (uuid) {
      return uuid;
    }

    this.fallbackIdCounter += 1;
    return `notification-${Date.now()}-${this.fallbackIdCounter}-${Math.random().toString(36).slice(2, 10)}`;
  }

  /**
   * Show a success notification
   * @param message The message to display
   * @param duration Duration in milliseconds (0 for persistent)
   */
  success(message: string, duration: number = 5000): void {
    this.show({ message, type: 'success', duration, dismissible: true });
  }

  /**
   * Show an error notification
   * @param message The message to display
   * @param duration Duration in milliseconds (0 for persistent)
   */
  error(message: string, duration: number = 0): void {
    this.show({ message, type: 'error', duration, dismissible: true });
  }

  /**
   * Show a warning notification
   * @param message The message to display
   * @param duration Duration in milliseconds (0 for persistent)
   */
  warning(message: string, duration: number = 7000): void {
    this.show({ message, type: 'warning', duration, dismissible: true });
  }

  /**
   * Show an info notification
   * @param message The message to display
   * @param duration Duration in milliseconds (0 for persistent)
   */
  info(message: string, duration: number = 5000): void {
    this.show({ message, type: 'info', duration, dismissible: true });
  }

  /**
   * Show a notification
   * @param notification The notification to display
   */
  show(notification: Omit<INotification, 'id'>): void {
    const fullNotification: INotification = {
      ...notification,
      id: this.createNotificationId(),
    };
    this.notificationsSubject.next([...this.notificationsSubject.value, fullNotification]);

    // Auto-dismiss after duration if specified
    if (fullNotification.duration && fullNotification.duration > 0) {
      setTimeout(() => {
        this.dismiss(fullNotification.id);
      }, fullNotification.duration);
    }
  }

  /**
   * Dismiss a specific notification
   * @param notification The notification to dismiss
   */
  dismiss(notification: INotification | string): void {
    const notificationId = typeof notification === 'string' ? notification : notification.id;
    const notifications = this.notificationsSubject.value.filter((n) => n.id !== notificationId);
    this.notificationsSubject.next(notifications);
  }

  /**
   * Clear all notifications
   */
  clear(): void {
    this.notificationsSubject.next([]);
  }
}
