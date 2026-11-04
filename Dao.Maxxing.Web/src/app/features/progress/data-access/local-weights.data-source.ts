import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { isValidDate } from '../../../nutrition/nutrition';
import { placeholderCall, PlaceholderDb } from '../../../placeholder/placeholder-db';
import { Weight } from './weight';
import type { WeightsDataSource } from './weights.data-source';

/** PLACEHOLDER weight history over `PlaceholderDb`, until P2 (#22) adds the endpoints. */
@Injectable({ providedIn: 'root' })
export class LocalWeightsDataSource implements WeightsDataSource {
  private readonly db = inject(PlaceholderDb);

  getWeights(): Observable<Weight[]> {
    return placeholderCall(() => structuredClone(this.db.weights));
  }

  saveWeight(weight: Weight, replacing?: string): Observable<Weight[]> {
    return placeholderCall(() => {
      if (!isValidDate(weight.date)) throw new Error('Choose a valid date.');
      if (!Number.isFinite(weight.kg) || weight.kg <= 0) {
        throw new Error('Weight must be greater than zero.');
      }
      if (weight.date !== replacing && this.db.weights.some((w) => w.date === weight.date)) {
        throw new Error('A weight already exists for that date. Edit it in the history instead.');
      }
      this.db.weights = [
        ...this.db.weights.filter((w) => w.date !== (replacing ?? weight.date)),
        { ...weight },
      ].sort((a, b) => a.date.localeCompare(b.date));
      return structuredClone(this.db.weights);
    });
  }

  deleteWeight(date: string): Observable<Weight[]> {
    return placeholderCall(() => {
      this.db.weights = this.db.weights.filter((w) => w.date !== date);
      return structuredClone(this.db.weights);
    });
  }
}
