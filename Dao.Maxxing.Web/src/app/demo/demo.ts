import { ChangeDetectionStrategy, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { Icon } from './icon';
import { DemoStore } from './demo-store';
import { Diary } from './diary';
import { Library } from './library';
import { Progress } from './progress';
import { Settings } from './settings';

@Component({
  imports: [Icon, Diary, Library, Progress, Settings],
  templateUrl: './demo.html',
  styleUrl: './demo.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'maxxing' },
})
export class Demo {
  readonly store = inject(DemoStore);
  readonly screen = signal('Diary');
  readonly access = signal<'signed-in' | 'signed-out' | 'denied'>('signed-in');
  readonly nav = [{ name: 'Diary', icon: 'diary' }, { name: 'Foods & recipes', icon: 'food' }, { name: 'Progress', icon: 'progress' }, { name: 'Settings', icon: 'settings' }];
  readonly main = viewChild<ElementRef<HTMLElement>>('main');
  navigate(name: string): void {
    this.screen.set(name); this.store.error.set(''); this.store.notice.set('');
    setTimeout(() => { this.main()?.nativeElement.focus(); window.scrollTo({ top: 0 }); });
  }
  reset(): void {
    this.store.reset(); this.screen.set('Diary'); this.access.set('signed-in');
    this.store.notice.set('Demo reset. All fictional examples have been restored.');
  }
  retryHint(): void { this.store.notice.set('Return to the retained form and submit the same action again. The simulated connection is now available.'); }
}
