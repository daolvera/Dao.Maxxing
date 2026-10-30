import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { WeatherComponent } from './weather/weather.component';
import { AuthService } from './auth/auth.service';

@Component({
  imports: [RouterOutlet, WeatherComponent],
  templateUrl: './template.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TemplateComponent {
  protected readonly auth = inject(AuthService);
  protected readonly title = signal('Dao.Maxxing.Web');
}
