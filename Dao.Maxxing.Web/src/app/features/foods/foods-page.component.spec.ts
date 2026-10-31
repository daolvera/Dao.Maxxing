import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideFixedClock } from '../../testing/fixed-clock';
import { closeOverlays, nextModalRender, provideNoNgbAnimations } from '../../testing/modals';
import { FoodsStore } from './data-access/foods.store';
import { FoodsPageComponent } from './foods-page.component';

describe('FoodsPageComponent', () => {
  let fixture: ComponentFixture<FoodsPageComponent>;
  let element: HTMLElement;

  const settle = async () => {
    await fixture.whenStable();
    await nextModalRender();
  };
  const type = async (input: Element | null, value: string) => {
    (input as HTMLInputElement).value = value;
    input!.dispatchEvent(new Event('input'));
    await settle();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [FoodsPageComponent],
      providers: [provideFixedClock(), provideNoNgbAnimations()],
    });
    fixture = TestBed.createComponent(FoodsPageComponent);
    element = fixture.nativeElement;
    await settle();
  });

  afterEach(() => closeOverlays());

  it('lists the library and filters it by search', async () => {
    const names = () => [...element.querySelectorAll('[role=tabpanel] h2')].map((h) => h.textContent);
    expect(names()).toContain('Rolled oats');
    await type(element.querySelector('input[type=search]'), 'avo');
    expect(names()).toEqual(['Avocado']);
  });

  it('switches to recipes', async () => {
    const tab = [...element.querySelectorAll('[role=tab]')].find((t) => t.textContent?.includes('Recipes'));
    (tab as HTMLElement).click();
    await settle();
    expect(element.querySelector('[role=tabpanel]')?.textContent).toContain('Chicken & rice bowl');
    expect(element.querySelector('[role=tabpanel]')?.textContent).toContain('4 servings');
  });

  it('toggles a favorite from the list', async () => {
    const button = element.querySelector('button[aria-label="Favorite Avocado"]') as HTMLElement;
    expect(button.getAttribute('aria-pressed')).toBe('false');
    button.click();
    await settle();
    expect(element.querySelector('button[aria-label="Favorite Avocado"]')?.getAttribute('aria-pressed')).toBe('true');
  });

  it('creates a food through the form modal and shows field errors first', async () => {
    const create = [...element.querySelectorAll('button')].find((b) => b.textContent?.includes('Create food'));
    create!.click();
    await settle();
    const modal = document.querySelector('ngb-modal-window')!;
    (modal.querySelector('button[type=submit]') as HTMLElement).click();
    await settle();
    expect(modal.querySelector('.invalid-feedback')?.textContent).toContain('Food name is required');

    await type(modal.querySelector('input[formcontrolname=name]'), 'Toast');
    await type(modal.querySelector('input[formcontrolname=serving]'), '1 slice');
    await type(modal.querySelector('input[formcontrolname=calories]'), '80');
    (modal.querySelector('button[type=submit]') as HTMLElement).click();
    await settle();

    expect(document.querySelector('ngb-modal-window')).toBeNull();
    expect(TestBed.inject(FoodsStore).foods().some((f) => f.name === 'Toast')).toBe(true);
  });
});
