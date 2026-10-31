import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NutritionLineComponent } from './nutrition-line/nutrition-line.component';
import { PageHeaderComponent } from './page-header/page-header.component';
import { PlaceholderNoticeComponent } from './placeholder-notice/placeholder-notice.component';

@Component({
  imports: [PageHeaderComponent, PlaceholderNoticeComponent, NutritionLineComponent],
  template: `
    <app-page-header heading="Foods" subtitle="Your library">
      <button type="button">Create</button>
    </app-page-header>
    <app-placeholder-notice feature="The diary" [issue]="16" />
    <app-nutrition-line [nutrition]="{ calories: 150.4, protein: 5.25, carbs: 27, fat: 3 }" />
  `,
})
class HostComponent {}

describe('shared components', () => {
  let element: HTMLElement;

  beforeEach(async () => {
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    element = fixture.nativeElement;
  });

  it('renders a page heading with projected actions', () => {
    expect(element.querySelector('app-page-header h1')?.textContent).toBe('Foods');
    expect(element.querySelector('app-page-header p')?.textContent).toBe('Your library');
    expect(element.querySelector('app-page-header button')?.textContent).toBe('Create');
  });

  it('links the placeholder notice to its issue', () => {
    const notice = element.querySelector('app-placeholder-notice')!;
    expect(notice.textContent).toContain("The diary isn't connected to the API yet");
    expect(notice.querySelector('a')?.getAttribute('href')).toBe(
      'https://github.com/daolvera/Dao.Maxxing/issues/16',
    );
  });

  it('formats one line of nutrition', () => {
    const text = element.querySelector('app-nutrition-line')?.textContent?.replace(/\s+/g, ' ').trim();
    expect(text).toBe('150 kcal P 5.3 g C 27 g F 3 g');
  });
});
