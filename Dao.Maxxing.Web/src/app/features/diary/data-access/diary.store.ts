import { computed, inject, Injectable, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { createMutationRunner, toErrorMessage } from '../../../data-access/mutation-runner';
import { isValidDate, offsetDate, sum } from '../../../nutrition/nutrition';
import { SettingsStore } from '../../settings/data-access/settings.store';
import { DiaryDay, DiaryEntry, DiaryEntryChange, NewDiaryEntry } from './diary-day';
import { DiaryDataSource } from './diary.data-source';

export type DayStatus = 'complete' | 'in-progress' | 'empty';

export interface MealView {
  name: string;
  entries: DiaryEntry[];
  calories: number;
}

/** State for the diary page: the selected date and that day's entries. Provided by the route. */
@Injectable()
export class DiaryStore {
  private readonly source = inject(DiaryDataSource);
  private readonly settings = inject(SettingsStore);
  private readonly mutations = createMutationRunner();

  readonly date = signal(this.settings.today());
  private readonly dayResource = rxResource({
    params: () => this.date(),
    stream: ({ params }) => this.source.getDay(params),
  });

  readonly day = this.dayResource.value.asReadonly();
  readonly loading = this.dayResource.isLoading;
  readonly error = computed(() => {
    const error = this.dayResource.error();
    return error ? toErrorMessage(error) : null;
  });
  readonly saving = this.mutations.saving;
  readonly today = this.settings.today;
  readonly isToday = computed(() => this.date() === this.today());
  readonly sections = computed(() => this.day()?.sections ?? []);
  readonly meals = computed<MealView[]>(() => {
    const entries = this.day()?.entries ?? [];
    return this.sections().map((name) => {
      const inSection = entries.filter((e) => e.section === name);
      return { name, entries: inSection, calories: sum(inSection).calories };
    });
  });
  readonly total = computed(() => sum(this.day()?.entries ?? []));
  readonly target = computed(() => this.settings.goalFor(this.date()));
  readonly status = computed<DayStatus>(() => {
    const day = this.day();
    if (day?.complete) return 'complete';
    return day?.entries.length ? 'in-progress' : 'empty';
  });

  selectDate(date: string): void {
    if (isValidDate(date)) this.date.set(date);
  }

  step(days: number): void {
    this.date.update((date) => offsetDate(date, days));
  }

  addEntry(entry: NewDiaryEntry): Promise<boolean> {
    return this.write(
      this.source.addEntry(this.date(), entry),
      `${entry.food.name} added to ${entry.section}.`,
    );
  }

  updateEntry(id: string, change: DiaryEntryChange): Promise<boolean> {
    return this.write(this.source.updateEntry(this.date(), id, change), 'Diary entry updated.');
  }

  deleteEntry(entry: DiaryEntry): Promise<boolean> {
    return this.write(
      this.source.deleteEntry(this.date(), entry.id),
      `${entry.name} removed from the diary.`,
    );
  }

  toggleComplete(): Promise<boolean> {
    const complete = !this.day()?.complete;
    return this.write(
      this.source.setComplete(this.date(), complete),
      complete ? 'Day marked complete.' : 'Day marked incomplete. You can keep logging.',
    );
  }

  reload(): void {
    this.dayResource.reload();
  }

  private write(request: ReturnType<DiaryDataSource['getDay']>, success: string) {
    return this.mutations.run(request, success, (day: DiaryDay) => this.dayResource.set(day));
  }
}
