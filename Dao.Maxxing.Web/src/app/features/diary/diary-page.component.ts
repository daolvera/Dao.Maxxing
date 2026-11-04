import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  FieldControlDirective,
  FormFieldComponent,
} from '../../components/form-field/form-field.component';
import { ConfirmModalComponent } from '../../components/confirm-modal/confirm-modal.component';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';
import { PlaceholderNoticeComponent } from '../../components/placeholder-notice/placeholder-notice.component';
import { offsetDate } from '../../nutrition/nutrition';
import { ModalService } from '../../services/modal.service';
import { DiaryEntry } from './data-access/diary-day';
import { DiaryStore } from './data-access/diary.store';
import { FoodPickerModalComponent, PortionChoice } from './food-picker-modal.component';
import { MacroSummaryComponent } from './macro-summary.component';
import { MealSectionComponent } from './meal-section.component';

const statusLabels = { complete: 'Complete', 'in-progress': 'In progress', empty: 'Not logged' };

@Component({
  selector: 'app-diary-page',
  imports: [
    ReactiveFormsModule,
    FormFieldComponent,
    FieldControlDirective,
    PageHeaderComponent,
    PlaceholderNoticeComponent,
    MacroSummaryComponent,
    MealSectionComponent,
  ],
  template: `
    <app-page-header heading="Your daily diary" subtitle="A little less tracking. A little more living.">
      <button type="button" class="btn btn-primary" [disabled]="!store.sections().length" (click)="add()">
        <i class="bi bi-plus-lg" aria-hidden="true"></i> Add food
      </button>
    </app-page-header>
    <app-placeholder-notice feature="The diary" [issue]="16" />

    <div class="d-flex flex-wrap align-items-end column-gap-2 mb-2">
      <button type="button" class="btn btn-outline-secondary mb-3" aria-label="Previous day" (click)="step(-1)">
        <i class="bi bi-chevron-left" aria-hidden="true"></i>
      </button>
      <app-form-field label="Diary date" [control]="dateControl">
        <input appFieldControl class="form-control" type="date" [formControl]="dateControl" />
      </app-form-field>
      <button type="button" class="btn btn-outline-secondary mb-3" aria-label="Next day" (click)="step(1)">
        <i class="bi bi-chevron-right" aria-hidden="true"></i>
      </button>
      <button type="button" class="btn btn-outline-secondary mb-3" [disabled]="store.isToday()" (click)="goToToday()">
        Today
      </button>
      <span class="badge rounded-pill mb-3 ms-auto fs-6" [class]="statusClass()">{{ statusLabel() }}</span>
    </div>

    @if (store.error(); as error) {
      <div class="alert alert-danger d-flex flex-wrap align-items-center gap-2" role="alert">
        <span class="me-auto">{{ error }}</span>
        <button type="button" class="btn btn-sm btn-outline-danger" (click)="store.reload()">Try again</button>
      </div>
    }

    <div class="row g-4">
      <div class="col-xl-8 d-flex flex-column gap-4">
        <app-macro-summary
          [total]="store.total()"
          [target]="store.target()"
          [heading]="store.isToday() ? 'Today\\'s nutrition' : 'Daily nutrition'"
        />
        @if (store.loading() && !store.day()) {
          <div class="d-flex align-items-center gap-2" role="status">
            <span class="spinner-border spinner-border-sm text-primary" aria-hidden="true"></span>
            Loading your diary...
          </div>
        }
        @for (meal of store.meals(); track meal.name) {
          <app-meal-section [meal]="meal" (add)="add(meal.name)" (edit)="edit($event)" (remove)="remove($event)" />
        }
        @if (store.day(); as day) {
          <section class="card" aria-labelledby="completion-heading">
            <div class="card-body d-flex flex-wrap align-items-center gap-3">
              <div class="me-auto">
                <h2 id="completion-heading" class="h5">
                  {{ day.complete ? 'This day is complete' : 'Finished logging for this day?' }}
                </h2>
                <p class="text-body-secondary mb-0">
                  Completed days count toward weekly averages. Editing food marks the day incomplete.
                </p>
              </div>
              <button
                type="button"
                class="btn btn-outline-primary"
                [attr.aria-pressed]="day.complete"
                [disabled]="store.saving()"
                (click)="store.toggleComplete()"
              >
                <i class="bi bi-check2-circle" aria-hidden="true"></i>
                {{ day.complete ? 'Mark incomplete' : 'Mark day complete' }}
              </button>
            </div>
          </section>
        }
      </div>
      <aside class="col-xl-4" aria-label="About your diary">
        <div class="card bg-success-subtle border-0">
          <div class="card-body">
            <i class="bi bi-leaf fs-3 text-success-emphasis" aria-hidden="true"></i>
            <h2 class="h5 mt-2">A snapshot, not a score.</h2>
            <p class="mb-0">Your diary is here to help you notice patterns. Every day can look different.</p>
          </div>
        </div>
      </aside>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiaryPageComponent {
  protected readonly store = inject(DiaryStore);
  private readonly modals = inject(ModalService);

  protected readonly dateControl = new FormControl(this.store.date(), { nonNullable: true });
  protected readonly statusLabel = computed(() => statusLabels[this.store.status()]);
  protected readonly statusClass = computed(() => {
    const status = this.store.status();
    if (status === 'complete') return 'text-bg-success';
    return status === 'in-progress' ? 'text-bg-primary' : 'text-bg-secondary';
  });

  constructor() {
    this.dateControl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((date) => this.store.selectDate(date));
    // Keep the field in step when the store's date changes some other way.
    effect(() => {
      const date = this.store.date();
      if (this.dateControl.value !== date) this.dateControl.setValue(date, { emitEvent: false });
    });
  }

  protected step(days: number): void {
    this.dateControl.setValue(offsetDate(this.store.date(), days));
  }

  protected goToToday(): void {
    this.dateControl.setValue(this.store.today());
  }

  protected add(section = this.store.sections()[0]): void {
    this.openPicker({
      title: `Add to ${section}`,
      section,
      save: (choice: PortionChoice) => this.store.addEntry(choice),
    });
  }

  protected edit(entry: DiaryEntry): void {
    this.openPicker({
      title: `Edit ${entry.name}`,
      entry,
      save: ({ quantity, unit, section }: PortionChoice) =>
        this.store.updateEntry(entry.id, { quantity, unit, section }),
    });
  }

  protected remove(entry: DiaryEntry): void {
    const ref = this.modals.open(ConfirmModalComponent, { title: `Delete ${entry.name}?` });
    Object.assign(ref.componentInstance as ConfirmModalComponent, {
      message: `This removes ${entry.name} from ${entry.section} on ${this.store.date()}.`,
      confirmText: 'Delete entry',
      confirmButtonClass: 'btn-danger',
    });
    ref.result.then(
      () => this.store.deleteEntry(entry),
      () => undefined,
    );
  }

  private openPicker(options: Partial<FoodPickerModalComponent>): void {
    const ref = this.modals.open(FoodPickerModalComponent, { size: 'lg' });
    Object.assign(ref.componentInstance as FoodPickerModalComponent, {
      sections: this.store.sections(),
      ...options,
    });
    ref.result.catch(() => undefined);
  }
}
