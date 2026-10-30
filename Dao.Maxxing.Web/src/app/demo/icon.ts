import { ChangeDetectionStrategy, Component, input } from '@angular/core';

const paths: Record<string, string> = {
  diary: 'M6 3h12a2 2 0 0 1 2 2v16H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm2 0v18m4-13h4m-4 4h4',
  food: 'M4 3v6a3 3 0 0 0 6 0V3M7 3v18M17 3c-3 3-3 8 0 9h3V3h-3Zm3 9v9',
  progress: 'M4 3v17h17M8 15l4-5 4 2 5-7',
  settings: 'M4 7h16M4 17h16M8 4v6m8 4v6',
  plus: 'M12 5v14M5 12h14',
  arrow: 'm9 5 7 7-7 7',
  check: 'm5 12 4 4L19 6',
  scan: 'M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5M7 7v10m3-10v10m4-10v10m3-10v10',
  leaf: 'M20 3C10 2 3 6 4 13c1 7 11 8 14 1 2-4 2-8 2-11ZM6 18l9-10',
  logout: 'M10 4H4v16h6m4-13 5 5-5 5m-6-5h11',
};
@Component({
  selector: 'mx-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path [attr.d]="path()" /></svg>',
  styles: ':host{display:inline-flex;width:21px;height:21px;flex-shrink:0}svg{width:100%;height:100%}',
})
export class Icon {
  readonly name = input('leaf');
  path(): string { return paths[this.name()] ?? paths['leaf']; }
}
