import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Marks a screen whose data comes from a placeholder data source instead of the API, and links
 * the issue that adds the real endpoint. Remove it from the page when that issue lands.
 */
@Component({
  selector: 'app-placeholder-notice',
  template: `
    <div class="alert alert-info d-flex align-items-start gap-2 small py-2" role="note">
      <i class="bi bi-info-circle-fill mt-1" aria-hidden="true"></i>
      <p class="mb-0">
        <strong>Sample data.</strong> {{ feature() }} isn't connected to the API yet, so changes
        last until you reload. Tracked in
        <a class="alert-link" [href]="issueUrl()">issue #{{ issue() }}</a>.
      </p>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlaceholderNoticeComponent {
  /** What isn't connected, as a sentence subject: "The diary". */
  readonly feature = input.required<string>();
  readonly issue = input.required<number>();

  protected readonly issueUrl = computed(
    () => `https://github.com/daolvera/Dao.Maxxing/issues/${this.issue()}`,
  );
}
