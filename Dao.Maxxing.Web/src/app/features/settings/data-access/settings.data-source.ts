import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Nutrition } from '../../../nutrition/nutrition';
import { LocalSettingsDataSource } from './local-settings.data-source';
import { Goal, MealSection, Preferences } from './settings';

/**
 * Goals, meal defaults, and preferences. There are no endpoints yet (P1 #21), so the default is
 * the in-memory placeholder. Swap `useClass` for an `Api`-backed implementation when they exist.
 */
@Injectable({ providedIn: 'root', useClass: LocalSettingsDataSource })
export abstract class SettingsDataSource {
  /** Goal history, oldest first. */
  abstract getGoals(): Observable<Goal[]>;
  abstract saveGoals(targets: Nutrition, from: string): Observable<Goal[]>;
  abstract getMealSections(): Observable<MealSection[]>;
  /** New defaults apply to diary days from `from` onward. Existing days keep their sections. */
  abstract saveMealSections(sections: MealSection[], from: string): Observable<MealSection[]>;
  abstract getPreferences(): Observable<Preferences>;
  abstract savePreferences(preferences: Preferences): Observable<Preferences>;
}
