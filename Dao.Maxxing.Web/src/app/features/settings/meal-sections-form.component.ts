import { ChangeDetectionStrategy, Component, effect, inject, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  FieldControlDirective,
  FormFieldComponent,
} from '../../components/form-field/form-field.component';
import { FormUtils } from '../../utils/form-utils';
import { MealSection } from './data-access/settings';
import { SettingsStore } from './data-access/settings.store';

/** Rename, reorder, add, or hide the default meal sections for tomorrow onward. */
@Component({
  selector: 'app-meal-sections-form',
  imports: [ReactiveFormsModule, FormFieldComponent, FieldControlDirective],
  template: `
    <section class="card h-100" aria-labelledby="sections-heading">
      <form class="card-body" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <h2 id="sections-heading" class="h5">Your meal sections</h2>
        <p class="text-body-secondary">
          Changes apply from tomorrow. Existing diary days keep their sections.
        </p>
        <ol class="list-unstyled" formArrayName="sections">
          @for (group of form.controls.sections.controls; track group; let i = $index, last = $last) {
            <li class="d-flex flex-wrap align-items-end column-gap-2" [formGroupName]="i">
              <app-form-field class="flex-grow-1" [label]="'Section ' + (i + 1) + ' name'" [control]="group.controls.name">
                <input appFieldControl class="form-control" formControlName="name" maxlength="50" />
              </app-form-field>
              <div class="form-check mb-3 pb-2">
                <input class="form-check-input" type="checkbox" formControlName="visible" [id]="'section-visible-' + i" />
                <label class="form-check-label" [for]="'section-visible-' + i">
                  Visible<span class="visually-hidden"> section {{ i + 1 }}</span>
                </label>
              </div>
              <div class="btn-group mb-3" role="group" [attr.aria-label]="'Move section ' + (i + 1)">
                <button type="button" class="btn btn-outline-secondary" [disabled]="i === 0" [attr.aria-label]="'Move section ' + (i + 1) + ' up'" (click)="move(i, -1)">
                  <i class="bi bi-arrow-up" aria-hidden="true"></i>
                </button>
                <button type="button" class="btn btn-outline-secondary" [disabled]="last" [attr.aria-label]="'Move section ' + (i + 1) + ' down'" (click)="move(i, 1)">
                  <i class="bi bi-arrow-down" aria-hidden="true"></i>
                </button>
              </div>
            </li>
          }
        </ol>
        <div class="d-flex flex-wrap gap-2">
          <button type="button" class="btn btn-outline-secondary" (click)="addSection()">
            <i class="bi bi-plus-lg" aria-hidden="true"></i> Add section
          </button>
          <button type="submit" class="btn btn-primary" [disabled]="store.saving()">Save meal sections</button>
        </div>
      </form>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MealSectionsFormComponent {
  protected readonly store = inject(SettingsStore);
  private readonly fb = inject(FormBuilder).nonNullable;
  protected readonly form = this.fb.group({ sections: this.fb.array([this.sectionGroup()]) });

  constructor() {
    effect(() => {
      const sections = this.store.mealSections();
      untracked(() => {
        const array = this.form.controls.sections;
        array.clear();
        sections.forEach((s) => array.push(this.sectionGroup(s)));
      });
    });
  }

  protected addSection(): void {
    this.form.controls.sections.push(this.sectionGroup());
  }

  protected move(index: number, offset: number): void {
    const array = this.form.controls.sections;
    const control = array.at(index);
    array.removeAt(index);
    array.insert(index + offset, control);
  }

  protected submit(): void {
    if (this.form.invalid) {
      FormUtils.markAllAsTouched(this.form);
      return;
    }
    this.store.saveMealSections(this.form.getRawValue().sections);
  }

  private sectionGroup(section: MealSection = { name: '', visible: true }) {
    return this.fb.group({
      name: [section.name, Validators.required],
      visible: [section.visible],
    });
  }
}
