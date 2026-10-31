import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { FieldControlDirective, FormFieldComponent } from './form-field.component';

@Component({
  imports: [ReactiveFormsModule, FormFieldComponent, FieldControlDirective],
  template: `
    <app-form-field label="Food name" hint="As it appears on the label." [control]="name">
      <input appFieldControl class="form-control" [formControl]="name" />
    </app-form-field>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class HostComponent {
  readonly name = new FormControl('', Validators.required);
}

describe('FormFieldComponent', () => {
  async function render() {
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      label: element.querySelector('label')!,
      input: element.querySelector('input')!,
    };
  }

  it('labels the control and marks it required', async () => {
    const { label, input } = await render();

    expect(input.id).toBeTruthy();
    expect(label.htmlFor).toBe(input.id);
    expect(label.textContent).toContain('Food name');
    expect(label.querySelector('.visually-hidden')?.textContent).toBe('(required)');
  });

  it('describes the control with its hint before it is touched', async () => {
    const { fixture, input } = await render();

    expect(input.getAttribute('aria-describedby')).toBe(`${input.id}-hint`);
    expect(input.getAttribute('aria-invalid')).toBeNull();
    expect(fixture.nativeElement.querySelector('.invalid-feedback')).toBeNull();
  });

  it('shows and links the error once the control is touched', async () => {
    const { fixture, input } = await render();

    fixture.componentInstance.name.markAsTouched();
    await fixture.whenStable();

    const error = fixture.nativeElement.querySelector('.invalid-feedback') as HTMLElement;
    expect(error.textContent).toContain('Food name is required');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.classList).toContain('is-invalid');
    expect(input.getAttribute('aria-describedby')).toBe(`${input.id}-hint ${error.id}`);
  });
});
