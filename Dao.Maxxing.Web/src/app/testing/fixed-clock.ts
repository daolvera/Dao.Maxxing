import { Provider } from '@angular/core';
import { dateInZone, NOW } from '../nutrition/nutrition';

/** Noon UTC, so it's the same calendar date in nearly every time zone a test machine uses. */
export const fixedNow = new Date('2026-03-15T12:00:00Z');

/** Today's date as the placeholder data and `SettingsStore` see it under `provideFixedClock()`. */
export const fixedToday = dateInZone(
  Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  fixedNow,
);

export function provideFixedClock(): Provider {
  return { provide: NOW, useValue: () => fixedNow };
}
