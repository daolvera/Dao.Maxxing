import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'mx-photo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="photo-placeholder" [class.alternate]="alternate()">
      <svg viewBox="0 0 160 170" role="img" aria-label="Illustrated progress photo placeholder, not a real person">
        <circle cx="80" cy="33" r="15" fill="currentColor" />
        <path d="M56 59Q80 49 104 59L119 108Q120 118 111 117L98 84L99 134L94 160H81L80 117L77 160H64L60 134L62 84L49 117Q40 118 41 108Z" fill="currentColor" />
      </svg>
      <span>Sample photo · illustration only</span>
    </div>
  `,
})
export class Photo { readonly alternate = input(false); }
