import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { LocalWeightsDataSource } from './local-weights.data-source';
import { Weight } from './weight';

/**
 * Weight history. There is no endpoint yet (P2 #22), so the default is the in-memory placeholder.
 * Swap `useClass` for an `Api`-backed implementation when it exists.
 */
@Injectable({ providedIn: 'root', useClass: LocalWeightsDataSource })
export abstract class WeightsDataSource {
  /** Oldest first. */
  abstract getWeights(): Observable<Weight[]>;
  /** Creates or replaces the weight on `weight.date`. `replacing` is the date being edited. */
  abstract saveWeight(weight: Weight, replacing?: string): Observable<Weight[]>;
  abstract deleteWeight(date: string): Observable<Weight[]>;
}
