import { ChangeDetectionStrategy, Component } from '@angular/core';

/** A static preview of the diary. Everything here is sample data; nothing reaches the API. */
@Component({
  selector: 'app-landing-demo',
  template: `
    <div class="card shadow-sm">
      <div class="card-header d-flex align-items-center justify-content-between">
        <h3 class="h6 mb-0">Today's diary</h3>
        <span class="badge text-bg-secondary">Demo · sample data</span>
      </div>
      <div class="card-body d-flex flex-column gap-3">
        <div class="row g-3">
          @for (macro of macros; track macro.name) {
            <div class="col-6">
              <div class="small d-flex justify-content-between">
                <span>{{ macro.name }}</span>
                <span class="text-body-secondary">{{ macro.goal }}</span>
              </div>
              <div class="fw-semibold">{{ macro.value }}</div>
              <div
                class="progress mt-1"
                role="img"
                [attr.aria-label]="macro.name + ': ' + macro.percent + '% of goal'"
              >
                <div class="progress-bar" [style.width.%]="macro.percent"></div>
              </div>
            </div>
          }
        </div>
        <ul class="list-group">
          @for (entry of entries; track entry.name) {
            <li class="list-group-item d-flex justify-content-between align-items-center">
              <span>
                {{ entry.name }}
                <span class="d-block small text-body-secondary">{{ entry.meal }} · {{ entry.serving }}</span>
              </span>
              <span class="fw-semibold text-nowrap">{{ entry.calories }} kcal</span>
            </li>
          }
        </ul>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingDemoComponent {
  protected readonly macros = [
    { name: 'Calories', value: '1,240', goal: 'of 2,100', percent: 59 },
    { name: 'Protein', value: '92 g', goal: 'of 150 g', percent: 61 },
    { name: 'Carbs', value: '128 g', goal: 'of 220 g', percent: 58 },
    { name: 'Fat', value: '41 g', goal: 'of 70 g', percent: 59 },
  ];

  protected readonly entries = [
    { name: 'Greek yogurt with berries', meal: 'Breakfast', serving: '1 bowl', calories: 310 },
    { name: 'Chicken and rice', meal: 'Lunch', serving: '350 g', calories: 620 },
    { name: 'Protein bar', meal: 'Snack', serving: '1 bar', calories: 310 },
  ];
}
