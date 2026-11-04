import { DecimalPipe, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Input,
  OnInit,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbActiveModal, NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import {
  FieldControlDirective,
  FormFieldComponent,
} from '../../components/form-field/form-field.component';
import { NutritionLineComponent } from '../../components/nutrition-line/nutrition-line.component';
import { portion, PortionUnit } from '../../nutrition/nutrition';
import { FormUtils } from '../../utils/form-utils';
import { Food, recipeAsFood } from '../foods/data-access/food';
import { FoodsStore } from '../foods/data-access/foods.store';
import { DiaryEntry } from './data-access/diary-day';

export interface PortionChoice {
  food: Food;
  quantity: number;
  unit: PortionUnit;
  section: string;
}

type Source = 'favorites' | 'all' | 'recipes';

/**
 * Chooses a food and a portion to log, or edits the portion of an existing entry.
 *
 * Inputs stay `@Input()` because `ModalService` sets them through `componentInstance`. The modal
 * calls `save` itself and closes only when it resolves `true`, so a failed save keeps the input.
 */
@Component({
  selector: 'app-food-picker-modal',
  imports: [
    DecimalPipe,
    NgTemplateOutlet,
    ReactiveFormsModule,
    NgbNavModule,
    FormFieldComponent,
    FieldControlDirective,
    NutritionLineComponent,
  ],
  template: `
    <div class="modal-header">
      <h2 class="modal-title h5" [id]="titleId">{{ title }}</h2>
      <button type="button" class="btn-close" aria-label="Close" (click)="activeModal.dismiss()"></button>
    </div>
    <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <div class="modal-body">
        @if (!entry) {
          <app-form-field label="Search your foods" [control]="search">
            <input appFieldControl class="form-control" type="search" [formControl]="search" />
          </app-form-field>
          <ul ngbNav #nav="ngbNav" class="nav-tabs mb-3" [activeId]="source()" (activeIdChange)="source.set($event)">
            <li ngbNavItem="favorites">
              <button type="button" ngbNavLink>Favorites</button>
              <ng-template ngbNavContent>
                <ng-container [ngTemplateOutlet]="foodList" [ngTemplateOutletContext]="{ $implicit: favorites() }" />
              </ng-template>
            </li>
            <li ngbNavItem="all">
              <button type="button" ngbNavLink>All foods</button>
              <ng-template ngbNavContent>
                <ng-container [ngTemplateOutlet]="foodList" [ngTemplateOutletContext]="{ $implicit: allFoods() }" />
              </ng-template>
            </li>
            <li ngbNavItem="recipes">
              <button type="button" ngbNavLink>Recipes</button>
              <ng-template ngbNavContent>
                <ng-container [ngTemplateOutlet]="foodList" [ngTemplateOutletContext]="{ $implicit: recipes() }" />
              </ng-template>
            </li>
          </ul>
          <div [ngbNavOutlet]="nav"></div>
        }

        @if (selected(); as food) {
          <section class="border-top pt-3 mt-3" aria-labelledby="portion-heading">
            <h3 id="portion-heading" class="h6 mb-1">{{ food.name }}</h3>
            <p class="small text-body-secondary">
              {{ food.serving }}{{ food.grams ? ' · ' + food.grams + ' g per serving' : ' · No gram conversion' }}
            </p>
            <div class="row g-2">
              <app-form-field class="col-sm-4" label="Quantity" [control]="form.controls.quantity">
                <input appFieldControl class="form-control" type="number" min="0" step="any" formControlName="quantity" />
              </app-form-field>
              <app-form-field class="col-sm-4" label="Unit" [control]="form.controls.unit">
                <select appFieldControl class="form-select" formControlName="unit">
                  <option value="serving">Servings</option>
                  <option value="g" [disabled]="!food.grams">Grams</option>
                </select>
              </app-form-field>
              <app-form-field class="col-sm-4" label="Meal" [control]="form.controls.section">
                <select appFieldControl class="form-select" formControlName="section">
                  @for (section of sections; track section) {
                    <option [value]="section">{{ section }}</option>
                  }
                </select>
              </app-form-field>
            </div>
            @if (preview(); as nutrition) {
              <p class="mb-0" aria-live="polite">
                <span class="visually-hidden">This portion: </span>
                <app-nutrition-line [nutrition]="nutrition" />
              </p>
            }
          </section>
        }
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-outline-secondary" (click)="activeModal.dismiss()">Cancel</button>
        <button type="submit" class="btn btn-primary" [disabled]="!selected() || saving()">
          {{ entry ? 'Save entry' : 'Add food' }}
        </button>
      </div>
    </form>

    <ng-template #foodList let-foods>
      <div class="list-group">
        @for (food of foods; track food.id) {
          <button
            type="button"
            class="list-group-item list-group-item-action d-flex justify-content-between gap-2"
            [class.active]="selected()?.id === food.id"
            [attr.aria-pressed]="selected()?.id === food.id"
            (click)="choose(food)"
          >
            <span>{{ food.name }}&ngsp;<span class="d-block small">{{ food.serving }}</span></span>&ngsp;
            <span class="small text-nowrap">{{ food.calories | number: '1.0-0' }} kcal</span>
          </button>
        } @empty {
          <p class="text-body-secondary mb-0">No matches. Try another tab, or add the food in Foods &amp; recipes.</p>
        }
      </div>
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FoodPickerModalComponent implements OnInit {
  protected readonly activeModal = inject(NgbActiveModal);
  private readonly foods = inject(FoodsStore);

  @Input() title = 'Add to your diary';
  /** Set by `ModalService` so the dialog is named by its title. */
  @Input() titleId = 'app-food-picker-title';
  @Input() sections: string[] = [];
  @Input() section = '';
  /** The entry to edit. Without one, the modal adds a new entry. */
  @Input() entry?: DiaryEntry;
  @Input() save: (choice: PortionChoice) => Promise<boolean> = async () => true;

  protected readonly search = new FormControl('', { nonNullable: true });
  private readonly query = toSignal(this.search.valueChanges, { initialValue: '' });
  protected readonly source = signal<Source>('favorites');
  protected readonly selected = signal<Food | null>(null);
  protected readonly saving = signal(false);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    quantity: [1, [Validators.required, Validators.min(0.001)]],
    unit: ['serving' as PortionUnit],
    section: ['', Validators.required],
  });
  private readonly formValue = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  protected readonly favorites = computed(() => this.matching(this.foods.favorites()));
  protected readonly allFoods = computed(() => this.matching(this.foods.foods()));
  protected readonly recipes = computed(() =>
    this.matching(this.foods.recipes().map(recipeAsFood)),
  );
  protected readonly preview = computed(() => {
    const food = this.selected();
    const { quantity, unit } = this.formValue();
    return food && quantity && quantity > 0 ? portion(food, quantity, unit ?? 'serving') : null;
  });

  ngOnInit(): void {
    const entry = this.entry;
    if (entry) {
      this.selected.set({
        ...entry.base,
        id: entry.foodId,
        name: entry.name,
        serving: entry.serving,
        grams: entry.grams,
        favorite: false,
      });
      this.form.setValue({ quantity: entry.quantity, unit: entry.unit, section: entry.section });
    } else {
      this.form.controls.section.setValue(this.section || this.sections[0] || '');
    }
  }

  protected choose(food: Food): void {
    this.selected.set(food);
    this.form.patchValue({ quantity: 1, unit: 'serving' });
  }

  protected async submit(): Promise<void> {
    const food = this.selected();
    if (!food) return;
    if (this.form.invalid) {
      FormUtils.markAllAsTouched(this.form);
      return;
    }
    this.saving.set(true);
    const saved = await this.save({ food, ...this.form.getRawValue() });
    this.saving.set(false);
    if (saved) this.activeModal.close(true);
  }

  private matching(foods: Food[]): Food[] {
    const query = this.query().trim().toLowerCase();
    return foods.filter((f) => `${f.name} ${f.serving}`.toLowerCase().includes(query));
  }
}
