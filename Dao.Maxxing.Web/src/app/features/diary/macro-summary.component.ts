import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { nutrientLabels, nutrients, nutrientUnits, Nutrition } from '../../nutrition/nutrition';

/** Consumed against target for each nutrient, as numbers and a progress bar. */
@Component({
  selector: 'app-macro-summary',
  imports: [DecimalPipe],
  template: `
    <section class="card" aria-labelledby="macro-summary-heading">
      <div class="card-body">
        <div class="d-flex flex-wrap justify-content-between align-items-baseline gap-2 mb-3">
          <h2 id="macro-summary-heading" class="h5 mb-0">{{ heading() }}</h2>
          <span class="small text-body-secondary">Consumed / target</span>
        </div>
        <div class="row g-3">
          @for (row of rows(); track row.key) {
            <div class="col-6 col-md-3">
              <h3 class="h6 mb-1">{{ row.label }}</h3>
              <p class="fs-5 fw-semibold mb-1">
                {{ row.consumed | number: '1.0-0' }}
                <span class="fs-6 fw-normal text-body-secondary">
                  / {{ row.target | number: '1.0-0' }} {{ row.unit }}
                </span>
              </p>
              <div
                class="progress mb-1"
                role="progressbar"
                [attr.aria-label]="row.label + ' consumed'"
                aria-valuemin="0"
                [attr.aria-valuemax]="row.target"
                [attr.aria-valuenow]="row.consumed"
                [attr.aria-valuetext]="
                  (row.consumed | number: '1.0-0') + ' of ' + (row.target | number: '1.0-0') + ' ' + row.unit
                "
              >
                <div class="progress-bar" [style.width.%]="row.percent"></div>
              </div>
              <p class="small text-body-secondary mb-0">
                {{ row.remaining | number: '1.0-0' }} {{ row.unit }}
                {{ row.over ? 'over target' : 'remaining' }}
              </p>
            </div>
          }
        </div>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MacroSummaryComponent {
  readonly total = input.required<Nutrition>();
  readonly target = input.required<Nutrition>();
  readonly heading = input('Daily nutrition');

  protected readonly rows = computed(() =>
    nutrients.map((key) => {
      const consumed = this.total()[key];
      const target = this.target()[key];
      return {
        key,
        label: nutrientLabels[key],
        unit: nutrientUnits[key],
        consumed,
        target,
        percent: target ? Math.min(100, (consumed / target) * 100) : 0,
        remaining: Math.abs(target - consumed),
        over: consumed > target,
      };
    }),
  );
}
