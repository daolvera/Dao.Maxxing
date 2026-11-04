import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ConfirmModalComponent } from '../../components/confirm-modal/confirm-modal.component';
import {
  FieldControlDirective,
  FormFieldComponent,
} from '../../components/form-field/form-field.component';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';
import { PlaceholderNoticeComponent } from '../../components/placeholder-notice/placeholder-notice.component';
import { nutrientLabels, nutrients, nutrientUnits, WeightUnit } from '../../nutrition/nutrition';
import { ModalService } from '../../services/modal.service';
import { ProgressStore } from './data-access/progress.store';
import { Weight } from './data-access/weight';
import { WeightChoice, WeightFormModalComponent } from './weight-form-modal.component';

@Component({
  selector: 'app-progress-page',
  imports: [
    DatePipe,
    DecimalPipe,
    ReactiveFormsModule,
    FormFieldComponent,
    FieldControlDirective,
    PageHeaderComponent,
    PlaceholderNoticeComponent,
  ],
  template: `
    <app-page-header heading="Your progress" subtitle="Notice the patterns. Keep the bigger picture.">
      <button type="button" class="btn btn-primary" (click)="recordWeight()">
        <i class="bi bi-plus-lg" aria-hidden="true"></i> Record weight
      </button>
    </app-page-header>
    <app-placeholder-notice feature="Progress" [issue]="22" />

    @if (store.error(); as error) {
      <div class="alert alert-danger d-flex flex-wrap align-items-center gap-2" role="alert">
        <span class="me-auto">{{ error }}</span>
        <button type="button" class="btn btn-sm btn-outline-danger" (click)="store.reload()">Try again</button>
      </div>
    }

    <section class="card mb-4" aria-labelledby="weekly-heading">
      <div class="card-body">
        <div class="d-flex flex-wrap justify-content-between align-items-end column-gap-3">
          <h2 id="weekly-heading" class="h5 mb-3">Weekly nutrition</h2>
          <app-form-field label="Week ending" [control]="weekEnd">
            <input appFieldControl class="form-control" type="date" [formControl]="weekEnd" />
          </app-form-field>
        </div>
        <p class="text-body-secondary">
          Averages include {{ store.completedDays().length }} completed
          {{ store.completedDays().length === 1 ? 'day' : 'days' }} only. Partial days and missing logs
          are left out.
        </p>
        @if (store.average(); as average) {
          <dl class="row g-3 mb-4">
            @for (key of nutrients; track key) {
              <div class="col-6 col-md-3">
                <dt class="small text-body-secondary fw-normal">Average {{ labels[key].toLowerCase() }}</dt>
                <dd class="fs-4 fw-semibold mb-0">
                  {{ average[key] | number: '1.0-0' }} <span class="fs-6 fw-normal">{{ units[key] }}</span>
                </dd>
              </div>
            }
          </dl>
        } @else {
          <p class="alert alert-secondary">No completed days this week. Mark a diary day complete to see an average.</p>
        }
        <div class="table-responsive" tabindex="0" role="region" aria-label="Daily totals, scrolls sideways">
          <table class="table align-middle mb-0">
            <caption class="visually-hidden">Daily nutrition totals for the week</caption>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Status</th>
                @for (key of nutrients; track key) {
                  <th scope="col" class="text-end">{{ labels[key] }} ({{ units[key] }})</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (day of store.week(); track day.date) {
                <tr>
                  <th scope="row" class="fw-normal text-nowrap">{{ day.date | date: 'EEE, MMM d' : 'UTC' }}</th>
                  <td>
                    <span class="badge" [class]="day.complete ? 'text-bg-success' : day.logged ? 'text-bg-primary' : 'text-bg-secondary'">
                      {{ day.complete ? 'Complete' : day.logged ? 'Partial' : 'No data' }}
                    </span>
                  </td>
                  @for (key of nutrients; track key) {
                    <td class="text-end">{{ day.logged ? (day.total[key] | number: '1.0-0') : '—' }}</td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <div class="row g-4">
      <section class="col-lg-7" aria-labelledby="weight-heading">
        <div class="card h-100">
          <div class="card-body">
            <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
              <h2 id="weight-heading" class="h5 mb-0">Weight over time</h2>
              <div class="btn-group btn-group-sm" role="group" aria-label="Weight unit">
                @for (unit of weightUnits; track unit) {
                  <button
                    type="button"
                    class="btn btn-outline-primary"
                    [class.active]="store.weightUnit() === unit"
                    [attr.aria-pressed]="store.weightUnit() === unit"
                    (click)="store.setWeightUnit(unit)"
                  >
                    {{ unit }}
                  </button>
                }
              </div>
            </div>
            @if (change(); as change) {
              <p class="text-body-secondary">
                {{ change.amount | number: '1.0-1' }} {{ store.weightUnit() }} {{ change.direction }} since
                {{ change.since | date: 'MMM d' : 'UTC' }}.
              </p>
            }
            <ul class="list-group">
              @for (weight of newestFirst(); track weight.date) {
                <li class="list-group-item d-flex flex-wrap align-items-center gap-2">
                  <span class="me-auto">{{ weight.date | date: 'MMM d, yyyy' : 'UTC' }}</span>
                  <strong>{{ store.displayWeight(weight.kg) | number: '1.0-1' }} {{ store.weightUnit() }}</strong>
                  <button type="button" class="btn btn-sm btn-outline-secondary" (click)="editWeight(weight)">
                    Edit<span class="visually-hidden"> weight on {{ weight.date }}</span>
                  </button>
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-danger"
                    [attr.aria-label]="'Delete weight on ' + weight.date"
                    (click)="deleteWeight(weight)"
                  >
                    <i class="bi bi-trash3" aria-hidden="true"></i>
                  </button>
                </li>
              } @empty {
                <li class="list-group-item text-body-secondary">No weights recorded yet. Start whenever you're ready.</li>
              }
            </ul>
          </div>
        </div>
      </section>
      <section class="col-lg-5" aria-labelledby="photos-heading">
        <div class="card h-100">
          <div class="card-body">
            <h2 id="photos-heading" class="h5">A side-by-side perspective</h2>
            <p class="text-body-secondary">Compare two dated photos, privately and without analysis.</p>
            <div class="border rounded p-4 text-center text-body-secondary">
              <i class="bi bi-person-arms-up fs-1" aria-hidden="true"></i>
              <p class="mb-0">Private photo uploads arrive with issue #22.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgressPageComponent {
  protected readonly store = inject(ProgressStore);
  private readonly modals = inject(ModalService);
  protected readonly nutrients = nutrients;
  protected readonly labels = nutrientLabels;
  protected readonly units = nutrientUnits;
  protected readonly weightUnits: WeightUnit[] = ['lb', 'kg'];

  protected readonly weekEnd = new FormControl(this.store.weekEnd(), { nonNullable: true });
  protected readonly newestFirst = computed(() => [...this.store.weights()].reverse());
  protected readonly change = computed(() => {
    const weights = this.store.weights();
    if (weights.length < 2) return null;
    const first = weights[0];
    const difference =
      this.store.displayWeight(weights.at(-1)!.kg) - this.store.displayWeight(first.kg);
    return {
      amount: Math.abs(difference),
      direction: difference < 0 ? 'down' : 'up',
      since: first.date,
    };
  });

  constructor() {
    this.weekEnd.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((date) => this.store.selectWeekEnd(date));
    effect(() => {
      const date = this.store.weekEnd();
      if (this.weekEnd.value !== date) this.weekEnd.setValue(date, { emitEvent: false });
    });
  }

  protected recordWeight(): void {
    const latest = this.store.weights().at(-1);
    this.openWeightForm('Record a weight', {
      date: this.store.weekEnd(),
      amount: latest ? Number(this.store.displayWeight(latest.kg).toFixed(1)) : 0,
    });
  }

  protected editWeight(weight: Weight): void {
    this.openWeightForm(
      'Edit weight',
      { date: weight.date, amount: Number(this.store.displayWeight(weight.kg).toFixed(2)) },
      weight.date,
    );
  }

  protected deleteWeight(weight: Weight): void {
    const ref = this.modals.open(ConfirmModalComponent, { title: 'Delete this weight?' });
    Object.assign(ref.componentInstance as ConfirmModalComponent, {
      message: `This removes the weight recorded on ${weight.date}.`,
      confirmText: 'Delete weight',
      confirmButtonClass: 'btn-danger',
    });
    ref.result.then(
      () => this.store.deleteWeight(weight.date),
      () => undefined,
    );
  }

  private openWeightForm(title: string, initial: WeightChoice, replacing?: string): void {
    const ref = this.modals.open(WeightFormModalComponent, { title });
    Object.assign(ref.componentInstance as WeightFormModalComponent, {
      unit: this.store.weightUnit(),
      initial,
      save: ({ date, amount }: WeightChoice) => this.store.saveWeight(date, amount, replacing),
    });
    ref.result.catch(() => undefined);
  }
}
