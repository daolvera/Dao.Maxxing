import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideFixedClock } from '../../testing/fixed-clock';
import { SettingsStore } from './data-access/settings.store';
import { SettingsPageComponent } from './settings-page.component';

describe('SettingsPageComponent', () => {
  let fixture: ComponentFixture<SettingsPageComponent>;
  let element: HTMLElement;
  let store: SettingsStore;

  const type = async (input: Element | null, value: string) => {
    (input as HTMLInputElement).value = value;
    input!.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };
  /** Goal inputs in form order: calories, protein, carbs, fat. */
  const goalInput = (index: number) => element.querySelectorAll('app-goals-form input')[index];
  const submit = async (form: string) => {
    (element.querySelector(`${form} button[type=submit]`) as HTMLElement).click();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [SettingsPageComponent], providers: [provideFixedClock()] });
    fixture = TestBed.createComponent(SettingsPageComponent);
    element = fixture.nativeElement;
    store = TestBed.inject(SettingsStore);
    await fixture.whenStable();
  });

  it('fills the forms from the store', () => {
    expect((goalInput(0) as HTMLInputElement).value).toBe('2200');
    expect(element.querySelectorAll('app-meal-sections-form li')).toHaveLength(4);
  });

  it('warns when macros and calories disagree, and saves new targets', async () => {
    await type(goalInput(0), '1500');
    expect(element.querySelector('app-goals-form .alert-warning')).not.toBeNull();
    await submit('app-goals-form');
    expect(store.currentGoal().calories).toBe(1500);
  });

  it('blocks a zero target with a field error', async () => {
    await type(goalInput(3), '0');
    await submit('app-goals-form');
    expect(element.querySelector('app-goals-form .invalid-feedback')?.textContent).toContain('at least');
    expect(store.currentGoal().fat).toBe(60);
  });

  it('reorders and renames meal sections', async () => {
    (element.querySelector('button[aria-label="Move section 2 up"]') as HTMLElement).click();
    await fixture.whenStable();
    await type(element.querySelectorAll('app-meal-sections-form input[formcontrolname=name]')[3], 'Treats');
    await submit('app-meal-sections-form');
    expect(store.mealSections().map((s) => s.name)).toEqual(['Lunch', 'Breakfast', 'Dinner', 'Treats']);
  });

  it('rejects an unknown time zone in the form', async () => {
    const zone = store.timeZone();
    const input = element.querySelector('app-preferences-form input[formcontrolname=timeZone]');
    await type(input, 'Mars/Olympus');
    input!.dispatchEvent(new Event('blur'));
    await submit('app-preferences-form');
    expect(element.querySelector('app-preferences-form .invalid-feedback')?.textContent).toContain('invalid');
    expect(store.timeZone()).toBe(zone);
  });
});
