import { InjectionToken } from '@angular/core';

export interface AuthenticationProvider {
  initialize(sessionExpired: () => void): Promise<void>;
  hasSession(): boolean;
  login(): Promise<void>;
  logout(): Promise<void>;
  accessToken(): Promise<string>;
}

export const AUTH_PROVIDER = new InjectionToken<AuthenticationProvider>('AuthenticationProvider');
