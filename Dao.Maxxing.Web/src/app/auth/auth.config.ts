import { HttpInterceptorFn } from '@angular/common/http';
import { inject, provideAppInitializer } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { AUTH_PROVIDER } from './auth-provider';
import { AuthService } from './auth.service';
import { CookieProvider } from './cookie-provider';

export const authenticationProviders = [
  { provide: AUTH_PROVIDER, useClass: CookieProvider },
  // The route guards read the signed-in user, so it has to be known before the first navigation.
  provideAppInitializer(() => inject(AuthService).initialize()),
];

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const url = new URL(request.url, window.location.origin);
  if (url.origin !== window.location.origin || !url.pathname.startsWith('/api/')) return next(request);
  const auth = inject(AuthService);
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return next(request);
  return from(auth.csrfToken()).pipe(switchMap(token =>
    next(request.clone({ setHeaders: { 'X-XSRF-TOKEN': token } }))));
};
