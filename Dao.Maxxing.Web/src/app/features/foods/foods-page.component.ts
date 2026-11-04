import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import {
  FieldControlDirective,
  FormFieldComponent,
} from '../../components/form-field/form-field.component';
import { NutritionLineComponent } from '../../components/nutrition-line/nutrition-line.component';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';
import { PlaceholderNoticeComponent } from '../../components/placeholder-notice/placeholder-notice.component';
import { ModalService } from '../../services/modal.service';
import { Collection, collectionNutrition, Food } from './data-access/food';
import { FoodsStore } from './data-access/foods.store';
import { FoodFormModalComponent } from './food-form-modal.component';

@Component({
  selector: 'app-foods-page',
  imports: [
    NgTemplateOutlet,
    ReactiveFormsModule,
    NgbNavModule,
    FormFieldComponent,
    FieldControlDirective,
    NutritionLineComponent,
    PageHeaderComponent,
    PlaceholderNoticeComponent,
  ],
  template: `
    <app-page-header heading="Foods & recipes" subtitle="Build a little library of the things you love.">
      <button type="button" class="btn btn-primary" (click)="openFoodForm()">
        <i class="bi bi-plus-lg" aria-hidden="true"></i> Create food
      </button>
    </app-page-header>
    <app-placeholder-notice feature="Your food library" [issue]="15" />

    @if (store.error(); as error) {
      <div class="alert alert-danger d-flex flex-wrap align-items-center gap-2" role="alert">
        <span class="me-auto">{{ error }}</span>
        <button type="button" class="btn btn-sm btn-outline-danger" (click)="store.reload()">Try again</button>
      </div>
    }

    <div class="card">
      <div class="card-body">
        <app-form-field label="Search your library" [control]="search">
          <input appFieldControl class="form-control" type="search" [formControl]="search" />
        </app-form-field>
        <ul ngbNav #nav="ngbNav" class="nav-tabs mb-3">
          <li ngbNavItem="foods">
            <button type="button" ngbNavLink>Foods&ngsp;<span class="badge text-bg-secondary">{{ foods().length }}</span></button>
            <ng-template ngbNavContent>
              <ul class="list-group">
                @for (food of foods(); track food.id) {
                  <li class="list-group-item d-flex flex-wrap align-items-center gap-2">
                    <div class="me-auto">
                      <h2 class="h6 mb-0">{{ food.name }}</h2>
                      <p class="small text-body-secondary mb-1">{{ food.serving }}</p>
                      <app-nutrition-line [nutrition]="food" />
                    </div>
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-secondary"
                      [attr.aria-pressed]="food.favorite"
                      [attr.aria-label]="'Favorite ' + food.name"
                      (click)="store.toggleFavorite(food)"
                    >
                      <i class="bi" [class]="food.favorite ? 'bi-star-fill' : 'bi-star'" aria-hidden="true"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-secondary" (click)="openFoodForm(food)">
                      Edit<span class="visually-hidden"> {{ food.name }}</span>
                    </button>
                  </li>
                } @empty {
                  <li class="list-group-item text-body-secondary">No foods found. Create a private food from its label.</li>
                }
              </ul>
            </ng-template>
          </li>
          <li ngbNavItem="meals">
            <button type="button" ngbNavLink>Saved meals&ngsp;<span class="badge text-bg-secondary">{{ meals().length }}</span></button>
            <ng-template ngbNavContent>
              <ng-container [ngTemplateOutlet]="collectionList" [ngTemplateOutletContext]="{ $implicit: meals() }" />
            </ng-template>
          </li>
          <li ngbNavItem="recipes">
            <button type="button" ngbNavLink>Recipes&ngsp;<span class="badge text-bg-secondary">{{ recipes().length }}</span></button>
            <ng-template ngbNavContent>
              <ng-container [ngTemplateOutlet]="collectionList" [ngTemplateOutletContext]="{ $implicit: recipes() }" />
            </ng-template>
          </li>
        </ul>
        <div [ngbNavOutlet]="nav"></div>
        <p class="small text-body-secondary mt-3 mb-0">
          Building meals and recipes arrives with persistent meals and recipes (issue #20).
        </p>
      </div>
    </div>

    <ng-template #collectionList let-collections>
      <ul class="list-group">
        @for (collection of collections; track collection.id) {
          <li class="list-group-item">
            <h2 class="h6 mb-0">{{ collection.name }}</h2>
            <p class="small text-body-secondary mb-1">{{ describe(collection) }}</p>
            <app-nutrition-line [nutrition]="nutrition(collection)" />
          </li>
        } @empty {
          <li class="list-group-item text-body-secondary">Nothing saved here yet.</li>
        }
      </ul>
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FoodsPageComponent {
  protected readonly store = inject(FoodsStore);
  private readonly modals = inject(ModalService);

  protected readonly search = new FormControl('', { nonNullable: true });
  private readonly query = toSignal(this.search.valueChanges, { initialValue: '' });
  protected readonly foods = computed(() => this.matching(this.store.foods()));
  protected readonly meals = computed(() => this.matching(this.store.meals()));
  protected readonly recipes = computed(() => this.matching(this.store.recipes()));

  protected openFoodForm(food?: Food): void {
    const ref = this.modals.open(FoodFormModalComponent, {
      title: food ? `Edit ${food.name}` : 'Create a private food',
      size: 'lg',
    });
    (ref.componentInstance as FoodFormModalComponent).food = food;
    ref.result.catch(() => undefined);
  }

  protected nutrition(collection: Collection) {
    return collectionNutrition(collection);
  }

  protected describe(collection: Collection): string {
    const ingredients = `${collection.ingredients.length} ingredients`;
    if (collection.kind === 'meal') return `${ingredients} · per whole meal`;
    const weight = collection.cookedGrams ? ` · ${collection.cookedGrams} g cooked` : '';
    return `${ingredients} · ${collection.servings} servings${weight} · per serving`;
  }

  private matching<T extends { name: string }>(items: T[]): T[] {
    const query = this.query().trim().toLowerCase();
    return items.filter((item) => item.name.toLowerCase().includes(query));
  }
}
