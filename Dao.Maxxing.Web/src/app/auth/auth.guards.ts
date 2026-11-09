import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** App routes. Signed-out visitors go to the landing page. The API is still the security boundary. */
export const signedInGuard: CanMatchFn = () => {
  const signedIn = inject(AuthService).user() !== null;
  return signedIn || inject(Router).parseUrl('/');
};

/** The landing page. Returning false lets signed-in visitors fall through to the app routes. */
export const signedOutGuard: CanMatchFn = () => inject(AuthService).user() === null;
