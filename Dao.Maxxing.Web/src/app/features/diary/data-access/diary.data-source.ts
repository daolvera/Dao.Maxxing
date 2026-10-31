import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { DiaryDay, DiaryEntryChange, NewDiaryEntry } from './diary-day';
import { LocalDiaryDataSource } from './local-diary.data-source';

/**
 * The diary backend. There is no `/api/diary` endpoint yet (F6 #16), so the default is the
 * in-memory placeholder. Swap `useClass` for an `Api`-backed implementation when it exists.
 */
@Injectable({ providedIn: 'root', useClass: LocalDiaryDataSource })
export abstract class DiaryDataSource {
  abstract getDay(date: string): Observable<DiaryDay>;
  /** Every day from `from` to `to`, inclusive, including days with nothing logged. */
  abstract getDays(from: string, to: string): Observable<DiaryDay[]>;
  abstract addEntry(date: string, entry: NewDiaryEntry): Observable<DiaryDay>;
  abstract updateEntry(date: string, id: string, change: DiaryEntryChange): Observable<DiaryDay>;
  abstract deleteEntry(date: string, id: string): Observable<DiaryDay>;
  abstract setComplete(date: string, complete: boolean): Observable<DiaryDay>;
}
