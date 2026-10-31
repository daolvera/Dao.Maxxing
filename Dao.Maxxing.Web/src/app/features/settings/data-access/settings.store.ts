import { computed, inject, Injectable } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { createMutationRunner, toErrorMessage } from '../../../data-access/mutation-runner';
import {
  dateInZone,
  emptyNutrition,
  NOW,
  Nutrition,
  offsetDate,
  WeightUnit,
} from '../../../nutrition/nutrition';
import { MealSection, Preferences } from './settings';
import { SettingsDataSource } from './settings.data-source';

/**
 * Goals, meal defaults, and preferences. App-wide because the Diary and Progress features read
 * them too.
 */
@Injectable({ providedIn: 'root' })
export class SettingsStore {
  private readonly source = inject(SettingsDataSource);
  private readonly now = inject(NOW);
  private readonly mutations = createMutationRunner();

  private readonly goalsResource = rxResource({ stream: () => this.source.getGoals() });
  private readonly sectionsResource = rxResource({ stream: () => this.source.getMealSections() });
  private readonly preferencesResource = rxResource({
    stream: () => this.source.getPreferences(),
  });

  readonly goals = computed(() => this.goalsResource.value() ?? []);
  readonly mealSections = computed(() => this.sectionsResource.value() ?? []);
  readonly preferences = this.preferencesResource.value.asReadonly();
  readonly timeZone = computed(
    () =>
      this.preferences()?.timeZone ?? (Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'),
  );
  readonly weightUnit = computed<WeightUnit>(() => this.preferences()?.weightUnit ?? 'lb');
  /** Today's diary date in the user's time zone. */
  readonly today = computed(() => dateInZone(this.timeZone(), this.now()));
  readonly currentGoal = computed(() => this.goalFor(this.today()));
  readonly loading = computed(
    () =>
      this.goalsResource.isLoading() ||
      this.sectionsResource.isLoading() ||
      this.preferencesResource.isLoading(),
  );
  readonly error = computed(() => {
    const error =
      this.goalsResource.error() ?? this.sectionsResource.error() ?? this.preferencesResource.error();
    return error ? toErrorMessage(error) : null;
  });
  readonly saving = this.mutations.saving;

  /** The targets in effect on a date. */
  goalFor(date: string): Nutrition {
    return this.goals().filter((g) => g.from <= date).at(-1) ?? emptyNutrition();
  }

  /** New targets start today. Earlier days keep the targets they had. */
  saveGoals(targets: Nutrition): Promise<boolean> {
    const from = this.today();
    return this.mutations.run(
      this.source.saveGoals(targets, from),
      `Targets saved from ${from} onward. Earlier days keep their targets.`,
      (goals) => this.goalsResource.set(goals),
    );
  }

  /** New meal defaults start tomorrow, so today's diary doesn't change under you. */
  saveMealSections(sections: MealSection[]): Promise<boolean> {
    return this.mutations.run(
      this.source.saveMealSections(sections, offsetDate(this.today(), 1)),
      'Meal sections saved for tomorrow onward. Existing days keep theirs.',
      (saved) => this.sectionsResource.set(saved),
    );
  }

  savePreferences(change: Partial<Preferences>): Promise<boolean> {
    const preferences = { timeZone: this.timeZone(), weightUnit: this.weightUnit(), ...change };
    return this.mutations.run(
      this.source.savePreferences(preferences),
      'Preferences saved.',
      (saved) => this.preferencesResource.set(saved),
    );
  }

  reload(): void {
    this.goalsResource.reload();
    this.sectionsResource.reload();
    this.preferencesResource.reload();
  }
}
