import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { isValidDate, offsetDate, portion } from '../../../nutrition/nutrition';
import { placeholderCall, PlaceholderDb } from '../../../placeholder/placeholder-db';
import type { DiaryDataSource } from './diary.data-source';
import { DiaryDay, DiaryEntryChange, NewDiaryEntry } from './diary-day';

/** PLACEHOLDER diary over `PlaceholderDb`, until F6 (#16) adds `/api/diary`. */
@Injectable({ providedIn: 'root' })
export class LocalDiaryDataSource implements DiaryDataSource {
  private readonly db = inject(PlaceholderDb);

  getDay(date: string): Observable<DiaryDay> {
    return placeholderCall(() => this.day(date));
  }

  getDays(from: string, to: string): Observable<DiaryDay[]> {
    return placeholderCall(() => {
      const days: DiaryDay[] = [];
      for (let date = from; date <= to; date = offsetDate(date, 1)) days.push(this.day(date));
      return days;
    });
  }

  addEntry(date: string, entry: NewDiaryEntry): Observable<DiaryDay> {
    return placeholderCall(() => {
      const day = this.day(date);
      this.requireSection(day.sections, entry.section);
      return this.db.writeDay({
        ...day,
        entries: [...day.entries, this.db.makeEntry(entry)],
        complete: false,
      });
    });
  }

  updateEntry(date: string, id: string, change: DiaryEntryChange): Observable<DiaryDay> {
    return placeholderCall(() => {
      const day = this.day(date);
      const entry = day.entries.find((e) => e.id === id);
      if (!entry) throw new Error('This entry no longer exists.');
      this.requireSection(day.sections, change.section);
      if (!Number.isFinite(change.quantity) || change.quantity <= 0) {
        throw new Error('Enter a quantity greater than zero.');
      }
      if (change.unit === 'g' && !entry.grams) {
        throw new Error('Grams are unavailable for this food. Log it in servings instead.');
      }
      const updated = {
        ...entry,
        ...change,
        ...portion({ ...entry.base, grams: entry.grams }, change.quantity, change.unit),
      };
      return this.db.writeDay({
        ...day,
        entries: day.entries.map((e) => (e.id === id ? updated : e)),
        complete: false,
      });
    });
  }

  deleteEntry(date: string, id: string): Observable<DiaryDay> {
    return placeholderCall(() => {
      const day = this.day(date);
      return this.db.writeDay({
        ...day,
        entries: day.entries.filter((e) => e.id !== id),
        complete: false,
      });
    });
  }

  setComplete(date: string, complete: boolean): Observable<DiaryDay> {
    return placeholderCall(() => this.db.writeDay({ ...this.day(date), complete }));
  }

  private day(date: string): DiaryDay {
    if (!isValidDate(date)) throw new Error('Choose a valid diary date.');
    return this.db.day(date);
  }

  private requireSection(sections: string[], section: string): void {
    if (!sections.includes(section)) throw new Error('Choose a meal section.');
  }
}
