import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

console.log('¡La aplicación Angular se está ejecutando!'); // Added for debugging

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
