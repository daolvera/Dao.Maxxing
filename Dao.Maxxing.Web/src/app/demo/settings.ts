import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { DemoStore, nutrients } from './demo-store';

@Component({
  selector: 'mx-settings',
  imports: [ReactiveFormsModule, DecimalPipe],
  templateUrl: './settings.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Settings {
  readonly store = inject(DemoStore);
  readonly resetDemo = output<void>();
  private readonly fb = inject(FormBuilder).nonNullable;
  readonly nutrients = nutrients;
  readonly goals = this.fb.group({
    calories: [this.store.goalFor(this.store.today()).calories, [Validators.required, Validators.min(0.01)]],
    protein: [this.store.goalFor(this.store.today()).protein, [Validators.required, Validators.min(0.01)]],
    carbs: [this.store.goalFor(this.store.today()).carbs, [Validators.required, Validators.min(0.01)]],
    fat: [this.store.goalFor(this.store.today()).fat, [Validators.required, Validators.min(0.01)]],
  });
  readonly goalValues = toSignal(this.goals.valueChanges, { initialValue: this.goals.getRawValue() });
  readonly macroCalories = computed(() => {
    const v = this.goalValues();
    return (v.protein ?? 0) * 4 + (v.carbs ?? 0) * 4 + (v.fat ?? 0) * 9;
  });
  readonly mismatch = computed(() => Math.abs(this.macroCalories() - (this.goalValues().calories ?? 0)) > 1);
  readonly zone = this.fb.control(this.store.zone(), Validators.required);
  readonly sectionForm = this.fb.group({
    sections: this.fb.array(this.store.sections().map(s => this.fb.group({ name: [s.name, Validators.required], visible: s.visible }))),
  });
  readonly confirmDelete = signal(false);
  readonly deleteText = this.fb.control('');
  readonly exported = signal('');
  attempted = false;
  saveGoals(): void {
    this.attempted = true;
    if (this.goals.invalid) return;
    this.store.run(() => this.store.saveGoals(this.goals.getRawValue()), `Goals saved from ${this.store.today()} onward. Earlier targets are unchanged.`);
  }
  addSection(): void { this.sectionForm.controls.sections.push(this.fb.group({ name: ['', Validators.required], visible: this.fb.control<boolean>(true) })); }
  move(index: number, direction: number): void {
    const array = this.sectionForm.controls.sections;
    const next = index + direction;
    if (next < 0 || next >= array.length) return;
    const control = array.at(index);
    array.removeAt(index); array.insert(next, control);
  }
  saveSections(): void {
    this.store.run(() => this.store.saveSections(this.sectionForm.getRawValue().sections), 'Meal defaults saved for future dates. Existing diaries are unchanged.');
  }
  saveZone(): void { this.store.run(() => this.store.saveZone(this.zone.value.trim()), 'Time zone updated. Stored diary dates have not moved.'); }
  exportData(): void {
    this.exported.set(JSON.stringify({
      demo: true, note: 'Fictional demo export preview only; photo booleans represent illustrations, not uploaded files.',
      timeZone: this.store.zone(), weightUnit: this.store.weightUnit(),
      diary: this.store.days(), foods: this.store.foods(), mealsAndRecipes: this.store.collections(),
      goals: this.store.goals(), weights: this.store.weights(), mealDefaults: this.store.sectionVersions(),
    }, null, 2));
    this.store.notice.set('Demo export preview generated. No real data was downloaded.');
  }
  clear(): void {
    if (this.deleteText.value !== 'DELETE') { this.store.error.set('Type DELETE to confirm deleting all demo data.'); return; }
    if (this.store.run(() => this.store.clearData(), 'Demo data deleted. Reset demo restores fictional examples.')) {
      this.confirmDelete.set(false); this.exported.set('');
      this.goals.reset({ calories: 0, protein: 0, carbs: 0, fat: 0 });
      this.sectionForm.controls.sections.clear();
      this.sectionForm.controls.sections.push(this.fb.group({ name: ['Breakfast', Validators.required], visible: this.fb.control<boolean>(true) }));
    }
  }
}
