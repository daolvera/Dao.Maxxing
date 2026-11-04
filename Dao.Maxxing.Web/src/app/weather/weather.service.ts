import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Api } from '../api/api';
import { getWeatherForecast } from '../api/functions';
import { WeatherForecast } from '../api/models';

/** Data access for the weather sample endpoint, over the generated API client. */
@Injectable({ providedIn: 'root' })
export class WeatherService {
  private readonly api = inject(Api);

  getForecast(): Observable<WeatherForecast[]> {
    return this.api.invoke(getWeatherForecast);
  }
}
