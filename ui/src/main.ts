// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { CommonModule } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import '@angular/compiler'; // needed for dynamic cloze test component compilation
import { LOCALE_ID, enableProdMode, importProvidersFrom, provideZonelessChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { ToastrModule } from 'ngx-toastr';
import { AppComponent } from './app/app.component';
import { APP_ROUTES } from './app/app.routes';
import { interceptors } from './app/interceptors';
import { SessionService } from './app/session/session.service';
import { environment } from './environments/environment';

if (environment.production) {
    enableProdMode();
}

bootstrapApplication(AppComponent, {
    providers: [
        importProvidersFrom(CommonModule, TranslateModule.forRoot(), ToastrModule.forRoot({ preventDuplicates: true })),
        provideTranslateHttpLoader({ prefix: '/assets/i18n/', suffix: '.json' }),
        { provide: LOCALE_ID, deps: [SessionService], useFactory: (srv: SessionService) => srv.getLocale() },
        provideZonelessChangeDetection(),
        provideRouter(APP_ROUTES),
        provideHttpClient(withInterceptors(interceptors)),
        provideAnimationsAsync(), // needed for ng-bootstrap and ngx-toastr
    ],
});
