import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { WeatherService } from './weather.service';

describe('WeatherService', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] }),
  );

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('calls the generated weatherforecast operation', async () => {
    const forecast = firstValueFrom(TestBed.inject(WeatherService).getForecast());
    const request = TestBed.inject(HttpTestingController).expectOne('/api/weatherforecast');
    expect(request.request.method).toBe('GET');
    request.flush([{ date: '2026-01-01', temperatureC: 20, temperatureF: 67, summary: 'Mild' }]);
    expect(await forecast).toEqual([
      { date: '2026-01-01', temperatureC: 20, temperatureF: 67, summary: 'Mild' },
    ]);
  });
});
