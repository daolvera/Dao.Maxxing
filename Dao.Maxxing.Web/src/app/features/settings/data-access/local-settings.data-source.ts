import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { isValidTimeZone, Nutrition, nutrients } from '../../../nutrition/nutrition';
import { placeholderCall, PlaceholderDb } from '../../../placeholder/placeholder-db';
import { Goal, MealSection, Preferences } from './settings';
import type { SettingsDataSource } from './settings.data-source';

/** PLACEHOLDER settings over `PlaceholderDb`, until P1 (#21) adds the endpoints. */
@Injectable({ providedIn: 'root' })
export class LocalSettingsDataSource implements SettingsDataSource {
  private readonly db = inject(PlaceholderDb);

  getGoals(): Observable<Goal[]> {
    return placeholderCall(() => structuredClone(this.db.goals));
  }

  saveGoals(targets: Nutrition, from: string): Observable<Goal[]> {
    return placeholderCall(() => {
      if (!nutrients.every((k) => Number.isFinite(targets[k]) && targets[k] > 0)) {
        throw new Error('Every daily target must be greater than zero.');
      }
      this.db.goals = [...this.db.goals.filter((g) => g.from < from), { ...targets, from }];
      return structuredClone(this.db.goals);
    });
  }

  getMealSections(): Observable<MealSection[]> {
    return placeholderCall(() => structuredClone(this.db.mealSections));
  }

  saveMealSections(sections: MealSection[], from: string): Observable<MealSection[]> {
    return placeholderCall(() => {
      const cleaned = sections.map((s) => ({ ...s, name: s.name.trim() }));
      if (!cleaned.every((s) => s.name)) throw new Error('Meal section names cannot be empty.');
      if (new Set(cleaned.map((s) => s.name.toLowerCase())).size !== cleaned.length) {
        throw new Error('Meal section names must be unique.');
      }
      if (!cleaned.some((s) => s.visible)) {
        throw new Error('Keep at least one visible meal section.');
      }
      this.db.mealSections = cleaned;
      this.db.sectionVersions = [
        ...this.db.sectionVersions.filter((v) => v.from < from),
        { from, names: cleaned.filter((s) => s.visible).map((s) => s.name) },
      ];
      return structuredClone(cleaned);
    });
  }

  getPreferences(): Observable<Preferences> {
    return placeholderCall(() => ({ ...this.db.preferences }));
  }

  savePreferences(preferences: Preferences): Observable<Preferences> {
    return placeholderCall(() => {
      if (!isValidTimeZone(preferences.timeZone)) {
        throw new Error('Use a valid IANA time zone, such as America/Los_Angeles or UTC.');
      }
      this.db.preferences = { ...preferences };
      return { ...preferences };
    });
  }
}
