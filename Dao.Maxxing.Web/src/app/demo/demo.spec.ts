import { TestBed } from '@angular/core/testing';
import { Demo } from './demo';
import { DemoStore } from './demo-store';
import { FoodPicker } from './food-picker';
import { Library } from './library';
import { Progress } from './progress';
import { Settings } from './settings';
import { FoodEditor } from './food-editor';

describe('Clickable prototype', () => {
  beforeEach(async () => { await TestBed.configureTestingModule({ imports: [Demo, FoodPicker, Library, Progress, Settings] }).compileComponents(); });

  it('renders all primary navigation and demonstrates denied/allowed sign-in', () => {
    const fixture = TestBed.createComponent(Demo);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h1')?.textContent).toBe('Your daily diary');
    expect(element.querySelectorAll('nav button')).toHaveLength(4);
    fixture.componentInstance.access.set('denied'); fixture.detectChanges();
    expect(element.textContent).toContain("This space is private.");
    fixture.componentInstance.access.set('signed-out'); fixture.detectChanges();
    expect(element.textContent).toContain('Continue with Google (demo)');
    fixture.componentInstance.access.set('signed-in'); fixture.detectChanges();
    expect(element.querySelector('h1')?.textContent).toBe('Your daily diary');
  });

  it('looks up known and unknown barcodes and retains the portion form on save failure', () => {
    const fixture = TestBed.createComponent(FoodPicker);
    fixture.componentRef.setInput('section', 'Breakfast');
    fixture.detectChanges();
    const picker = fixture.componentInstance;
    const store = TestBed.inject(DemoStore);
    picker.lookup(); fixture.detectChanges();
    expect(picker.selected()?.id).toBe('oats');
    picker.portion.patchValue({ quantity: 20, unit: 'g' });
    expect(picker.preview()?.calories).toBe(75);
    store.failNext.set(true);
    picker.save();
    expect(picker.portion.controls.quantity.value).toBe(20);
    expect(store.error()).toContain('failed');
    picker.save();
    expect(store.day().entries.at(-1)?.calories).toBe(75);
    picker.barcode.setValue('unknown'); picker.lookup();
    expect(picker.selected()).toBeNull();
    expect(picker.barcodeMessage()).toContain('not found');
  });

  it('builds a cooked recipe from editable ingredients', () => {
    const fixture = TestBed.createComponent(Library);
    fixture.detectChanges();
    const library = fixture.componentInstance;
    library.editCollection(null);
    library.collectionForm.patchValue({ name: 'Demo porridge', servings: 2, cookedGrams: 400 });
    library.collectionForm.controls.ingredients.at(0).patchValue({ foodId: 'oats', servings: 2 });
    fixture.detectChanges();
    expect(library.preview().calories).toBe(150);
    library.saveCollection();
    const saved = TestBed.inject(DemoStore).collections().at(-1)!;
    expect(saved.name).toBe('Demo porridge');
    expect(saved.cookedGrams).toBe(400);
    expect(library.builder()).toBe(false);
  });

  it('updates the portion snapshot when switching between diary entries', () => {
    const fixture = TestBed.createComponent(FoodPicker);
    const store = TestBed.inject(DemoStore);
    fixture.componentRef.setInput('entry', store.day().entries[0]);
    fixture.componentRef.setInput('section', 'Breakfast');
    fixture.detectChanges();
    expect(fixture.componentInstance.selected()?.name).toBe('Rolled oats');
    fixture.componentRef.setInput('entry', store.day().entries[1]);
    fixture.detectChanges();
    expect(fixture.componentInstance.selected()?.name).toBe('Greek yogurt');
    fixture.componentInstance.save();
    expect(store.day().entries[0].name).toBe('Rolled oats');
    expect(store.day().entries[1].name).toBe('Greek yogurt');
  });

  it('loads the correct draft when switching food editors', () => {
    const fixture = TestBed.createComponent(FoodEditor);
    const store = TestBed.inject(DemoStore);
    fixture.componentRef.setInput('food', store.foods()[0]); fixture.detectChanges();
    expect(fixture.componentInstance.form.controls.name.value).toBe('Rolled oats');
    fixture.componentRef.setInput('food', store.foods()[1]); fixture.detectChanges();
    expect(fixture.componentInstance.form.controls.name.value).toBe('Greek yogurt');
  });

  it('edits saved diary meals even if their snapshot ingredient is not in the food library', () => {
    const fixture = TestBed.createComponent(Library);
    fixture.detectChanges();
    const store = TestBed.inject(DemoStore);
    store.saveMealFromDiary('Breakfast');
    fixture.componentInstance.editCollection(store.collections().at(-1)!);
    fixture.componentInstance.saveCollection();
    expect(store.error()).toBe('');
    expect(fixture.componentInstance.builder()).toBe(false);
  });

  it('records a weight with one placeholder photo and renders the comparison', () => {
    const fixture = TestBed.createComponent(Progress);
    fixture.detectChanges();
    const progress = fixture.componentInstance;
    const store = TestBed.inject(DemoStore);
    progress.start(store.weights()[0]);
    progress.weightForm.patchValue({ amount: 181, photo: true });
    progress.save();
    fixture.detectChanges();
    expect(progress.formOpen()).toBe(false);
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('mx-photo')).toHaveLength(2);
    expect(store.weights()[0].photo).toBe(true);
  });

  it('warns about goal mismatch, requires deletion confirmation, and previews fictional export', () => {
    const fixture = TestBed.createComponent(Settings);
    fixture.detectChanges();
    const settings = fixture.componentInstance;
    settings.goals.controls.calories.setValue(1000);
    fixture.detectChanges();
    expect(settings.mismatch()).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain("don't line up");
    settings.exportData();
    expect(JSON.parse(settings.exported()).demo).toBe(true);
    settings.clear();
    expect(TestBed.inject(DemoStore).days().length).toBeGreaterThan(0);
    settings.deleteText.setValue('DELETE'); settings.clear();
    expect(TestBed.inject(DemoStore).days()).toEqual([]);
  });
});
