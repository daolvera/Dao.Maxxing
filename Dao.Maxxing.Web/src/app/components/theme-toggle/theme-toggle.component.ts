import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ThemeService } from '../../services/theme.service';

/**
 * Theme toggle component for switching between light/dark modes
 * Displays a button with icon that changes based on current theme
 */
@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [],
  template: `
    <button
      type="button"
      class="btn btn-link link-body-emphasis text-decoration-none fs-5 px-2 py-1"
      (click)="toggleTheme()"
      [attr.aria-label]="'Switch to ' + (isDark() ? 'light' : 'dark') + ' mode'"
      title="Toggle theme"
    >
      @if (isDark()) {
        <i class="bi bi-sun-fill" aria-hidden="true"></i>
      } @else {
        <i class="bi bi-moon-stars-fill" aria-hidden="true"></i>
      }
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeToggleComponent {
  private themeService = inject(ThemeService);
  protected isDark = computed(() => this.themeService.isDarkMode());

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }
}
