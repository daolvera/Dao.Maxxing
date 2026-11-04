import { HttpErrorResponse } from '@angular/common/http';
import { Injector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';
import { createMutationRunner, toErrorMessage } from './mutation-runner';

describe('toErrorMessage', () => {
  it('prefers the ProblemDetails detail, then its title', () => {
    const problem = (body: object) =>
      new HttpErrorResponse({ status: 400, error: body });
    expect(toErrorMessage(problem({ title: 'Bad', detail: 'Quantity must be positive.' }))).toBe(
      'Quantity must be positive.',
    );
    expect(toErrorMessage(problem({ title: 'Not found' }))).toBe('Not found');
  });

  it('explains a network failure and falls back for anything else', () => {
    expect(toErrorMessage(new HttpErrorResponse({ status: 0 }))).toContain("Couldn't reach");
    expect(toErrorMessage(new Error('Choose a meal section.'))).toBe('Choose a meal section.');
    expect(toErrorMessage('boom')).toBe('Something went wrong. Try again.');
  });
});

describe('createMutationRunner', () => {
  const create = () =>
    runInInjectionContext(TestBed.inject(Injector), () => createMutationRunner());
  const messages = () => firstValueFrom(TestBed.inject(NotificationService).notifications$);

  it('applies the result and reports success', async () => {
    const runner = create();
    let applied = 0;
    const saved = await runner.run(of(42), 'Saved.', (value) => (applied = value));
    expect(saved).toBe(true);
    expect(applied).toBe(42);
    expect(runner.saving()).toBe(false);
    expect((await messages()).map((n) => [n.type, n.message])).toEqual([['success', 'Saved.']]);
  });

  it('reports a failure without applying anything', async () => {
    const runner = create();
    const apply = vi.fn();
    const saved = await runner.run(throwError(() => new Error('Nope.')), 'Saved.', apply);
    expect(saved).toBe(false);
    expect(apply).not.toHaveBeenCalled();
    expect((await messages()).map((n) => [n.type, n.message])).toEqual([['error', 'Nope.']]);
  });
});
