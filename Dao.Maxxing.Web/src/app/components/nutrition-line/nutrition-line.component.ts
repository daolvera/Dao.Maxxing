import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Nutrition } from '../../nutrition/nutrition';

/** One line of nutrition: calories, then protein, carbs, and fat in grams. */
@Component({
  selector: 'app-nutrition-line',
  imports: [DecimalPipe],
  template: `
    <!-- &ngsp; keeps a space between items, so screen readers don't run them together. -->
    <span class="fw-semibold text-body">{{ nutrition().calories | number: '1.0-0' }} kcal</span>&ngsp;
    <span><abbr title="Protein">P</abbr> {{ nutrition().protein | number: format() }} g</span>&ngsp;
    <span><abbr title="Carbs">C</abbr> {{ nutrition().carbs | number: format() }} g</span>&ngsp;
    <span><abbr title="Fat">F</abbr> {{ nutrition().fat | number: format() }} g</span>
  `,
  host: { class: 'd-inline-flex flex-wrap column-gap-2 small text-body-secondary' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NutritionLineComponent {
  readonly nutrition = input.required<Nutrition>();
  /** `DecimalPipe` digits format for the macros. */
  readonly format = input('1.0-1');
}
