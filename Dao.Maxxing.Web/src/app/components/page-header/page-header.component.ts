import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * A page's `h1`, an optional subtitle, and its primary actions (projected).
 *
 * @example
 * ```html
 * <app-page-header heading="Your daily diary" subtitle="A little less tracking.">
 *   <button type="button" class="btn btn-primary">Add food</button>
 * </app-page-header>
 * ```
 */
@Component({
  selector: 'app-page-header',
  template: `
    <div>
      <h1 class="h2 mb-1">{{ heading() }}</h1>
      @if (subtitle()) {
        <p class="text-body-secondary mb-0">{{ subtitle() }}</p>
      }
    </div>
    <div class="d-flex flex-wrap gap-2"><ng-content /></div>
  `,
  host: {
    class: 'd-flex flex-wrap align-items-end justify-content-between gap-3 mb-4',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeaderComponent {
  readonly heading = input.required<string>();
  readonly subtitle = input<string>();
}
