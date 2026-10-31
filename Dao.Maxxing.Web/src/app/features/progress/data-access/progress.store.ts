import { computed, inject, Injectable, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { createMutationRunner, toErrorMessage } from '../../../data-access/mutation-runner';
import {
  fromKilograms,
  isValidDate,
  offsetDate,
  scale,
  sum,
  toKilograms,
  WeightUnit,
} from '../../../nutrition/nutrition';
import { DiaryDataSource } from '../../diary/data-access/diary.data-source';
import { SettingsStore } from '../../settings/data-access/settings.store';
import { WeightsDataSource } from './weights.data-source';

/** State for the progress page: one week of diary totals and the weight history. Provided by the route. */
@Injectable()
export class ProgressStore {
  private readonly diary = inject(DiaryDataSource);
  private readonly weightsSource = inject(WeightsDataSource);
  private readonly settings = inject(SettingsStore);
  private readonly mutations = createMutationRunner();

  readonly weekEnd = signal(this.settings.today());
  private readonly weekResource = rxResource({
    params: () => this.weekEnd(),
    stream: ({ params }) => this.diary.getDays(offsetDate(params, -6), params),
  });
  private readonly weightsResource = rxResource({ stream: () => this.weightsSource.getWeights() });

  readonly week = computed(() =>
    (this.weekResource.value() ?? []).map((day) => ({
      date: day.date,
      complete: day.complete,
      logged: day.entries.length > 0,
      total: sum(day.entries),
    })),
  );
  readonly completedDays = computed(() => this.week().filter((d) => d.complete));
  /** Average of completed days only. Partial and missing days would skew it. */
  readonly average = computed(() => {
    const days = this.completedDays();
    return days.length ? scale(sum(days.map((d) => d.total)), 1 / days.length) : null;
  });
  readonly weights = computed(() => this.weightsResource.value() ?? []);
  readonly weightUnit = this.settings.weightUnit;
  readonly loading = computed(
    () => this.weekResource.isLoading() || this.weightsResource.isLoading(),
  );
  readonly error = computed(() => {
    const error = this.weekResource.error() ?? this.weightsResource.error();
    return error ? toErrorMessage(error) : null;
  });
  readonly saving = this.mutations.saving;

  selectWeekEnd(date: string): void {
    if (isValidDate(date)) this.weekEnd.set(date);
  }

  displayWeight(kg: number): number {
    return fromKilograms(kg, this.weightUnit());
  }

  /** Saves `amount` in the current display unit. `replacing` is the date of the entry being edited. */
  saveWeight(date: string, amount: number, replacing?: string): Promise<boolean> {
    return this.mutations.run(
      this.weightsSource.saveWeight({ date, kg: toKilograms(amount, this.weightUnit()) }, replacing),
      'Weight saved.',
      (weights) => this.weightsResource.set(weights),
    );
  }

  deleteWeight(date: string): Promise<boolean> {
    return this.mutations.run(this.weightsSource.deleteWeight(date), 'Weight deleted.', (weights) =>
      this.weightsResource.set(weights),
    );
  }

  setWeightUnit(weightUnit: WeightUnit): Promise<boolean> {
    return this.settings.savePreferences({ weightUnit });
  }

  reload(): void {
    this.weekResource.reload();
    this.weightsResource.reload();
  }
}
