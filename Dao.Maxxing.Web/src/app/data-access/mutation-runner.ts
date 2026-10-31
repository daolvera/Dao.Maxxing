import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, signal } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';
import { NotificationService } from '../services/notification.service';

/**
 * A readable message for a failed request. The API answers with ProblemDetails (RFC 9457), so
 * prefer its `detail` and `title`; placeholder data sources throw plain `Error`s.
 */
export function toErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const problem: unknown = error.error;
    if (typeof problem === 'object' && problem !== null) {
      const { detail, title } = problem as { detail?: unknown; title?: unknown };
      if (typeof detail === 'string' && detail) return detail;
      if (typeof title === 'string' && title) return title;
    }
    return error.status === 0
      ? "Couldn't reach the server. Check your connection and try again."
      : 'Something went wrong. Try again.';
  }
  return error instanceof Error && error.message ? error.message : 'Something went wrong. Try again.';
}

/**
 * Runs a store's writes: tracks whether one is in flight, applies the result to the store's
 * state, and reports the outcome as a toast. Call it from a field initializer.
 *
 * @example
 * ```ts
 * private readonly mutations = createMutationRunner();
 * readonly saving = this.mutations.saving;
 * save(food: FoodDraft) {
 *   return this.mutations.run(this.source.saveFood(food), 'Food saved.', () => this.foods.reload());
 * }
 * ```
 */
export function createMutationRunner() {
  const notifications = inject(NotificationService);
  const pending = signal(0);
  return {
    saving: computed(() => pending() > 0),
    /** Resolves `true` when the write succeeded, so callers can close a form only then. */
    async run<T>(request: Observable<T>, success: string, apply: (value: T) => void): Promise<boolean> {
      pending.update((n) => n + 1);
      try {
        apply(await firstValueFrom(request));
        notifications.success(success);
        return true;
      } catch (error) {
        notifications.error(toErrorMessage(error));
        return false;
      } finally {
        pending.update((n) => n - 1);
      }
    },
  };
}
