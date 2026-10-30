import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { AUTH_CONFIGURATION, AuthConfiguration } from './app/auth/auth-provider';

async function bootstrap(): Promise<void> {
  if (window.location.pathname !== '/template') {
    await bootstrapApplication(App, appConfig);
    return;
  }
  const response = await fetch('/api/auth/config');
  if (!response.ok) throw new Error('Unable to load authentication configuration. Check the API logs and docs/authentication.md.');
  const configuration: AuthConfiguration = await response.json();
  await bootstrapApplication(App, {
    ...appConfig,
    providers: [{ provide: AUTH_CONFIGURATION, useValue: configuration }, ...appConfig.providers],
  });
}
bootstrap().catch(error => {
  console.error(error);
  const root = document.querySelector('app-root');
  if (root) root.textContent = window.location.pathname === '/template'
    ? 'Authentication setup failed. Check the API logs and docs/authentication.md.'
    : 'The prototype could not start. Refresh the page and check the browser console.';
});
