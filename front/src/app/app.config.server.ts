import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { provideTranslateService, TranslateLoader } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import * as fs from 'node:fs';
import { join } from 'node:path';

export class TranslateServerLoader implements TranslateLoader {
  getTranslation(lang: string): Observable<any> {
    return new Observable((observer) => {
      // Try production path first (dist)
      let assetsPath = join(process.cwd(), 'dist', 'front', 'browser', 'assets', 'i18n');
      
      // If not found (e.g. dev mode), try source path
      if (!fs.existsSync(assetsPath)) {
        assetsPath = join(process.cwd(), 'front', 'src', 'assets', 'i18n');
      }
      
      // Fallback for different CWD structures (e.g. inside front/)
      if (!fs.existsSync(assetsPath)) {
         assetsPath = join(process.cwd(), 'src', 'assets', 'i18n');
      }

      const filePath = join(assetsPath, `${lang}.json`);

      try {
        const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        observer.next(jsonData);
        observer.complete();
      } catch (err) {
        console.warn(`[TranslateServerLoader] Failed to load ${lang} from ${filePath}`, err);
        observer.complete(); // Complete without emitting to let client handle it
      }
    });
  }
}

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    provideTranslateService({
      loader: {
        provide: TranslateLoader,
        useClass: TranslateServerLoader
      }
    })
  ]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);