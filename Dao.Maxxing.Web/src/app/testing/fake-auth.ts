import { Provider, signal } from '@angular/core';
import { vi } from 'vitest';
import { AppUser, AuthService } from '../auth/auth.service';

/** Replaces AuthService so a spec can choose who's signed in. `null` means signed out. */
export function provideFakeAuth(user: AppUser | null, error: string | null = null): Provider {
  const current = signal(user);
  return {
    provide: AuthService,
    useValue: {
      user: current,
      error: signal(error),
      login: vi.fn().mockResolvedValue(undefined),
      logout: vi.fn(async () => current.set(null)),
    },
  };
}
