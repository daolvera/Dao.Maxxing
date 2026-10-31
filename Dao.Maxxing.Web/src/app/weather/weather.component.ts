import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Api } from '../api/api';
import { getWeatherForecast } from '../api/functions';
import { WeatherForecast } from '../api/models';

@Component({
  selector: 'app-weather',
  template: `
    <section class="my-4" aria-labelledby="weather-heading">
      <h2 id="weather-heading" class="h4 mb-1 text-primary-emphasis">Weather forecast</h2>
      <p class="small text-body-secondary mb-3">
        Live data from the C# API: <code>GET /api/weatherforecast</code>
      </p>
      @if (loading()) {
        <div class="d-flex align-items-center gap-2 py-3" role="status">
          <span class="spinner-border spinner-border-sm text-primary" aria-hidden="true"></span>
          <span>Loading forecasts...</span>
        </div>
      } @else if (error()) {
        <div class="alert alert-danger d-flex align-items-center gap-2" role="alert">
          <i class="bi bi-exclamation-triangle-fill" aria-hidden="true"></i>
          {{ error() }}
        </div>
      } @else {
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0" aria-labelledby="weather-heading">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col" class="text-end">Temp (°C)</th>
                <th scope="col" class="text-end">Temp (°F)</th>
                <th scope="col">Summary</th>
              </tr>
            </thead>
            <tbody>
              @for (forecast of forecasts(); track forecast.date) {
                <tr>
                  <td>{{ forecast.date }}</td>
                  <td class="text-end">{{ forecast.temperatureC }}</td>
                  <td class="text-end">{{ forecast.temperatureF }}</td>
                  <td>{{ forecast.summary }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeatherComponent implements OnInit {
  private readonly api = inject(Api);

  readonly forecasts = signal<WeatherForecast[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.api.invoke(getWeatherForecast).subscribe({
      next: (data) => {
        this.forecasts.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load weather data. Is the API running?');
        this.loading.set(false);
      },
    });
  }
}
