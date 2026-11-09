import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig).catch((error) => {
  console.error(error);
  const root = document.querySelector('app-root');
  if (root) root.textContent = 'Maxxing could not start. Refresh the page and check the browser console.';
});
