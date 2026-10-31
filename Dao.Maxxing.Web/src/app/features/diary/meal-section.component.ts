import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NutritionLineComponent } from '../../components/nutrition-line/nutrition-line.component';
import { DiaryEntry } from './data-access/diary-day';
import { MealView } from './data-access/diary.store';

let nextId = 0;

/** One meal section of a diary day: its entries and its add, edit, and delete actions. */
@Component({
  selector: 'app-meal-section',
  imports: [DecimalPipe, NutritionLineComponent],
  template: `
    <section class="card" [attr.aria-labelledby]="headingId">
      <div class="card-header bg-transparent d-flex justify-content-between align-items-center">
        <h2 class="h5 mb-0" [id]="headingId">{{ meal().name }}</h2>
        <span class="small text-body-secondary">{{ meal().calories | number: '1.0-0' }} kcal</span>
      </div>
      @if (meal().entries.length) {
        <ul class="list-group list-group-flush">
          @for (entry of meal().entries; track entry.id) {
            <li class="list-group-item d-flex flex-wrap align-items-center column-gap-3 row-gap-1">
              <button
                type="button"
                class="btn btn-link link-body-emphasis text-decoration-none text-start p-0 flex-grow-1"
                (click)="edit.emit(entry)"
              >
                <span class="d-block fw-semibold">{{ entry.name }}</span>&ngsp;
                <span class="d-block small text-body-secondary">
                  {{ entry.quantity | number: '1.0-2' }} {{ unitLabel(entry) }} · {{ entry.serving }}
                </span>
                <span class="visually-hidden">, edit portion</span>
              </button>
              <app-nutrition-line [nutrition]="entry" format="1.0-0" />
              <button
                type="button"
                class="btn btn-outline-danger btn-sm"
                [attr.aria-label]="'Delete ' + entry.name + ' from ' + meal().name"
                (click)="remove.emit(entry)"
              >
                <i class="bi bi-trash3" aria-hidden="true"></i>
              </button>
            </li>
          }
        </ul>
      } @else {
        <p class="card-body text-body-secondary mb-0">
          Nothing logged yet. Add something whenever you're ready.
        </p>
      }
      <div class="card-footer bg-transparent">
        <button type="button" class="btn btn-link px-0" (click)="add.emit()">
          <i class="bi bi-plus-lg" aria-hidden="true"></i> Add food<span class="visually-hidden">
            to {{ meal().name }}</span
          >
        </button>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MealSectionComponent {
  readonly meal = input.required<MealView>();
  readonly add = output<void>();
  readonly edit = output<DiaryEntry>();
  readonly remove = output<DiaryEntry>();

  protected readonly headingId = `meal-section-${++nextId}`;

  protected unitLabel(entry: DiaryEntry): string {
    if (entry.unit === 'g') return 'g';
    return entry.quantity === 1 ? 'serving' : 'servings';
  }
}
