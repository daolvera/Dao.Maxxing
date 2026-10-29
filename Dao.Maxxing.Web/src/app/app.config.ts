import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { withInterceptors, withInterceptorsFromDi } from '@angular/common/http';
import { authenticationProviders, authInterceptor } from './auth/auth.config';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withXhr(), withInterceptors([authInterceptor]), withInterceptorsFromDi()),
    ...authenticationProviders,
    provideRouter(routes)
  ]
};
